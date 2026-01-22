/**
 * Dissonance Scoring System
 * Implements a zero-centered scoring norm for counterpoint dissonance analysis.
 *
 * Scores: +1.0 to +2.0 = Excellent (Suspensions, Passing Tones)
 *         0.0 = Neutral/Acceptable
 *         Negative = Weak or Error-prone
 *
 * Semantic Categories for visualization:
 *   consonant_normal:      Normal consonant interval (pale green)
 *   consonant_repetitive:  Same interval repeated too often (yellowish)
 *   consonant_good_resolution: Consonance after well-resolved dissonance (bright green)
 *   consonant_bad_resolution:  Consonance after poorly-resolved dissonance (orange)
 *   dissonant_good:        Well-handled dissonance (purple, brighter = better)
 *   dissonant_marginal:    Acceptable but not ideal dissonance (purple-ish)
 *   dissonant_bad:         Poorly handled dissonance (red)
 */

import { pitchName, metricWeight } from './formatter';

// Configuration
let treatP4AsDissonant = false; // Toggle for P4 treatment

export function setP4Treatment(dissonant) {
  treatP4AsDissonant = dissonant;
}

export function getP4Treatment() {
  return treatP4AsDissonant;
}

/**
 * Classify interval magnitude
 */
function getIntervalMagnitude(semitones) {
  const abs = Math.abs(semitones);
  if (abs === 0) return { type: 'unison', penalty: 0 };
  if (abs <= 2) return { type: 'step', penalty: 0 };
  if (abs <= 4) return { type: 'skip', penalty: -0.5 }; // m3, M3
  if (abs === 5 || abs === 7 || abs === 12) return { type: 'perfect_leap', penalty: -1.0 }; // P4, P5, P8
  return { type: 'large_leap', penalty: -2.0 }; // 6th+
}

/**
 * Determine motion type between two simultaneities
 * Returns: 'oblique', 'contrary', 'similar', 'parallel'
 */
function getMotionType(prevSim, currSim) {
  if (!prevSim) return { type: 'unknown', v1Moved: true, v2Moved: true };

  const v1Moved = currSim.voice1Note !== prevSim.voice1Note &&
                  currSim.voice1Note.pitch !== prevSim.voice1Note.pitch;
  const v2Moved = currSim.voice2Note !== prevSim.voice2Note &&
                  currSim.voice2Note.pitch !== prevSim.voice2Note.pitch;

  if (!v1Moved && !v2Moved) {
    return { type: 'static', v1Moved: false, v2Moved: false };
  }

  if (!v1Moved || !v2Moved) {
    return { type: 'oblique', v1Moved, v2Moved };
  }

  const v1Dir = Math.sign(currSim.voice1Note.pitch - prevSim.voice1Note.pitch);
  const v2Dir = Math.sign(currSim.voice2Note.pitch - prevSim.voice2Note.pitch);

  if (v1Dir === -v2Dir) {
    return { type: 'contrary', v1Moved: true, v2Moved: true };
  }

  // Similar motion - check if parallel (same interval size)
  const v1Interval = Math.abs(currSim.voice1Note.pitch - prevSim.voice1Note.pitch);
  const v2Interval = Math.abs(currSim.voice2Note.pitch - prevSim.voice2Note.pitch);

  if (v1Interval === v2Interval) {
    return { type: 'parallel', v1Moved: true, v2Moved: true };
  }

  return { type: 'similar', v1Moved: true, v2Moved: true };
}

/**
 * Check if this is a strong beat (weight >= 0.75)
 */
function isStrongBeat(onset) {
  return metricWeight(onset) >= 0.75;
}

/**
 * Score the entry into a dissonance (C → D)
 */
function scoreEntry(prevSim, currSim) {
  let score = 0; // Base
  const details = [];

  if (!prevSim) {
    return { score: 0, details: ['No previous simultaneity'] };
  }

  const motion = getMotionType(prevSim, currSim);

  // Motion modifier
  if (motion.type === 'oblique') {
    score += 0.5;
    details.push(`Oblique motion: +0.5`);
  } else if (motion.type === 'contrary') {
    score += 0.5;
    details.push(`Contrary motion: +0.5`);
  } else if (motion.type === 'similar' || motion.type === 'parallel') {
    score -= 1.5;
    details.push(`Similar/parallel motion: -1.5`);
  }

  // Magnitude modifier - check which voice(s) moved and by how much
  if (motion.v1Moved) {
    const interval = Math.abs(currSim.voice1Note.pitch - prevSim.voice1Note.pitch);
    const mag = getIntervalMagnitude(interval);
    if (mag.penalty !== 0) {
      score += mag.penalty;
      details.push(`V1 ${mag.type} (${interval} st): ${mag.penalty}`);
    }
  }
  if (motion.v2Moved) {
    const interval = Math.abs(currSim.voice2Note.pitch - prevSim.voice2Note.pitch);
    const mag = getIntervalMagnitude(interval);
    if (mag.penalty !== 0) {
      score += mag.penalty;
      details.push(`V2 ${mag.type} (${interval} st): ${mag.penalty}`);
    }
  }

  // Meter modifier
  if (isStrongBeat(currSim.onset)) {
    score -= 1.0;
    details.push(`Strong beat: -1.0`);
  }

  return {
    score,
    details,
    motion,
    v1MelodicInterval: motion.v1Moved ? currSim.voice1Note.pitch - prevSim.voice1Note.pitch : 0,
    v2MelodicInterval: motion.v2Moved ? currSim.voice2Note.pitch - prevSim.voice2Note.pitch : 0,
  };
}

/**
 * Score the exit from a dissonance (D → C)
 */
function scoreExit(currSim, nextSim, entryInfo) {
  let score = 1.0; // Base for resolving
  const details = ['Base resolution: +1.0'];

  if (!nextSim) {
    return { score: -1.0, details: ['No resolution - dissonance unresolved: -1.0'], motion: null };
  }

  const motion = getMotionType(currSim, nextSim);

  // Resolution modifier - check how each voice resolves
  let v1Resolution = null;
  let v2Resolution = null;

  if (motion.v1Moved) {
    const interval = Math.abs(nextSim.voice1Note.pitch - currSim.voice1Note.pitch);
    const mag = getIntervalMagnitude(interval);
    v1Resolution = {
      interval,
      direction: Math.sign(nextSim.voice1Note.pitch - currSim.voice1Note.pitch),
      magnitude: mag,
    };

    if (mag.type === 'skip') {
      score -= 1.0;
      details.push(`V1 skip resolution: -1.0`);
    } else if (mag.type === 'perfect_leap') {
      score -= 1.5;
      details.push(`V1 perfect leap resolution: -1.5`);
    } else if (mag.type === 'large_leap') {
      score -= 2.5;
      details.push(`V1 large leap resolution: -2.5`);
    }
  }

  if (motion.v2Moved) {
    const interval = Math.abs(nextSim.voice2Note.pitch - currSim.voice2Note.pitch);
    const mag = getIntervalMagnitude(interval);
    v2Resolution = {
      interval,
      direction: Math.sign(nextSim.voice2Note.pitch - currSim.voice2Note.pitch),
      magnitude: mag,
    };

    if (mag.type === 'skip') {
      score -= 1.0;
      details.push(`V2 skip resolution: -1.0`);
    } else if (mag.type === 'perfect_leap') {
      score -= 1.5;
      details.push(`V2 perfect leap resolution: -1.5`);
    } else if (mag.type === 'large_leap') {
      score -= 2.5;
      details.push(`V2 large leap resolution: -2.5`);
    }
  }

  // Recovery violation check
  // If entry was skip/leap, exit should be step in opposite direction
  if (entryInfo && entryInfo.motion) {
    const checkRecovery = (entryInterval, exitResolution, voice) => {
      if (!exitResolution) return;
      const entryMag = getIntervalMagnitude(entryInterval);
      if (entryMag.type === 'skip' || entryMag.type === 'perfect_leap' || entryMag.type === 'large_leap') {
        // Entry was a leap - check if resolution is step in opposite direction
        const entryDir = Math.sign(entryInterval);
        if (exitResolution.magnitude.type !== 'step' || exitResolution.direction === entryDir) {
          score -= 2.0;
          details.push(`${voice} recovery violation (leap not recovered by opposite step): -2.0`);
        }
      }
    };

    if (entryInfo.v1MelodicInterval !== 0 && v1Resolution) {
      checkRecovery(entryInfo.v1MelodicInterval, v1Resolution, 'V1');
    }
    if (entryInfo.v2MelodicInterval !== 0 && v2Resolution) {
      checkRecovery(entryInfo.v2MelodicInterval, v2Resolution, 'V2');
    }
  }

  // Check if resolution goes to consonance
  if (!nextSim.interval.isConsonant()) {
    // Special case: P4 might be treated as consonant
    if (nextSim.interval.class === 4 && !treatP4AsDissonant) {
      // P4 treated as consonant, ok
    } else {
      score -= 1.5;
      details.push(`Resolution to dissonance: -1.5`);
    }
  }

  return {
    score,
    details,
    motion,
    v1Resolution,
    v2Resolution,
  };
}

/**
 * Check for pattern matches and return bonus
 */
function checkPatterns(prevSim, currSim, nextSim, entryInfo, exitInfo) {
  const patterns = [];

  if (!prevSim || !nextSim || !entryInfo || !exitInfo) {
    return { bonus: 0, patterns: [] };
  }

  let bonus = 0;

  // SUSPENSION: Entry=Oblique+Strong, Exit=Step Down by the voice that held
  if (entryInfo.motion.type === 'oblique' && isStrongBeat(currSim.onset)) {
    // Check which voice held and which moved
    const heldVoice = !entryInfo.motion.v1Moved ? 1 : (!entryInfo.motion.v2Moved ? 2 : null);
    if (heldVoice) {
      const resolution = heldVoice === 1 ? exitInfo.v1Resolution : exitInfo.v2Resolution;
      if (resolution && resolution.magnitude.type === 'step' && resolution.direction < 0) {
        bonus += 1.5;
        patterns.push({ type: 'suspension', bonus: 1.5, description: 'Suspension (oblique entry, step down resolution)' });
      }
    }
  }

  // APPOGGIATURA: Entry=Leap/Skip+Strong, Exit=Step Opposite by the voice that leaped
  if (isStrongBeat(currSim.onset)) {
    // Check if V1 leaped in and steps out opposite
    if (entryInfo.v1MelodicInterval !== 0) {
      const entryMag = getIntervalMagnitude(entryInfo.v1MelodicInterval);
      if ((entryMag.type === 'skip' || entryMag.type === 'perfect_leap' || entryMag.type === 'large_leap') && exitInfo.v1Resolution) {
        const entryDir = Math.sign(entryInfo.v1MelodicInterval);
        if (exitInfo.v1Resolution.magnitude.type === 'step' && exitInfo.v1Resolution.direction === -entryDir) {
          bonus += 2.5;
          patterns.push({ type: 'appoggiatura', bonus: 2.5, voice: 1, description: 'Appoggiatura (V1 leaps in, steps out opposite)' });
        }
      }
    }
    // Check V2
    if (entryInfo.v2MelodicInterval !== 0 && !patterns.some(p => p.type === 'appoggiatura')) {
      const entryMag = getIntervalMagnitude(entryInfo.v2MelodicInterval);
      if ((entryMag.type === 'skip' || entryMag.type === 'perfect_leap' || entryMag.type === 'large_leap') && exitInfo.v2Resolution) {
        const entryDir = Math.sign(entryInfo.v2MelodicInterval);
        if (exitInfo.v2Resolution.magnitude.type === 'step' && exitInfo.v2Resolution.direction === -entryDir) {
          bonus += 2.5;
          patterns.push({ type: 'appoggiatura', bonus: 2.5, voice: 2, description: 'Appoggiatura (V2 leaps in, steps out opposite)' });
        }
      }
    }
  }

  // CAMBIATA: Entry=Step Down, Exit=Skip Down (3rd)
  // Check V1
  if (entryInfo.v1MelodicInterval < 0 && Math.abs(entryInfo.v1MelodicInterval) <= 2) {
    if (exitInfo.v1Resolution && exitInfo.v1Resolution.direction < 0 &&
        exitInfo.v1Resolution.interval >= 3 && exitInfo.v1Resolution.interval <= 4) {
      bonus += 1.5;
      patterns.push({ type: 'cambiata', bonus: 1.5, voice: 1, description: 'Cambiata (step down entry, skip down exit)' });
    }
  }
  // Check V2
  if (!patterns.some(p => p.type === 'cambiata') && entryInfo.v2MelodicInterval < 0 && Math.abs(entryInfo.v2MelodicInterval) <= 2) {
    if (exitInfo.v2Resolution && exitInfo.v2Resolution.direction < 0 &&
        exitInfo.v2Resolution.interval >= 3 && exitInfo.v2Resolution.interval <= 4) {
      bonus += 1.5;
      patterns.push({ type: 'cambiata', bonus: 1.5, voice: 2, description: 'Cambiata (step down entry, skip down exit)' });
    }
  }

  // ESCAPE TONE: Entry=Step, Exit=Skip/Leap Opposite
  // Check V1
  if (!patterns.length && entryInfo.v1MelodicInterval !== 0) {
    const entryMag = getIntervalMagnitude(entryInfo.v1MelodicInterval);
    if (entryMag.type === 'step' && exitInfo.v1Resolution) {
      const entryDir = Math.sign(entryInfo.v1MelodicInterval);
      if ((exitInfo.v1Resolution.magnitude.type === 'skip' || exitInfo.v1Resolution.magnitude.type === 'perfect_leap') &&
          exitInfo.v1Resolution.direction === -entryDir) {
        bonus += 0.5;
        patterns.push({ type: 'escape_tone', bonus: 0.5, voice: 1, description: 'Escape tone (step in, skip/leap out opposite)' });
      }
    }
  }
  // Check V2
  if (!patterns.some(p => p.type === 'escape_tone') && entryInfo.v2MelodicInterval !== 0) {
    const entryMag = getIntervalMagnitude(entryInfo.v2MelodicInterval);
    if (entryMag.type === 'step' && exitInfo.v2Resolution) {
      const entryDir = Math.sign(entryInfo.v2MelodicInterval);
      if ((exitInfo.v2Resolution.magnitude.type === 'skip' || exitInfo.v2Resolution.magnitude.type === 'perfect_leap') &&
          exitInfo.v2Resolution.direction === -entryDir) {
        bonus += 0.5;
        patterns.push({ type: 'escape_tone', bonus: 0.5, voice: 2, description: 'Escape tone (step in, skip/leap out opposite)' });
      }
    }
  }

  // PASSING TONE: Stepwise through in same direction (handled separately as it's weak beat)
  if (!isStrongBeat(currSim.onset) && !patterns.length) {
    // Check V1 passing
    if (entryInfo.v1MelodicInterval !== 0 && exitInfo.v1Resolution) {
      const entryMag = getIntervalMagnitude(entryInfo.v1MelodicInterval);
      const entryDir = Math.sign(entryInfo.v1MelodicInterval);
      if (entryMag.type === 'step' && exitInfo.v1Resolution.magnitude.type === 'step' &&
          exitInfo.v1Resolution.direction === entryDir) {
        patterns.push({ type: 'passing', bonus: 0, voice: 1, description: 'Passing tone (stepwise through)' });
      }
    }
    // Check V2 passing
    if (!patterns.some(p => p.type === 'passing') && entryInfo.v2MelodicInterval !== 0 && exitInfo.v2Resolution) {
      const entryMag = getIntervalMagnitude(entryInfo.v2MelodicInterval);
      const entryDir = Math.sign(entryInfo.v2MelodicInterval);
      if (entryMag.type === 'step' && exitInfo.v2Resolution.magnitude.type === 'step' &&
          exitInfo.v2Resolution.direction === entryDir) {
        patterns.push({ type: 'passing', bonus: 0, voice: 2, description: 'Passing tone (stepwise through)' });
      }
    }

    // NEIGHBOR TONE: Step out and back
    if (!patterns.length) {
      // Check V1
      if (entryInfo.v1MelodicInterval !== 0 && exitInfo.v1Resolution) {
        const entryMag = getIntervalMagnitude(entryInfo.v1MelodicInterval);
        const entryDir = Math.sign(entryInfo.v1MelodicInterval);
        if (entryMag.type === 'step' && exitInfo.v1Resolution.magnitude.type === 'step' &&
            exitInfo.v1Resolution.direction === -entryDir) {
          patterns.push({ type: 'neighbor', bonus: 0, voice: 1, description: 'Neighbor tone (step out and back)' });
        }
      }
      // Check V2
      if (!patterns.some(p => p.type === 'neighbor') && entryInfo.v2MelodicInterval !== 0 && exitInfo.v2Resolution) {
        const entryMag = getIntervalMagnitude(entryInfo.v2MelodicInterval);
        const entryDir = Math.sign(entryInfo.v2MelodicInterval);
        if (entryMag.type === 'step' && exitInfo.v2Resolution.magnitude.type === 'step' &&
            exitInfo.v2Resolution.direction === -entryDir) {
          patterns.push({ type: 'neighbor', bonus: 0, voice: 2, description: 'Neighbor tone (step out and back)' });
        }
      }
    }
  }

  // ANTICIPATION: Entry=Oblique+Weak, Exit=Oblique (same note repeated)
  if (entryInfo.motion.type === 'oblique' && !isStrongBeat(currSim.onset) && exitInfo.motion.type === 'oblique') {
    patterns.push({ type: 'anticipation', bonus: 0, description: 'Anticipation (oblique entry and exit on weak beat)' });
  }

  return { bonus, patterns };
}

/**
 * Score a consonance based on context
 * Tracks repetition and resolution quality
 */
function scoreConsonance(currSim, allSims, index, intervalHistory) {
  const intervalClass = currSim.interval.class;
  const details = [];
  let score = 0;
  let category = 'consonant_normal';

  // Track interval usage for repetition penalty
  const recentIntervals = intervalHistory.slice(-4); // Last 4 intervals
  const sameIntervalCount = recentIntervals.filter(ic => ic === intervalClass).length;

  // Repetition penalty: penalize if same interval class appears 3+ times in last 4
  if (sameIntervalCount >= 3) {
    score -= 0.5;
    category = 'consonant_repetitive';
    details.push(`Excessive repetition of ${intervalClass}ths: -0.5`);
  } else if (sameIntervalCount >= 2) {
    score -= 0.2;
    category = 'consonant_repetitive';
    details.push(`Repeated ${intervalClass}th: -0.2`);
  }

  // Check if this consonance resolves a preceding dissonance
  const prevSims = allSims.filter(s => s.onset < currSim.onset);
  const prevSim = prevSims.length > 0 ? prevSims[prevSims.length - 1] : null;

  if (prevSim && !prevSim.interval.isConsonant()) {
    // This consonance resolves a dissonance - check how well
    const motion = getMotionType(prevSim, currSim);

    // Check if resolution was by step (good) or leap (less good)
    let goodResolution = true;

    if (motion.v1Moved) {
      const interval = Math.abs(currSim.voice1Note.pitch - prevSim.voice1Note.pitch);
      if (interval > 2) {
        goodResolution = false;
        details.push('V1 resolved by leap');
      }
    }
    if (motion.v2Moved) {
      const interval = Math.abs(currSim.voice2Note.pitch - prevSim.voice2Note.pitch);
      if (interval > 2) {
        goodResolution = false;
        details.push('V2 resolved by leap');
      }
    }

    if (goodResolution) {
      score += 0.5;
      category = 'consonant_good_resolution';
      details.push('Good stepwise resolution: +0.5');
    } else {
      score -= 0.3;
      category = 'consonant_bad_resolution';
      details.push('Leap resolution: -0.3');
    }
  }

  // Bonus for imperfect consonances (3rds, 6ths) - more flexible
  if (intervalClass === 3 || intervalClass === 6) {
    if (category === 'consonant_normal') {
      details.push('Imperfect consonance (flexible)');
    }
  }

  // Slight caution for perfect consonances (unisons, 5ths, 8ves) on weak beats
  if ((intervalClass === 1 || intervalClass === 5 || intervalClass === 8) && !isStrongBeat(currSim.onset)) {
    // Perfect consonances on weak beats can feel static
    if (category === 'consonant_normal' && sameIntervalCount === 0) {
      details.push('Perfect consonance on weak beat');
    }
  }

  return {
    type: 'consonant',
    category,
    score,
    label: intervalClass === 1 ? 'U' : intervalClass === 8 ? '8' : intervalClass.toString(),
    isConsonant: true,
    intervalClass,
    details,
    resolvesDissonance: prevSim && !prevSim.interval.isConsonant(),
  };
}

/**
 * Main scoring function for a dissonance
 * Analyzes the C → D → C chain and returns comprehensive score
 */
export function scoreDissonance(currSim, allSims, index = -1, intervalHistory = []) {
  // Find previous and next simultaneities
  const prevSims = allSims.filter(s => s.onset < currSim.onset);
  const nextSims = allSims.filter(s => s.onset > currSim.onset);
  const prevSim = prevSims.length > 0 ? prevSims[prevSims.length - 1] : null;
  const nextSim = nextSims.length > 0 ? nextSims[0] : null;

  // Check if this is actually a dissonance
  let isDissonant = !currSim.interval.isConsonant();

  // P4 special handling
  if (currSim.interval.class === 4) {
    if (treatP4AsDissonant) {
      isDissonant = true;
    } else {
      isDissonant = false;
    }
  }

  if (!isDissonant) {
    // Score as consonance with context
    return scoreConsonance(currSim, allSims, index, intervalHistory);
  }

  // Score entry
  const entryInfo = scoreEntry(prevSim, currSim);

  // Score exit
  const exitInfo = scoreExit(currSim, nextSim, entryInfo);

  // Check patterns
  const patternInfo = checkPatterns(prevSim, currSim, nextSim, entryInfo, exitInfo);

  // Calculate total score
  const totalScore = entryInfo.score + exitInfo.score + patternInfo.bonus;

  // Determine type label and semantic category
  let type = 'unprepared';
  let label = '!';
  let category = 'dissonant_bad';

  if (totalScore >= 1.0) {
    category = 'dissonant_good';
  } else if (totalScore >= -0.5) {
    category = 'dissonant_marginal';
  }

  if (patternInfo.patterns.length > 0) {
    const mainPattern = patternInfo.patterns[0];
    type = mainPattern.type;
    switch (type) {
      case 'suspension': label = 'Sus'; break;
      case 'appoggiatura': label = 'App'; break;
      case 'passing': label = 'PT'; break;
      case 'neighbor': label = 'N'; break;
      case 'cambiata': label = 'Cam'; break;
      case 'escape_tone': label = 'Esc'; break;
      case 'anticipation': label = 'Ant'; break;
    }
  }

  // Build description
  const v1Pitch = pitchName(currSim.voice1Note.pitch);
  const v2Pitch = pitchName(currSim.voice2Note.pitch);
  let description = `${currSim.interval}: ${v1Pitch} vs ${v2Pitch}`;

  if (patternInfo.patterns.length > 0) {
    description += ` — ${patternInfo.patterns[0].description}`;
  }

  return {
    type,
    category,
    score: totalScore,
    label,
    isConsonant: false,
    interval: currSim.interval.toString(),
    intervalClass: currSim.interval.class,
    v1Pitch,
    v2Pitch,
    onset: currSim.onset,
    isStrongBeat: isStrongBeat(currSim.onset),
    entry: entryInfo,
    exit: exitInfo,
    patterns: patternInfo.patterns,
    description,
    details: [
      `Entry: ${entryInfo.score.toFixed(1)} (${entryInfo.details.join(', ')})`,
      `Exit: ${exitInfo.score.toFixed(1)} (${exitInfo.details.join(', ')})`,
      patternInfo.patterns.length > 0 ? `Pattern: ${patternInfo.patterns.map(p => `${p.type} +${p.bonus}`).join(', ')}` : 'No pattern match',
      `Total: ${totalScore.toFixed(1)}`,
    ],
  };
}

/**
 * Analyze all intervals in a passage with context tracking
 */
export function analyzeAllDissonances(sims) {
  const results = [];
  const intervalHistory = []; // Track interval classes for repetition detection

  for (let i = 0; i < sims.length; i++) {
    const sim = sims[i];
    const scoring = scoreDissonance(sim, sims, i, intervalHistory);
    results.push({
      onset: sim.onset,
      ...scoring,
    });

    // Track interval history
    intervalHistory.push(sim.interval.class);
  }

  // Calculate summary statistics
  const consonances = results.filter(r => r.isConsonant);
  const dissonances = results.filter(r => !r.isConsonant);
  const goodDissonances = dissonances.filter(r => r.score >= 0);
  const badDissonances = dissonances.filter(r => r.score < 0);
  const repetitiveConsonances = consonances.filter(r => r.category === 'consonant_repetitive');

  const typeCounts = {};
  for (const d of dissonances) {
    typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
  }

  return {
    all: results,
    consonances,
    dissonances,
    summary: {
      totalIntervals: results.length,
      totalConsonances: consonances.length,
      totalDissonances: dissonances.length,
      repetitiveConsonances: repetitiveConsonances.length,
      goodCount: goodDissonances.length,
      badCount: badDissonances.length,
      averageScore: dissonances.length > 0
        ? dissonances.reduce((sum, d) => sum + d.score, 0) / dissonances.length
        : 0,
      typeCounts,
    },
  };
}
