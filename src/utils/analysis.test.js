import { describe, expect, it } from 'vitest';
import { testContourIndependence } from './analysis';

const formatter = {
  meter: [4, 4],
  formatBeat: (t) => `${t}`,
};

describe('testContourIndependence', () => {
  it('counts oblique motion regardless of which voice is stationary', () => {
    const voice1 = [
      { onset: 0, duration: 1, pitch: 60 },
      { onset: 1, duration: 1, pitch: 60 }, // hold while v2 moves
      { onset: 2, duration: 1, pitch: 62 }, // move while v2 holds
      { onset: 3, duration: 1, pitch: 64 },
    ];

    const voice2 = [
      { onset: 0, duration: 1, pitch: 67 },
      { onset: 1, duration: 1, pitch: 65 }, // move while v1 holds
      { onset: 2, duration: 1, pitch: 65 }, // hold while v1 moves
      { onset: 3, duration: 1, pitch: 64 },
    ];

    const resultForward = testContourIndependence(voice1, voice2, formatter);
    const resultSwapped = testContourIndependence(voice2, voice1, formatter);

    expect(resultForward.obliqueMotions).toBe(2);
    expect(resultSwapped.obliqueMotions).toBe(2);
    expect(resultForward.obliqueRatio).toBeCloseTo(resultSwapped.obliqueRatio, 6);
  });
});
