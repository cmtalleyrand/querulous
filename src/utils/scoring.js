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
 * Based on chord analysis: coverage (proportion of beats with chords) and dominant implication
 */
export function calculateTonalDefinitionScore(result) {
  if (!result || result.error) return { score: 0, internal: 0, details: [] };

  let internal = 0; // Base-zero score
  const details = [];

  // Dominant implied from chord analysis
  if (result.chordAnalysis?.summary?.impliesDominant) {
    internal += 3;
    details.push({ factor: 'Harmony implies dominant function', impact: +3 });
  }

  // Harmonic clarity from chord coverage (0-2.0 points, scaled to internal)
  if (result.harmonicClarityScore && result.harmonicClarityScore > 0) {
    const clarityImpact = Math.round(result.harmonicClarityScore * 4); // Scale to 0-8
    internal += clarityImpact;
    details.push({ factor: 'Harmonic clarity (beat coverage)', impact: clarityImpact });
  }

  return {
    score: toDisplayScore(internal),
    internal,
    details,
  };
}

/**
 * Calculate Melodic Contour score (base-zero)
 * Factors: leap recovery, focal point/climax
 */
export function calculateMelodicContourScore(result) {
  if (!result || result.error) return { score: 0, internal: 0, details: [] };

  let internal = 0;
  const details = [];

  // Leap recovery bonus
  if (result.leapRecoveryScore && result.leapRecoveryScore > 0) {
    const leapImpact = Math.round(result.leapRecoveryScore * 8); // ~2 points
    internal += leapImpact;
    details.push({ factor: 'Good leap recovery', impact: leapImpact });
  }

  // Focal point/climax bonus (0-3 points, scaled to internal)
  if (result.focalPointScore && result.focalPointScore > 0) {
    const focalImpact = Math.round(result.focalPointScore * 3); // Scale to ~9 max
    internal += focalImpact;
    details.push({ factor: 'Clear melodic climax', impact: focalImpact });
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

  // Sort by score (best first) and take top 3
  // Rationale: You're unlikely to use more than 3 stretto distances in practice,
  // so what matters is whether your best options are good, not the average of all.
  const sortedScores = [...distanceScores].sort((a, b) => b.avgScore - a.avgScore);
  const top3 = sortedScores.slice(0, 3);
  const rest = sortedScores.slice(3);

  // Primary score: average of top 3 (or fewer if less than 3 tested)
  const top3Avg = top3.reduce((sum, d) => sum + d.avgScore, 0) / top3.length;

  // Secondary: rest of distances contribute at 25% weight
  const restAvg = rest.length > 0 ? rest.reduce((sum, d) => sum + d.avgScore, 0) / rest.length : 0;
  const weightedAvg = rest.length > 0
    ? (top3Avg * 0.75 + restAvg * 0.25)
    : top3Avg;

  // Internal score: scale to -15 to +15 range
  let internal = weightedAvg * 5;

  details.push({
    factor: `Top ${top3.length} stretto distances avg: ${top3Avg.toFixed(2)}`,
    impact: Math.round(top3Avg * 5),
  });

  if (rest.length > 0) {
    details.push({
      factor: `Other ${rest.length} distances avg: ${restAvg.toFixed(2)} (25% weight)`,
      impact: Math.round(restAvg * 5 * 0.25),
      type: 'info',
    });
  }

  // Count good distances for context
  const goodDistances = distanceScores.filter(d => d.avgScore >= 0).length;

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
    avgCounterpointScore: weightedAvg,
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
 * Combines harmonic implication + answer compatibility into one basic indicator.
 * (Opening/terminal removed - oversimplified and not purely harmonic)
 *
 * Baseline 0 = acceptable tonal orientation
 * Positive = clear tonal structure
 * Negative = unclear or problematic
 */
export function calculateTonalClarityScore(harmonicResult, answerResult) {
  const details = [];
  let internal = 0;

  // --- From Harmonic Implication ---
  if (harmonicResult && !harmonicResult.error) {
    // Dominant implied from chord analysis
    if (harmonicResult.chordAnalysis?.summary?.impliesDominant) {
      internal += 2;
      details.push({ factor: 'Harmony implies dominant function', impact: +2 });
    }

    // Harmonic clarity from coverage
    if (harmonicResult.harmonicClarityScore > 1.5) {
      internal += 2;
      details.push({ factor: 'Clear harmonic implications', impact: +2 });
    } else if (harmonicResult.harmonicClarityScore < 0.5) {
      internal -= 2;
      details.push({ factor: 'Ambiguous harmonic implications', impact: -2 });
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

  // Parallel perfects penalty removed - already reflected in the average score
  // which includes consecutive perfect consonance penalties. Adding a separate
  // penalty here was double-counting.

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
 *
 * Main metric: Solo onset ratio (% of onsets in only one voice)
 * - Desirable baseline: 33-66%
 * - Penalize: <20% (shadowing) or >80% (disjointed)
 *
 * Secondary: Strong beat simultaneity
 * - Punish: >90%
 * - Reward: <80%
 */
export function calculateRhythmicInterplayScore(result) {
  if (!result || result.error) return { score: 0, internal: 0, details: [] };

  let internal = 0;
  const details = [];

  const soloRatio = result.soloOnsetRatio;
  const strongBeatSim = result.strongBeatSimultaneity;

  // Main metric: solo onset ratio
  if (soloRatio !== undefined) {
    if (soloRatio >= 0.33 && soloRatio <= 0.66) {
      // Ideal range - good interlocking
      internal += 10;
      details.push({ factor: `${Math.round(soloRatio * 100)}% solo onsets (good interlocking)`, impact: +10 });
    } else if (soloRatio < 0.20) {
      // Too few solo onsets - voices shadow each other
      internal -= 10;
      details.push({ factor: `${Math.round(soloRatio * 100)}% solo onsets (shadowing)`, impact: -10 });
    } else if (soloRatio > 0.80) {
      // Too many solo onsets - voices rarely align
      internal -= 10;
      details.push({ factor: `${Math.round(soloRatio * 100)}% solo onsets (disjointed)`, impact: -10 });
    } else {
      // Between 20-33% or 66-80% - acceptable but not ideal
      details.push({ factor: `${Math.round(soloRatio * 100)}% solo onsets`, impact: 0 });
    }
  }

  // Secondary metric: strong beat simultaneity
  if (strongBeatSim !== undefined) {
    if (strongBeatSim > 0.90) {
      // Too lockstep on strong beats
      internal -= 5;
      details.push({ factor: `${Math.round(strongBeatSim * 100)}% strong beat simultaneity (lockstep)`, impact: -5 });
    } else if (strongBeatSim < 0.80) {
      // Good independence on strong beats
      internal += 5;
      details.push({ factor: `${Math.round(strongBeatSim * 100)}% strong beat simultaneity (independent)`, impact: +5 });
    }
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
 *
 * Target ratio: 4:1 (contrary+oblique) vs (similar+parallel)
 * - 3:1 is slightly low (small penalty)
 * - 2:1 is too low (larger penalty)
 * - 6:1+ is too high (small penalty)
 *
 * Within contrary+oblique: contrary:oblique should be around 5:2
 * - Too skewed either way (>3:1) is penalized
 *
 * Within similar+parallel: similar:parallel should be at least 2:1
 * - Less than 2:1 is penalized, less than 3:2 even more
 *
 * Size of motion: Large similar/parallel motion is worse than small
 */
export function calculateVoiceIndependenceScore(result) {
  if (!result || result.error) return { score: 0, internal: 0, details: [] };

  let internal = 0;
  const details = [];

  const contraryRatio = result.contraryRatio || 0;
  const parallelRatio = result.parallelRatio || 0;
  const obliqueRatio = result.obliqueRatio || 0;
  const similarRatio = result.similarRatio || 0;

  // Calculate grouped ratios
  const independentMotion = contraryRatio + obliqueRatio;
  const dependentMotion = similarRatio + parallelRatio;

  // Main ratio: independent vs dependent (target 4:1 = 80% independent)
  const mainRatio = dependentMotion > 0 ? independentMotion / dependentMotion : 10;

  if (mainRatio >= 3.5 && mainRatio <= 5) {
    // Ideal range (around 4:1)
    internal += 10;
    details.push({ factor: `Good motion balance (${mainRatio.toFixed(1)}:1 independent:dependent)`, impact: +10 });
  } else if (mainRatio >= 2.5 && mainRatio < 3.5) {
    // 3:1 range - slightly low
    internal += 5;
    details.push({ factor: `Acceptable motion balance (${mainRatio.toFixed(1)}:1)`, impact: +5 });
  } else if (mainRatio >= 1.5 && mainRatio < 2.5) {
    // 2:1 range - too low
    internal -= 5;
    details.push({ factor: `Low independence (${mainRatio.toFixed(1)}:1)`, impact: -5 });
  } else if (mainRatio < 1.5) {
    // Less than 1.5:1 - very poor
    internal -= 12;
    details.push({ factor: `Poor independence (${mainRatio.toFixed(1)}:1)`, impact: -12 });
  } else if (mainRatio > 6) {
    // Too skewed toward independent - slight penalty
    internal += 5;
    details.push({ factor: `High independence (${mainRatio.toFixed(1)}:1) - slightly excessive`, impact: +5 });
  } else {
    // 5-6 range
    internal += 8;
    details.push({ factor: `Strong independence (${mainRatio.toFixed(1)}:1)`, impact: +8 });
  }

  // Contrary vs oblique balance (target around 5:2 = 2.5:1)
  // Below 5:2 (2.5:1) should get small reward
  if (obliqueRatio > 0) {
    const coRatio = contraryRatio / obliqueRatio;
    if (coRatio >= 1.5 && coRatio <= 2.5) {
      // Below 5:2 - good balance with healthy oblique, reward
      internal += 5;
      details.push({ factor: `Good contrary/oblique balance (${coRatio.toFixed(1)}:1) - healthy oblique`, impact: +5 });
    } else if (coRatio > 2.5 && coRatio <= 3) {
      // Around 5:2 - acceptable
      internal += 2;
      details.push({ factor: `Acceptable contrary/oblique (${coRatio.toFixed(1)}:1)`, impact: +2 });
    } else if (coRatio > 3) {
      // Too much contrary relative to oblique - penalize, larger penalty for larger skew
      const penalty = Math.min(5, Math.floor((coRatio - 3)));
      if (penalty > 0) {
        internal -= penalty;
        details.push({ factor: `Lacking oblique motion (${coRatio.toFixed(1)}:1 contrary:oblique)`, impact: -penalty });
      }
    } else if (coRatio < 1) {
      // More oblique than contrary - also penalize if >3:1 the other way
      const invRatio = 1 / coRatio;
      if (invRatio > 3) {
        const penalty = Math.min(5, Math.floor(invRatio - 3));
        internal -= penalty;
        details.push({ factor: `Excessive oblique vs contrary (1:${invRatio.toFixed(1)})`, impact: -penalty });
      }
    }
  }

  // Similar vs parallel balance (target at least 2:1)
  if (parallelRatio > 0 && similarRatio > 0) {
    const spRatio = similarRatio / parallelRatio;
    if (spRatio < 1.5) {
      // Less than 3:2 - strong penalty
      internal -= 5;
      details.push({ factor: `Too much parallel vs similar (${spRatio.toFixed(1)}:1)`, impact: -5 });
    } else if (spRatio < 2) {
      // Less than 2:1 - moderate penalty
      internal -= 2;
      details.push({ factor: `High parallel motion ratio (${spRatio.toFixed(1)}:1 similar:parallel)`, impact: -2 });
    }
  } else if (parallelRatio > 0.2) {
    // Lots of parallel, no similar
    internal -= 5;
    details.push({ factor: `Excessive parallel motion (${Math.round(parallelRatio * 100)}%)`, impact: -5 });
  }

  // SIZE OF MOTION consideration
  // Large parallel/similar motion is worse than small
  // result.details contains motion info - check for large interval parallel motions
  if (result.details && result.details.length > 0) {
    let largeParallelCount = 0;
    let largeSimilarCount = 0;
    for (const d of result.details) {
      if (d.type === 'parallel' && d.interval && Math.abs(d.interval) > 4) {
        largeParallelCount++;
      }
      if (d.type === 'similar' && d.interval && Math.abs(d.interval) > 4) {
        largeSimilarCount++;
      }
    }
    if (largeParallelCount > 2) {
      const penalty = Math.min(5, largeParallelCount - 2);
      internal -= penalty;
      details.push({ factor: `Large parallel leaps (${largeParallelCount} instances)`, impact: -penalty });
    }
    if (largeSimilarCount > 3) {
      const penalty = Math.min(3, largeSimilarCount - 3);
      internal -= penalty;
      details.push({ factor: `Large similar motion leaps (${largeSimilarCount} instances)`, impact: -penalty });
    }
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
 * Simply uses the counterpoint quality score against the answer, weighted for length.
 */
export function calculateTranspositionStabilityScore(result) {
  if (!result || result.error) return { score: 0, internal: 0, details: [] };

  const details = [];

  // Primary and only factor: dissonance scoring against the answer
  const detailedScoring = result.detailedScoring?.summary;
  const totalIntervals = detailedScoring?.totalIntervals || 0;

  if (detailedScoring && totalIntervals > 0) {
    const avgScore = detailedScoring.averageScore || 0;
    // Scale: avg -3 to +3 maps to internal -15 to +15
    // Weight slightly by length (more intervals = more reliable assessment)
    const lengthFactor = Math.min(1.2, 0.8 + totalIntervals / 50);
    const internal = avgScore * 5 * lengthFactor;

    details.push({
      factor: `Counterpoint quality vs answer: ${avgScore.toFixed(2)}`,
      impact: Math.round(internal),
    });

    if (totalIntervals < 10) {
      details.push({
        factor: `Short overlap (${totalIntervals} intervals)`,
        impact: 0,
        type: 'info',
      });
    }

    return {
      score: toDisplayScore(internal),
      internal,
      details,
    };
  }

  // No analysis data
  return {
    score: toDisplayScore(0),
    internal: 0,
    details: [{ factor: 'No counterpoint data available', impact: 0 }],
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
