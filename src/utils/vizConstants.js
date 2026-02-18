/**
 * Shared visualization constants and utilities
 */

// Unified semantic color scheme - NEW SYSTEM:
// A) Dissonances: purple → red (based on ENTRY score + pattern bonus)
// B) Consonant resolutions: emerald → amber (based on EXIT score)
// C) Red reserved for: parallel fifths/octaves, consecutive non-passing dissonances
export const VIZ_COLORS = {
  // Consonance colors (for standalone consonances, not resolutions)
  perfectConsonant: '#14b8a6',    // Teal-500 - for P1, P5, P8
  imperfectConsonant: '#84cc16',  // Lime-500 - for 3rds, 6ths
  repeatedInterval: '#a3a3a3',    // Neutral-400 - grey for repeated
  consonant: '#84cc16',           // Alias for imperfect

  // DISSONANCE colors (purple → red based on entry + pattern score)
  // Blue-purple if well-entered/patterned, red-purple if poorly entered
  // Score 0 is on the red side of purple
  dissonantExcellent: '#6366f1',  // Indigo-500 - excellent entry+pattern (score >= 2.0)
  dissonantVeryGood: '#7c3aed',   // Violet-600 - very good (score >= 1.5)
  dissonantGood: '#8b5cf6',       // Violet-500 - good (score >= 1.0)
  dissonantAcceptable: '#a855f7', // Purple-500 - acceptable (score >= 0.5)
  dissonantMarginal: '#c026d3',   // Fuchsia-600 - marginal (score >= 0)
  dissonantPoor: '#db2777',       // Pink-600 - poor, red side of purple (score >= -0.5)
  dissonantBad: '#e11d48',        // Rose-600 - bad (score >= -1.0)
  dissonantVeryBad: '#dc2626',    // Red-600 - very bad (score < -1.0)

  // RESOLUTION colors (emerald → amber based on exit score)
  // Only as bad as amber, never red (red reserved for violations)
  resolutionExcellent: '#10b981',  // Emerald-500 - excellent resolution (score >= 1.0)
  resolutionVeryGood: '#22c55e',   // Green-500 - very good (score >= 0.75)
  resolutionGood: '#84cc16',       // Lime-500 - good (score >= 0.5)
  resolutionAcceptable: '#eab308', // Yellow-500 - acceptable (score >= 0.25)
  resolutionMarginal: '#f59e0b',   // Amber-500 - marginal (score >= 0)
  resolutionPoor: '#f97316',       // Orange-500 - poor (score >= -0.5)
  resolutionWeak: '#fb923c',       // Orange-400 - weak (score < -0.5)

  // VIOLATION colors - RED reserved for serious issues
  parallelFifthsOctaves: '#dc2626', // Red-600 - parallel 5ths/8ves
  consecutiveDissonance: '#ef4444', // Red-500 - consecutive non-passing dissonances
  unresolvedDissonance: '#f59e0b',  // Amber-500 - unresolved

  // Semi-transparent fills for interval regions
  perfectFill: 'rgba(20, 184, 166, 0.20)',      // Teal
  imperfectFill: 'rgba(132, 204, 22, 0.18)',    // Lime
  repeatedFill: 'rgba(163, 163, 163, 0.15)',    // Grey
  consonantFill: 'rgba(132, 204, 22, 0.18)',    // Alias

  // Dissonance fills (purple spectrum) — high opacity to show over note bars
  dissonantExcellentFill: 'rgba(99, 102, 241, 0.72)',   // Indigo
  dissonantGoodFill: 'rgba(139, 92, 246, 0.70)',        // Violet
  dissonantMarginalFill: 'rgba(192, 38, 211, 0.68)',    // Fuchsia
  dissonantBadFill: 'rgba(219, 39, 119, 0.72)',         // Pink
  dissonantVeryBadFill: 'rgba(220, 38, 38, 0.75)',      // Red

  // Resolution fills (green to amber spectrum)
  resolutionExcellentFill: 'rgba(16, 185, 129, 0.22)',  // Emerald
  resolutionGoodFill: 'rgba(132, 204, 22, 0.20)',       // Lime
  resolutionMarginalFill: 'rgba(245, 158, 11, 0.22)',   // Amber
  resolutionPoorFill: 'rgba(251, 146, 60, 0.24)',       // Orange

  // Violation fills - prominent red
  parallelFill: 'rgba(220, 38, 38, 0.35)',              // Bright red
  unresolvedFill: 'rgba(245, 158, 11, 0.30)',           // Amber

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
 * Get dissonance color based on entry + pattern score (purple → red spectrum)
 * Blue-purple if well-entered/patterned, red-purple if poorly entered
 * Score 0 is on the red side of purple
 */
function getDissonanceColorByEntryScore(score) {
  if (score >= 2.0) return { color: VIZ_COLORS.dissonantExcellent, fill: VIZ_COLORS.dissonantExcellentFill, label: 'Excellent' };
  if (score >= 1.5) return { color: VIZ_COLORS.dissonantVeryGood, fill: VIZ_COLORS.dissonantExcellentFill, label: 'Very good' };
  if (score >= 1.0) return { color: VIZ_COLORS.dissonantGood, fill: VIZ_COLORS.dissonantGoodFill, label: 'Good' };
  if (score >= 0.5) return { color: VIZ_COLORS.dissonantAcceptable, fill: VIZ_COLORS.dissonantGoodFill, label: 'Acceptable' };
  if (score >= 0) return { color: VIZ_COLORS.dissonantMarginal, fill: VIZ_COLORS.dissonantMarginalFill, label: 'Marginal' };
  if (score >= -0.5) return { color: VIZ_COLORS.dissonantPoor, fill: VIZ_COLORS.dissonantBadFill, label: 'Poor' };
  if (score >= -1.0) return { color: VIZ_COLORS.dissonantBad, fill: VIZ_COLORS.dissonantBadFill, label: 'Bad' };
  return { color: VIZ_COLORS.dissonantVeryBad, fill: VIZ_COLORS.dissonantVeryBadFill, label: 'Very bad' };
}

/**
 * Get resolution color based on exit score (emerald → amber spectrum)
 * Only as bad as amber/orange, never red (red reserved for violations)
 */
function getResolutionColorByExitScore(score) {
  if (score >= 1.0) return { color: VIZ_COLORS.resolutionExcellent, fill: VIZ_COLORS.resolutionExcellentFill, label: 'Excellent' };
  if (score >= 0.75) return { color: VIZ_COLORS.resolutionVeryGood, fill: VIZ_COLORS.resolutionExcellentFill, label: 'Very good' };
  if (score >= 0.5) return { color: VIZ_COLORS.resolutionGood, fill: VIZ_COLORS.resolutionGoodFill, label: 'Good' };
  if (score >= 0.25) return { color: VIZ_COLORS.resolutionAcceptable, fill: VIZ_COLORS.resolutionGoodFill, label: 'Acceptable' };
  if (score >= 0) return { color: VIZ_COLORS.resolutionMarginal, fill: VIZ_COLORS.resolutionMarginalFill, label: 'Marginal' };
  if (score >= -0.5) return { color: VIZ_COLORS.resolutionPoor, fill: VIZ_COLORS.resolutionPoorFill, label: 'Poor' };
  return { color: VIZ_COLORS.resolutionWeak, fill: VIZ_COLORS.resolutionPoorFill, label: 'Weak' };
}

/**
 * Get interval style based on consonance, score, and resolution status
 * NEW SYSTEM:
 * - Dissonances colored by entry+pattern score (purple→red)
 * - Resolutions colored by exit score (emerald→amber)
 * - Regular consonances keep original colors (teal/lime)
 *
 * @param {Object} options - { isConsonant, isPerfect, score, entryScore, exitScore, category, isRepeated, isResolved, isParallel }
 * @returns {Object} { color, bg, fill, label, borderStyle, borderWidth, opacity }
 */
export function getIntervalStyle({
  isConsonant,
  isPerfect,
  score = 0,
  entryScore,    // NEW: for coloring dissonances by entry
  exitScore,     // NEW: for coloring resolutions by exit
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
    // RESOLUTION: consonance following a dissonance - color by exit score (emerald → amber)
    if (category === 'consonant_resolution' || category === 'consonant_good_resolution' || category === 'consonant_bad_resolution') {
      const useScore = exitScore !== undefined ? exitScore : score;
      const colorInfo = getResolutionColorByExitScore(useScore);
      return {
        ...colorInfo,
        bg: useScore >= 0.5 ? '#d1fae5' : (useScore >= 0 ? '#fef3c7' : '#fed7aa'),
        borderStyle: useScore >= 0 ? 'solid' : 'dashed',
        borderWidth: useScore >= 0.75 ? 2 : 1,
        opacity: useScore >= 0.5 ? 0.85 : 0.7,
      };
    }

    // PREPARATION: consonance before a dissonance
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

  // DISSONANCE - color by entry + pattern score (purple → red spectrum)
  // Use entryScore if provided, otherwise fall back to total score
  const useEntryScore = entryScore !== undefined ? entryScore : score;
  const colorInfo = getDissonanceColorByEntryScore(useEntryScore);

  const baseResolutionStyle = isResolved
    ? { borderStyle: 'solid', borderWidth: 1, opacity: 0.75 }
    : { borderStyle: 'dashed', borderWidth: 2, opacity: 0.6 };

  return {
    ...colorInfo,
    bg: useEntryScore >= 1.0 ? '#e0e7ff' : (useEntryScore >= 0 ? '#f3e8ff' : '#fce7f3'),
    ...baseResolutionStyle,
    opacity: isResolved ? (useEntryScore >= 0.5 ? 0.8 : 0.7) : 0.55,
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

  // Both must be perfect 5ths (class 5) or unisons/octaves (class 1)
  // NOTE: In mod-12 system, octaves are reduced to class 1 (unison)
  // Class 7 is a SEVENTH (m7/M7), NOT a fifth!
  const isPerfectFifth = (ic) => ic === 5;
  const isPerfectOctaveOrUnison = (ic) => ic === 1;

  // Parallel 5ths
  if (isPerfectFifth(prevClass) && isPerfectFifth(currClass)) {
    // Check both voices moved in same direction
    const v1Moved = currInterval.duxPitch !== prevInterval.duxPitch;
    const v2Moved = currInterval.comesPitch !== prevInterval.comesPitch;
    if (v1Moved && v2Moved) {
      const v1Dir = Math.sign(currInterval.duxPitch - prevInterval.duxPitch);
      const v2Dir = Math.sign(currInterval.comesPitch - prevInterval.comesPitch);
      if (v1Dir === v2Dir) return true;
    }
  }

  // Parallel octaves/unisons
  if (isPerfectOctaveOrUnison(prevClass) && isPerfectOctaveOrUnison(currClass)) {
    const v1Moved = currInterval.duxPitch !== prevInterval.duxPitch;
    const v2Moved = currInterval.comesPitch !== prevInterval.comesPitch;
    if (v1Moved && v2Moved) {
      const v1Dir = Math.sign(currInterval.duxPitch - prevInterval.duxPitch);
      const v2Dir = Math.sign(currInterval.comesPitch - prevInterval.comesPitch);
      if (v1Dir === v2Dir) return true;
    }
  }

  return false;
}
