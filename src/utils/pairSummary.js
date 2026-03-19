import { metricWeight } from './formatter';

const PAIR_SCORE_WEIGHTS = Object.freeze({
  allIntervalDurationWeightedMean: 0.4,
  salienceWeightedDissonanceHandling: 0.3,
  averageDissonanceHandling: 0.3,
});

const roundToTenth = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }
  return Math.round(numericValue * 10) / 10;
};

const getParallelPerfectPenalty = (analysisResult, violationAccessor = null) => {
  if (!analysisResult || analysisResult.error) {
    return 0;
  }

  const violations = violationAccessor ? violationAccessor(analysisResult) : analysisResult.violations;
  const violationCount = Array.isArray(violations) ? violations.length : 0;
  return Math.min(6, violationCount * 2);
};

const getDetailedSummary = (analysisResult, summaryAccessor = null) => {
  if (!analysisResult || analysisResult.error) {
    return null;
  }

  const summary = summaryAccessor ? summaryAccessor(analysisResult) : analysisResult.detailedScoring?.summary;
  return summary ?? null;
};

const calculateSalienceWeightedDissonanceHandling = (analysisResult, meter, allAccessor = null) => {
  if (!analysisResult || analysisResult.error || !Array.isArray(meter)) {
    return 0;
  }

  const intervalRows = allAccessor ? allAccessor(analysisResult) : analysisResult.detailedScoring?.all;
  if (!Array.isArray(intervalRows)) {
    return 0;
  }

  const dissonances = intervalRows.filter((row) => row && row.isConsonant === false);
  if (dissonances.length === 0) {
    return 0;
  }

  let weightedScoreSum = 0;
  let weightSum = 0;

  for (const dissonance of dissonances) {
    const salienceWeight = metricWeight(dissonance.onset || 0, meter);
    weightedScoreSum += (dissonance.score || 0) * salienceWeight;
    weightSum += salienceWeight;
  }

  return weightSum > 0 ? weightedScoreSum / weightSum : 0;
};

export function buildPairSummary({
  label,
  analysisResult,
  meter,
  summaryAccessor = null,
  violationAccessor = null,
  allAccessor = null,
}) {
  const summary = getDetailedSummary(analysisResult, summaryAccessor);
  const allIntervalDurationWeightedMean = summary?.overallAvgScore ?? summary?.averageScore ?? 0;
  const averageDissonanceHandling = summary?.averageScore ?? 0;
  const salienceWeightedDissonanceHandling = calculateSalienceWeightedDissonanceHandling(analysisResult, meter, allAccessor);
  const parallelPerfectPenalty = getParallelPerfectPenalty(analysisResult, violationAccessor);

  const rawFinalPairScore = (
    (PAIR_SCORE_WEIGHTS.allIntervalDurationWeightedMean * allIntervalDurationWeightedMean)
    + (PAIR_SCORE_WEIGHTS.salienceWeightedDissonanceHandling * salienceWeightedDissonanceHandling)
    + (PAIR_SCORE_WEIGHTS.averageDissonanceHandling * averageDissonanceHandling)
    - parallelPerfectPenalty
  );

  return {
    label,
    pairQuality: roundToTenth(rawFinalPairScore),
    components: {
      allIntervalDurationWeightedMean: roundToTenth(allIntervalDurationWeightedMean),
      salienceWeightedDissonanceHandling: roundToTenth(salienceWeightedDissonanceHandling),
      averageDissonanceHandling: roundToTenth(averageDissonanceHandling),
    },
    parallelPerfectPenalty: roundToTenth(parallelPerfectPenalty),
    finalPairScore: roundToTenth(rawFinalPairScore),
  };
}

const isAvailableAnalysisResult = (analysisResult) => Boolean(analysisResult && !analysisResult.error);

export function buildAvailablePairSummaries(pairDefinitions, meter) {
  return pairDefinitions
    .filter((pairDefinition) => isAvailableAnalysisResult(pairDefinition?.analysisResult))
    .map((pairDefinition) => buildPairSummary({ ...pairDefinition, meter }));
}
