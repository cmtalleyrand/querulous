/**
 * Dissonance Scoring System
 * Implements a zero-centered scoring norm for counterpoint dissonance analysis.
 *
 * Scores: +1.0 to +2.0 = Strong handling (Suspensions, Passing Tones)
 *         0.0 = Neutral/Acceptable
 *         Negative = Weak or Error-prone
 *
 * Semantic Categories for visualization:
 *   consonant_normal:      Normal consonant interval (pale green)
 *   consonant_preparation: Consonance that prepares an upcoming dissonance (cyan/teal)
 *   consonant_repetitive:  Same interval repeated too often (yellowish)
 *   consonant_good_resolution: Consonance after well-resolved dissonance (bright green)
 *   consonant_bad_resolution:  Consonance after poorly-resolved dissonance (orange)
 *   dissonant_good:        Well-handled dissonance (purple, brighter = better)
 *   dissonant_marginal:    Acceptable but not ideal dissonance (purple-ish)
 *   dissonant_bad:         Poorly handled dissonance (red)
 */

import { pitchName, metricWeight } from './formatter';

// ===========================================================================
// Global state for backward compatibility
// TODO: Migrate all callers to use createAnalysisContext pattern
// ===========================================================================
let _globalMeter = [4, 4];
let _globalP4Treatment = false;
let _globalSequenceRanges = [];
let _globalSequenceBeatRanges = [];

export function setMeter(meter) {
  _globalMeter = meter;
}

export function getMeter() {
  return _globalMeter;
}

export function setP4Treatment(treatAsDissonant) {
  _globalP4Treatment = treatAsDissonant;
}

export function getP4Treatment() {
  return _globalP4Treatment;
}

export function setSequenceRanges(ranges) {
  _globalSequenceRanges = ranges;
}

export function getSequenceRanges() {
  return _globalSequenceRanges;
}

export function setSequenceBeatRanges(ranges) {
  _globalSequenceBeatRanges = ranges;
}

export function getSequenceBeatRanges() {
  return _globalSequenceBeatRanges;
}

// Helper to get a context from global state (for legacy callers)
function getGlobalContext() {
  return {
    treatP4AsDissonant: _globalP4Treatment,
    meter: _globalMeter,
    sequenceBeatRanges: _globalSequenceBeatRanges,
    sequenceNoteRanges: _globalSequenceRanges,
  };
}

/**
 * Create an analysis context with all configuration needed for scoring.
 * This replaces previous module-level mutable state.
 *
 * @param {Object} options
 * @param {boolean} [options.treatP4AsDissonant=false] - Force all P4s as dissonant
 * @param {number[]} [options.meter=[4,4]] - Time signature [numerator, denominator]
 * @param {Array} [options.sequenceBeatRanges=[]] - Array of {startBeat, endBeat} for penalty mitigation
 * @param {Array} [options.sequenceNoteRanges=[]] - Array of {start, end} note index ranges
 * @returns {Object} Analysis context
 */
export function createAnalysisContext(options = {}) {
  return {
    treatP4AsDissonant: options.treatP4AsDissonant || false,
    meter: options.meter || [4, 4],
    sequenceBeatRanges: options.sequenceBeatRanges || [],
    sequenceNoteRanges: options.sequenceNoteRanges || [],
  };
}

/**
 * Check if P4 should be treated as dissonant based on user setting
 * Default behavior: P4 is treated as consonant (unchecked checkbox)
 * When checkbox is checked: P4 is treated as dissonant
 * @param {Simultaneity} sim - The simultaneity to check
 * @param {Object} ctx - Analysis context
 * @returns {boolean}
 */
function isP4DissonantInContext(sim, ctx) {
  // P4 is dissonant by default in two-voice counterpoint (bass is always implied).
  // The user can override this via the "Treat P4 as consonant" toggle.
  return ctx.treatP4AsDissonant !== false;
}

/**
 * Check if a note index is within a sequence
 * @param {number} noteIndex - The index of the note in the voice
 * @param {Object} ctx - Analysis context
 * @returns {boolean}
 */
function isNoteInSequence(noteIndex, ctx) {
  for (const range of ctx.sequenceNoteRanges) {
    if (noteIndex >= range.start && noteIndex <= range.end) {
      return true;
    }
  }
  return false;
}

/**
 * Check if an onset time falls within a sequence
 * @param {number} onset - The onset time to check
 * @param {Object} ctx - Analysis context
 * @returns {boolean}
 */
function isOnsetInSequence(onset, ctx) {
  for (const range of ctx.sequenceBeatRanges) {
    if (onset >= range.startBeat && onset <= range.endBeat) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate sub-subdivision threshold for short note detection.
 * Notes shorter than a triplet of the main subdivision are considered "very short"
 * and should have reduced penalties (they pass too quickly to be very noticeable).
 *
 * For 4/4 meter: main beat = 1 quarter, subdivision = 8th note (0.5), triplet = ~0.167
 * For 6/8 meter: main beat = dotted quarter (1.5), subdivision = 8th (0.5), triplet = ~0.167
 *
 * @param {Object} ctx - Analysis context with meter
 * @returns {number} Duration threshold in beats
 */
function getShortNoteThreshold(ctx) {
  const [numerator, denominator] = ctx.meter || [4, 4];

  // Determine if compound meter (6/8, 9/8, 12/8)
  const isCompound = (numerator % 3 === 0 && numerator > 3 && denominator === 8);

  // In simple meter: subdivision = half a beat
  // In compound meter: subdivision = 1/3 of the dotted-quarter beat
  const subdivision = isCompound ? (1 / 3) : 0.5;

  // Triplet of subdivision
  return subdivision / 3;
}

/**
 * Check if a note is "short" (below sub-subdivision level).
 * Short notes get special treatment for penalties:
 * - Consecutive dissonances: penalty halved if on off-beat
 * - Motion/parallels: penalty halved if NOT repeated
 * - Repetition penalties: halved
 *
 * @param {Simultaneity} sim - The simultaneity to check
 * @param {Object} ctx - Analysis context
 * @returns {{isShort: boolean, duration: number, threshold: number}}
 */
function getShortNoteInfo(sim, ctx) {
  // Use the shorter of the two notes' durations
  const minDuration = Math.min(sim.voice1Note.duration, sim.voice2Note.duration);
  const threshold = getShortNoteThreshold(ctx);

  return {
    isShort: minDuration <= threshold,
    duration: minDuration,
    threshold,
  };
}

/**
 * Score "passingness" of a dissonance for a given voice.
 * Determines if a dissonant note qualifies as passing motion per user spec.
 *
 * Requirements to be eligible:
 * - MUST be an eighth note or shorter
 * - ALWAYS passing if 32nd note or shorter and not repeated
 * - If on strong/medium beat, MUST be shorter than an eighth
 *
 * Scoring factors:
 * - eighth note: -1
 * - between 8th and 16th (e.g. triplet 8th, dotted 16th): -0.5
 * - longer than previous note: -0.5
 * - from rest of eighth or longer: -0.5
 * - shorter than previous note: +0.25
 * - on the beat: -0.5
 * - off the primary subdivision: +0.5
 * - by leap: -0.5
 * - by step: +0.75
 * - oblique motion: +0.5
 * - in same direction as previous move: +0.5
 * - returning to previous note: +0.5
 * - recovering from leap: +0.25
 * - repeating same interval class (step/skip/perfect leap): +0.25
 * - in sequence: +1
 *
 * Penalty mitigation = sum of passingness / 2
 * If passingness >= 1 → is passing motion
 *
 * @param {Simultaneity} currSim - Current simultaneity
 * @param {Simultaneity|null} prevSim - Previous simultaneity
 * @param {Simultaneity|null} nextSim - Next simultaneity
 * @param {number} voiceMelodicInterval - Melodic interval into this note for the voice
 * @param {number|null} prevMelodicInterval - Previous melodic interval for same voice
 * @param {Object} exitResolution - Resolution info for this voice
 * @param {Object} entryMotion - Motion type info
 * @param {Object} ctx - Analysis context
 * @returns {{ passingness: number, isPassing: boolean, mitigation: number, details: string[] }}
 */
function scorePassingMotion(currSim, prevSim, nextSim, voiceMelodicInterval, prevMelodicInterval, exitResolution, entryMotion, ctx) {
  const details = [];

  // Get note duration (shorter of the two voices for this simultaneity)
  const noteDuration = Math.min(currSim.voice1Note.duration, currSim.voice2Note.duration);

  // Eligibility check: must be eighth note (0.5) or shorter
  if (noteDuration > 0.5 + 0.01) {
    return { passingness: 0, isPassing: false, mitigation: 0, details: ['Duration > eighth note: not eligible'] };
  }

  // If on strong or medium beat, must be shorter than eighth
  const beatStrength = metricWeight(currSim.onset, ctx.meter);
  if (beatStrength >= 0.75 && noteDuration >= 0.5 - 0.01) {
    return { passingness: 0, isPassing: false, mitigation: 0, details: ['Strong beat + eighth note: not eligible'] };
  }

  // Always passing if 32nd note or shorter (0.125) and not repeated pitch
  const is32ndOrShorter = noteDuration <= 0.125 + 0.01;
  const isRepeatedPitch = voiceMelodicInterval === 0;
  if (is32ndOrShorter && !isRepeatedPitch) {
    return { passingness: 3, isPassing: true, mitigation: 1.5, details: ['32nd note or shorter: always passing'] };
  }

  let passingness = 0;

  // Duration scoring
  if (noteDuration >= 0.5 - 0.01) {
    // Eighth note
    passingness -= 1;
    details.push('Eighth note: -1');
  } else if (noteDuration > 0.25 + 0.01) {
    // Between 8th and 16th (triplet eighth, dotted 16th, etc.)
    passingness -= 0.5;
    details.push('Between 8th and 16th: -0.5');
  }
  // 16th or shorter: no penalty

  // Compare to previous note duration
  if (prevSim) {
    const prevDuration = Math.min(prevSim.voice1Note.duration, prevSim.voice2Note.duration);
    if (noteDuration > prevDuration + 0.01) {
      passingness -= 0.5;
      details.push('Longer than previous note: -0.5');
    } else if (noteDuration < prevDuration - 0.01) {
      passingness += 0.25;
      details.push('Shorter than previous note: +0.25');
    }
  }

  // From rest check
  if (prevSim) {
    const prevV1End = prevSim.voice1Note.onset + prevSim.voice1Note.duration;
    const prevV2End = prevSim.voice2Note.onset + prevSim.voice2Note.duration;
    const v1RestDur = currSim.onset - prevV1End;
    const v2RestDur = currSim.onset - prevV2End;
    const maxRest = Math.max(v1RestDur, v2RestDur);
    if (maxRest >= 0.5 - 0.01) {
      passingness -= 0.5;
      details.push('From rest of eighth or longer: -0.5');
    }
  }

  // Beat position
  if (beatStrength >= 0.75) {
    passingness -= 0.5;
    details.push('On the beat: -0.5');
  } else if (beatStrength < 0.5) {
    passingness += 0.5;
    details.push('Off primary subdivision: +0.5');
  }

  // Motion type
  const absInterval = Math.abs(voiceMelodicInterval);
  if (absInterval === 0) {
    // Repeated note - not really passing
    passingness -= 0.5;
    details.push('Repeated note: -0.5');
  } else if (absInterval > 2) {
    passingness -= 0.5;
    details.push('By leap: -0.5');
  } else {
    passingness += 0.75;
    details.push('By step: +0.75');
  }

  // Oblique motion (only one voice moved)
  if (entryMotion && entryMotion.type === 'oblique') {
    passingness += 0.5;
    details.push('Oblique motion: +0.5');
  }

  // Same direction as previous move
  if (prevMelodicInterval !== null && prevMelodicInterval !== undefined && prevMelodicInterval !== 0 && voiceMelodicInterval !== 0) {
    if (Math.sign(prevMelodicInterval) === Math.sign(voiceMelodicInterval)) {
      passingness += 0.5;
      details.push('Same direction as previous: +0.5');
    }
  }

  // Returning to previous note
  if (exitResolution && prevSim) {
    const exitInterval = exitResolution.interval || 0;
    const exitDir = exitResolution.direction || 0;
    // If exit returns us to the pitch we had before entry
    if (exitDir !== 0 && Math.sign(exitDir) !== Math.sign(voiceMelodicInterval) &&
        Math.abs(exitInterval - absInterval) <= 1) {
      passingness += 0.5;
      details.push('Returning to previous note: +0.5');
    }
  }

  // Recovering from leap (opposite direction step/short leap after a leap)
  if (prevMelodicInterval !== null && prevMelodicInterval !== undefined) {
    const prevAbs = Math.abs(prevMelodicInterval);
    if (prevAbs > 2 && voiceMelodicInterval !== 0) {
      if (Math.sign(voiceMelodicInterval) !== Math.sign(prevMelodicInterval)) {
        passingness += 0.25;
        details.push('Recovering from leap: +0.25');
      }
    }
  }

  // Repeating same interval class (step after step, skip after skip, etc.)
  if (prevMelodicInterval !== null && prevMelodicInterval !== undefined && prevMelodicInterval !== 0) {
    const prevMag = getIntervalMagnitude(prevMelodicInterval);
    const currMag = getIntervalMagnitude(voiceMelodicInterval);
    if (prevMag.type === currMag.type && currMag.type !== 'unison') {
      passingness += 0.25;
      details.push(`Repeating ${currMag.type}: +0.25`);
    }
  }

  // In sequence
  if (isOnsetInSequence(currSim.onset, ctx)) {
    passingness += 1;
    details.push('In sequence: +1');
  }

  const mitigation = passingness / 2;
  const isPassing = passingness >= 1;

  return { passingness, isPassing, mitigation: Math.max(0, mitigation), details };
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
      reason = 'melodic skip into dissonance, left by skip';
    } else if (exitMag.type === 'perfect_leap') {
      basePenalty = -1.0;
      reason = 'melodic skip into dissonance, left by P4/P5';
    } else {
      // Large leap or octave
      basePenalty = -2.0;
      reason = 'melodic skip into dissonance, left by large leap';
    }
  }
  // Perfect leap entry (P4/P5)
  else if (entryMag.type === 'perfect_leap') {
    if (exitMag.type === 'skip' && oppositeDirection) {
      basePenalty = -1.0;
      reason = 'melodic P4/P5 leap into dissonance, left by opposite skip';
    } else if (exitMag.type === 'perfect_leap' && oppositeDirection) {
      basePenalty = -1.5;
      reason = 'melodic P4/P5 leap into dissonance, left by opposite P4/P5';
    } else if (exitMag.type === 'skip' && sameDirection) {
      basePenalty = -1.5;
      reason = 'melodic P4/P5 leap into dissonance, continued by same-dir skip';
    } else {
      // Any other resolution
      basePenalty = -2.0;
      reason = 'melodic P4/P5 leap into dissonance, poorly resolved';
    }
  }
  // Large leap entry (6th, 7th, etc.)
  else if (entryMag.type === 'large_leap' || entryMag.type === 'octave') {
    if (exitMag.type === 'step') {
      return { penalty: 0, reason: 'large melodic leap into dissonance, resolved by step', inSequence };
    }
    if (exitMag.type === 'skip' && oppositeDirection) {
      basePenalty = -1.5;
      reason = 'large melodic leap into dissonance, left by opposite skip';
    } else {
      basePenalty = -2.5;
      reason = 'large melodic leap into dissonance, poorly resolved';
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
 * Returns: 'oblique', 'contrary', 'similar', 'similar_step', 'similar_same_type', 'parallel', 'reentry'
 *
 * Motion types:
 * - reentry: Voice returning after long rest (>1 quarter AND >2× last note) - always neutral
 * - oblique: One voice holds while other moves
 * - contrary: Voices move in opposite directions
 * - similar_step: Same direction, one/both move by step (most acceptable similar)
 * - similar: Same direction, different interval types (acceptable)
 * - similar_same_type: Same direction, same interval type but different size (less acceptable)
 * - parallel: Same direction and interval size (parallel 5ths/8ves forbidden)
 *
 * Modifiers (applied to penalties):
 * - fromRest: If entering from a rest, penalties are HALVED (asynchronous modifier)
 *
 * @param {Simultaneity} prevSim - Previous simultaneity
 * @param {Simultaneity} currSim - Current simultaneity
 * @param {Object} restContext - Rest analysis from analyzeRestContext
 */
function getMotionType(prevSim, currSim, restContext = null) {
  if (!prevSim) return { type: 'unknown', v1Moved: true, v2Moved: true, v1Interval: 0, v2Interval: 0, fromRest: false, isReentry: false };

  const v1Moved = currSim.voice1Note !== prevSim.voice1Note &&
                  currSim.voice1Note.pitch !== prevSim.voice1Note.pitch;
  const v2Moved = currSim.voice2Note !== prevSim.voice2Note &&
                  currSim.voice2Note.pitch !== prevSim.voice2Note.pitch;

  const v1Interval = v1Moved ? Math.abs(currSim.voice1Note.pitch - prevSim.voice1Note.pitch) : 0;
  const v2Interval = v2Moved ? Math.abs(currSim.voice2Note.pitch - prevSim.voice2Note.pitch) : 0;

  // Check if entry was from a rest (asynchronous modifier - halves penalties)
  const v1FromRest = restContext?.entryFromRest?.v1 || false;
  const v2FromRest = restContext?.entryFromRest?.v2 || false;
  const fromRest = v1FromRest || v2FromRest;

  // Check for REENTRY: rest > 1 quarter AND > 2× last note duration
  // This is a special case where score is always neutral (0)
  let isReentry = false;
  if (restContext) {
    const v1RestDur = restContext.entryFromRest?.v1RestDuration || 0;
    const v2RestDur = restContext.entryFromRest?.v2RestDuration || 0;
    const v1LastNoteDur = prevSim.voice1Note.duration;
    const v2LastNoteDur = prevSim.voice2Note.duration;

    // Reentry if rest > 1 quarter (1.0) AND rest > 2× last note duration
    const v1IsReentry = v1FromRest && v1RestDur > 1.0 && v1RestDur > 2 * v1LastNoteDur;
    const v2IsReentry = v2FromRest && v2RestDur > 1.0 && v2RestDur > 2 * v2LastNoteDur;
    isReentry = v1IsReentry || v2IsReentry;
  }

  if (!v1Moved && !v2Moved) {
    return { type: 'static', v1Moved: false, v2Moved: false, v1Interval: 0, v2Interval: 0, fromRest, isReentry };
  }

  // Reentry motion type - always scores neutral
  if (isReentry) {
    return { type: 'reentry', v1Moved, v2Moved, v1Interval, v2Interval, fromRest, isReentry: true };
  }

  if (!v1Moved || !v2Moved) {
    return { type: 'oblique', v1Moved, v2Moved, v1Interval, v2Interval, fromRest, isReentry };
  }

  const v1Dir = Math.sign(currSim.voice1Note.pitch - prevSim.voice1Note.pitch);
  const v2Dir = Math.sign(currSim.voice2Note.pitch - prevSim.voice2Note.pitch);

  if (v1Dir === -v2Dir) {
    return { type: 'contrary', v1Moved: true, v2Moved: true, v1Interval, v2Interval, fromRest, isReentry };
  }

  // Similar motion - determine subtype based on interval characteristics
  // Parallel: same interval size
  if (v1Interval === v2Interval) {
    return { type: 'parallel', v1Moved: true, v2Moved: true, v1Interval, v2Interval, fromRest, isReentry };
  }

  // Check if either voice moves by step (1-2 semitones)
  const v1IsStep = v1Interval <= 2;
  const v2IsStep = v2Interval <= 2;

  if (v1IsStep || v2IsStep) {
    return { type: 'similar_step', v1Moved: true, v2Moved: true, v1Interval, v2Interval, fromRest, isReentry };
  }

  // Check if both voices move by same interval type (skip, perfect_leap, large_leap)
  const v1Mag = getIntervalMagnitude(v1Interval);
  const v2Mag = getIntervalMagnitude(v2Interval);

  if (v1Mag.type === v2Mag.type) {
    return { type: 'similar_same_type', v1Moved: true, v2Moved: true, v1Interval, v2Interval, intervalType: v1Mag.type, fromRest, isReentry };
  }

  // Different interval types
  return { type: 'similar', v1Moved: true, v2Moved: true, v1Interval, v2Interval, fromRest, isReentry };
}

/**
 * Check if this is a strong beat (weight >= 0.75)
 */
function isStrongBeat(onset, ctx) {
  return metricWeight(onset, ctx.meter) >= 0.75;
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
 * Rest handling:
 * - fromRest modifier: halves penalties for similar/parallel motion
 * - reentry motion type: always neutral (score = 0)
 */
function scoreEntry(prevSim, currSim, restContext = null, ctx) {
  let score = 0;
  const details = [];

  if (!prevSim) {
    return { score: 0, details: ['No previous simultaneity'], motion: null, v1MelodicInterval: 0, v2MelodicInterval: 0, restModifier: 1.0 };
  }

  // Pass restContext to getMotionType
  const motion = getMotionType(prevSim, currSim, restContext);

  // Reentry = always neutral
  if (motion.type === 'reentry') {
    details.push('Re-entry after long rest: neutral');
    return { score: 0, details, motion, v1MelodicInterval: 0, v2MelodicInterval: 0, restModifier: 1.0 };
  }

  // fromRest modifier: halves penalties for similar/parallel
  const restModifier = motion.fromRest ? 0.5 : 1.0;
  const restNote = motion.fromRest ? ' (halved: from rest)' : '';

  // Motion scoring (tracked separately for passingness mitigation)
  let motionComponent = 0;
  if (motion.type === 'oblique') {
    const adj = 0.5;
    score += adj;
    motionComponent = adj;
    details.push(`Oblique motion: +${adj.toFixed(2)}`);
  } else if (motion.type === 'contrary') {
    const adj = 0.5;
    score += adj;
    motionComponent = adj;
    details.push(`Contrary motion: +${adj.toFixed(2)}`);
  } else if (motion.type === 'parallel') {
    const adj = -1.5 * restModifier;
    score += adj;
    motionComponent = adj;
    details.push(`Parallel motion: ${adj.toFixed(2)}${restNote}`);
  } else if (motion.type === 'similar_same_type') {
    const adj = -1.0 * restModifier;
    score += adj;
    motionComponent = adj;
    details.push(`Similar motion (same interval type): ${adj.toFixed(2)}${restNote}`);
  } else if (motion.type === 'similar_step' || motion.type === 'similar') {
    const adj = -0.5 * restModifier;
    score += adj;
    motionComponent = adj;
    details.push(`Similar motion: ${adj.toFixed(2)}${restNote}`);
  }

  // Record entry intervals for resolution penalty calculation (penalties applied in scoreExit)
  const v1MelodicInterval = motion.v1Moved ? currSim.voice1Note.pitch - prevSim.voice1Note.pitch : 0;
  const v2MelodicInterval = motion.v2Moved ? currSim.voice2Note.pitch - prevSim.voice2Note.pitch : 0;

  // Note entry leap types for reference (human-readable labels, not raw enum)
  const _leapLabel = { skip: 'skip (3rd)', perfect_leap: 'P4/P5 leap', large_leap: 'large leap', octave: 'octave leap' };
  if (motion.v1Moved) {
    const mag = getIntervalMagnitude(v1MelodicInterval);
    if (mag.type !== 'step' && mag.type !== 'unison') {
      details.push(`V1 entered by ${_leapLabel[mag.type] || mag.type} (${Math.abs(v1MelodicInterval)} st)`);
    }
  }
  if (motion.v2Moved) {
    const mag = getIntervalMagnitude(v2MelodicInterval);
    if (mag.type !== 'step' && mag.type !== 'unison') {
      details.push(`V2 entered by ${_leapLabel[mag.type] || mag.type} (${Math.abs(v2MelodicInterval)} st)`);
    }
  }

  // Meter modifier - reduced from -1.0 to -0.5 since accented passing tones
  // and neighbor tones are acceptable. Additional penalty for unresolved
  // strong-beat dissonances is applied in scoreExit.
  if (isStrongBeat(currSim.onset, ctx)) {
    score -= 0.5;
    details.push(`Strong beat: -0.5`);
  }

  return {
    score,
    details,
    motion,
    v1MelodicInterval,
    v2MelodicInterval,
    restModifier,
    motionComponent, // between-voice motion penalty/reward for passingness mitigation
  };
}

/**
 * Score the exit from a dissonance (D → ?)
 * Now uses proportional penalties based on entry leap size and resolution type
 * Penalties are mitigated if the melodic motion is part of a sequence
 * Rest handling: -0.5 penalty if resolved by abandonment (one voice drops out)
 */
function scoreExit(currSim, nextSim, entryInfo, restContext = null, ctx) {
  if (!nextSim) {
    let score = -1.0;
    const details = ['Unresolved (no following note)'];

    // Keep abandonment handling consistent with the normal exit path.
    // This can occur at phrase boundaries when one voice drops out first.
    if (restContext && restContext.resolvedByAbandonment) {
      score -= 0.5;
      details.push('Resolved by abandonment (voice dropped out): -0.5');
    }

    return {
      score,
      details,
      motion: null,
      v1Resolution: null,
      v2Resolution: null,
      resolvedByAbandonment: Boolean(restContext && restContext.resolvedByAbandonment),
      baseExitComponent: score,
      // No evaluated motion exists without a following simultaneity.
      // Keep these as null so downstream code doesn't treat them as measured penalties.
      v1ResolutionComponent: null,
      v2ResolutionComponent: null,
    };
  }

  // Check if this is actually a resolution (D → C) or just movement (D → D)
  // NOTE: P4 is ALWAYS dissonant in two-voice counterpoint (one voice is always the bass)
  const isConsonant = nextSim.interval.isConsonant();

  // Differentiate between perfect and imperfect consonance resolution
  // Perfect consonances: unison (1), P5 (5), P8 (8)
  // Imperfect consonances: 3rd (3), 6th (6)
  const nextIntervalClass = nextSim.interval.class;
  const isPerfectConsonance = isConsonant && (nextIntervalClass === 1 || nextIntervalClass === 5 || nextIntervalClass === 8);
  const isImperfectConsonance = isConsonant && (nextIntervalClass === 3 || nextIntervalClass === 6);

  let score;
  const details = [];

  // baseExitComponent: D→D penalty or consonance resolution reward (NOT motion-magnitude dependent)
  // Tracked separately so passingness can target the D→D penalty specifically (rule c)
  let baseExitComponent;

  if (isImperfectConsonance) {
    score = 1.0;
    baseExitComponent = 1.0;
    details.push('Resolves to imperfect consonance: +1.0');
  } else if (isPerfectConsonance) {
    score = 0.5;
    baseExitComponent = 0.5;
    details.push('Resolves to perfect consonance: +0.5');
  } else if (isConsonant) {
    // Other consonances (should not reach here in two-voice counterpoint)
    score = 0.5;
    baseExitComponent = 0.5;
    details.push('Resolves to consonance: +0.5');
  } else {
    // Resolution to another dissonance
    // Short note + off-beat: halve the penalty (two quick consecutive dissonances on off-beats not a big deal)
    const shortNoteInfo = getShortNoteInfo(currSim, ctx);
    const isOffBeat = currSim.metricWeight < 0.75;
    if (shortNoteInfo.isShort && isOffBeat) {
      score = -0.375; // Halved penalty
      baseExitComponent = -0.375;
      details.push('Leads to another dissonance: -0.375 (short note on off-beat - halved)');
    } else {
      score = -0.75;
      baseExitComponent = -0.75;
      details.push('Leads to another dissonance (no resolution): -0.75');
    }
  }

  // Check for resolution by abandonment (one voice drops out)
  if (restContext && restContext.resolvedByAbandonment) {
    score -= 0.5;
    details.push('Resolved by abandonment (voice dropped out): -0.5');
  }

  // Resolution-after-rest rules:
  // - If ONE voice held through rest and other enters → valid resolution
  // - If BOTH voices have moved since rest → not a true resolution
  // - Phantom note: rest up to duration/2 still counts as resolution
  if (restContext) {
    const v1RestDur = restContext.exitToRest?.v1RestDuration || 0;
    const v2RestDur = restContext.exitToRest?.v2RestDuration || 0;
    const v1PhantomLimit = currSim.voice1Note.duration / 2;
    const v2PhantomLimit = currSim.voice2Note.duration / 2;

    // Check if this is a "both moved after rest" situation (invalid resolution)
    const v1HadLongRest = v1RestDur > v1PhantomLimit;
    const v2HadLongRest = v2RestDur > v2PhantomLimit;

    if (v1HadLongRest && v2HadLongRest) {
      // Both voices had long rests - not a valid resolution
      score -= 1.0;
      details.push('Invalid resolution (both voices rested then moved): -1.0');
    } else if (v1HadLongRest || v2HadLongRest) {
      // One voice had long rest but other held - still valid but weaker
      score -= 0.3;
      details.push('Delayed resolution (one voice rested): -0.3');
    }
  }

  const motion = getMotionType(currSim, nextSim);

  // Check if either voice's motion is part of a sequence (by onset time)
  const v1InSequence = isOnsetInSequence(currSim.onset, ctx);
  const v2InSequence = isOnsetInSequence(currSim.onset, ctx);

  // Resolution modifier - check how each voice resolves with proportional penalties
  // v1ResolutionComponent / v2ResolutionComponent: single-voice motion penalties, tracked
  // separately so passingness can mitigate each using that voice's passingness score
  let v1Resolution = null;
  let v2Resolution = null;
  let v1ResolutionComponent = 0;
  let v2ResolutionComponent = 0;

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
        v1ResolutionComponent += penaltyInfo.penalty;
        details.push(`V1 ${penaltyInfo.reason}: ${penaltyInfo.penalty.toFixed(2)}`);
      }

      // Leap continuation penalty: large leaps (but not skips) should be followed by opposite direction
      // Applies to perfect_leap (P4/P5) and large_leap (6th+), not skip (3rd)
      if ((entryMag.type === 'perfect_leap' || entryMag.type === 'large_leap' || entryMag.type === 'octave') &&
          v1Resolution.direction !== 0 && v1Resolution.direction === entryDir) {
        score -= 0.25;
        v1ResolutionComponent -= 0.25;
        details.push('V1 melodic leap not followed by opposite motion: -0.25');
      }
    } else if (exitMag.type !== 'step' && exitMag.type !== 'unison') {
      // No entry leap but exit is a leap - apply standard penalties (with sequence mitigation)
      let penalty = 0;
      let reason = '';
      if (exitMag.type === 'skip') {
        penalty = -0.5;
        reason = 'V1 leaves dissonance by melodic skip';
      } else if (exitMag.type === 'perfect_leap') {
        penalty = -0.5;
        reason = 'V1 leaves dissonance by melodic P4/P5';
      } else {
        penalty = -1.5;
        reason = 'V1 leaves dissonance by large melodic leap';
      }
      // Apply sequence mitigation
      if (v1InSequence) {
        penalty *= 0.25;
        reason += ' (mitigated: in sequence)';
      }
      score += penalty;
      v1ResolutionComponent += penalty;
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
        v2ResolutionComponent += penaltyInfo.penalty;
        details.push(`V2 ${penaltyInfo.reason}: ${penaltyInfo.penalty.toFixed(2)}`);
      }

      // Leap continuation penalty: large leaps (but not skips) should be followed by opposite direction
      if ((entryMag.type === 'perfect_leap' || entryMag.type === 'large_leap' || entryMag.type === 'octave') &&
          v2Resolution.direction !== 0 && v2Resolution.direction === entryDir) {
        score -= 0.25;
        v2ResolutionComponent -= 0.25;
        details.push('V2 melodic leap not followed by opposite motion: -0.25');
      }
    } else if (exitMag.type !== 'step' && exitMag.type !== 'unison') {
      // No entry leap but exit is a leap - apply standard penalties (with sequence mitigation)
      let penalty = 0;
      let reason = '';
      if (exitMag.type === 'skip') {
        penalty = -0.5;
        reason = 'V2 leaves dissonance by melodic skip';
      } else if (exitMag.type === 'perfect_leap') {
        penalty = -0.5;
        reason = 'V2 leaves dissonance by melodic P4/P5';
      } else {
        penalty = -1.5;
        reason = 'V2 leaves dissonance by large melodic leap';
      }
      // Apply sequence mitigation
      if (v2InSequence) {
        penalty *= 0.25;
        reason += ' (mitigated: in sequence)';
      }
      score += penalty;
      v2ResolutionComponent += penalty;
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
    baseExitComponent,       // D→D penalty or consonance reward — for passingness rule (c)
    v1ResolutionComponent,   // V1-individual motion penalties — for passingness rule (a)
    v2ResolutionComponent,   // V2-individual motion penalties — for passingness rule (a)
  };
}

/**
 * Check for pattern matches and return bonus
 */
function checkPatterns(prevSim, currSim, nextSim, entryInfo, exitInfo, ctx) {
  const patterns = [];

  if (!prevSim || !nextSim || !entryInfo || !exitInfo) {
    return { bonus: 0, patterns: [] };
  }

  let bonus = 0;
  const entryBonuses = []; // Track bonuses allocated to entry
  const exitBonuses = [];  // Track bonuses allocated to exit

  // SUSPENSION/RETARDATION: Oblique entry (one voice held), step resolution by the held voice
  // Split bonuses: +0.75 for oblique entry pattern, +0.5 for step resolution, +0.25 for downward (vs upward)
  if (entryInfo.motion.type === 'oblique') {
    const heldVoice = !entryInfo.motion.v1Moved ? 1 : (!entryInfo.motion.v2Moved ? 2 : null);
    if (heldVoice) {
      const resolution = heldVoice === 1 ? exitInfo.v1Resolution : exitInfo.v2Resolution;
      if (resolution && resolution.magnitude.type === 'step') {
        const isDownward = resolution.direction < 0;
        const patternType = isDownward ? 'suspension' : 'retardation';

        // Entry bonus: oblique motion with preparation
        const entryBonus = 0.75;
        entryBonuses.push({ amount: entryBonus, reason: `${patternType} preparation (oblique)` });

        // Exit bonus: step resolution
        const stepBonus = 0.5;
        exitBonuses.push({ amount: stepBonus, reason: 'step resolution' });

        // Exit bonus: direction bonus (downward is more traditional)
        const dirBonus = isDownward ? 0.25 : 0;
        if (isDownward) {
          exitBonuses.push({ amount: dirBonus, reason: 'downward resolution' });
        }

        const totalBonus = entryBonus + stepBonus + dirBonus;
        bonus += totalBonus;
        patterns.push({
          type: patternType,
          bonus: totalBonus,
          entryBonus,
          exitBonus: stepBonus + dirBonus,
          description: `${isDownward ? 'Suspension' : 'Retardation'} (oblique entry, step ${isDownward ? 'down' : 'up'} resolution)`
        });
      }
    }
  }

  // ANTICIPATION: Early arrival creating momentary dissonance (typically oblique, weak beat)
  // Like suspension but reversed - the moving voice anticipates the next harmony
  if (entryInfo.motion.type === 'oblique' && !isStrongBeat(currSim.onset, ctx)) {
    const movingVoice = entryInfo.motion.v1Moved ? 1 : (entryInfo.motion.v2Moved ? 2 : null);
    if (movingVoice) {
      // Anticipation typically "resolves" by the other voice moving (oblique exit) or both moving
      if (exitInfo.motion && exitInfo.motion.type !== 'parallel') {
        const anticipationBonus = 0.5; // Moderate bonus for recognized pattern
        bonus += anticipationBonus;
        entryBonuses.push({ amount: anticipationBonus, reason: 'anticipation pattern' });
        patterns.push({
          type: 'anticipation',
          bonus: anticipationBonus,
          entryBonus: anticipationBonus,
          exitBonus: 0,
          description: 'Anticipation (early arrival on weak beat)'
        });
      }
    }
  }

  // APPOGGIATURA: Entry=Leap/Skip+Strong, Exit=Step by the voice that leaped
  // Allocate more to entry to offset leap penalty: +2.0 entry, +0.5 exit
  if (isStrongBeat(currSim.onset, ctx)) {
    // Check if V1 leaped in and steps out opposite
    if (entryInfo.v1MelodicInterval !== 0) {
      const entryMag = getIntervalMagnitude(entryInfo.v1MelodicInterval);
      if ((entryMag.type === 'skip' || entryMag.type === 'perfect_leap' || entryMag.type === 'large_leap') && exitInfo.v1Resolution) {
        if (exitInfo.v1Resolution.magnitude.type === 'step') {
          const entryDir = Math.sign(entryInfo.v1MelodicInterval);
          const oppositeStep = exitInfo.v1Resolution.direction === -entryDir;
          const bonusFactor = oppositeStep ? 0.5 : 1.0;
          const entryBonus = 2.0 * bonusFactor; // Offset leap penalty (halved on opposite-step exits)
          const exitBonus = 0.5 * bonusFactor;  // Acknowledge resolution quality
          const totalBonus = entryBonus + exitBonus;
          bonus += totalBonus;
          entryBonuses.push({ amount: entryBonus, reason: oppositeStep ? 'appoggiatura leap entry (opposite-step reduced)' : 'appoggiatura leap entry' });
          exitBonuses.push({ amount: exitBonus, reason: oppositeStep ? 'step resolution (opposite-step reduced)' : 'step resolution' });
          patterns.push({
            type: 'appoggiatura',
            bonus: totalBonus,
            entryBonus,
            exitBonus,
            voice: 1,
            description: oppositeStep ? 'Appoggiatura (V1 leaps in, opposite-step exit — reduced bonus)' : 'Appoggiatura (V1 leaps in, resolves by step)'
          });
        }
      }
    }
    // Check V2
    if (entryInfo.v2MelodicInterval !== 0 && !patterns.some(p => p.type === 'appoggiatura')) {
      const entryMag = getIntervalMagnitude(entryInfo.v2MelodicInterval);
      if ((entryMag.type === 'skip' || entryMag.type === 'perfect_leap' || entryMag.type === 'large_leap') && exitInfo.v2Resolution) {
        if (exitInfo.v2Resolution.magnitude.type === 'step') {
          const entryDir = Math.sign(entryInfo.v2MelodicInterval);
          const oppositeStep = exitInfo.v2Resolution.direction === -entryDir;
          const bonusFactor = oppositeStep ? 0.5 : 1.0;
          const entryBonus = 2.0 * bonusFactor;
          const exitBonus = 0.5 * bonusFactor;
          const totalBonus = entryBonus + exitBonus;
          bonus += totalBonus;
          entryBonuses.push({ amount: entryBonus, reason: oppositeStep ? 'appoggiatura leap entry (opposite-step reduced)' : 'appoggiatura leap entry' });
          exitBonuses.push({ amount: exitBonus, reason: oppositeStep ? 'step resolution (opposite-step reduced)' : 'step resolution' });
          patterns.push({
            type: 'appoggiatura',
            bonus: totalBonus,
            entryBonus,
            exitBonus,
            voice: 2,
            description: oppositeStep ? 'Appoggiatura (V2 leaps in, opposite-step exit — reduced bonus)' : 'Appoggiatura (V2 leaps in, resolves by step)'
          });
        }
      }
    }
  }

  // CAMBIATA (NOTA CAMBIATA) DETECTION
  // Traditional cambiata: 5-note figure where the 2nd note is dissonant
  // Pattern: consonance → step to dissonance → skip down 3rd → step up → resolution
  // Entry: step from consonance (controlled entry, +0.3)
  // Exit: skip down a third (unusual but part of pattern, +1.0 to offset skip penalty)
  //
  // Variants:
  //   - cambiata_proper: Traditional form (step down, skip down 3rd) on weak beat
  //   - cambiata_inverted: Inverted form (step up, skip up 3rd)
  //   - cambiata_strong: On strong beat (less traditional, smaller bonus)

  // Helper to check cambiata for a voice
  // Entry bonus: small reward for controlled step entry
  // Exit bonus: larger reward to offset skip penalty and recognize the melodic figure
  const checkCambiataForVoice = (voice, melodicInterval, resolution) => {
    if (!resolution) return null;

    const entryIsStep = Math.abs(melodicInterval) > 0 && Math.abs(melodicInterval) <= 2;
    const exitIsSkip = resolution.interval >= 3 && resolution.interval <= 4;
    const sameDirection = Math.sign(melodicInterval) === resolution.direction;

    if (!entryIsStep || !exitIsSkip || !sameDirection) return null;

    const isDescending = melodicInterval < 0;
    const isWeakBeat = !isStrongBeat(currSim.onset, ctx);

    if (isDescending && isWeakBeat) {
      // Traditional cambiata: step down, skip down, weak beat (most idiomatic)
      const entryBonus = 0.3;
      const exitBonus = 1.2;
      return {
        type: 'cambiata_proper',
        bonus: entryBonus + exitBonus,
        entryBonus,
        exitBonus,
        voice,
        label: 'Cam',
        description: 'Cambiata (step down → skip down 3rd, weak beat)',
      };
    } else if (!isDescending && isWeakBeat) {
      // Inverted cambiata: step up, skip up, weak beat (less common but acceptable)
      const entryBonus = 0.2;
      const exitBonus = 0.8;
      return {
        type: 'cambiata_inverted',
        bonus: entryBonus + exitBonus,
        entryBonus,
        exitBonus,
        voice,
        label: 'Cam↑',
        description: 'Inverted cambiata (step up → skip up 3rd)',
      };
    } else if (isDescending) {
      // Cambiata-like on strong beat (less idiomatic, smaller reward)
      const entryBonus = 0.1;
      const exitBonus = 0.4;
      return {
        type: 'cambiata_strong',
        bonus: entryBonus + exitBonus,
        entryBonus,
        exitBonus,
        voice,
        label: 'Cam?',
        description: 'Cambiata figure on strong beat (non-traditional)',
      };
    } else {
      // Inverted on strong beat
      const entryBonus = 0.1;
      const exitBonus = 0.4;
      return {
        type: 'cambiata_inverted_strong',
        bonus: entryBonus + exitBonus,
        entryBonus,
        exitBonus,
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
    entryBonuses.push({ amount: v1Cambiata.entryBonus, reason: `${v1Cambiata.description} entry` });
    exitBonuses.push({ amount: v1Cambiata.exitBonus, reason: `${v1Cambiata.description} exit` });
    patterns.push(v1Cambiata);
  }

  // Check V2 for cambiata (only if V1 didn't match)
  if (!v1Cambiata) {
    const v2Cambiata = checkCambiataForVoice(2, entryInfo.v2MelodicInterval, exitInfo.v2Resolution);
    if (v2Cambiata) {
      bonus += v2Cambiata.bonus;
      entryBonuses.push({ amount: v2Cambiata.entryBonus, reason: `${v2Cambiata.description} entry` });
      exitBonuses.push({ amount: v2Cambiata.exitBonus, reason: `${v2Cambiata.description} exit` });
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
        exitBonuses.push({ amount: 0.5, reason: 'escape tone exit skip/leap' });
        patterns.push({ type: 'escape_tone', bonus: 0.5, entryBonus: 0, exitBonus: 0.5, voice: 1, description: 'Escape tone (step in, skip/leap out opposite)' });
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
        exitBonuses.push({ amount: 0.5, reason: 'escape tone exit skip/leap' });
        patterns.push({ type: 'escape_tone', bonus: 0.5, entryBonus: 0, exitBonus: 0.5, voice: 2, description: 'Escape tone (step in, skip/leap out opposite)' });
      }
    }
  }

  // PASSING/NEIGHBOR TONES: stepwise weak or accented dissonances.
  if (!patterns.length) {
    // Check V1 passing
    if (entryInfo.v1MelodicInterval !== 0 && exitInfo.v1Resolution) {
      const entryMag = getIntervalMagnitude(entryInfo.v1MelodicInterval);
      const entryDir = Math.sign(entryInfo.v1MelodicInterval);
      if (entryMag.type === 'step' && exitInfo.v1Resolution.magnitude.type === 'step' &&
          exitInfo.v1Resolution.direction === entryDir) {
        const accentedBonus = isStrongBeat(currSim.onset, ctx) ? 0.25 : 0;
        if (accentedBonus > 0) entryBonuses.push({ amount: accentedBonus, reason: 'accented passing tone' });
        bonus += accentedBonus;
        patterns.push({ type: 'passing', bonus: accentedBonus, voice: 1, description: accentedBonus > 0 ? 'Accented passing tone (stepwise through)' : 'Passing tone (stepwise through)' });
      }
    }
    // Check V2 passing
    if (!patterns.some(p => p.type === 'passing') && entryInfo.v2MelodicInterval !== 0 && exitInfo.v2Resolution) {
      const entryMag = getIntervalMagnitude(entryInfo.v2MelodicInterval);
      const entryDir = Math.sign(entryInfo.v2MelodicInterval);
      if (entryMag.type === 'step' && exitInfo.v2Resolution.magnitude.type === 'step' &&
          exitInfo.v2Resolution.direction === entryDir) {
        const accentedBonus = isStrongBeat(currSim.onset, ctx) ? 0.25 : 0;
        if (accentedBonus > 0) entryBonuses.push({ amount: accentedBonus, reason: 'accented passing tone' });
        bonus += accentedBonus;
        patterns.push({ type: 'passing', bonus: accentedBonus, voice: 2, description: accentedBonus > 0 ? 'Accented passing tone (stepwise through)' : 'Passing tone (stepwise through)' });
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
          const accentedBonus = isStrongBeat(currSim.onset, ctx) ? 0.25 : 0;
          if (accentedBonus > 0) entryBonuses.push({ amount: accentedBonus, reason: 'accented neighbor tone' });
          bonus += accentedBonus;
          patterns.push({ type: 'neighbor', bonus: accentedBonus, voice: 1, description: accentedBonus > 0 ? 'Accented neighbor tone (step out and back)' : 'Neighbor tone (step out and back)' });
        }
      }
      // Check V2
      if (!patterns.some(p => p.type === 'neighbor') && entryInfo.v2MelodicInterval !== 0 && exitInfo.v2Resolution) {
        const entryMag = getIntervalMagnitude(entryInfo.v2MelodicInterval);
        const entryDir = Math.sign(entryInfo.v2MelodicInterval);
        if (entryMag.type === 'step' && exitInfo.v2Resolution.magnitude.type === 'step' &&
            exitInfo.v2Resolution.direction === -entryDir) {
          const accentedBonus = isStrongBeat(currSim.onset, ctx) ? 0.25 : 0;
          if (accentedBonus > 0) entryBonuses.push({ amount: accentedBonus, reason: 'accented neighbor tone' });
          bonus += accentedBonus;
          patterns.push({ type: 'neighbor', bonus: accentedBonus, voice: 2, description: accentedBonus > 0 ? 'Accented neighbor tone (step out and back)' : 'Neighbor tone (step out and back)' });
        }
      }
    }
  }

  // Return pattern analysis with entry/exit bonus allocation
  return {
    bonus,
    patterns,
    entryBonuses,   // Array of {amount, reason} for entry
    exitBonuses,    // Array of {amount, reason} for exit
  };
}

/**
 * Score a consonance based on context
 * Tracks repetition and resolution quality
 */
function scoreConsonance(currSim, allSims, index, intervalHistory, ctx) {
  const intervalClass = currSim.interval.class;
  const v1Pitch = pitchName(currSim.voice1Note.pitch);
  const v2Pitch = pitchName(currSim.voice2Note.pitch);
  const intervalName = currSim.interval.toString();
  const details = [];
  let score = 0;
  let category = 'consonant_normal';

  // Check for CONSECUTIVE same intervals (not just frequency)
  // RESTS RESET THE COUNT: -1 in history = rest marker
  const isPerfect = intervalClass === 1 || intervalClass === 5 || intervalClass === 8;
  const isThird = intervalClass === 3;
  const isSixth = intervalClass === 6;

  // Count consecutive same interval class at end of history
  // Stop counting at rest markers (-1) or different intervals
  let consecutiveCount = 0;
  for (let i = intervalHistory.length - 1; i >= 0; i--) {
    if (intervalHistory[i] === -1) {
      // Rest marker - break the consecutive chain
      break;
    } else if (intervalHistory[i] === intervalClass) {
      consecutiveCount++;
    } else {
      break;
    }
  }

  // Repetition penalties:
  // - 3+ consecutive perfect intervals (unison, 5th, octave) = penalty (2 allowed)
  // - 4+ consecutive 3rds = penalty (3 allowed)
  // - 4+ consecutive 6ths = penalty (3 allowed)
  if (isPerfect && consecutiveCount >= 2) {
    // This would be the 3rd consecutive perfect
    score -= 0.5;
    category = 'consonant_repetitive';
    const intervalNames = { 1: 'unisons', 5: '5ths', 8: 'octaves' };
    details.push({
      text: `3rd+ consecutive ${intervalNames[intervalClass] || 'perfect interval'} (${v1Pitch}-${v2Pitch})`,
      impact: -0.5,
      type: 'penalty',
    });
  } else if ((isThird || isSixth) && consecutiveCount >= 3) {
    // This would be the 4th consecutive 3rd or 6th
    score -= 0.3;
    category = 'consonant_repetitive';
    details.push({
      text: `4th+ consecutive ${intervalClass}th (${v1Pitch}-${v2Pitch})`,
      impact: -0.3,
      type: 'penalty',
    });
  }

  // Check if this consonance resolves a preceding dissonance
  const prevSims = allSims.filter(s => s.onset < currSim.onset);
  const prevSim = prevSims.length > 0 ? prevSims[prevSims.length - 1] : null;

  // Check if this consonance prepares an upcoming dissonance
  const nextSims = allSims.filter(s => s.onset > currSim.onset);
  const nextSim = nextSims.length > 0 ? nextSims[0] : null;
  let isPreparation = false;
  if (nextSim) {
    let nextIsDissonant = !nextSim.interval.isConsonant();
    // P4 special case
    if (nextSim.interval.class === 4 && isP4DissonantInContext(nextSim, ctx)) {
      nextIsDissonant = true;
    }
    isPreparation = nextIsDissonant;
  }

  // If this consonance follows a dissonance, get the exit score for proper coloring
  let resolutionExitScore = undefined;
  // Check if previous interval was dissonant (including P4 in context)
  let prevWasDissonant = prevSim && !prevSim.interval.isConsonant();
  if (prevSim && prevSim.interval.class === 4 && prevSim.interval.quality === 'perfect') {
    prevWasDissonant = isP4DissonantInContext(prevSim, ctx);
  }

  if (prevWasDissonant) {
    // Score the previous dissonance to get its exit score
    const prevDissonanceScore = _scoreDissonance(prevSim, allSims, index - 1, intervalHistory, ctx);
    resolutionExitScore = prevDissonanceScore.exitScore;

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

    // Set category for resolution - use generic 'consonant_resolution'
    // Color will be determined by resolutionExitScore
    if (goodResolution) {
      category = 'consonant_resolution';
      details.push({
        text: `Resolution from ${prevInterval}: exit score ${resolutionExitScore !== undefined ? resolutionExitScore.toFixed(1) : '?'}`,
        subtext: resolutionDetails.join('; '),
        impact: 0,
        type: 'info',
      });
    } else {
      category = 'consonant_bad_resolution';
      details.push({
        text: `Weak resolution: ${prevInterval} → ${intervalName} by leap`,
        subtext: resolutionDetails.join('; '),
        impact: 0,
        type: 'info',
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

  // Mark as preparation if it precedes a dissonance (and isn't a resolution)
  if (isPreparation && category === 'consonant_normal') {
    category = 'consonant_preparation';
    details.unshift({
      text: `Preparation for upcoming dissonance`,
      impact: 0,
      type: 'info',
    });
  }

  return {
    type: 'consonant',
    category,
    score,
    exitScore: resolutionExitScore,  // NEW: exit score from previous dissonance for resolution coloring
    label: intervalClass.toString(),
    isConsonant: true,
    intervalClass,
    intervalName,
    v1Pitch,
    v2Pitch,
    details,
    resolvesDissonance: prevSim && !prevSim.interval.isConsonant(),
    isPreparation,
  };
}

/**
 * Internal scoring function that accepts a pre-built analysis context.
 * Used by analyzeAllDissonances to avoid redundant context creation.
 */
function _scoreDissonance(currSim, allSims, index, intervalHistory, ctx) {

  // Find previous and next simultaneities
  const prevSims = allSims.filter(s => s.onset < currSim.onset);
  const nextSims = allSims.filter(s => s.onset > currSim.onset);
  const prevSim = prevSims.length > 0 ? prevSims[prevSims.length - 1] : null;
  const nextSim = nextSims.length > 0 ? nextSims[0] : null;

  // Check if this is actually a dissonance
  let isDissonant = !currSim.interval.isConsonant();

  // P4 special handling - in two-voice counterpoint, P4 is generally treated as dissonant
  // because one voice is always the bass, and P4 against bass is dissonant
  // NOTE: Only applies to PERFECT 4th (P4), NOT augmented 4th (A4/tritone) which is always dissonant
  if (currSim.interval.class === 4 && currSim.interval.quality === 'perfect') {
    isDissonant = isP4DissonantInContext(currSim, ctx);
  }

  if (!isDissonant) {
    // Score as consonance with context
    return scoreConsonance(currSim, allSims, index, intervalHistory, ctx);
  }

  // Analyze rest context for entry/exit handling
  const restContext = analyzeRestContext(prevSim, currSim, nextSim);

  // Score entry (with rest context for motion modifier reduction)
  const entryInfo = scoreEntry(prevSim, currSim, restContext, ctx);

  // Score exit (with rest context for abandonment and phantom note handling)
  const exitInfo = scoreExit(currSim, nextSim, entryInfo, restContext, ctx);

  // Check patterns
  const patternInfo = checkPatterns(prevSim, currSim, nextSim, entryInfo, exitInfo, ctx);

  // P4 is less severe than other dissonances - add bonus to entry (it's a quality of the interval itself)
  const isP4 = currSim.interval.class === 4 && currSim.interval.quality === 'perfect';
  const p4Bonus = isP4 ? 0.5 : 0;

  // Cross-reference: show exit resolution penalty in the Entry section so users can
  // see that the entry leap is what drives the penalty (it's a combined entry+exit issue).
  const _xl = { skip: 'skip (3rd)', perfect_leap: 'P4/P5 leap', large_leap: 'large leap', octave: 'octave leap' };
  // Keep this finite check as a defensive guard for null/unset resolution components
  // on unresolved endpoints and any future malformed intermediate states.
  if (Number.isFinite(exitInfo.v1ResolutionComponent) && exitInfo.v1ResolutionComponent !== 0 && entryInfo.v1MelodicInterval !== 0) {
    const mag = getIntervalMagnitude(entryInfo.v1MelodicInterval);
    const c = exitInfo.v1ResolutionComponent;
    entryInfo.details.push(`V1 ${_xl[mag.type] || mag.type} → exit: ${c >= 0 ? '+' : ''}${c.toFixed(2)}`);
  }
  if (Number.isFinite(exitInfo.v2ResolutionComponent) && exitInfo.v2ResolutionComponent !== 0 && entryInfo.v2MelodicInterval !== 0) {
    const mag = getIntervalMagnitude(entryInfo.v2MelodicInterval);
    const c = exitInfo.v2ResolutionComponent;
    entryInfo.details.push(`V2 ${_xl[mag.type] || mag.type} → exit: ${c >= 0 ? '+' : ''}${c.toFixed(2)}`);
  }

  // Calculate ENTRY score: entry motion + entry-allocated pattern bonuses + P4 bonus
  const entryBonusTotal = (patternInfo.entryBonuses || []).reduce((sum, b) => sum + b.amount, 0);
  const entryScore = entryInfo.score + entryBonusTotal + p4Bonus;

  // Calculate EXIT score: exit motion + exit-allocated pattern bonuses
  const exitBonusTotal = (patternInfo.exitBonuses || []).reduce((sum, b) => sum + b.amount, 0);
  const exitScore = exitInfo.score + exitBonusTotal;

  // Total score (for backwards compatibility and overall assessment)
  const totalScore = entryScore + exitScore;

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
    entryScore,      // NEW: separate entry score for purple-red coloring
    exitScore,       // NEW: separate exit score (used for resolution coloring)
    label,
    isConsonant: false,
    interval: currSim.interval.toString(),
    intervalClass: currSim.interval.class,
    v1Pitch,
    v2Pitch,
    onset: currSim.onset,
    isStrongBeat: isStrongBeat(currSim.onset, ctx),
    entry: entryInfo,
    exit: exitInfo,
    patterns: patternInfo.patterns,
    description,
    details: [
      `Entry: ${entryScore.toFixed(1)} (base: ${entryInfo.score.toFixed(1)}${entryBonusTotal > 0 ? `, patterns: +${entryBonusTotal.toFixed(1)}` : ''}${p4Bonus > 0 ? `, P4: +${p4Bonus.toFixed(1)}` : ''})`,
      `Exit: ${exitScore.toFixed(1)} (base: ${exitInfo.score.toFixed(1)}${exitBonusTotal > 0 ? `, patterns: +${exitBonusTotal.toFixed(1)}` : ''})`,
      patternInfo.patterns.length > 0 ? `Patterns: ${patternInfo.patterns.map(p => `${p.type} (entry: +${p.entryBonus || 0}, exit: +${p.exitBonus || 0})`).join(', ')}` : null,
      `Total: ${totalScore.toFixed(1)}`,
    ].filter(Boolean),
  };
}

/**
 * Public scoring function for a single dissonance.
 * Creates an analysis context from options and delegates to internal implementation.
 *
 * @param {Simultaneity} currSim - The simultaneity to score
 * @param {Simultaneity[]} allSims - All simultaneities for context
 * @param {number} index - Index in allSims (-1 if unknown)
 * @param {number[]} intervalHistory - Previous interval classes for repetition tracking
 * @param {Object} options - Analysis options (treatP4AsDissonant, meter, sequenceBeatRanges, sequenceNoteRanges)
 */
export function scoreDissonance(currSim, allSims, index = -1, intervalHistory = [], options = {}) {
  const ctx = createAnalysisContext(options);
  return _scoreDissonance(currSim, allSims, index, intervalHistory, ctx);
}

/**
 * Analyze all intervals in a passage with context tracking
 *
 * Consecutive interval handling:
 * - Rests RESET the consecutive count (a rest breaks the continuity)
 * - Each dissonance that resolves to another dissonance receives a -0.75 penalty (in scoreExit)
 * - Consecutive dissonances compound: tracked in the summary as consecutiveDissonanceGroups
 */
export function analyzeAllDissonances(sims, options = {}) {
  const ctx = createAnalysisContext(options);
  const results = [];
  const intervalHistory = []; // Track interval classes for repetition detection

  for (let i = 0; i < sims.length; i++) {
    const sim = sims[i];

    // Check if there was a rest AND the OTHER voice completed a note during it
    // Only then do we reset consecutive count
    if (i > 0) {
      const prevSim = sims[i - 1];
      const prevV1End = prevSim.voice1Note.onset + prevSim.voice1Note.duration;
      const prevV2End = prevSim.voice2Note.onset + prevSim.voice2Note.duration;
      const currStart = sim.onset;
      const gapThreshold = 0.05;

      const v1Rested = currStart - prevV1End > gapThreshold;
      const v2Rested = currStart - prevV2End > gapThreshold;

      // Check if OTHER voice completed a note during the rest
      // V1 rested: did V2 have a note that started AND ended during V1's rest?
      // V2 rested: did V1 have a note that started AND ended during V2's rest?
      let otherVoiceCompletedNote = false;

      if (v1Rested && !v2Rested) {
        // V1 rested, check if V2 completed a note during
        // V2's current note started before V1's rest ended
        const v2NoteInGap = sim.voice2Note.onset > prevV1End && sim.voice2Note.onset < currStart;
        otherVoiceCompletedNote = v2NoteInGap;
      } else if (v2Rested && !v1Rested) {
        // V2 rested, check if V1 completed a note during
        const v1NoteInGap = sim.voice1Note.onset > prevV2End && sim.voice1Note.onset < currStart;
        otherVoiceCompletedNote = v1NoteInGap;
      }

      if ((v1Rested || v2Rested) && otherVoiceCompletedNote) {
        // Rest with other voice activity - reset consecutive counting
        intervalHistory.push(-1); // -1 = rest marker
      }
    }

    const scoring = _scoreDissonance(sim, sims, i, intervalHistory, ctx);
    const overlapEnd = Math.min(
      sim.voice1Note.onset + sim.voice1Note.duration,
      sim.voice2Note.onset + sim.voice2Note.duration
    );
    results.push({
      onset: sim.onset,
      duration: Math.max(0.25, overlapEnd - sim.onset),
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
  // Also annotate each result with chain position info
  const consecutiveGroups = [];
  let currentGroup = [];
  for (let i = 0; i < results.length; i++) {
    if (!results[i].isConsonant) {
      currentGroup.push({ index: i, onset: results[i].onset, type: results[i].type });
    } else {
      if (currentGroup.length >= 1) {
        // Mark chain positions
        for (let j = 0; j < currentGroup.length; j++) {
          const idx = currentGroup[j].index;
          results[idx].chainPosition = j; // 0 = entry
          results[idx].chainLength = currentGroup.length;
          results[idx].isChainEntry = (j === 0);
          results[idx].isConsecutiveDissonance = (j > 0);
          // Chain start/end onsets for border drawing
          results[idx].chainStartOnset = results[currentGroup[0].index].onset;
          results[idx].chainEndOnset = results[currentGroup[currentGroup.length - 1].index].onset;
        }
        // Also mark the resolution consonance as chain end
        results[i].isChainResolution = true;
        results[i].chainStartOnset = results[currentGroup[0].index].onset;
        results[i].chainEndOnset = results[currentGroup[currentGroup.length - 1].index].onset;
      }
      if (currentGroup.length >= 2) {
        consecutiveGroups.push([...currentGroup]);
      }
      currentGroup = [];
    }
  }
  // Don't forget trailing group (unresolved chain)
  if (currentGroup.length >= 1) {
    for (let j = 0; j < currentGroup.length; j++) {
      const idx = currentGroup[j].index;
      results[idx].chainPosition = j;
      results[idx].chainLength = currentGroup.length;
      results[idx].isChainEntry = (j === 0);
      results[idx].isConsecutiveDissonance = (j > 0);
      results[idx].chainStartOnset = results[currentGroup[0].index].onset;
      results[idx].chainEndOnset = results[currentGroup[currentGroup.length - 1].index].onset;
      results[idx].chainUnresolved = true;
    }
  }
  if (currentGroup.length >= 2) {
    consecutiveGroups.push([...currentGroup]);
  }

  // Pass 1: Compute and store passingness for ALL dissonances (not just consecutive ones).
  // Done before applying any mitigations so that chain entries can reference the
  // already-computed passingness of their successor (needed for rule c below).
  for (let i = 0; i < results.length; i++) {
    if (!results[i].isConsonant) {
      const sim = sims[i];
      const prevSim = i > 0 ? sims[i - 1] : null;
      const nextSim = i < sims.length - 1 ? sims[i + 1] : null;

      // Reuse already-computed melodic intervals and motion from scoreEntry
      const v1Interval = results[i].entry?.v1MelodicInterval ?? 0;
      const v2Interval = results[i].entry?.v2MelodicInterval ?? 0;
      const entryMotion = results[i].entry?.motion ?? { type: 'unknown' };

      const prevPrevSim = i > 1 ? sims[i - 2] : null;
      const prevV1Interval = prevPrevSim && prevSim ? prevSim.voice1Note.pitch - prevPrevSim.voice1Note.pitch : null;
      const prevV2Interval = prevPrevSim && prevSim ? prevSim.voice2Note.pitch - prevPrevSim.voice2Note.pitch : null;

      const v1Passing = scorePassingMotion(sim, prevSim, nextSim, v1Interval, prevV1Interval, null, entryMotion, ctx);
      const v2Passing = scorePassingMotion(sim, prevSim, nextSim, v2Interval, prevV2Interval, null, entryMotion, ctx);
      const bestPassing = v1Passing.passingness >= v2Passing.passingness ? v1Passing : v2Passing;

      // Store all three so the mitigation pass can use per-voice values
      results[i].passingMotion = bestPassing;
      results[i].v1PassingMotion = v1Passing;
      results[i].v2PassingMotion = v2Passing;

      // Consecutive-only bookkeeping (chain mitigation count, stretto viability flag)
      if (results[i].isConsecutiveDissonance) {
        let mitigationCount = 0;
        if (bestPassing.isPassing) mitigationCount++;
        if (isOnsetInSequence(sim.onset, ctx)) mitigationCount++;
        if (results[i].patterns && results[i].patterns.length > 0) mitigationCount++;
        results[i].consecutiveMitigationCount = mitigationCount;
        results[i].consecutiveMitigation = bestPassing.mitigation;

        // Flag as passing motion for stretto viability (passing D→D is a minor issue only)
        results[i].isPassing = bestPassing.isPassing;
      }
    }
  }

  // Pass 2: Apply passingness mitigations per score component.
  //
  // Each component gets the mitigation appropriate to its voice(s) and sign:
  // (a) Between-voice motion PENALTIES (parallel, similar entry): mitigate with bestPassing,
  //     cap at 0 (never flip to reward)
  // (b) Between-voice motion REWARDS (oblique, contrary entry): reduce by min(0.8, mit/2.5),
  //     floor at 0 (never flip to penalty)
  // (a) V1 single-voice motion PENALTIES (V1 exit resolution): mitigate with v1Passing
  // (a) V2 single-voice motion PENALTIES (V2 exit resolution): mitigate with v2Passing
  // (c) D→D base exit penalty on a consecutive member (middle of 3+ chain):
  //     mitigate with bestPassing, cap at 0 (potentially complete)
  // (c) D→D base exit penalty on the chain ENTRY: the -0.75 lives here, not on the
  //     non-entry member; mitigate using the next (consecutive) member's bestPassing
  //
  // NOT touched: strong-beat meter penalty, consonance resolution reward,
  //              abandonment/rest penalties, pattern bonuses
  for (let i = 0; i < results.length; i++) {
    if (!results[i].isConsonant && results[i].passingMotion) {
      const bestPassing = results[i].passingMotion;
      const v1Passing = results[i].v1PassingMotion;
      const v2Passing = results[i].v2PassingMotion;
      if (!bestPassing) continue;

      const entryMotionComp = results[i].entry?.motionComponent || 0;
      const v1ResComp = results[i].exit?.v1ResolutionComponent || 0;
      const v2ResComp = results[i].exit?.v2ResolutionComponent || 0;

      let entryAdj = 0;
      let exitAdj = 0;
      const adjDetails = [];

      // (a/b) Between-voice entry motion component
      if (entryMotionComp < 0 && bestPassing.mitigation > 0) {
        const mitigated = Math.min(0, entryMotionComp + bestPassing.mitigation);
        entryAdj += mitigated - entryMotionComp;
        adjDetails.push(`entry motion (${bestPassing.mitigation.toFixed(2)}): +${(mitigated - entryMotionComp).toFixed(2)}`);
      } else if (entryMotionComp > 0 && bestPassing.mitigation > 0) {
        const reduction = Math.min(entryMotionComp, Math.min(0.8, bestPassing.mitigation / 2.5));
        entryAdj -= reduction;
        adjDetails.push(`entry reward reduction: -${reduction.toFixed(2)}`);
      }

      // (a) V1 single-voice exit motion penalties
      if (v1ResComp < 0 && v1Passing.mitigation > 0) {
        const mitigated = Math.min(0, v1ResComp + v1Passing.mitigation);
        exitAdj += mitigated - v1ResComp;
        adjDetails.push(`V1 resolution (${v1Passing.mitigation.toFixed(2)}): +${(mitigated - v1ResComp).toFixed(2)}`);
      }

      // (a) V2 single-voice exit motion penalties
      if (v2ResComp < 0 && v2Passing.mitigation > 0) {
        const mitigated = Math.min(0, v2ResComp + v2Passing.mitigation);
        exitAdj += mitigated - v2ResComp;
        adjDetails.push(`V2 resolution (${v2Passing.mitigation.toFixed(2)}): +${(mitigated - v2ResComp).toFixed(2)}`);
      }

      // (c) D→D penalty — only for consecutive members (middle of 3+ chains)
      if (results[i].isConsecutiveDissonance) {
        const ddComp = results[i].exit?.baseExitComponent || 0;
        if (ddComp < 0 && bestPassing.mitigation > 0) {
          const mitigated = Math.min(0, ddComp + bestPassing.mitigation);
          exitAdj += mitigated - ddComp;
          adjDetails.push(`D→D (own exit, ${bestPassing.mitigation.toFixed(2)}): +${(mitigated - ddComp).toFixed(2)}`);
        }
      }

      const totalAdj = entryAdj + exitAdj;
      if (Math.abs(totalAdj) > 0.005) {
        results[i].score += totalAdj;
        results[i].entryScore += entryAdj;
        results[i].exitScore += exitAdj;
        results[i].passingCharacterAdj = totalAdj;
        const label = bestPassing.isPassing ? 'passing motion' : 'partial passing';
        results[i].details.push(
          `Passing character (${label}): +${totalAdj.toFixed(2)} [${adjDetails.join(', ')}]`
        );
      }

    } else if (results[i].isChainEntry && results[i].chainLength > 1) {
      // (c) The chain entry's D→D exit penalty (-0.75) is mitigated by the passingness
      // of the immediately following consecutive member (i+1 in results, since consecutive
      // dissonances are always adjacent simultaneities).
      const nextIdx = i + 1;
      if (nextIdx < results.length && results[nextIdx].isConsecutiveDissonance && results[nextIdx].passingMotion) {
        const nextBestPassing = results[nextIdx].passingMotion;
        const ddComp = results[i].exit?.baseExitComponent || 0;
        if (ddComp < 0 && nextBestPassing.mitigation > 0) {
          const mitigated = Math.min(0, ddComp + nextBestPassing.mitigation);
          const adj = mitigated - ddComp;
          if (Math.abs(adj) > 0.005) {
            results[i].score += adj;
            results[i].exitScore += adj;
            results[i].passingCharacterAdj = (results[i].passingCharacterAdj || 0) + adj;
            const label = nextBestPassing.isPassing ? 'next passing' : 'next partial passing';
            results[i].details.push(
              `D→D penalty mitigated (${label}, ${nextBestPassing.mitigation.toFixed(2)}): +${adj.toFixed(2)}`
            );
          }
        }
      }
    }
  }

  // Duration-weighted average across ALL intervals (same formula as TwoVoiceViz badge).
  // Consonances are scored 0.2–0.5 by type; dissonances use their actual score.
  let _totalW = 0, _totalD = 0;
  for (const r of results) {
    const dur = Math.max(0.25, r.duration || 0.25);
    _totalD += dur;
    if (r.isConsonant) {
      const base = [3, 6].includes(r.intervalClass) ? 0.5
        : r.intervalClass === 5 ? 0.3
        : r.intervalClass === 4 ? 0.25
        : 0.2;
      _totalW += base * dur;
    } else {
      _totalW += (r.score || 0) * dur;
    }
  }
  const overallAvgScore = _totalD > 0 ? _totalW / _totalD : 0;

  return {
    all: results,
    consonances,
    dissonances,
    summary: {
      totalIntervals: results.length,
      totalConsonances: consonances.length,
      totalDissonances: dissonances.length,
      repetitiveConsonances: repetitiveConsonances.length,
      // Recompute good/bad counts and averageScore using post-mitigation scores
      goodCount: dissonances.filter(d => d.score >= 0).length,
      badCount: dissonances.filter(d => d.score < 0).length,
      averageScore: dissonances.length > 0
        ? dissonances.reduce((sum, d) => sum + d.score, 0) / dissonances.length
        : 0,
      // Duration-weighted average across all intervals — matches the TwoVoiceViz badge score
      overallAvgScore,
      typeCounts,
      allPatterns, // All recognized ornamental patterns
      consecutiveDissonanceGroups: consecutiveGroups, // Groups of 2+ adjacent dissonances
    },
  };
}
