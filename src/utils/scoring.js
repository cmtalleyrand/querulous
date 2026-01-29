/**
 * Scoring utilities for fugue analysis
 *
 * BASE-ZERO SCORING SYSTEM:
 * All scores are displayed as-is (base zero). Positive scores indicate
 * strengths, negative indicate weaknesses, zero is the neutral baseline.
 * Anything over zero is fair/acceptable.
 *
 * This approach ensures:
 * - Meaningful baselines (0 = acceptable but unremarkable)
 * - Scores are comparable across categories
 * - Easy to understand what contributes to the score
 * - Direct relationship between displayed values and scoring factors
 */

/**
 * For backward compatibility - now just returns the internal score directly
 * @deprecated Use internal scores directly
 */
export function toDisplayScore(internalScore) {
  return internalScore;
}

/**
 * For backward compatibility - now just returns the score directly
 * @deprecated Use internal scores directly
 */
export function toInternalScore(displayScore) {
  return displayScore;
}

/**
 * Score categories organized by conceptual grouping
 * Each category now documents its baseline and scoring factors
 *
 * Groups:
 * - MELODIC: Properties of the subject line itself
 * - FUGAL: How well it works as fugue material
 * - COMBINATION: How voices work together (with CS)
 */
export const SCORE_CATEGORIES = {
  // === MELODIC GROUP: Subject line quality ===
  tonalClarity: {
    name: 'Tonal Clarity',
    description: 'Basic tonal orientation (opening/ending notes, answer junction)',
    group: 'melodic',
    weight: 0.5,  // Reduced weight - basic indicator
    baseline: 'Clear enough tonal center',
    factors: ['Opening note', 'Terminal quality', 'Answer junction'],
    isBasicIndicator: true,  // Flag for UI to de-emphasize
  },
  rhythmicCharacter: {
    name: 'Rhythmic Character',
    description: 'Distinctiveness and variety of rhythmic profile',
    group: 'melodic',
    weight: 0.8,
    baseline: 'Minimal rhythmic variety',
    factors: ['+5 per unique duration', '+10 good contrast', '-10 uniform rhythm'],
  },

  // === FUGAL GROUP: Contrapuntal potential ===
  strettoPotential: {
    name: 'Stretto Potential',
    description: 'Counterpoint quality when overlapping at various distances',
    group: 'fugal',
    weight: 1.0,
    baseline: 'Average counterpoint at overlap',
    factors: ['Based on dissonance scores at each distance', '+bonus for multiple good distances'],
  },
  // Legacy entries kept for backward compatibility but no longer used in scoring
  tonalDefinition: {
    name: 'Tonal Definition',
    description: 'Legacy - now part of Tonal Clarity',
    group: 'melodic',
    weight: 0,
    deprecated: true,
  },
  answerCompatibility: {
    name: 'Answer Compatibility',
    description: 'Legacy - now part of Tonal Clarity',
    group: 'fugal',
    weight: 0,
    deprecated: true,
  },

  // === COMBINATION GROUP: Voice interaction (with CS) ===
  invertibility: {
    name: 'Invertibility',
    description: 'Quality of double counterpoint at the octave',
    group: 'combination',
    weight: 1.0,
    baseline: 'Inverted same quality as original',
    factors: ['Based on inverted position dissonance scores', '-penalty for parallel perfects'],
  },
  rhythmicInterplay: {
    name: 'Rhythmic Interplay',
    description: 'Degree of rhythmic independence between voices',
    group: 'combination',
    weight: 0.8,
    baseline: '50% attack overlap (neutral)',
    factors: ['+15 complementary (low overlap)', '-15 homorhythmic (high overlap)'],
  },
  voiceIndependence: {
    name: 'Voice Independence',
    description: 'Differentiation of melodic contours between voices',
    group: 'combination',
    weight: 0.9,
    baseline: 'Average motion variety',
    factors: ['+15 high contrary motion', '-15 high parallel motion', '+5 oblique motion'],
  },
  transpositionStability: {
    name: 'Transposition Stability',
    description: 'How well the countersubject works against the dominant-level answer',
    group: 'combination',
    weight: 1.0,
    baseline: 'Acceptable counterpoint against answer',
    factors: ['Based on dissonance scores vs answer', '-penalty for parallel perfects'],
  },
};

// Legacy key mapping for backward compatibility
export const LEGACY_KEY_MAP = {
  harmonicImplication: 'tonalDefinition',
  rhythmicVariety: 'rhythmicCharacter',
  strettoViability: 'strettoPotential',
  tonalAnswer: 'answerCompatibility',
  doubleCounterpoint: 'invertibility',
  rhythmicComplementarity: 'rhythmicInterplay',
  contourIndependence: 'voiceIndependence',
  modulatoryRobustness: 'transpositionStability',
};

/**
 * Score thresholds for rating (base-zero scale)
 * 0 is the baseline - anything over zero is fair/acceptable
 */
export const SCORE_THRESHOLDS = {
  strong: 15,    // Notably strong
  good: 5,       // Good
  fair: 0,       // Baseline - acceptable
  weak: -10,     // Below baseline
};

/**
 * Get a rating label for a base-zero score
 */
export function getScoreRating(score) {
  if (score >= SCORE_THRESHOLDS.strong) return 'Strong';
  if (score >= SCORE_THRESHOLDS.good) return 'Good';
  if (score >= SCORE_THRESHOLDS.fair) return 'Fair';
  return 'Weak';
}

/**
 * Get a color for a base-zero score
 */
export function getScoreColor(score) {
  if (score >= SCORE_THRESHOLDS.strong) return '#2e7d32'; // Dark green
  if (score >= SCORE_THRESHOLDS.good) return '#558b2f'; // Light green
  if (score >= SCORE_THRESHOLDS.fair) return '#78909c'; // Gray-blue (neutral)
  return '#c62828'; // Red
}

/**
 * Get a background color for a base-zero score
 */
export function getScoreBgColor(score) {
  if (score >= SCORE_THRESHOLDS.strong) return '#e8f5e9';
  if (score >= SCORE_THRESHOLDS.good) return '#f1f8e9';
  if (score >= SCORE_THRESHOLDS.fair) return '#fafafa';
  return '#ffebee';
}

/**
 * Calculate Tonal Definition score (base-zero)
 * Baseline 0 = ambiguous tonal center
 * Factors: opening note, terminal quality, dominant arrival
 */
export function calculateTonalDefinitionScore(result) {
  if (!result || result.error) return { score: 0, internal: 0, details: [] };

  let internal = 0; // Base-zero score
  const details = [];

  // Opening on tonic chord tone: +10
  if (result.opening?.isTonicChordTone) {
    internal += 10;
    details.push({ factor: 'Opens on tonic chord tone', impact: +10 });
  } else if (result.opening?.scaleDegree === 5) {
    internal += 5;
    details.push({ factor: 'Opens on dominant', impact: +5 });
  }

  // Terminal quality (most important factor)
  const terminalScores = {
    strong: 15,    // Clear cadential implication
    good: 8,       // Good but not ideal
    workable: 0,   // Neutral
    ambiguous: -8, // Unclear direction
    unusual: -12,  // Problematic
  };
  const termScore = terminalScores[result.terminal?.q] || 0;
  internal += termScore;
  details.push({ factor: `Terminal: ${result.terminal?.q || 'unknown'}`, impact: termScore });

  // Dominant arrival bonus
  if (result.dominantArrival) {
    const ratio = result.dominantArrival.ratio;
    if (ratio >= 0.3 && ratio <= 0.7) {
      internal += 5;
      details.push({ factor: 'Well-placed dominant arrival', impact: +5 });
    } else {
      internal += 2;
      details.push({ factor: 'Dominant arrival present', impact: +2 });
    }
  }

  return {
    score: toDisplayScore(internal),
    internal,
    details,
  };
}

// Legacy alias
export const calculateHarmonicImplicationScore = calculateTonalDefinitionScore;

/**
 * Calculate Rhythmic Character score (base-zero)
 * Baseline 0 = minimal rhythmic variety (2 note values)
 * Factors: unique durations, rhythmic contrast
 */
export function calculateRhythmicCharacterScore(result) {
  if (!result || result.error) return { score: 0, internal: 0, details: [] };

  let internal = 0; // Base-zero score
  const details = [];

  // Unique durations: baseline is 2, score relative to that
  const uniqueCount = result.uniqueDurations || 1;
  if (uniqueCount >= 5) {
    internal += 15;
    details.push({ factor: `${uniqueCount} different note values (strong variety)`, impact: +15 });
  } else if (uniqueCount >= 4) {
    internal += 10;
    details.push({ factor: `${uniqueCount} different note values (good variety)`, impact: +10 });
  } else if (uniqueCount >= 3) {
    internal += 5;
    details.push({ factor: `${uniqueCount} different note values`, impact: +5 });
  } else if (uniqueCount === 2) {
    // Baseline - no adjustment
    details.push({ factor: `${uniqueCount} different note values (minimal)`, impact: 0 });
  } else {
    internal -= 15;
    details.push({ factor: 'Uniform rhythm (single note value)', impact: -15 });
  }

  // Rhythmic contrast
  const hasContrast = result.observations?.some((o) => o.description?.includes('Good rhythmic contrast'));
  if (hasContrast) {
    internal += 10;
    details.push({ factor: 'Good rhythmic contrast', impact: +10 });
  }

  // Check for rhythmic patterns
  const hasPattern = result.observations?.some((o) =>
    o.description?.includes('pattern') || o.description?.includes('motive')
  );
  if (hasPattern) {
    internal += 5;
    details.push({ factor: 'Recognizable rhythmic pattern', impact: +5 });
  }

  return {
    score: toDisplayScore(internal),
    internal,
    details,
  };
}

// Legacy alias
export const calculateRhythmicVarietyScore = calculateRhythmicCharacterScore;

/**
 * Calculate Stretto Potential score (base-zero)
 * KEY CHANGE: Each stretto distance is scored as full counterpoint.
 * The score is based on the average counterpoint quality across all distances.
 *
 * Baseline 0 = average counterpoint quality (some good, some bad distances)
 * Positive = consistently good counterpoint at multiple distances
 * Negative = poor counterpoint quality at most distances
 */
export function calculateStrettoPotentialScore(result, subjectLength = null) {
  if (!result || result.error) return { score: 0, internal: 0, details: [], context: {} };

  const details = [];
  const allResults = result.allResults || [];
  const totalTests = allResults.length;

  if (totalTests === 0) {
    return { score: 50, internal: 0, details: [{ factor: 'No stretto distances tested', impact: 0 }], context: {} };
  }

  // Collect counterpoint scores from each distance
  // Each distance already has dissonance analysis - use avgDissonanceScore
  const distanceScores = allResults.map(r => {
    // Use the average dissonance score from the analysis
    // This treats each stretto as if it were full counterpoint
    const avgScore = r.dissonanceAnalysis?.summary?.averageScore || 0;
    return {
      distance: r.distance,
      avgScore,
      issueCount: r.issues?.length || 0,
      viable: r.viable,
    };
  });

  // Calculate overall average counterpoint score across all distances
  const avgCounterpointScore = distanceScores.reduce((sum, d) => sum + d.avgScore, 0) / totalTests;

  // Internal score: scale the average counterpoint score
  // Counterpoint scores typically range -3 to +3, map to internal -15 to +15
  let internal = avgCounterpointScore * 5;

  details.push({
    factor: `Average counterpoint score: ${avgCounterpointScore.toFixed(2)}`,
    impact: Math.round(internal),
  });

  // Bonus for number of "good" distances (avgScore >= 0)
  const goodDistances = distanceScores.filter(d => d.avgScore >= 0).length;
  const goodRatio = goodDistances / totalTests;

  if (goodRatio >= 0.7) {
    internal += 8;
    details.push({ factor: `${goodDistances}/${totalTests} distances with good counterpoint`, impact: +8 });
  } else if (goodRatio >= 0.5) {
    internal += 4;
    details.push({ factor: `${goodDistances}/${totalTests} distances with good counterpoint`, impact: +4 });
  } else if (goodRatio < 0.3) {
    internal -= 5;
    details.push({ factor: `Only ${goodDistances}/${totalTests} distances workable`, impact: -5 });
  }

  // Bonus for close stretto possibility (high overlap with good counterpoint)
  const closeGood = distanceScores.filter(d => {
    const r = allResults.find(ar => ar.distance === d.distance);
    return r && r.overlapPercent >= 60 && d.avgScore >= 0;
  });
  if (closeGood.length > 0) {
    internal += 5;
    details.push({ factor: `Close stretto possible with good counterpoint`, impact: +5 });
  }

  // Penalty for parallel perfects (critical issues)
  const hasParallelPerfects = allResults.some(r =>
    r.issues?.some(i => i.type === 'parallel')
  );
  if (hasParallelPerfects) {
    const parallelCount = allResults.filter(r =>
      r.issues?.some(i => i.type === 'parallel')
    ).length;
    const penalty = Math.min(10, parallelCount * 2);
    internal -= penalty;
    details.push({ factor: `Parallel perfects at ${parallelCount} distances`, impact: -penalty });
  }

  // Context
  const context = {
    subjectLength,
    testedDistances: totalTests,
    goodDistances,
    avgCounterpointScore,
    distanceScores,
  };

  if (subjectLength && goodDistances > 0) {
    details.push({
      factor: `${goodDistances} usable entry points`,
      impact: 0,
      type: 'info',
    });
  }

  return {
    score: toDisplayScore(internal),
    internal,
    details,
    context,
  };
}

// Legacy alias
export const calculateStrettoViabilityScore = calculateStrettoPotentialScore;

/**
 * Calculate Answer Compatibility score (base-zero)
 * Baseline 0 = acceptable junction
 * Factors: junction quality, answer type clarity
 */
export function calculateAnswerCompatibilityScore(result) {
  if (!result || result.error) return { score: 0, internal: 0, details: [] };

  let internal = 0; // Base-zero score
  const details = [];

  // Junction quality (primary factor)
  const junctionScores = {
    strong: 15,   // Ideal tonic-dominant connection
    good: 5,      // Good but not ideal
    workable: 0,  // Neutral (baseline)
    static: -8,   // Lacks motion
    unusual: -12, // Problematic
  };
  const juncScore = junctionScores[result.junction?.q] || 0;
  internal += juncScore;
  details.push({ factor: `Junction: ${result.junction?.p || '?'} (${result.junction?.q || 'unknown'})`, impact: juncScore });

  // Answer type clarity
  if (result.answerType === 'real') {
    internal += 5;
    details.push({ factor: 'Clear real answer', impact: +5 });
  } else if (result.mutationPoint !== null) {
    internal += 3;
    details.push({ factor: 'Clear tonal mutation point', impact: +3 });
  }

  // Check for problematic tonal motions
  const hasProblems = result.observations?.some(o => o.type === 'issue');
  if (hasProblems) {
    internal -= 5;
    details.push({ factor: 'Some problematic intervals for tonal answer', impact: -5 });
  }

  return {
    score: toDisplayScore(internal),
    internal,
    details,
  };
}

// Legacy alias
export const calculateTonalAnswerScore = calculateAnswerCompatibilityScore;

/**
 * Calculate Tonal Clarity score (base-zero)
 * Combines former tonal definition + answer compatibility into one basic indicator.
 * This is deliberately simple - tonal analysis is quite primitive at this stage.
 *
 * Baseline 0 = acceptable tonal orientation
 * Positive = clear tonal structure
 * Negative = unclear or problematic
 */
export function calculateTonalClarityScore(harmonicResult, answerResult) {
  const details = [];
  let internal = 0;

  // --- From Tonal Definition ---
  if (harmonicResult && !harmonicResult.error) {
    // Opening on tonic chord tone
    if (harmonicResult.opening?.isTonicChordTone) {
      internal += 3;
      details.push({ factor: 'Opens on tonic chord tone', impact: +3 });
    }

    // Terminal quality (simplified)
    const terminalQ = harmonicResult.terminal?.q;
    if (terminalQ === 'strong' || terminalQ === 'good') {
      internal += 3;
      details.push({ factor: `Terminal: ${terminalQ}`, impact: +3 });
    } else if (terminalQ === 'ambiguous' || terminalQ === 'unusual') {
      internal -= 3;
      details.push({ factor: `Terminal: ${terminalQ}`, impact: -3 });
    }
  }

  // --- From Answer Compatibility ---
  if (answerResult && !answerResult.error) {
    // Junction quality (simplified)
    const junctionQ = answerResult.junction?.q;
    if (junctionQ === 'strong' || junctionQ === 'good') {
      internal += 3;
      details.push({ factor: `Answer junction: ${junctionQ}`, impact: +3 });
    } else if (junctionQ === 'static' || junctionQ === 'unusual') {
      internal -= 3;
      details.push({ factor: `Answer junction: ${junctionQ}`, impact: -3 });
    }
  }

  return {
    score: internal,
    internal,
    details,
    isBasicIndicator: true,
  };
}

/**
 * Calculate Invertibility score (base-zero)
 * KEY CHANGE: Score based on comparison of inverted to uninverted quality.
 *
 * Baseline 0 = inverted position has same quality as original
 * Positive = inverted maintains or improves quality
 * Negative = inverted position degrades significantly
 *
 * The fundamental question: "Does inversion work as well as the original?"
 */
export function calculateInvertibilityScore(result) {
  if (!result || result.error) return { score: 0, internal: 0, details: [], context: {} };

  const details = [];

  // Get detailed scoring data
  const origScoring = result.original?.detailedScoring?.summary;
  const invScoring = result.inverted?.detailedScoring?.summary;

  const origAvg = origScoring?.averageScore || 0;
  const invAvg = invScoring?.averageScore || 0;

  // Context
  const context = {
    originalIntervals: origScoring?.totalIntervals || 0,
    invertedIntervals: invScoring?.totalIntervals || 0,
    originalAvgScore: origAvg,
    invertedAvgScore: invAvg,
    qualityDifference: invAvg - origAvg,
  };

  let internal = 0;

  // PRIMARY FACTOR: Quality of inverted position
  // This is what matters - does the inversion sound good?
  // Scale: avg score -3 to +3 maps to internal -15 to +15
  internal = invAvg * 5;
  details.push({
    factor: `Inverted position quality: ${invAvg.toFixed(2)}`,
    impact: Math.round(invAvg * 5),
  });

  // SECONDARY FACTOR: Comparison to original
  // If inverted is much worse than original, additional penalty
  // If inverted is better than original, small bonus
  const qualityDiff = invAvg - origAvg;

  if (qualityDiff < -1.0) {
    // Inverted is significantly worse than original
    const penalty = Math.min(8, Math.abs(qualityDiff) * 3);
    internal -= penalty;
    details.push({
      factor: `Inverted degrades from original (Δ${qualityDiff.toFixed(2)})`,
      impact: -Math.round(penalty),
    });
  } else if (qualityDiff > 0.5) {
    // Inverted is actually better than original (rare but good)
    internal += 3;
    details.push({
      factor: `Inverted improves on original (Δ+${qualityDiff.toFixed(2)})`,
      impact: +3,
    });
  } else {
    // Similar quality - this is the baseline (good)
    details.push({
      factor: `Similar quality in both positions (Δ${qualityDiff.toFixed(2)})`,
      impact: 0,
      type: 'info',
    });
  }

  // Parallel perfects - critical voice-leading issues in EITHER position
  // NOTE: The invAvg already includes consonance repetition penalties (consecutive perfects: -0.5 each),
  // so this penalty is reduced to avoid double-counting the same underlying problem.
  // This catches the specific voice-leading error (parallel motion to perfect intervals)
  // which the average score only partially reflects.
  const origIssues = result.original?.issues?.length || 0;
  const invIssues = result.inverted?.issues?.length || 0;

  if (invIssues > 0) {
    const penalty = Math.min(6, invIssues * 2);
    internal -= penalty;
    details.push({
      factor: `${invIssues} parallel perfect(s) in inverted position`,
      impact: -penalty,
    });
  }

  if (origIssues > 0 && invIssues === 0) {
    // Original has issues but inverted doesn't - interesting case
    details.push({
      factor: `${origIssues} issue(s) in original (inverted is cleaner)`,
      impact: 0,
      type: 'info',
    });
  }

  // Imperfect consonance ratio - higher ratio means safer inversion
  const origRatio = result.original?.imperfectRatio || 0;
  const invRatio = result.inverted?.imperfectRatio || 0;
  const avgRatio = (origRatio + invRatio) / 2;

  if (avgRatio >= 0.6) {
    internal += 5;
    details.push({
      factor: `${Math.round(avgRatio * 100)}% imperfect consonances (safe for inversion)`,
      impact: +5,
    });
  } else if (avgRatio < 0.3) {
    internal -= 3;
    details.push({
      factor: `Only ${Math.round(avgRatio * 100)}% imperfect consonances (risky)`,
      impact: -3,
    });
  }

  return {
    score: toDisplayScore(internal),
    internal,
    details,
    context,
  };
}

// Legacy alias
export const calculateDoubleCounterpointScore = calculateInvertibilityScore;

/**
 * Calculate Rhythmic Interplay score (base-zero)
 * Baseline 0 = 50% attack overlap (moderate independence)
 * Positive = complementary rhythms (low overlap)
 * Negative = homorhythmic (high overlap)
 */
export function calculateRhythmicInterplayScore(result) {
  if (!result || result.error) return { score: 0, internal: 0, details: [] };

  let internal = 0;
  const details = [];
  const overlapRatio = result.overlapRatio || 0.5;

  // Score based on distance from 50% (neutral)
  // 0-30% overlap = strong complementarity (+15)
  // 30-50% = good (+5 to 0)
  // 50-70% = fair (0 to -5)
  // 70-100% = homorhythmic (-5 to -15)

  if (overlapRatio <= 0.3) {
    internal = 15;
    details.push({ factor: `Strong rhythmic independence (${Math.round(overlapRatio * 100)}% overlap)`, impact: +15 });
  } else if (overlapRatio <= 0.5) {
    // Linear interpolation from +8 at 30% to 0 at 50%
    internal = Math.round(8 * (0.5 - overlapRatio) / 0.2);
    details.push({ factor: `Good rhythmic independence (${Math.round(overlapRatio * 100)}% overlap)`, impact: internal });
  } else if (overlapRatio <= 0.7) {
    // Linear interpolation from 0 at 50% to -8 at 70%
    internal = Math.round(-8 * (overlapRatio - 0.5) / 0.2);
    details.push({ factor: `Moderate overlap (${Math.round(overlapRatio * 100)}%)`, impact: internal });
  } else {
    // Linear interpolation from -8 at 70% to -15 at 100%
    internal = Math.round(-8 - 7 * (overlapRatio - 0.7) / 0.3);
    details.push({ factor: `Homorhythmic (${Math.round(overlapRatio * 100)}% overlap)`, impact: internal });
  }

  // Strong beat collision penalty
  const collisions = result.strongBeatCollisions || 0;
  if (collisions > 4) {
    internal -= 5;
    details.push({ factor: `${collisions} strong beat collisions`, impact: -5 });
  } else if (collisions > 2) {
    internal -= 2;
    details.push({ factor: `${collisions} strong beat collisions`, impact: -2 });
  }

  return {
    score: toDisplayScore(internal),
    internal,
    details,
  };
}

// Legacy alias
export const calculateRhythmicComplementarityScore = calculateRhythmicInterplayScore;

/**
 * Calculate Voice Independence score (base-zero)
 * Baseline 0 = average motion variety
 * Positive = high contrary motion, good voice differentiation
 * Negative = excessive parallel motion
 */
export function calculateVoiceIndependenceScore(result) {
  if (!result || result.error) return { score: 0, internal: 0, details: [] };

  let internal = 0;
  const details = [];

  const contraryRatio = result.contraryRatio || 0;
  const parallelRatio = result.parallelRatio || 0;
  const obliqueRatio = result.obliqueRatio || 0;

  // Contrary motion: ideal is 30-50%, score relative to that
  if (contraryRatio >= 0.5) {
    internal += 12;
    details.push({ factor: `Strong contrary motion (${Math.round(contraryRatio * 100)}%)`, impact: +12 });
  } else if (contraryRatio >= 0.35) {
    internal += 8;
    details.push({ factor: `Good contrary motion (${Math.round(contraryRatio * 100)}%)`, impact: +8 });
  } else if (contraryRatio >= 0.2) {
    internal += 3;
    details.push({ factor: `Moderate contrary motion (${Math.round(contraryRatio * 100)}%)`, impact: +3 });
  } else {
    internal -= 5;
    details.push({ factor: `Low contrary motion (${Math.round(contraryRatio * 100)}%)`, impact: -5 });
  }

  // Parallel motion: penalize if too high
  if (parallelRatio > 0.4) {
    internal -= 12;
    details.push({ factor: `Excessive parallel motion (${Math.round(parallelRatio * 100)}%)`, impact: -12 });
  } else if (parallelRatio > 0.25) {
    internal -= 5;
    details.push({ factor: `High parallel motion (${Math.round(parallelRatio * 100)}%)`, impact: -5 });
  } else if (parallelRatio <= 0.1) {
    internal += 5;
    details.push({ factor: `Low parallel motion (${Math.round(parallelRatio * 100)}%)`, impact: +5 });
  }

  // Oblique motion: adds variety
  if (obliqueRatio >= 0.2) {
    internal += 5;
    details.push({ factor: `Good oblique motion (${Math.round(obliqueRatio * 100)}%)`, impact: +5 });
  } else if (obliqueRatio >= 0.1) {
    internal += 2;
    details.push({ factor: `Some oblique motion (${Math.round(obliqueRatio * 100)}%)`, impact: +2 });
  }

  return {
    score: toDisplayScore(internal),
    internal,
    details,
  };
}

// Legacy alias
export const calculateContourIndependenceScore = calculateVoiceIndependenceScore;

/**
 * Calculate Transposition Stability score (base-zero)
 * Baseline 0 = acceptable counterpoint against the answer
 * Based on dissonance analysis when CS sounds against the dominant-level answer
 */
export function calculateTranspositionStabilityScore(result) {
  if (!result || result.error) return { score: 0, internal: 0, details: [] };

  let internal = 0;
  const details = [];

  // Primary factor: dissonance scoring against the answer
  const detailedScoring = result.detailedScoring?.summary;
  if (detailedScoring && detailedScoring.totalDissonances > 0) {
    const avgScore = detailedScoring.averageScore;
    // Scale: avg -3 to +3 maps to internal -15 to +15
    internal = avgScore * 5;
    details.push({
      factor: `Counterpoint quality vs answer: ${avgScore.toFixed(2)}`,
      impact: Math.round(internal),
    });
  } else if (detailedScoring) {
    // No dissonances - good
    internal = 10;
    details.push({ factor: 'No dissonances against answer', impact: +10 });
  }

  // Consonance profile on strong beats
  const profile = result.intervalProfile;
  if (profile) {
    const total = profile.consonant + profile.dissonant;
    if (total > 0) {
      const consPercent = Math.round((profile.consonant / total) * 100);

      // Baseline expectation: ~70% consonant
      if (consPercent >= 85) {
        internal += 8;
        details.push({ factor: `${consPercent}% consonant on strong beats (strong)`, impact: +8 });
      } else if (consPercent >= 70) {
        internal += 3;
        details.push({ factor: `${consPercent}% consonant on strong beats (good)`, impact: +3 });
      } else if (consPercent < 50) {
        internal -= 8;
        details.push({ factor: `Only ${consPercent}% consonant on strong beats`, impact: -8 });
      }
    }
  }

  // Parallel perfect violations
  const violations = result.violations?.length || 0;
  if (violations === 0) {
    internal += 3;
    details.push({ factor: 'No parallel perfect violations', impact: +3 });
  } else {
    const penalty = Math.min(15, violations * 5);
    internal -= penalty;
    details.push({ factor: `${violations} parallel perfect violation(s)`, impact: -penalty });
  }

  return {
    score: toDisplayScore(internal),
    internal,
    details,
  };
}

// Legacy alias
export const calculateModulatoryRobustnessScore = calculateTranspositionStabilityScore;

/**
 * Calculate overall fugue viability score (base-zero aggregation)
 *
 * The overall score is the weighted average of internal scores.
 * Scores are displayed as-is (base zero) - anything over zero is fair.
 */
export function calculateOverallScore(results, hasCountersubject, subjectInfo = null) {
  // Extract subject metrics if available
  const subjectLength = subjectInfo?.length || results.subject?.length;
  const subjectDuration = subjectInfo?.duration || results.subjectDuration;
  const noteCount = subjectInfo?.noteCount || results.noteCount;

  const scores = {};

  // === Melodic group ===
  // Combined tonal clarity (replaces separate tonalDefinition and answerCompatibility)
  const tonalClarity = calculateTonalClarityScore(results.harmonicImplication, results.tonalAnswer);
  scores.tonalClarity = tonalClarity;

  // Keep legacy scores for backward compatibility (but they don't contribute to overall)
  const tonalDef = calculateTonalDefinitionScore(results.harmonicImplication);
  scores.tonalDefinition = tonalDef;
  scores.harmonicImplication = tonalDef;

  const answerComp = calculateAnswerCompatibilityScore(results.tonalAnswer);
  scores.answerCompatibility = answerComp;
  scores.tonalAnswer = answerComp;

  const rhythmChar = calculateRhythmicCharacterScore(results.rhythmicVariety);
  scores.rhythmicCharacter = rhythmChar;
  scores.rhythmicVariety = rhythmChar;

  // === Fugal group ===
  const strettoPot = calculateStrettoPotentialScore(results.stretto, subjectDuration);
  scores.strettoPotential = strettoPot;
  scores.strettoViability = strettoPot;

  if (hasCountersubject) {
    // === Combination group ===
    const invert = calculateInvertibilityScore(results.doubleCounterpoint);
    scores.invertibility = invert;
    scores.doubleCounterpoint = invert;

    const rhythmInt = calculateRhythmicInterplayScore(results.rhythmicComplementarity);
    scores.rhythmicInterplay = rhythmInt;
    scores.rhythmicComplementarity = rhythmInt;

    const voiceInd = calculateVoiceIndependenceScore(results.contourIndependence);
    scores.voiceIndependence = voiceInd;
    scores.contourIndependence = voiceInd;

    const transpStab = calculateTranspositionStabilityScore(results.modulatoryRobustness);
    scores.transpositionStability = transpStab;
    scores.modulatoryRobustness = transpStab;
  }

  // Calculate weighted average of INTERNAL scores
  let totalWeight = 0;
  let weightedInternalSum = 0;

  // Categories used for scoring (note: tonalClarity replaces tonalDefinition + answerCompatibility)
  const scoringKeys = ['tonalClarity', 'rhythmicCharacter', 'strettoPotential'];
  if (hasCountersubject) {
    scoringKeys.push('invertibility', 'rhythmicInterplay', 'voiceIndependence', 'transpositionStability');
  }

  for (const key of scoringKeys) {
    const scoreData = scores[key];
    if (!scoreData) continue;

    const weight = SCORE_CATEGORIES[key]?.weight || 1.0;
    totalWeight += weight;
    weightedInternalSum += (scoreData.internal || 0) * weight;
  }

  const avgInternal = weightedInternalSum / (totalWeight || 1);
  // Round to one decimal place for display
  const overallScore = Math.round(avgInternal * 10) / 10;

  // Build context summary
  const context = {
    subjectNotes: noteCount,
    subjectBeats: subjectDuration,
    categoriesAnalyzed: scoringKeys.length,
    averageInternalScore: avgInternal,
  };

  return {
    overall: overallScore,
    internalScore: avgInternal,
    rating: getScoreRating(overallScore),
    color: getScoreColor(overallScore),
    bgColor: getScoreBgColor(overallScore),
    categories: scores,
    context,
  };
}

/**
 * Get a summary of strengths and areas for improvement
 */
export function getScoreSummary(scoreResult) {
  const strengths = [];
  const improvements = [];

  // Active category keys (skip deprecated ones)
  const activeKeys = [
    'tonalClarity', 'rhythmicCharacter', 'strettoPotential',
    'invertibility', 'rhythmicInterplay', 'voiceIndependence', 'transpositionStability'
  ];

  for (const key of activeKeys) {
    const data = scoreResult.categories[key];
    if (!data) continue;

    const category = SCORE_CATEGORIES[key];
    if (!category || category.deprecated) continue;

    // Use internal score for comparisons since we're now base-zero
    if (data.internal >= SCORE_THRESHOLDS.good) {
      strengths.push({
        category: category.name,
        key,
        score: data.internal,
        internal: data.internal,
        rating: getScoreRating(data.internal),
      });
    } else if (data.internal < SCORE_THRESHOLDS.fair) {
      improvements.push({
        category: category.name,
        key,
        score: data.internal,
        internal: data.internal,
        rating: getScoreRating(data.internal),
        suggestion: getSuggestion(key, data),
      });
    }
  }

  return { strengths, improvements };
}

/**
 * Get improvement suggestions for a category
 */
function getSuggestion(category, data) {
  const suggestions = {
    // Active keys
    tonalClarity: 'Consider the opening/ending notes and harmonic motion at the answer junction.',
    rhythmicCharacter: 'Try incorporating more diverse note values and rhythmic contrasts.',
    strettoPotential: 'Adjust melodic intervals to improve counterpoint quality when overlapping.',
    invertibility: 'Use more thirds and sixths to maintain quality when inverted.',
    rhythmicInterplay: 'Offset attack points between voices for better independence.',
    voiceIndependence: 'Add more contrary motion to differentiate voice contours.',
    transpositionStability: 'Ensure the countersubject works smoothly against the dominant-level answer.',
    // Legacy keys
    tonalDefinition: 'Consider starting on a tonic chord tone and ending on a degree that creates clear harmonic motion.',
    answerCompatibility: 'Consider the harmonic junction at the end of the subject.',
    harmonicImplication: 'Consider starting on a tonic chord tone and ending on a degree that creates clear harmonic motion.',
    rhythmicVariety: 'Try incorporating more diverse note values and rhythmic contrasts.',
    strettoViability: 'Adjust melodic intervals to improve counterpoint quality when overlapping.',
    tonalAnswer: 'Consider the harmonic junction at the end of the subject.',
    doubleCounterpoint: 'Use more thirds and sixths to maintain quality when inverted.',
    rhythmicComplementarity: 'Offset attack points between voices for better independence.',
    contourIndependence: 'Add more contrary motion to differentiate voice contours.',
    modulatoryRobustness: 'Ensure the countersubject works smoothly against the dominant-level answer.',
  };

  return suggestions[category] || 'Review the analysis details for specific issues.';
}
