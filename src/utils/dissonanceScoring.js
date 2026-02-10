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
  // P4 is ALWAYS dissonant in two-voice counterpoint
  // (one voice is always the bass, and P4 against bass is dissonant)
  // It's just scored less severely than other dissonances
  return true;
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

  // Motion scoring
  if (motion.type === 'oblique') {
    const adj = 0.5;
    score += adj;
    details.push(`Oblique motion: +${adj.toFixed(2)}`);
  } else if (motion.type === 'contrary') {
    const adj = 0.5;
    score += adj;
    details.push(`Contrary motion: +${adj.toFixed(2)}`);
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
    details.push(`Similar motion: ${adj.toFixed(2)}${restNote}`);
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
    return { score: -1.0, details: ['Unresolved (no following note)'], motion: null, v1Resolution: null, v2Resolution: null, resolvedByAbandonment: false };
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

  if (isImperfectConsonance) {
    score = 1.0;
    details.push('Resolves to imperfect consonance: +1.0');
  } else if (isPerfectConsonance) {
    score = 0.5;
    details.push('Resolves to perfect consonance: +0.5');
  } else if (isConsonant) {
    // Other consonances (should not reach here in two-voice counterpoint)
    score = 0.5;
    details.push('Resolves to consonance: +0.5');
  } else {
    // Resolution to another dissonance
    // Short note + off-beat: halve the penalty (two quick consecutive dissonances on off-beats not a big deal)
    const shortNoteInfo = getShortNoteInfo(currSim, ctx);
    const isOffBeat = currSim.metricWeight < 0.75;
    if (shortNoteInfo.isShort && isOffBeat) {
      score = -0.375; // Halved penalty
      details.push('Leads to another dissonance: -0.375 (short note on off-beat - halved)');
    } else {
      score = -0.75;
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
function checkPatterns(prevSim, currSim, nextSim, entryInfo, exitInfo, ctx) {
  const patterns = [];

  if (!prevSim || !nextSim || !entryInfo || !exitInfo) {
    return { bonus: 0, patterns: [] };
  }

  let bonus = 0;

  // SUSPENSION: Entry=Oblique+Strong, Exit=Step Down by the voice that held
  if (entryInfo.motion.type === 'oblique' && isStrongBeat(currSim.onset, ctx)) {
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
  if (isStrongBeat(currSim.onset, ctx)) {
    // Check if V1 leaped in and steps out opposite
    if (entryInfo.v1MelodicInterval !== 0) {
      const entryMag = getIntervalMagnitude(entryInfo.v1MelodicInterval);
      if ((entryMag.type === 'skip' || entryMag.type === 'perfect_leap' || entryMag.type === 'large_leap') && exitInfo.v1Resolution) {
        const entryDir = Math.sign(entryInfo.v1MelodicInterval);
        if (exitInfo.v1Resolution.magnitude.type === 'step' && exitInfo.v1Resolution.direction === -entryDir) {
          bonus += 2.5;
          patterns.push({ type: 'appoggiatura', bonus: 2.0, voice: 1, description: 'Appoggiatura (V1 leaps in, steps out opposite)' });
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
          patterns.push({ type: 'appoggiatura', bonus: 2.0, voice: 2, description: 'Appoggiatura (V2 leaps in, steps out opposite)' });
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
    const isWeakBeat = !isStrongBeat(currSim.onset, ctx);

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
  if (!isStrongBeat(currSim.onset, ctx) && !patterns.length) {
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
  if (entryInfo.motion.type === 'oblique' && !isStrongBeat(currSim.onset, ctx) && exitInfo.motion.type === 'oblique') {
    patterns.push({ type: 'anticipation', bonus: 0, description: 'Anticipation (oblique entry and exit on weak beat)' });
  }

  return { bonus, patterns };
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

    // Resolution quality tracked for visualization but no score impact
    // (already scored in the dissonance's exit scoring - avoid double counting)
    if (goodResolution) {
      category = 'consonant_good_resolution';
      details.push({
        text: `Good resolution: ${prevInterval} (${prevV1}/${prevV2}) → ${intervalName} (${v1Pitch}/${v2Pitch})`,
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

  // Calculate total score
  let totalScore = entryInfo.score + exitInfo.score + patternInfo.bonus;

  // P4 is less severe than other dissonances - add bonus
  // P4 (perfect 4th) has interval class 4 and quality 'perfect'
  const isP4 = currSim.interval.class === 4 && currSim.interval.quality === 'perfect';
  let p4Bonus = 0;
  if (isP4) {
    p4Bonus = 0.5; // P4 is milder dissonance
    totalScore += p4Bonus;
  }

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
    isStrongBeat: isStrongBeat(currSim.onset, ctx),
    entry: entryInfo,
    exit: exitInfo,
    patterns: patternInfo.patterns,
    description,
    details: [
      `Entry: ${entryInfo.score.toFixed(1)} (${entryInfo.details.join(', ')})`,
      `Exit: ${exitInfo.score.toFixed(1)} (${exitInfo.details.join(', ')})`,
      patternInfo.patterns.length > 0 ? `Pattern: ${patternInfo.patterns.map(p => `${p.type} +${p.bonus}`).join(', ')}` : 'No pattern match',
      isP4 ? `P4 (mild dissonance): +${p4Bonus.toFixed(1)}` : null,
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
