/**
 * Scoring utilities for fugue analysis
 *
 * This module provides functions to calculate scores for various aspects
 * of fugue subject and countersubject analysis. All scores are normalized
 * to a 0-100 scale for easy comparison and visualization.
 */

/**
 * Score categories and their descriptions
 */
export const SCORE_CATEGORIES = {
  harmonicImplication: {
    name: 'Harmonic Implication',
    description: 'How well the subject establishes and implies harmonic motion',
    weight: 1.0,
  },
  rhythmicVariety: {
    name: 'Rhythmic Variety',
    description: 'Diversity and contrast in rhythmic values',
    weight: 0.8,
  },
  strettoViability: {
    name: 'Stretto Viability',
    description: 'How well the subject works in overlapping entries',
    weight: 1.0,
  },
  tonalAnswer: {
    name: 'Tonal Answer',
    description: 'Clarity and quality of the tonal answer junction',
    weight: 0.9,
  },
  doubleCounterpoint: {
    name: 'Double Counterpoint',
    description: 'Invertibility of subject-countersubject combination',
    weight: 1.0,
  },
  rhythmicComplementarity: {
    name: 'Rhythmic Complementarity',
    description: 'How well the countersubject complements the subject rhythmically',
    weight: 0.8,
  },
  contourIndependence: {
    name: 'Contour Independence',
    description: 'Independence of melodic contours between voices',
    weight: 0.9,
  },
  modulatoryRobustness: {
    name: 'Modulatory Robustness',
    description: 'How well the countersubject works against the answer',
    weight: 1.0,
  },
};

/**
 * Score thresholds for rating
 */
export const SCORE_THRESHOLDS = {
  excellent: 85,
  good: 70,
  fair: 50,
  poor: 0,
};

/**
 * Get a rating label for a score
 */
export function getScoreRating(score) {
  if (score >= SCORE_THRESHOLDS.excellent) return 'Excellent';
  if (score >= SCORE_THRESHOLDS.good) return 'Good';
  if (score >= SCORE_THRESHOLDS.fair) return 'Fair';
  return 'Needs Work';
}

/**
 * Get a color for a score
 */
export function getScoreColor(score) {
  if (score >= SCORE_THRESHOLDS.excellent) return '#2e7d32'; // Dark green
  if (score >= SCORE_THRESHOLDS.good) return '#558b2f'; // Light green
  if (score >= SCORE_THRESHOLDS.fair) return '#f57c00'; // Orange
  return '#c62828'; // Red
}

/**
 * Get a background color for a score
 */
export function getScoreBgColor(score) {
  if (score >= SCORE_THRESHOLDS.excellent) return '#e8f5e9';
  if (score >= SCORE_THRESHOLDS.good) return '#f1f8e9';
  if (score >= SCORE_THRESHOLDS.fair) return '#fff3e0';
  return '#ffebee';
}

/**
 * Calculate harmonic implication score
 */
export function calculateHarmonicImplicationScore(result) {
  if (!result || result.error) return { score: 0, details: [] };

  let score = 50; // Base score
  const details = [];

  // Opening on tonic chord tone: +20
  if (result.opening?.isTonicChordTone) {
    score += 20;
    details.push({ factor: 'Opens on tonic chord tone', impact: +20 });
  } else {
    details.push({ factor: 'Opens on non-tonic tone', impact: 0 });
  }

  // Terminal quality
  const terminalScores = {
    strong: 25,
    good: 15,
    workable: 5,
    ambiguous: -5,
    unusual: -10,
  };
  const termScore = terminalScores[result.terminal?.q] || 0;
  score += termScore;
  details.push({ factor: `Terminal: ${result.terminal?.q || 'unknown'}`, impact: termScore });

  // Dominant arrival bonus
  if (result.dominantArrival) {
    const ratio = result.dominantArrival.ratio;
    if (ratio >= 0.3 && ratio <= 0.7) {
      score += 10;
      details.push({ factor: 'Well-placed dominant arrival', impact: +10 });
    } else {
      score += 5;
      details.push({ factor: 'Dominant arrival present', impact: +5 });
    }
  }

  return { score: Math.min(100, Math.max(0, score)), details };
}

/**
 * Calculate rhythmic variety score
 */
export function calculateRhythmicVarietyScore(result) {
  if (!result || result.error) return { score: 0, details: [] };

  let score = 40; // Base score
  const details = [];

  // Unique durations bonus
  const uniqueCount = result.uniqueDurations || 1;
  if (uniqueCount >= 4) {
    score += 35;
    details.push({ factor: `${uniqueCount} different note values`, impact: +35 });
  } else if (uniqueCount >= 3) {
    score += 25;
    details.push({ factor: `${uniqueCount} different note values`, impact: +25 });
  } else if (uniqueCount >= 2) {
    score += 15;
    details.push({ factor: `${uniqueCount} different note values`, impact: +15 });
  } else {
    score -= 20;
    details.push({ factor: 'Uniform rhythm', impact: -20 });
  }

  // Check for rhythmic contrast in observations
  const hasContrast = result.observations?.some((o) => o.description?.includes('Good rhythmic contrast'));
  if (hasContrast) {
    score += 20;
    details.push({ factor: 'Good rhythmic contrast', impact: +20 });
  }

  return { score: Math.min(100, Math.max(0, score)), details };
}

/**
 * Calculate stretto viability score
 * Uses weighted severity (accounting for beat strength, duration, consecutiveness)
 */
export function calculateStrettoViabilityScore(result, subjectLength = null) {
  if (!result || result.error) return { score: 0, details: [], context: {} };

  const details = [];
  const totalTests = result.allResults?.length || 0;
  const viableCount = result.viableStrettos?.length || 0;
  const summary = result.summary || {};

  if (totalTests === 0) {
    return { score: 0, details: [{ factor: 'No stretto distances tested', impact: 0 }], context: {} };
  }

  // Context information
  const context = {
    subjectLength,
    testedDistances: totalTests,
    viableDistances: viableCount,
    viableRatio: viableCount / totalTests,
    avgWeightedSeverity: summary.avgWeightedSeverity,
    maxWeightedSeverity: summary.maxWeightedSeverity,
  };

  // Base score from viable ratio
  const viableRatio = viableCount / totalTests;
  let score = Math.round(viableRatio * 50); // Reduced from 70 to make room for severity-based scoring

  // More informative description with ratio
  const ratioPercent = Math.round(viableRatio * 100);
  details.push({
    factor: `${viableCount} of ${totalTests} distances viable (${ratioPercent}%)`,
    impact: score,
  });

  // Bonus/penalty based on average weighted severity across all strettos
  // Low average severity = issues are minor (weak beats, short notes, scattered)
  const avgSeverity = summary.avgWeightedSeverity || 0;
  if (avgSeverity === 0) {
    score += 20;
    details.push({ factor: 'All strettos clean—no issues', impact: +20 });
  } else if (avgSeverity < 2) {
    score += 15;
    details.push({ factor: `Low average severity (${avgSeverity.toFixed(1)})—issues minor`, impact: +15 });
  } else if (avgSeverity < 4) {
    score += 5;
    details.push({ factor: `Moderate severity (${avgSeverity.toFixed(1)})`, impact: +5 });
  } else if (avgSeverity >= 6) {
    score -= 10;
    details.push({ factor: `High average severity (${avgSeverity.toFixed(1)})—issues on strong beats/long notes`, impact: -10 });
  }

  // Penalty for strettos with consecutive issues (compounds problems)
  const hasConsecutiveIssues = result.allResults?.some(r => r.maxConsecutiveIssues >= 2);
  if (hasConsecutiveIssues) {
    const worstConsecutive = Math.max(...result.allResults.map(r => r.maxConsecutiveIssues || 0));
    if (worstConsecutive >= 3) {
      score -= 10;
      details.push({ factor: `Consecutive issues (${worstConsecutive} in a row)—compounds problems`, impact: -10 });
    } else {
      score -= 5;
      details.push({ factor: 'Some consecutive issues detected', impact: -5 });
    }
  }

  // If we know subject length, add context
  if (subjectLength) {
    const beatsPerStretto = subjectLength / (viableCount || 1);
    if (viableCount > 0) {
      details.push({
        factor: `Average ${beatsPerStretto.toFixed(1)} beats between viable entry points`,
        impact: 0,
        type: 'info',
      });
    }
  }

  // Bonus for consecutive viable strettos (indicates flexibility)
  let maxConsecutive = 0;
  let current = 0;
  for (const r of result.allResults || []) {
    if (r.viable) {
      current++;
      maxConsecutive = Math.max(maxConsecutive, current);
    } else {
      current = 0;
    }
  }

  if (maxConsecutive >= 3) {
    score += 15;
    details.push({ factor: `${maxConsecutive} consecutive viable distances—flexible entry timing`, impact: +15 });
  } else if (maxConsecutive >= 2) {
    score += 8;
    details.push({ factor: `${maxConsecutive} consecutive viable distances`, impact: +8 });
  }

  // Bonus for having at least one viable close stretto (high overlap)
  const closeViable = result.viableStrettos?.filter((s) => s.overlapPercent >= 60);
  if (closeViable?.length > 0) {
    const closestOverlap = Math.max(...closeViable.map(s => s.overlapPercent));
    score += 10;
    details.push({ factor: `Close stretto possible (${closestOverlap}% overlap)`, impact: +10 });
  }

  // Count near-viable (low weighted severity) for additional context
  const nearViable = result.allResults?.filter(r => !r.viable && (r.weightedSeverity || 0) < 3) || [];
  if (nearViable.length > 0) {
    context.nearViableCount = nearViable.length;
    details.push({
      factor: `${nearViable.length} distances nearly viable (low severity issues)—minor adjustments needed`,
      impact: 0,
      type: 'info',
    });
  }

  return { score: Math.min(100, Math.max(0, score)), details, context };
}

/**
 * Calculate tonal answer score
 */
export function calculateTonalAnswerScore(result) {
  if (!result || result.error) return { score: 0, details: [] };

  let score = 60; // Base score
  const details = [];

  // Junction quality
  const junctionScores = {
    strong: 25,
    good: 15,
    static: -10,
    unusual: -15,
  };
  const juncScore = junctionScores[result.junction?.q] || 0;
  score += juncScore;
  details.push({ factor: `Junction: ${result.junction?.p || '?'} (${result.junction?.q || 'unknown'})`, impact: juncScore });

  // Answer type clarity
  if (result.answerType === 'real') {
    score += 10;
    details.push({ factor: 'Clear real answer', impact: +10 });
  } else if (result.mutationPoint !== null) {
    score += 5;
    details.push({ factor: 'Clear tonal mutation point', impact: +5 });
  }

  return { score: Math.min(100, Math.max(0, score)), details };
}

/**
 * Calculate double counterpoint score
 * Uses actual dissonance scores from detailed analysis, not just issue counts
 */
export function calculateDoubleCounterpointScore(result) {
  if (!result || result.error) return { score: 0, details: [], context: {} };

  const details = [];

  // Get detailed scoring data
  const origScoring = result.original?.detailedScoring?.summary;
  const invScoring = result.inverted?.detailedScoring?.summary;

  // Context
  const context = {
    originalIntervals: origScoring?.totalIntervals || 0,
    invertedIntervals: invScoring?.totalIntervals || 0,
    originalAvgScore: origScoring?.averageScore || 0,
    invertedAvgScore: invScoring?.averageScore || 0,
  };

  // Start with base score of 50
  let score = 50;

  // Use average dissonance scores if available (more nuanced than issue counting)
  if (origScoring && origScoring.totalDissonances > 0) {
    const avgScore = origScoring.averageScore;
    // Average score ranges roughly -3 to +3, map to -20 to +20 impact
    const impact = Math.round(avgScore * 7);
    score += impact;
    details.push({
      factor: `Original dissonance handling: avg ${avgScore.toFixed(2)}`,
      impact: impact,
    });
  } else if (origScoring) {
    score += 15;
    details.push({ factor: 'No dissonances in original position', impact: +15 });
  }

  if (invScoring && invScoring.totalDissonances > 0) {
    const avgScore = invScoring.averageScore;
    const impact = Math.round(avgScore * 7);
    score += impact;
    details.push({
      factor: `Inverted dissonance handling: avg ${avgScore.toFixed(2)}`,
      impact: impact,
    });
  } else if (invScoring) {
    score += 15;
    details.push({ factor: 'No dissonances in inverted position', impact: +15 });
  }

  // Parallel perfects are still critical issues
  const origIssues = result.original?.issues?.length || 0;
  const invIssues = result.inverted?.issues?.length || 0;
  if (origIssues > 0 || invIssues > 0) {
    const totalIssues = origIssues + invIssues;
    const penalty = Math.min(30, totalIssues * 10);
    score -= penalty;
    details.push({
      factor: `${totalIssues} critical issue${totalIssues !== 1 ? 's' : ''} (parallel 5ths/8ves, P4 vs bass)`,
      impact: -penalty,
    });
  }

  // Imperfect consonance ratio bonus
  const origRatio = result.original?.imperfectRatio || 0;
  const invRatio = result.inverted?.imperfectRatio || 0;
  const avgRatio = (origRatio + invRatio) / 2;

  if (avgRatio >= 0.5) {
    score += 10;
    details.push({
      factor: `${Math.round(avgRatio * 100)}% imperfect consonances—good for invertibility`,
      impact: +10,
    });
  } else if (avgRatio < 0.3) {
    score -= 5;
    details.push({
      factor: `Only ${Math.round(avgRatio * 100)}% imperfect consonances—risky for inversion`,
      impact: -5,
    });
  }

  return { score: Math.min(100, Math.max(0, score)), details, context };
}

/**
 * Calculate rhythmic complementarity score
 */
export function calculateRhythmicComplementarityScore(result) {
  if (!result || result.error) return { score: 0, details: [] };

  const details = [];
  const overlapRatio = result.overlapRatio || 0;

  // Ideal overlap is between 30-60%
  let score;
  if (overlapRatio <= 0.3) {
    score = 90;
    details.push({ factor: `Low overlap (${Math.round(overlapRatio * 100)}%)`, impact: 90 });
  } else if (overlapRatio <= 0.5) {
    score = 75;
    details.push({ factor: `Moderate overlap (${Math.round(overlapRatio * 100)}%)`, impact: 75 });
  } else if (overlapRatio <= 0.7) {
    score = 55;
    details.push({ factor: `High overlap (${Math.round(overlapRatio * 100)}%)`, impact: 55 });
  } else {
    score = 30;
    details.push({ factor: `Very high overlap (${Math.round(overlapRatio * 100)}%) - homorhythmic`, impact: 30 });
  }

  // Strong beat collision penalty
  const collisions = result.strongBeatCollisions || 0;
  if (collisions > 3) {
    score -= 10;
    details.push({ factor: `${collisions} strong beat collisions`, impact: -10 });
  }

  return { score: Math.min(100, Math.max(0, score)), details };
}

/**
 * Calculate contour independence score
 */
export function calculateContourIndependenceScore(result) {
  if (!result || result.error) return { score: 0, details: [] };

  let score = 50; // Base score
  const details = [];

  const contraryRatio = result.contraryRatio || 0;
  const parallelRatio = result.parallelRatio || 0;
  const obliqueRatio = result.obliqueRatio || 0;

  // Contrary motion is ideal
  if (contraryRatio >= 0.4) {
    score += 30;
    details.push({ factor: `High contrary motion (${Math.round(contraryRatio * 100)}%)`, impact: +30 });
  } else if (contraryRatio >= 0.25) {
    score += 15;
    details.push({ factor: `Moderate contrary motion (${Math.round(contraryRatio * 100)}%)`, impact: +15 });
  }

  // Parallel motion is problematic
  if (parallelRatio > 0.3) {
    score -= 20;
    details.push({ factor: `High parallel motion (${Math.round(parallelRatio * 100)}%)`, impact: -20 });
  } else if (parallelRatio <= 0.1) {
    score += 10;
    details.push({ factor: `Low parallel motion (${Math.round(parallelRatio * 100)}%)`, impact: +10 });
  }

  // Oblique motion adds variety
  if (obliqueRatio >= 0.15) {
    score += 10;
    details.push({ factor: `Good oblique motion (${Math.round(obliqueRatio * 100)}%)`, impact: +10 });
  }

  return { score: Math.min(100, Math.max(0, score)), details };
}

/**
 * Calculate modulatory robustness score
 * Uses detailed dissonance scores when available
 */
export function calculateModulatoryRobustnessScore(result) {
  if (!result || result.error) return { score: 0, details: [] };

  let score = 50; // Base score
  const details = [];

  // Use detailed dissonance scoring if available
  const detailedScoring = result.detailedScoring?.summary;
  if (detailedScoring && detailedScoring.totalDissonances > 0) {
    const avgScore = detailedScoring.averageScore;
    // Map average score (-3 to +3) to impact (-15 to +15)
    const impact = Math.round(avgScore * 5);
    score += impact;
    details.push({
      factor: `Dissonance handling vs answer: avg ${avgScore.toFixed(2)}`,
      impact: impact,
    });
  }

  const profile = result.intervalProfile;
  if (profile) {
    const total = profile.consonant + profile.dissonant;
    if (total > 0) {
      const consPercent = Math.round((profile.consonant / total) * 100);

      if (consPercent >= 80) {
        score += 25;
        details.push({ factor: `${consPercent}% consonant on strong beats`, impact: +25 });
      } else if (consPercent >= 60) {
        score += 15;
        details.push({ factor: `${consPercent}% consonant on strong beats`, impact: +15 });
      } else {
        score -= 10;
        details.push({ factor: `Only ${consPercent}% consonant on strong beats`, impact: -10 });
      }
    }
  }

  // Parallel perfect violations
  const violations = result.violations?.length || 0;
  if (violations === 0) {
    score += 10;
    details.push({ factor: 'No parallel perfect violations', impact: +10 });
  } else {
    const penalty = Math.min(30, violations * 10);
    score -= penalty;
    details.push({ factor: `${violations} parallel perfect violations`, impact: -penalty });
  }

  return { score: Math.min(100, Math.max(0, score)), details };
}

/**
 * Calculate overall fugue viability score
 * Now accepts optional subject info for context-aware scoring
 */
export function calculateOverallScore(results, hasCountersubject, subjectInfo = null) {
  // Extract subject metrics if available
  const subjectLength = subjectInfo?.length || results.subject?.length;
  const subjectDuration = subjectInfo?.duration || results.subjectDuration;
  const noteCount = subjectInfo?.noteCount || results.noteCount;

  const scores = {
    harmonicImplication: calculateHarmonicImplicationScore(results.harmonicImplication),
    rhythmicVariety: calculateRhythmicVarietyScore(results.rhythmicVariety),
    strettoViability: calculateStrettoViabilityScore(results.stretto, subjectDuration),
    tonalAnswer: calculateTonalAnswerScore(results.tonalAnswer),
  };

  if (hasCountersubject) {
    scores.doubleCounterpoint = calculateDoubleCounterpointScore(results.doubleCounterpoint);
    scores.rhythmicComplementarity = calculateRhythmicComplementarityScore(results.rhythmicComplementarity);
    scores.contourIndependence = calculateContourIndependenceScore(results.contourIndependence);
    scores.modulatoryRobustness = calculateModulatoryRobustnessScore(results.modulatoryRobustness);
  }

  // Calculate weighted average
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [key, scoreData] of Object.entries(scores)) {
    const weight = SCORE_CATEGORIES[key]?.weight || 1.0;
    totalWeight += weight;
    weightedSum += scoreData.score * weight;
  }

  const overallScore = Math.round(weightedSum / totalWeight);

  // Build context summary
  const context = {
    subjectNotes: noteCount,
    subjectBeats: subjectDuration,
    categoriesAnalyzed: Object.keys(scores).length,
  };

  return {
    overall: overallScore,
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

  for (const [key, data] of Object.entries(scoreResult.categories)) {
    const category = SCORE_CATEGORIES[key];
    if (!category) continue;

    if (data.score >= SCORE_THRESHOLDS.good) {
      strengths.push({
        category: category.name,
        score: data.score,
        rating: getScoreRating(data.score),
      });
    } else if (data.score < SCORE_THRESHOLDS.fair) {
      improvements.push({
        category: category.name,
        score: data.score,
        rating: getScoreRating(data.score),
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
    harmonicImplication: 'Consider starting on a tonic chord tone and ending on a degree that creates clear harmonic motion.',
    rhythmicVariety: 'Try incorporating more diverse note values and rhythmic contrasts.',
    strettoViability: 'Adjust melodic intervals to reduce dissonances when overlapping.',
    tonalAnswer: 'Consider the harmonic junction at the end of the subject.',
    doubleCounterpoint: 'Use more thirds and sixths to improve invertibility.',
    rhythmicComplementarity: 'Offset attack points between voices for better interplay.',
    contourIndependence: 'Add more contrary motion to create independent voice profiles.',
    modulatoryRobustness: 'Ensure the countersubject works smoothly against the answer.',
  };

  return suggestions[category] || 'Review the analysis details for specific issues.';
}
