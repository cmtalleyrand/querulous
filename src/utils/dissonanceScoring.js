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
let treatP4AsDissonant = false; // Toggle for P4 treatment (forces all P4s as dissonant)
let currentMeter = [4, 4]; // Default meter, can be updated
let sequenceNoteRanges = []; // Ranges of note indices that are part of sequences (for penalty mitigation)

export function setP4Treatment(dissonant) {
  treatP4AsDissonant = dissonant;
}

export function getP4Treatment() {
  return treatP4AsDissonant;
}

/**
 * Check if P4 should be treated as dissonant based on voice positions
 * P4 is dissonant when the lower note is the bass (lowest voice)
 * P4 is consonant between upper voices
 * @param {Simultaneity} sim - The simultaneity to check
 * @returns {boolean} - Whether this P4 should be treated as dissonant
 */
function isP4DissonantInContext(sim) {
  // If user forced all P4s as dissonant, respect that
  if (treatP4AsDissonant) return true;

  // In two-voice counterpoint, the lower voice IS the bass
  // So P4 against the lower voice is dissonant
  // This is the traditional rule: P4 sounding against the bass is dissonant
  return true; // In 2-voice texture, P4 is generally treated as dissonant
}

export function setMeter(meter) {
  currentMeter = meter;
}

export function getMeter() {
  return currentMeter;
}

/**
 * Set the sequence note ranges for leap penalty mitigation
 * @param {Array} ranges - Array of {start, end} objects indicating note indices in sequences
 */
export function setSequenceRanges(ranges) {
  sequenceNoteRanges = ranges || [];
}

export function getSequenceRanges() {
  return sequenceNoteRanges;
}

/**
 * Check if a note index is within a sequence
 * @param {number} noteIndex - The index of the note in the voice
 * @returns {boolean} - True if the note is part of a detected sequence
 */
export function isNoteInSequence(noteIndex) {
  for (const range of sequenceNoteRanges) {
    if (noteIndex >= range.start && noteIndex <= range.end) {
      return true;
    }
  }
  return false;
}

// Store sequence beat ranges (onset-based) for checking by time
let sequenceBeatRanges = [];

/**
 * Set sequence beat ranges (by onset time)
 * @param {Array} ranges - Array of {startBeat, endBeat} objects
 */
export function setSequenceBeatRanges(ranges) {
  sequenceBeatRanges = ranges || [];
}

/**
 * Check if an onset time falls within a sequence
 * @param {number} onset - The onset time to check
 * @returns {boolean} - True if the onset is during a melodic sequence
 */
export function isOnsetInSequence(onset) {
  for (const range of sequenceBeatRanges) {
    if (onset >= range.startBeat && onset <= range.endBeat) {
      return true;
    }
  }
  return false;
}

/**
 * Classify interval magnitude
 */
function getIntervalMagnitude(semitones) {
  const abs = Math.abs(semitones);
  if (abs === 0) return { type: 'unison', semitones: abs };
  if (abs <= 2) return { type: 'step', semitones: abs };
  if (abs <= 4) return { type: 'skip', semitones: abs }; // m3, M3 (3-4 semitones)
  if (abs === 5 || abs === 7) return { type: 'perfect_leap', semitones: abs }; // P4, P5
  if (abs === 12) return { type: 'octave', semitones: abs }; // P8
  return { type: 'large_leap', semitones: abs }; // 6th+ (excluding octave)
}

/**
 * Calculate resolution penalty based on entry leap type and resolution type
 * User specification:
 * - Skip (m3/M3, 3-4 st) entered: -0.5 if resolved by skip, -1 if P4/P5, -2 otherwise
 * - P4/P5 entered: -1 if opposite skip, -1.5 if opposite P4/P5 or same-dir skip, -2 otherwise
 *
 * SEQUENCE MITIGATION: If the leap is part of a detected melodic sequence,
 * the penalty is reduced by 75% (mitigating the "size and direction" penalties).
 * Sequences are structured repetitions that justify unusual leaps.
 *
 * @param {number} entryInterval - Entry interval in semitones
 * @param {number} exitInterval - Exit interval in semitones
 * @param {number} exitDirection - Direction of exit (positive = up, negative = down)
 * @param {number} entryDirection - Direction of entry
 * @param {boolean} inSequence - Whether this leap is part of a melodic sequence
 */
function calculateResolutionPenalty(entryInterval, exitInterval, exitDirection, entryDirection, inSequence = false) {
  const entryMag = getIntervalMagnitude(entryInterval);
  const exitMag = getIntervalMagnitude(exitInterval);
  const sameDirection = (entryDirection !== 0 && exitDirection !== 0 && Math.sign(entryDirection) === Math.sign(exitDirection));
  const oppositeDirection = (entryDirection !== 0 && exitDirection !== 0 && Math.sign(entryDirection) !== Math.sign(exitDirection));

  // Step resolution is always fine
  if (exitMag.type === 'step') return { penalty: 0, reason: 'step resolution', inSequence };

  // Unison/held note
  if (exitMag.type === 'unison') return { penalty: 0, reason: 'no movement', inSequence };

  let basePenalty = 0;
  let reason = '';

  // Skip entry (m3/M3, 3-4 semitones)
  if (entryMag.type === 'skip') {
    if (exitMag.type === 'skip') {
      basePenalty = -0.5;
      reason = 'skip resolved by skip';
    } else if (exitMag.type === 'perfect_leap') {
      basePenalty = -1.0;
      reason = 'skip resolved by P4/P5';
    } else {
      // Large leap or octave
      basePenalty = -2.0;
      reason = 'skip resolved by large leap';
    }
  }
  // Perfect leap entry (P4/P5)
  else if (entryMag.type === 'perfect_leap') {
    if (exitMag.type === 'skip' && oppositeDirection) {
      basePenalty = -1.0;
      reason = 'P4/P5 resolved by opposite skip';
    } else if (exitMag.type === 'perfect_leap' && oppositeDirection) {
      basePenalty = -1.5;
      reason = 'P4/P5 resolved by opposite P4/P5';
    } else if (exitMag.type === 'skip' && sameDirection) {
      basePenalty = -1.5;
      reason = 'P4/P5 resolved by same-direction skip';
    } else {
      // Any other resolution
      basePenalty = -2.0;
      reason = 'P4/P5 poorly resolved';
    }
  }
  // Large leap entry (6th, 7th, etc.)
  else if (entryMag.type === 'large_leap' || entryMag.type === 'octave') {
    if (exitMag.type === 'step') {
      return { penalty: 0, reason: 'large leap resolved by step', inSequence };
    }
    if (exitMag.type === 'skip' && oppositeDirection) {
      basePenalty = -1.5;
      reason = 'large leap resolved by opposite skip';
    } else {
      basePenalty = -2.5;
      reason = 'large leap poorly resolved';
    }
  }

  // Apply sequence mitigation: reduce penalty by 75% if in a sequence
  if (inSequence && basePenalty < 0) {
    const mitigatedPenalty = basePenalty * 0.25; // Keep only 25% of penalty
    return {
      penalty: mitigatedPenalty,
      reason: reason + ' (mitigated: in sequence)',
      inSequence: true,
      originalPenalty: basePenalty,
    };
  }

  return { penalty: basePenalty, reason, inSequence: false };
}

/**
 * Determine motion type between two simultaneities
 * Returns: 'oblique', 'contrary', 'similar', 'similar_step', 'similar_same_type', 'parallel'
 *
 * Similar motion subtypes:
 * - similar_step: One or both voices move by step (most acceptable)
 * - similar_same_type: Both move by same interval type but different size (less acceptable)
 * - similar: Different interval types (acceptable)
 * - parallel: Same interval size (least acceptable - parallel 5ths/8ves forbidden)
 */
function getMotionType(prevSim, currSim) {
  if (!prevSim) return { type: 'unknown', v1Moved: true, v2Moved: true, v1Interval: 0, v2Interval: 0 };

  const v1Moved = currSim.voice1Note !== prevSim.voice1Note &&
                  currSim.voice1Note.pitch !== prevSim.voice1Note.pitch;
  const v2Moved = currSim.voice2Note !== prevSim.voice2Note &&
                  currSim.voice2Note.pitch !== prevSim.voice2Note.pitch;

  const v1Interval = v1Moved ? Math.abs(currSim.voice1Note.pitch - prevSim.voice1Note.pitch) : 0;
  const v2Interval = v2Moved ? Math.abs(currSim.voice2Note.pitch - prevSim.voice2Note.pitch) : 0;

  if (!v1Moved && !v2Moved) {
    return { type: 'static', v1Moved: false, v2Moved: false, v1Interval: 0, v2Interval: 0 };
  }

  if (!v1Moved || !v2Moved) {
    return { type: 'oblique', v1Moved, v2Moved, v1Interval, v2Interval };
  }

  const v1Dir = Math.sign(currSim.voice1Note.pitch - prevSim.voice1Note.pitch);
  const v2Dir = Math.sign(currSim.voice2Note.pitch - prevSim.voice2Note.pitch);

  if (v1Dir === -v2Dir) {
    return { type: 'contrary', v1Moved: true, v2Moved: true, v1Interval, v2Interval };
  }

  // Similar motion - determine subtype based on interval characteristics
  // Parallel: same interval size
  if (v1Interval === v2Interval) {
    return { type: 'parallel', v1Moved: true, v2Moved: true, v1Interval, v2Interval };
  }

  // Check if either voice moves by step (1-2 semitones)
  const v1IsStep = v1Interval <= 2;
  const v2IsStep = v2Interval <= 2;

  if (v1IsStep || v2IsStep) {
    return { type: 'similar_step', v1Moved: true, v2Moved: true, v1Interval, v2Interval };
  }

  // Check if both voices move by same interval type (skip, perfect_leap, large_leap)
  const v1Mag = getIntervalMagnitude(v1Interval);
  const v2Mag = getIntervalMagnitude(v2Interval);

  if (v1Mag.type === v2Mag.type) {
    return { type: 'similar_same_type', v1Moved: true, v2Moved: true, v1Interval, v2Interval, intervalType: v1Mag.type };
  }

  // Different interval types
  return { type: 'similar', v1Moved: true, v2Moved: true, v1Interval, v2Interval };
}

/**
 * Check if this is a strong beat (weight >= 0.75)
 */
function isStrongBeat(onset) {
  return metricWeight(onset, currentMeter) >= 0.75;
}

/**
 * Calculate rest context between two simultaneities
 * A "phantom note" extends for duration/2 beats after the note ends
 * @returns Object with rest analysis for entry and exit
 */
function analyzeRestContext(prevSim, currSim, nextSim) {
  const result = {
    entryFromRest: { v1: false, v2: false, v1RestDuration: 0, v2RestDuration: 0 },
    exitToRest: { v1: false, v2: false, v1RestDuration: 0, v2RestDuration: 0 },
    resolvedByAbandonment: false,
  };

  if (prevSim) {
    // Check if there was a rest before current simultaneity
    const v1PrevEnd = prevSim.voice1Note.onset + prevSim.voice1Note.duration;
    const v2PrevEnd = prevSim.voice2Note.onset + prevSim.voice2Note.duration;

    // If note ended before current onset, there was a rest
    if (v1PrevEnd < currSim.onset - 0.01) {
      result.entryFromRest.v1 = true;
      result.entryFromRest.v1RestDuration = currSim.onset - v1PrevEnd;
    }
    if (v2PrevEnd < currSim.onset - 0.01) {
      result.entryFromRest.v2 = true;
      result.entryFromRest.v2RestDuration = currSim.onset - v2PrevEnd;
    }
  }

  if (nextSim) {
    // Check if there's a rest between current and next simultaneity
    const v1CurrEnd = currSim.voice1Note.onset + currSim.voice1Note.duration;
    const v2CurrEnd = currSim.voice2Note.onset + currSim.voice2Note.duration;

    if (v1CurrEnd < nextSim.onset - 0.01) {
      result.exitToRest.v1 = true;
      result.exitToRest.v1RestDuration = nextSim.onset - v1CurrEnd;
    }
    if (v2CurrEnd < nextSim.onset - 0.01) {
      result.exitToRest.v2 = true;
      result.exitToRest.v2RestDuration = nextSim.onset - v2CurrEnd;
    }

    // Check if one voice "abandons" the other (drops out while dissonance holds)
    // Voice 1 abandons if it ends while voice 2 is still sounding
    const v1AbandonedV2 = v1CurrEnd < v2CurrEnd - 0.01 && v1CurrEnd < nextSim.onset - 0.01;
    const v2AbandonedV1 = v2CurrEnd < v1CurrEnd - 0.01 && v2CurrEnd < nextSim.onset - 0.01;
    result.resolvedByAbandonment = v1AbandonedV2 || v2AbandonedV1;
  } else {
    // No next simultaneity - check if notes extend to end
    const v1CurrEnd = currSim.voice1Note.onset + currSim.voice1Note.duration;
    const v2CurrEnd = currSim.voice2Note.onset + currSim.voice2Note.duration;
    // If one voice ends significantly before the other
    if (Math.abs(v1CurrEnd - v2CurrEnd) > 0.1) {
      result.resolvedByAbandonment = true;
    }
  }

  return result;
}

/**
 * Check if entry is from a "fresh start" (rest longer than note duration)
 * In this case, motion bonuses/penalties should be reduced
 */
function getEntryRestModifier(restContext, currSim) {
  let modifier = 1.0; // Default: full motion scoring

  if (restContext.entryFromRest.v1) {
    const noteDur = currSim.voice1Note.duration;
    if (restContext.entryFromRest.v1RestDuration > noteDur) {
      modifier *= 0.5; // Halve if rest was longer than note
    }
  }
  if (restContext.entryFromRest.v2) {
    const noteDur = currSim.voice2Note.duration;
    if (restContext.entryFromRest.v2RestDuration > noteDur) {
      modifier *= 0.5;
    }
  }

  return modifier;
}

/**
 * Score the entry into a dissonance (C → D)
 * Entry penalties are now deferred to be calculated based on how the leap is resolved
 * Rest handling: If entering from a rest longer than the note duration, motion bonuses/penalties are halved
 */
function scoreEntry(prevSim, currSim, restContext = null) {
  let score = 0; // Base
  const details = [];

  if (!prevSim) {
    return { score: 0, details: ['No previous simultaneity'], motion: null, v1MelodicInterval: 0, v2MelodicInterval: 0, restModifier: 1.0 };
  }

  const motion = getMotionType(prevSim, currSim);

  // Calculate rest modifier if context provided
  const restModifier = restContext ? getEntryRestModifier(restContext, currSim) : 1.0;
  const restNote = restModifier < 1.0 ? ' (reduced: entry from rest)' : '';

  // Motion modifier - apply rest modifier
  // Penalties for similar motion based on subtype:
  // - similar_step or similar (different interval types): -0.5
  // - similar_same_type (same interval type, different size): -1.0
  // - parallel (same interval size): -1.5
  if (motion.type === 'oblique') {
    const adj = 0.5 * restModifier;
    score += adj;
    details.push(`Oblique motion: +${adj.toFixed(2)}${restNote}`);
  } else if (motion.type === 'contrary') {
    const adj = 0.5 * restModifier;
    score += adj;
    details.push(`Contrary motion: +${adj.toFixed(2)}${restNote}`);
  } else if (motion.type === 'parallel') {
    const adj = -1.5 * restModifier;
    score += adj;
    details.push(`Parallel motion: ${adj.toFixed(2)}${restNote}`);
  } else if (motion.type === 'similar_same_type') {
    const adj = -1.0 * restModifier;
    score += adj;
    details.push(`Similar motion (same interval type): ${adj.toFixed(2)}${restNote}`);
  } else if (motion.type === 'similar_step' || motion.type === 'similar') {
    const adj = -0.5 * restModifier;
    score += adj;
    details.push(`Similar motion (step/different types): ${adj.toFixed(2)}${restNote}`);
  }

  // Record entry intervals for resolution penalty calculation (penalties applied in scoreExit)
  const v1MelodicInterval = motion.v1Moved ? currSim.voice1Note.pitch - prevSim.voice1Note.pitch : 0;
  const v2MelodicInterval = motion.v2Moved ? currSim.voice2Note.pitch - prevSim.voice2Note.pitch : 0;

  // Note entry leap types for reference
  if (motion.v1Moved) {
    const mag = getIntervalMagnitude(v1MelodicInterval);
    if (mag.type !== 'step' && mag.type !== 'unison') {
      details.push(`V1 entry: ${mag.type} (${Math.abs(v1MelodicInterval)} st)`);
    }
  }
  if (motion.v2Moved) {
    const mag = getIntervalMagnitude(v2MelodicInterval);
    if (mag.type !== 'step' && mag.type !== 'unison') {
      details.push(`V2 entry: ${mag.type} (${Math.abs(v2MelodicInterval)} st)`);
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
    v1MelodicInterval,
    v2MelodicInterval,
    restModifier,
  };
}

/**
 * Score the exit from a dissonance (D → ?)
 * Now uses proportional penalties based on entry leap size and resolution type
 * Penalties are mitigated if the melodic motion is part of a sequence
 * Rest handling: -0.5 penalty if resolved by abandonment (one voice drops out)
 */
function scoreExit(currSim, nextSim, entryInfo, restContext = null) {
  if (!nextSim) {
    return { score: -1.0, details: ['Unresolved (no following note)'], motion: null, v1Resolution: null, v2Resolution: null, resolvedByAbandonment: false };
  }

  // Check if this is actually a resolution (D → C) or just movement (D → D)
  const isConsonant = nextSim.interval.isConsonant() ||
    (nextSim.interval.class === 4 && !treatP4AsDissonant); // P4 can be consonant

  // Differentiate between perfect and imperfect consonance resolution
  // Perfect consonances: unison (1), P5 (5), P8 (8)
  // Imperfect consonances: 3rd (3), 6th (6)
  const nextIntervalClass = nextSim.interval.class;
  const isPerfectConsonance = isConsonant && (nextIntervalClass === 1 || nextIntervalClass === 5 || nextIntervalClass === 8);
  const isImperfectConsonance = isConsonant && (nextIntervalClass === 3 || nextIntervalClass === 6);

  let score;
  const details = [];

  if (isImperfectConsonance) {
    score = 1.0;
    details.push('Resolves to imperfect consonance: +1.0');
  } else if (isPerfectConsonance) {
    score = 0.5;
    details.push('Resolves to perfect consonance: +0.5');
  } else if (isConsonant) {
    // Other consonances (P4 treated as consonant in some contexts)
    score = 0.5;
    details.push('Resolves to consonance: +0.5');
  } else {
    // Resolution to another dissonance
    score = -1.5;
    details.push('Leads to another dissonance (no resolution): -1.5');
  }

  // Check for resolution by abandonment (one voice drops out)
  if (restContext && restContext.resolvedByAbandonment) {
    score -= 0.5;
    details.push('Resolved by abandonment (voice dropped out): -0.5');
  }

  // Check for phantom note situation: if there's a long rest before resolution,
  // the "resolution" is delayed and less meaningful
  if (restContext) {
    const v1RestDur = restContext.exitToRest.v1RestDuration || 0;
    const v2RestDur = restContext.exitToRest.v2RestDuration || 0;
    const v1PhantomLimit = currSim.voice1Note.duration / 2;
    const v2PhantomLimit = currSim.voice2Note.duration / 2;

    // If rest exceeds phantom note duration, resolution is "distant"
    if (v1RestDur > v1PhantomLimit || v2RestDur > v2PhantomLimit) {
      score -= 0.3;
      details.push('Delayed resolution (rest exceeds phantom duration): -0.3');
    }
  }

  const motion = getMotionType(currSim, nextSim);

  // Check if either voice's motion is part of a sequence (by onset time)
  const v1InSequence = isOnsetInSequence(currSim.onset);
  const v2InSequence = isOnsetInSequence(currSim.onset);

  // Resolution modifier - check how each voice resolves with proportional penalties
  let v1Resolution = null;
  let v2Resolution = null;

  if (motion.v1Moved) {
    const exitInterval = nextSim.voice1Note.pitch - currSim.voice1Note.pitch;
    const exitMag = getIntervalMagnitude(exitInterval);
    v1Resolution = {
      interval: Math.abs(exitInterval),
      direction: Math.sign(exitInterval),
      magnitude: exitMag,
      inSequence: v1InSequence,
    };

    // Calculate proportional penalty based on how entry leap is resolved
    if (entryInfo && entryInfo.v1MelodicInterval !== 0) {
      const entryDir = Math.sign(entryInfo.v1MelodicInterval);
      const entryMag = getIntervalMagnitude(entryInfo.v1MelodicInterval);
      const penaltyInfo = calculateResolutionPenalty(
        Math.abs(entryInfo.v1MelodicInterval),
        Math.abs(exitInterval),
        v1Resolution.direction,
        entryDir,
        v1InSequence
      );
      if (penaltyInfo.penalty !== 0) {
        score += penaltyInfo.penalty;
        details.push(`V1 ${penaltyInfo.reason}: ${penaltyInfo.penalty.toFixed(2)}`);
      }

      // Leap continuation penalty: large leaps (but not skips) should be followed by opposite direction
      // Applies to perfect_leap (P4/P5) and large_leap (6th+), not skip (3rd)
      if ((entryMag.type === 'perfect_leap' || entryMag.type === 'large_leap' || entryMag.type === 'octave') &&
          v1Resolution.direction !== 0 && v1Resolution.direction === entryDir) {
        score -= 0.25;
        details.push('V1 leap not followed by opposite motion: -0.25');
      }
    } else if (exitMag.type !== 'step' && exitMag.type !== 'unison') {
      // No entry leap but exit is a leap - apply standard penalties (with sequence mitigation)
      let penalty = 0;
      let reason = '';
      if (exitMag.type === 'skip') {
        penalty = -0.5;
        reason = 'V1 skip resolution';
      } else if (exitMag.type === 'perfect_leap') {
        penalty = -0.5;
        reason = 'V1 P4/P5 resolution';
      } else {
        penalty = -1.5;
        reason = 'V1 large leap resolution';
      }
      // Apply sequence mitigation
      if (v1InSequence) {
        penalty *= 0.25;
        reason += ' (mitigated: in sequence)';
      }
      score += penalty;
      details.push(`${reason}: ${penalty.toFixed(2)}`);
    }
  }

  if (motion.v2Moved) {
    const exitInterval = nextSim.voice2Note.pitch - currSim.voice2Note.pitch;
    const exitMag = getIntervalMagnitude(exitInterval);
    v2Resolution = {
      interval: Math.abs(exitInterval),
      direction: Math.sign(exitInterval),
      magnitude: exitMag,
      inSequence: v2InSequence,
    };

    // Calculate proportional penalty based on how entry leap is resolved
    if (entryInfo && entryInfo.v2MelodicInterval !== 0) {
      const entryDir = Math.sign(entryInfo.v2MelodicInterval);
      const entryMag = getIntervalMagnitude(entryInfo.v2MelodicInterval);
      const penaltyInfo = calculateResolutionPenalty(
        Math.abs(entryInfo.v2MelodicInterval),
        Math.abs(exitInterval),
        v2Resolution.direction,
        entryDir,
        v2InSequence
      );
      if (penaltyInfo.penalty !== 0) {
        score += penaltyInfo.penalty;
        details.push(`V2 ${penaltyInfo.reason}: ${penaltyInfo.penalty.toFixed(2)}`);
      }

      // Leap continuation penalty: large leaps (but not skips) should be followed by opposite direction
      if ((entryMag.type === 'perfect_leap' || entryMag.type === 'large_leap' || entryMag.type === 'octave') &&
          v2Resolution.direction !== 0 && v2Resolution.direction === entryDir) {
        score -= 0.25;
        details.push('V2 leap not followed by opposite motion: -0.25');
      }
    } else if (exitMag.type !== 'step' && exitMag.type !== 'unison') {
      // No entry leap but exit is a leap - apply standard penalties (with sequence mitigation)
      let penalty = 0;
      let reason = '';
      if (exitMag.type === 'skip') {
        penalty = -0.5;
        reason = 'V2 skip resolution';
      } else if (exitMag.type === 'perfect_leap') {
        penalty = -0.5;
        reason = 'V2 P4/P5 resolution';
      } else {
        penalty = -1.5;
        reason = 'V2 large leap resolution';
      }
      // Apply sequence mitigation
      if (v2InSequence) {
        penalty *= 0.25;
        reason += ' (mitigated: in sequence)';
      }
      score += penalty;
      details.push(`${reason}: ${penalty.toFixed(2)}`);
    }
  }

  // Already handled at function start - no redundant check needed

  return {
    score,
    details,
    motion,
    v1Resolution,
    v2Resolution,
    resolvedByAbandonment: restContext?.resolvedByAbandonment || false,
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

  // CAMBIATA (NOTA CAMBIATA) DETECTION
  // Traditional cambiata: 5-note figure where the 2nd note is dissonant
  // Pattern: consonance → step down to dissonance → skip down 3rd → step up → resolution
  // We detect at the dissonance point (note 2 of 5):
  //   - Entry: step down from consonance
  //   - Exit: skip down a third (m3 or M3, 3-4 semitones)
  //   - Typically on weak beat
  //
  // Variants:
  //   - cambiata_proper: Traditional form (step down, skip down 3rd) on weak beat
  //   - cambiata_inverted: Inverted form (step up, skip up 3rd)
  //   - cambiata_simple: Core pattern on strong beat (less traditional)

  // Helper to check cambiata for a voice
  const checkCambiataForVoice = (voice, melodicInterval, resolution) => {
    if (!resolution) return null;

    const entryIsStep = Math.abs(melodicInterval) > 0 && Math.abs(melodicInterval) <= 2;
    const exitIsSkip = resolution.interval >= 3 && resolution.interval <= 4;
    const sameDirection = Math.sign(melodicInterval) === resolution.direction;

    if (!entryIsStep || !exitIsSkip || !sameDirection) return null;

    const isDescending = melodicInterval < 0;
    const isWeakBeat = !isStrongBeat(currSim.onset);

    if (isDescending && isWeakBeat) {
      // Traditional cambiata: step down, skip down, weak beat
      return {
        type: 'cambiata_proper',
        bonus: 1.5,
        voice,
        label: 'Cam',
        description: 'Cambiata (step down → skip down 3rd, weak beat)',
      };
    } else if (!isDescending && isWeakBeat) {
      // Inverted cambiata: step up, skip up, weak beat
      return {
        type: 'cambiata_inverted',
        bonus: 1.0,
        voice,
        label: 'Cam↑',
        description: 'Inverted cambiata (step up → skip up 3rd)',
      };
    } else if (isDescending) {
      // Cambiata-like on strong beat (less idiomatic)
      return {
        type: 'cambiata_strong',
        bonus: 0.5,
        voice,
        label: 'Cam?',
        description: 'Cambiata figure on strong beat (non-traditional)',
      };
    } else {
      // Inverted on strong beat
      return {
        type: 'cambiata_inverted_strong',
        bonus: 0.5,
        voice,
        label: 'Cam↑?',
        description: 'Inverted cambiata on strong beat (non-traditional)',
      };
    }
  };

  // Check V1 for cambiata
  const v1Cambiata = checkCambiataForVoice(1, entryInfo.v1MelodicInterval, exitInfo.v1Resolution);
  if (v1Cambiata) {
    bonus += v1Cambiata.bonus;
    patterns.push(v1Cambiata);
  }

  // Check V2 for cambiata (only if V1 didn't match)
  if (!v1Cambiata) {
    const v2Cambiata = checkCambiataForVoice(2, entryInfo.v2MelodicInterval, exitInfo.v2Resolution);
    if (v2Cambiata) {
      bonus += v2Cambiata.bonus;
      patterns.push(v2Cambiata);
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
  const v1Pitch = pitchName(currSim.voice1Note.pitch);
  const v2Pitch = pitchName(currSim.voice2Note.pitch);
  const intervalName = currSim.interval.toString();
  const details = [];
  let score = 0;
  let category = 'consonant_normal';

  // Check for CONSECUTIVE same intervals (not just frequency)
  const isPerfect = intervalClass === 1 || intervalClass === 5 || intervalClass === 8;
  const isThird = intervalClass === 3;
  const isSixth = intervalClass === 6;

  // Count consecutive same interval class at end of history
  let consecutiveCount = 0;
  for (let i = intervalHistory.length - 1; i >= 0; i--) {
    if (intervalHistory[i] === intervalClass) {
      consecutiveCount++;
    } else {
      break;
    }
  }

  // Repetition penalties:
  // - 2+ consecutive perfect intervals (unison, 5th, octave) = penalty
  // - 3+ consecutive 3rds = penalty
  // - 3+ consecutive 6ths = penalty
  if (isPerfect && consecutiveCount >= 1) {
    // This would be the 2nd consecutive perfect
    score -= 0.5;
    category = 'consonant_repetitive';
    const intervalNames = { 1: 'unisons', 5: '5ths', 8: 'octaves' };
    details.push({
      text: `2nd consecutive ${intervalNames[intervalClass] || 'perfect interval'} (${v1Pitch}-${v2Pitch})`,
      impact: -0.5,
      type: 'penalty',
    });
  } else if ((isThird || isSixth) && consecutiveCount >= 2) {
    // This would be the 3rd consecutive 3rd or 6th
    score -= 0.3;
    category = 'consonant_repetitive';
    details.push({
      text: `3rd consecutive ${intervalClass}th (${v1Pitch}-${v2Pitch})`,
      impact: -0.3,
      type: 'penalty',
    });
  }

  // Check if this consonance resolves a preceding dissonance
  const prevSims = allSims.filter(s => s.onset < currSim.onset);
  const prevSim = prevSims.length > 0 ? prevSims[prevSims.length - 1] : null;

  if (prevSim && !prevSim.interval.isConsonant()) {
    const prevV1 = pitchName(prevSim.voice1Note.pitch);
    const prevV2 = pitchName(prevSim.voice2Note.pitch);
    const prevInterval = prevSim.interval.toString();
    const motion = getMotionType(prevSim, currSim);

    // Check resolution quality
    let goodResolution = true;
    const resolutionDetails = [];

    if (motion.v1Moved) {
      const semitones = Math.abs(currSim.voice1Note.pitch - prevSim.voice1Note.pitch);
      const direction = currSim.voice1Note.pitch > prevSim.voice1Note.pitch ? 'up' : 'down';
      if (semitones > 2) {
        goodResolution = false;
        resolutionDetails.push(`Voice 1 leapt ${semitones} semitones ${direction} (${prevV1}→${v1Pitch})`);
      } else {
        resolutionDetails.push(`Voice 1 stepped ${direction} (${prevV1}→${v1Pitch})`);
      }
    } else {
      resolutionDetails.push(`Voice 1 held (${v1Pitch})`);
    }

    if (motion.v2Moved) {
      const semitones = Math.abs(currSim.voice2Note.pitch - prevSim.voice2Note.pitch);
      const direction = currSim.voice2Note.pitch > prevSim.voice2Note.pitch ? 'up' : 'down';
      if (semitones > 2) {
        goodResolution = false;
        resolutionDetails.push(`Voice 2 leapt ${semitones} semitones ${direction} (${prevV2}→${v2Pitch})`);
      } else {
        resolutionDetails.push(`Voice 2 stepped ${direction} (${prevV2}→${v2Pitch})`);
      }
    } else {
      resolutionDetails.push(`Voice 2 held (${v2Pitch})`);
    }

    if (goodResolution) {
      score += 0.5;
      category = 'consonant_good_resolution';
      details.push({
        text: `Good resolution: ${prevInterval} (${prevV1}/${prevV2}) → ${intervalName} (${v1Pitch}/${v2Pitch})`,
        subtext: resolutionDetails.join('; '),
        impact: +0.5,
        type: 'bonus',
      });
    } else {
      score -= 0.3;
      category = 'consonant_bad_resolution';
      details.push({
        text: `Weak resolution: ${prevInterval} → ${intervalName} by leap`,
        subtext: resolutionDetails.join('; '),
        impact: -0.3,
        type: 'penalty',
      });
    }
  }

  // Add basic interval info if no other details
  if (details.length === 0) {
    details.push({
      text: `${intervalName}: ${v1Pitch} against ${v2Pitch}`,
      impact: 0,
      type: 'info',
    });
  }

  return {
    type: 'consonant',
    category,
    score,
    label: intervalClass.toString(),
    isConsonant: true,
    intervalClass,
    intervalName,
    v1Pitch,
    v2Pitch,
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

  // P4 special handling - in two-voice counterpoint, P4 is generally treated as dissonant
  // because one voice is always the bass, and P4 against bass is dissonant
  if (currSim.interval.class === 4) {
    isDissonant = isP4DissonantInContext(currSim);
  }

  if (!isDissonant) {
    // Score as consonance with context
    return scoreConsonance(currSim, allSims, index, intervalHistory);
  }

  // Analyze rest context for entry/exit handling
  const restContext = analyzeRestContext(prevSim, currSim, nextSim);

  // Score entry (with rest context for motion modifier reduction)
  const entryInfo = scoreEntry(prevSim, currSim, restContext);

  // Score exit (with rest context for abandonment and phantom note handling)
  const exitInfo = scoreExit(currSim, nextSim, entryInfo, restContext);

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

    // Use pattern's label if provided, otherwise fall back to defaults
    if (mainPattern.label) {
      label = mainPattern.label;
    } else {
      switch (type) {
        case 'suspension': label = 'Sus'; break;
        case 'appoggiatura': label = 'App'; break;
        case 'passing': label = 'PT'; break;
        case 'neighbor': label = 'N'; break;
        case 'cambiata': label = 'Cam'; break;
        case 'cambiata_proper': label = 'Cam'; break;
        case 'cambiata_inverted': label = 'Cam↑'; break;
        case 'cambiata_strong': label = 'Cam?'; break;
        case 'cambiata_inverted_strong': label = 'Cam↑?'; break;
        case 'escape_tone': label = 'Esc'; break;
        case 'anticipation': label = 'Ant'; break;
      }
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
 *
 * Consecutive dissonance handling:
 * - Each dissonance that resolves to another dissonance receives a -1.5 penalty (in scoreExit)
 * - Consecutive dissonances compound: 2 in a row = both penalized, 3 in a row = all penalized
 * - This is tracked in the summary as consecutiveDissonanceGroups
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

  // Track pattern types
  const typeCounts = {};
  const allPatterns = []; // Collect all detected patterns for display
  for (const d of dissonances) {
    typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
    if (d.patterns && d.patterns.length > 0) {
      for (const p of d.patterns) {
        allPatterns.push({
          ...p,
          onset: d.onset,
          interval: d.interval,
        });
      }
    }
  }

  // Track consecutive dissonance groups (D → D → D sequences)
  const consecutiveGroups = [];
  let currentGroup = [];
  for (let i = 0; i < results.length; i++) {
    if (!results[i].isConsonant) {
      currentGroup.push({ index: i, onset: results[i].onset, type: results[i].type });
    } else {
      if (currentGroup.length >= 2) {
        consecutiveGroups.push([...currentGroup]);
      }
      currentGroup = [];
    }
  }
  // Don't forget trailing group
  if (currentGroup.length >= 2) {
    consecutiveGroups.push([...currentGroup]);
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
      allPatterns, // All recognized ornamental patterns
      consecutiveDissonanceGroups: consecutiveGroups, // Groups of 2+ adjacent dissonances
    },
  };
}
