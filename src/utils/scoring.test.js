import { describe, expect, it } from 'vitest';
import { calculateRhythmicCharacterScore } from './scoring';

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
