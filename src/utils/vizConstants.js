/**
 * Shared visualization constants and utilities
 */

// Unified semantic color scheme
export const VIZ_COLORS = {
  // Interval quality colors (solid fills)
  consonant: '#22c55e',           // Green-500 - imperfect consonances (3rds, 6ths)
  perfectConsonant: '#3b82f6',    // Blue-500 - perfect consonances (unison, 5th, 8ve)
  dissonantStrong: '#7c3aed',     // Violet-600 - well-handled dissonance (score >= 2)
  dissonantGood: '#8b5cf6',       // Violet-500 - good dissonance handling (score >= 1)
  dissonantAcceptable: '#a78bfa', // Violet-400 - acceptable (score >= 0)
  dissonantMarginal: '#c026d3',   // Fuchsia-600 - marginal (score >= -1)
  dissonantWeak: '#ea580c',       // Orange-600 - weak handling (score > -2)
  dissonantProblematic: '#dc2626',// Red-600 - problematic (score > -3)
  dissonantSevere: '#b91c1c',     // Red-700 - severe issues (score <= -3)

  // Semi-transparent fills for regions
  consonantFill: 'rgba(34, 197, 94, 0.35)',
  perfectFill: 'rgba(59, 130, 246, 0.3)',
  dissonantGoodFill: 'rgba(139, 92, 246, 0.35)',
  dissonantMarginalFill: 'rgba(202, 138, 4, 0.35)',
  dissonantBadFill: 'rgba(234, 88, 12, 0.4)',
  dissonantSevereFill: 'rgba(220, 38, 38, 0.4)',

  // Voice colors (for dux/comes, subject/CS)
  voiceDux: '#4f46e5',            // Indigo-600 - dux/subject
  voiceComes: '#dc2626',          // Red-600 - comes/answer
  voiceCSAbove: '#22c55e',        // Green-500 - countersubject above
  voiceCSBelow: '#f59e0b',        // Amber-500 - countersubject below (inverted)

  // UI state colors
  issueBackground: '#fef2f2',
  issueBorder: '#fca5a5',
  issueText: '#991b1b',
  warningBackground: '#fffbeb',
  warningBorder: '#fcd34d',
  warningText: '#92400e',
  cleanBackground: '#f0fdf4',
  cleanBorder: '#86efac',
  cleanText: '#166534',

  // Grid colors
  gridDownbeat: '#64748b',
  gridMainBeat: '#94a3b8',
  gridSubdivision: '#e2e8f0',

  // Highlight
  highlight: '#fbbf24',           // Amber-400
};

/**
 * Get interval style based on consonance and score
 * @param {Object} options - { isConsonant, isPerfect, score }
 * @returns {Object} { color, bg, fill, label }
 */
export function getIntervalStyle({ isConsonant, isPerfect, score = 0 }) {
  if (isConsonant) {
    if (isPerfect) {
      return {
        color: VIZ_COLORS.perfectConsonant,
        bg: '#dbeafe',
        fill: VIZ_COLORS.perfectFill,
        label: 'Perfect',
      };
    }
    return {
      color: VIZ_COLORS.consonant,
      bg: '#dcfce7',
      fill: VIZ_COLORS.consonantFill,
      label: 'Consonant',
    };
  }

  // Dissonant - grade by score
  if (score >= 2.0) {
    return { color: VIZ_COLORS.dissonantStrong, bg: '#ddd6fe', fill: VIZ_COLORS.dissonantGoodFill, label: 'Strong' };
  }
  if (score >= 1.0) {
    return { color: VIZ_COLORS.dissonantGood, bg: '#ede9fe', fill: VIZ_COLORS.dissonantGoodFill, label: 'Good' };
  }
  if (score >= 0) {
    return { color: VIZ_COLORS.dissonantAcceptable, bg: '#f3f0ff', fill: VIZ_COLORS.dissonantGoodFill, label: 'Acceptable' };
  }
  if (score >= -1.0) {
    return { color: VIZ_COLORS.dissonantMarginal, bg: '#fae8ff', fill: VIZ_COLORS.dissonantMarginalFill, label: 'Marginal' };
  }
  if (score >= -2.0) {
    return { color: VIZ_COLORS.dissonantWeak, bg: '#ffedd5', fill: VIZ_COLORS.dissonantBadFill, label: 'Weak' };
  }
  if (score >= -3.0) {
    return { color: VIZ_COLORS.dissonantProblematic, bg: '#fee2e2', fill: VIZ_COLORS.dissonantSevereFill, label: 'Problematic' };
  }
  return { color: VIZ_COLORS.dissonantSevere, bg: '#fecaca', fill: VIZ_COLORS.dissonantSevereFill, label: 'Severe' };
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
