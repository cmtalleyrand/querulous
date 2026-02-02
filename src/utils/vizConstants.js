/**
 * Shared visualization constants and utilities
 */

// Unified semantic color scheme - muted, professional palette
export const VIZ_COLORS = {
  // Interval quality colors (muted, professional)
  consonant: '#4ade80',           // Green-400 muted - imperfect consonances
  perfectConsonant: '#60a5fa',    // Blue-400 muted - perfect consonances
  dissonantStrong: '#a78bfa',     // Violet-400 - well-handled dissonance (score >= 2)
  dissonantGood: '#c4b5fd',       // Violet-300 - good dissonance handling (score >= 1)
  dissonantAcceptable: '#d8b4fe', // Violet-300 lighter - acceptable (score >= 0)
  dissonantMarginal: '#e879f9',   // Fuchsia-400 - marginal (score >= -1)
  dissonantWeak: '#fb923c',       // Orange-400 - weak handling (score > -2)
  dissonantProblematic: '#f87171',// Red-400 - problematic (score > -3)
  dissonantSevere: '#ef4444',     // Red-500 - severe issues (score <= -3)

  // Semi-transparent fills for regions (subtle, not garish)
  consonantFill: 'rgba(74, 222, 128, 0.15)',
  perfectFill: 'rgba(96, 165, 250, 0.15)',
  dissonantGoodFill: 'rgba(167, 139, 250, 0.18)',
  dissonantMarginalFill: 'rgba(232, 121, 249, 0.18)',
  dissonantBadFill: 'rgba(251, 146, 60, 0.20)',
  dissonantSevereFill: 'rgba(248, 113, 113, 0.22)',

  // Voice colors (muted, distinct)
  voiceDux: '#6366f1',            // Indigo-500 - dux/subject
  voiceComes: '#f97316',          // Orange-500 - comes/answer (not red, too harsh)
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
};

/**
 * Get interval style based on consonance and score
 * @param {Object} options - { isConsonant, isPerfect, score, category }
 * @returns {Object} { color, bg, fill, label }
 */
export function getIntervalStyle({ isConsonant, isPerfect, score = 0, category }) {
  if (isConsonant) {
    // Check for specific categories first
    if (category === 'consonant_preparation') {
      return {
        color: '#0891b2',
        bg: '#cffafe',
        fill: 'rgba(80, 160, 180, 0.50)',
        label: 'Preparation',
      };
    }
    if (category === 'consonant_good_resolution') {
      return {
        color: '#059669',
        bg: '#a7f3d0',
        fill: 'rgba(60, 145, 100, 0.50)',
        label: 'Good resolution',
      };
    }
    if (category === 'consonant_bad_resolution') {
      return {
        color: '#ea580c',
        bg: '#fed7aa',
        fill: 'rgba(190, 130, 70, 0.50)',
        label: 'Poor resolution',
      };
    }
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
