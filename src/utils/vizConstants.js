/**
 * Shared visualization constants and utilities
 */

// Unified semantic color scheme - muted, professional palette
export const VIZ_COLORS = {
  // Consonance colors (updated per spec)
  perfectConsonant: '#2dd4bf',    // Teal-400 - blue-green for P1, P5, P8
  imperfectConsonant: '#84cc16',  // Lime-500 - yellow-green for 3rds, 6ths
  repeatedInterval: '#a3a3a3',    // Neutral-400 - grey for repeated/unison same pitch
  consonant: '#84cc16',           // Alias for imperfect (backwards compat)

  // Dissonance colors - gradient from well-handled to problematic
  dissonantStrong: '#8b5cf6',     // Violet-500 - well-handled dissonance (score >= 2)
  dissonantGood: '#a78bfa',       // Violet-400 - good dissonance handling (score >= 1)
  dissonantAcceptable: '#c4b5fd', // Violet-300 - acceptable (score >= 0)
  dissonantMarginal: '#e879f9',   // Fuchsia-400 - marginal (score >= -1)
  dissonantWeak: '#fb923c',       // Orange-400 - weak handling (score > -2)
  dissonantProblematic: '#f87171',// Red-400 - problematic (score > -3)
  dissonantSevere: '#ef4444',     // Red-500 - severe issues (score <= -3)

  // Problem indicators - bright and prominent
  parallelFifthsOctaves: '#dc2626', // Red-600 - bright red for parallel 5ths/8ves
  unresolvedDissonance: '#f59e0b',  // Amber-500 - warning orange for unresolved

  // Semi-transparent fills for interval regions (always visible, subtle)
  perfectFill: 'rgba(45, 212, 191, 0.20)',      // Teal, slightly more visible
  imperfectFill: 'rgba(132, 204, 22, 0.18)',    // Lime
  repeatedFill: 'rgba(163, 163, 163, 0.15)',    // Grey
  consonantFill: 'rgba(132, 204, 22, 0.18)',    // Alias
  dissonantGoodFill: 'rgba(139, 92, 246, 0.22)',
  dissonantMarginalFill: 'rgba(232, 121, 249, 0.22)',
  dissonantBadFill: 'rgba(251, 146, 60, 0.25)',
  dissonantSevereFill: 'rgba(248, 113, 113, 0.28)',

  // Problem fills - more prominent
  parallelFill: 'rgba(220, 38, 38, 0.35)',      // Bright red fill
  unresolvedFill: 'rgba(245, 158, 11, 0.30)',   // Warning orange fill

  // Voice colors (muted, distinct)
  voiceSubject: '#6366f1',        // Indigo-500 - subject
  voiceAnswer: '#f97316',         // Orange-500 - answer
  voiceCS: '#10b981',             // Emerald-500 - countersubject
  voiceDux: '#6366f1',            // Alias for subject
  voiceComes: '#f97316',          // Alias for answer
  voiceCSAbove: '#10b981',        // Emerald-500 - countersubject (softer green)
  voiceCSBelow: '#f59e0b',        // Amber-500 - countersubject below (inverted)

  // UI state colors - very subtle backgrounds
  issueBackground: '#fef2f2',
  issueBorder: '#fecaca',
  issueText: '#991b1b',
  warningBackground: '#fefce8',
  warningBorder: '#fef08a',
  warningText: '#854d0e',
  cleanBackground: '#f0fdf4',
  cleanBorder: '#bbf7d0',
  cleanText: '#166534',

  // Grid colors
  gridDownbeat: '#64748b',
  gridMainBeat: '#94a3b8',
  gridSubdivision: '#e2e8f0',

  // Highlight
  highlight: '#fbbf24',           // Amber-400

  // Sequence border
  sequenceBorder: '#8b5cf6',      // Violet-500 for sequence highlighting
};

/**
 * Get interval style based on consonance, score, and resolution status
 * @param {Object} options - { isConsonant, isPerfect, score, category, isRepeated, isResolved, isParallel }
 * @returns {Object} { color, bg, fill, label, borderStyle, borderWidth, opacity }
 */
export function getIntervalStyle({
  isConsonant,
  isPerfect,
  score = 0,
  category,
  isRepeated = false,
  isResolved = true,
  isParallel = false
}) {
  // Problem indicators take precedence
  if (isParallel) {
    return {
      color: VIZ_COLORS.parallelFifthsOctaves,
      bg: '#fecaca',
      fill: VIZ_COLORS.parallelFill,
      label: 'Parallel 5th/8ve',
      borderStyle: 'solid',
      borderWidth: 3,
      opacity: 0.9,
    };
  }

  if (isConsonant) {
    // Check for specific categories first
    if (category === 'consonant_preparation') {
      return {
        color: '#0891b2',
        bg: '#cffafe',
        fill: 'rgba(45, 212, 191, 0.35)',
        label: 'Preparation',
        borderStyle: 'solid',
        borderWidth: 1,
        opacity: 0.7,
      };
    }
    if (category === 'consonant_good_resolution') {
      return {
        color: VIZ_COLORS.perfectConsonant,
        bg: '#ccfbf1',
        fill: 'rgba(45, 212, 191, 0.45)', // Brighter/more saturated for good resolution
        label: 'Good resolution',
        borderStyle: 'solid',
        borderWidth: 2,
        opacity: 0.85,
      };
    }
    if (category === 'consonant_bad_resolution') {
      return {
        color: VIZ_COLORS.unresolvedDissonance,
        bg: '#fed7aa',
        fill: VIZ_COLORS.unresolvedFill,
        label: 'Poor resolution',
        borderStyle: 'dashed',
        borderWidth: 2,
        opacity: 0.6,
      };
    }

    // Repeated interval (same pitch class) - greyer
    if (isRepeated) {
      return {
        color: VIZ_COLORS.repeatedInterval,
        bg: '#e5e5e5',
        fill: VIZ_COLORS.repeatedFill,
        label: 'Repeated',
        borderStyle: 'solid',
        borderWidth: 1,
        opacity: 0.5,
      };
    }

    // Perfect consonance (P1, P5, P8) - blue-green teal
    if (isPerfect) {
      return {
        color: VIZ_COLORS.perfectConsonant,
        bg: '#ccfbf1',
        fill: VIZ_COLORS.perfectFill,
        label: 'Perfect',
        borderStyle: 'solid',
        borderWidth: 1,
        opacity: 0.6,
      };
    }

    // Imperfect consonance (3rds, 6ths) - yellow-green lime
    return {
      color: VIZ_COLORS.imperfectConsonant,
      bg: '#ecfccb',
      fill: VIZ_COLORS.imperfectFill,
      label: 'Consonant',
      borderStyle: 'solid',
      borderWidth: 1,
      opacity: 0.6,
    };
  }

  // Dissonant - grade by score, with resolution status affecting border/saturation
  const baseResolutionStyle = isResolved
    ? { borderStyle: 'solid', borderWidth: 1, opacity: 0.7 }
    : { borderStyle: 'dashed', borderWidth: 2, opacity: 0.55 };

  if (score >= 2.0) {
    return {
      color: VIZ_COLORS.dissonantStrong,
      bg: '#ddd6fe',
      fill: VIZ_COLORS.dissonantGoodFill,
      label: 'Strong',
      ...baseResolutionStyle,
      opacity: isResolved ? 0.75 : 0.55,
    };
  }
  if (score >= 1.0) {
    return {
      color: VIZ_COLORS.dissonantGood,
      bg: '#ede9fe',
      fill: VIZ_COLORS.dissonantGoodFill,
      label: 'Good',
      ...baseResolutionStyle,
      opacity: isResolved ? 0.7 : 0.5,
    };
  }
  if (score >= 0) {
    return {
      color: VIZ_COLORS.dissonantAcceptable,
      bg: '#f3f0ff',
      fill: VIZ_COLORS.dissonantGoodFill,
      label: 'Acceptable',
      ...baseResolutionStyle,
      opacity: isResolved ? 0.65 : 0.45,
    };
  }
  if (score >= -1.0) {
    return {
      color: VIZ_COLORS.dissonantMarginal,
      bg: '#fae8ff',
      fill: VIZ_COLORS.dissonantMarginalFill,
      label: 'Marginal',
      ...baseResolutionStyle,
      opacity: isResolved ? 0.65 : 0.45,
    };
  }
  if (score >= -2.0) {
    return {
      color: VIZ_COLORS.dissonantWeak,
      bg: '#ffedd5',
      fill: VIZ_COLORS.dissonantBadFill,
      label: 'Weak',
      borderStyle: 'dashed',
      borderWidth: 2,
      opacity: 0.6,
    };
  }
  if (score >= -3.0) {
    return {
      color: VIZ_COLORS.dissonantProblematic,
      bg: '#fee2e2',
      fill: VIZ_COLORS.dissonantSevereFill,
      label: 'Problematic',
      borderStyle: 'dashed',
      borderWidth: 2,
      opacity: 0.7,
    };
  }
  return {
    color: VIZ_COLORS.dissonantSevere,
    bg: '#fecaca',
    fill: VIZ_COLORS.dissonantSevereFill,
    label: 'Severe',
    borderStyle: 'dashed',
    borderWidth: 3,
    opacity: 0.8,
  };
}

/**
 * Calculate grid metrics from meter for visualization
 * @param {number[]} meter - [numerator, denominator] e.g. [4, 4] or [6, 8]
 * @returns {Object} Grid configuration
 */
export function getGridMetrics(meter) {
  const [num, denom] = meter;

  // Internal units (quarter notes) per measure
  const unitsPerMeasure = (num * 4) / denom;

  // Is this a compound meter? (6/8, 9/8, 12/8)
  const isCompound = (num % 3 === 0 && denom === 8 && num >= 6);

  // Main beats per measure
  const beatsPerMeasure = isCompound ? num / 3 : num;

  // Internal units per main beat
  const unitsPerBeat = isCompound ? 1.5 : (4 / denom);

  // Subdivisions to show (for sub-beat grid lines)
  const subdivisionsPerBeat = isCompound ? 3 : 2;

  return {
    unitsPerMeasure,
    isCompound,
    beatsPerMeasure,
    unitsPerBeat,
    subdivisionsPerBeat,
  };
}

/**
 * Get measure number for a given onset (1-indexed)
 * @param {number} onset - Time in internal units (quarter notes)
 * @param {number} unitsPerMeasure - From getGridMetrics
 * @returns {number} Measure number (1, 2, 3, ...)
 */
export function getMeasureNumber(onset, unitsPerMeasure) {
  return Math.floor(onset / unitsPerMeasure) + 1;
}

/**
 * Get beat within measure (1-indexed)
 * @param {number} onset - Time in internal units
 * @param {Object} gridMetrics - From getGridMetrics
 * @returns {number} Beat number within measure (1, 2, 3, ...)
 */
export function getBeatInMeasure(onset, gridMetrics) {
  const posInMeasure = onset % gridMetrics.unitsPerMeasure;
  return Math.floor(posInMeasure / gridMetrics.unitsPerBeat) + 1;
}

/**
 * Check if onset is a downbeat (first beat of measure)
 * @param {number} onset - Time in internal units
 * @param {number} unitsPerMeasure - From getGridMetrics
 * @returns {boolean}
 */
export function isDownbeat(onset, unitsPerMeasure) {
  // Allow small tolerance for floating point
  const posInMeasure = onset % unitsPerMeasure;
  return posInMeasure < 0.01 || (unitsPerMeasure - posInMeasure) < 0.01;
}

/**
 * Check if onset is a main beat (not just subdivision)
 * @param {number} onset - Time in internal units
 * @param {Object} gridMetrics - From getGridMetrics
 * @returns {boolean}
 */
export function isMainBeat(onset, gridMetrics) {
  const posInMeasure = onset % gridMetrics.unitsPerMeasure;
  const posInBeat = posInMeasure % gridMetrics.unitsPerBeat;
  return posInBeat < 0.01 || (gridMetrics.unitsPerBeat - posInBeat) < 0.01;
}

/**
 * Generate grid line data for a visualization
 * @param {number} maxTime - Maximum time to show
 * @param {number[]} meter - [numerator, denominator]
 * @param {Object} options - { showSubdivisions: boolean }
 * @returns {Array} Array of { time, isDownbeat, isMainBeat, measureNum, beatNum }
 */
export function generateGridLines(maxTime, meter, options = {}) {
  const { showSubdivisions = false } = options;
  const metrics = getGridMetrics(meter);
  const lines = [];

  // Step size: smallest unit to show
  const step = showSubdivisions
    ? metrics.unitsPerBeat / metrics.subdivisionsPerBeat
    : metrics.unitsPerBeat;

  let measureNum = 1;

  for (let t = 0; t <= maxTime + 0.01; t += step) {
    const atDownbeat = isDownbeat(t, metrics.unitsPerMeasure);
    const atMainBeat = isMainBeat(t, metrics);

    if (atDownbeat && t > 0) {
      measureNum++;
    }

    lines.push({
      time: t,
      isDownbeat: atDownbeat,
      isMainBeat: atMainBeat,
      measureNum: atDownbeat ? measureNum : null,
      beatNum: atMainBeat && !atDownbeat ? getBeatInMeasure(t, metrics) : null,
    });
  }

  return lines;
}

/**
 * Get interval name from semitones
 * @param {number} semitones - Signed number of semitones (positive = up)
 * @returns {string} Interval name like "P5 up", "m3 down", "P8 up"
 */
export function getIntervalName(semitones) {
  if (semitones === 0) return 'Unison';

  const direction = semitones > 0 ? 'up' : 'down';
  const absSemi = Math.abs(semitones);

  // Handle compound intervals (larger than octave)
  const octaves = Math.floor(absSemi / 12);
  const simpleSemi = absSemi % 12;

  const intervalNames = {
    0: 'P1',
    1: 'm2',
    2: 'M2',
    3: 'm3',
    4: 'M3',
    5: 'P4',
    6: 'TT', // Tritone
    7: 'P5',
    8: 'm6',
    9: 'M6',
    10: 'm7',
    11: 'M7',
  };

  if (octaves === 0) {
    return `${intervalNames[simpleSemi]} ${direction}`;
  } else if (simpleSemi === 0) {
    return octaves === 1 ? `P8 ${direction}` : `${octaves} octaves ${direction}`;
  } else {
    const octaveStr = octaves === 1 ? '+P8' : `+${octaves}×P8`;
    return `${intervalNames[simpleSemi]}${octaveStr} ${direction}`;
  }
}

/**
 * Get sequence styling for notes within a detected sequence
 * @param {boolean} isInSequence - Whether note is part of a sequence
 * @param {boolean} isActiveSequence - Whether this sequence is currently selected/active
 * @returns {Object} Style properties for the sequence border
 */
export function getSequenceStyle(isInSequence, isActiveSequence = false) {
  if (!isInSequence) {
    return { border: 'none', boxShadow: 'none' };
  }

  if (isActiveSequence) {
    return {
      border: `2px solid ${VIZ_COLORS.sequenceBorder}`,
      boxShadow: `0 0 4px ${VIZ_COLORS.sequenceBorder}`,
      borderRadius: '2px',
    };
  }

  return {
    border: `1px dashed ${VIZ_COLORS.sequenceBorder}`,
    boxShadow: 'none',
    borderRadius: '2px',
  };
}

/**
 * Check if an interval represents parallel 5ths or 8ves
 * @param {Object} prevInterval - Previous interval point
 * @param {Object} currInterval - Current interval point
 * @returns {boolean}
 */
export function isParallelFifthOrOctave(prevInterval, currInterval) {
  if (!prevInterval || !currInterval) return false;

  const prevClass = prevInterval.intervalClass;
  const currClass = currInterval.intervalClass;

  // Both must be perfect 5ths (7 semitones / class 5) or octaves (12 semitones / class 1/8)
  const isPerfectFifth = (ic) => ic === 5 || ic === 7;
  const isPerfectOctave = (ic) => ic === 1 || ic === 8 || ic === 0;

  // Parallel 5ths
  if (isPerfectFifth(prevClass) && isPerfectFifth(currClass)) {
    // Check both voices moved in same direction
    const v1Moved = currInterval.v1Pitch !== prevInterval.v1Pitch;
    const v2Moved = currInterval.v2Pitch !== prevInterval.v2Pitch;
    if (v1Moved && v2Moved) {
      const v1Dir = Math.sign(currInterval.v1Pitch - prevInterval.v1Pitch);
      const v2Dir = Math.sign(currInterval.v2Pitch - prevInterval.v2Pitch);
      if (v1Dir === v2Dir) return true;
    }
  }

  // Parallel octaves/unisons
  if (isPerfectOctave(prevClass) && isPerfectOctave(currClass)) {
    const v1Moved = currInterval.v1Pitch !== prevInterval.v1Pitch;
    const v2Moved = currInterval.v2Pitch !== prevInterval.v2Pitch;
    if (v1Moved && v2Moved) {
      const v1Dir = Math.sign(currInterval.v1Pitch - prevInterval.v1Pitch);
      const v2Dir = Math.sign(currInterval.v2Pitch - prevInterval.v2Pitch);
      if (v1Dir === v2Dir) return true;
    }
  }

  return false;
}
