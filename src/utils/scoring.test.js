import { describe, expect, it } from 'vitest';
import {
  calculateRhythmicCharacterScore,
  calculateStrettoPotentialScore,
} from './scoring.js';

function createStrettoResult(entries) {
  return {
    allResults: entries.map(({
      distance,
      avgScore,
      overlapPercent = 0,
      viable = true,
      issues = [],
    }) => ({
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
  it('weights the best three stretto distances and rewards close viable overlap', () => {
    const result = calculateStrettoPotentialScore(createStrettoResult([
      { distance: 0.5, avgScore: 1.5, overlapPercent: 85, viable: true },
      { distance: 1, avgScore: 1.2, overlapPercent: 70, viable: true },
      { distance: 2, avgScore: 0.9, overlapPercent: 55, viable: true },
      { distance: 4, avgScore: -1.0, overlapPercent: 25, viable: false, issues: [{ description: 'bad overlap' }] },
    ]));

    expect(result.internal).toBeGreaterThan(0);
    expect(result.details.some((detail) => detail.factor.includes('Top 3 stretto distances avg'))).toBe(true);
    expect(result.details.some((detail) => detail.factor.includes('Close stretto possible'))).toBe(true);
  });
});
