import { describe, expect, it } from 'vitest';
import {
  calculateRhythmicCharacterScore,
  calculateStrettoPotentialScore,
} from './scoring';

function createStrettoResult(entries) {
  return {
    allResults: entries.map(({ distance, avgScore, overlapPercent = 0, viable = true, issues = [] }) => ({
      distance,
      overlapPercent,
      viable,
      issues,
      dissonanceAnalysis: {
        summary: {
          averageScore: avgScore,
        },
      },
    })),
  };
}

describe('calculateRhythmicCharacterScore', () => {
  it('applies syncopation scoring without throwing when offBeatRatio is present', () => {
    const result = calculateRhythmicCharacterScore({
      uniqueDurations: 3,
      offBeatRatio: 0.4,
      observations: [],
    });

    expect(result.internal).toBeGreaterThan(5);
    expect(result.details.some((d) => d.factor.includes('Syncopation'))).toBe(true);
  });

  it('penalizes excessive syncopation over the high-threshold plateau', () => {
    const moderate = calculateRhythmicCharacterScore({
      uniqueDurations: 3,
      offBeatRatio: 0.4,
      observations: [],
    });
    const excessive = calculateRhythmicCharacterScore({
      uniqueDurations: 3,
      offBeatRatio: 0.9,
      observations: [],
    });

    expect(excessive.internal).toBeLessThan(moderate.internal);
  });
});

describe('calculateStrettoPotentialScore', () => {
  it('preserves the main all-distances aggregation so long distances still affect the score', () => {
    const subjectLength = 9;
    const baseline = createStrettoResult([
      { distance: 1, avgScore: 0.2 },
      { distance: 3, avgScore: 0.1 },
      { distance: 6, avgScore: -1 },
      { distance: 8, avgScore: -1 },
    ]);
    const improvedLongDistances = createStrettoResult([
      { distance: 1, avgScore: 0.2 },
      { distance: 3, avgScore: 0.1 },
      { distance: 6, avgScore: 1 },
      { distance: 8, avgScore: 1 },
    ]);

    const baselineScore = calculateStrettoPotentialScore(baseline, subjectLength);
    const improvedScore = calculateStrettoPotentialScore(improvedLongDistances, subjectLength);

    expect(baselineScore.context.shortDistanceWeightedAverage).toBeCloseTo(1 / 6, 10);
    expect(improvedScore.context.shortDistanceWeightedAverage).toBeCloseTo(1 / 6, 10);
    expect(improvedScore.context.avgCounterpointScore).toBeGreaterThan(baselineScore.context.avgCounterpointScore);
    expect(improvedScore.internal).toBeGreaterThan(baselineScore.internal);
  });

  it('uses only short distances for the replacement bonus term', () => {
    const subjectLength = 9;
    const first = createStrettoResult([
      { distance: 1, avgScore: 0.3 },
      { distance: 2, avgScore: 0.1 },
      { distance: 6, avgScore: -1 },
      { distance: 8, avgScore: 1 },
    ]);
    const second = createStrettoResult([
      { distance: 1, avgScore: 0.3 },
      { distance: 2, avgScore: 0.1 },
      { distance: 6, avgScore: 1 },
      { distance: 8, avgScore: -1 },
    ]);

    const firstScore = calculateStrettoPotentialScore(first, subjectLength);
    const secondScore = calculateStrettoPotentialScore(second, subjectLength);

    const firstBonus = firstScore.internal - firstScore.context.avgCounterpointScore * 5;
    const secondBonus = secondScore.internal - secondScore.context.avgCounterpointScore * 5;

    expect(firstScore.context.shortDistanceCandidates.map(({ distance }) => distance)).toEqual([1, 2]);
    expect(secondScore.context.shortDistanceCandidates.map(({ distance }) => distance)).toEqual([1, 2]);
    expect(firstBonus).toBeCloseTo(secondBonus, 10);
    expect(firstBonus).toBeCloseTo(firstScore.context.shortDistanceWeightedAverage * 5, 10);
  });

  it('applies the short-distance weighting exactly as 2:1:0.5 over the top three scores', () => {
    const result = createStrettoResult([
      { distance: 1, avgScore: 8 },
      { distance: 2, avgScore: 4 },
      { distance: 3, avgScore: 2 },
      { distance: 4, avgScore: 100 },
    ]);

    const score = calculateStrettoPotentialScore(result, 9);

    expect(score.context.shortDistanceCutoff).toBe(3);
    expect(score.context.shortDistanceCandidates.map(({ distance }) => distance)).toEqual([1, 2, 3]);
    expect(score.context.shortDistanceTopScores.map(({ avgScore }) => avgScore)).toEqual([8, 4, 2]);
    expect(score.context.shortDistanceWeightedAverage).toBeCloseTo(6, 10);
  });

  it('removes the old thresholded close-stretto jump based on overlapPercent', () => {
    const subjectLength = 9;
    const highOverlap = createStrettoResult([
      { distance: 1, avgScore: 0.1, overlapPercent: 70 },
      { distance: 6, avgScore: -0.5, overlapPercent: 0 },
      { distance: 8, avgScore: -0.5, overlapPercent: 0 },
    ]);
    const lowOverlap = createStrettoResult([
      { distance: 1, avgScore: 0.1, overlapPercent: 10 },
      { distance: 6, avgScore: -0.5, overlapPercent: 0 },
      { distance: 8, avgScore: -0.5, overlapPercent: 0 },
    ]);

    const highOverlapScore = calculateStrettoPotentialScore(highOverlap, subjectLength);
    const lowOverlapScore = calculateStrettoPotentialScore(lowOverlap, subjectLength);
    const bonus = highOverlapScore.internal - highOverlapScore.context.avgCounterpointScore * 5;

    expect(highOverlapScore.internal).toBeCloseTo(lowOverlapScore.internal, 10);
    expect(bonus).toBeCloseTo(0.5, 10);
    expect(bonus).not.toBeCloseTo(5, 10);
  });
});
