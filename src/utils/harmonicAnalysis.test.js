import { describe, expect, it } from 'vitest';
import { computeNoteSalience } from './harmonicAnalysis.js';

describe('computeNoteSalience', () => {
  it('rewards metrically strong, longer, and more structural notes', () => {
    const stepwiseQuarter = computeNoteSalience(
      { pitch: 62, onset: 1, duration: 1 },
      1,
      [4, 4],
      { pitch: 60, onset: 0, duration: 1 },
    );

    const downbeatLeap = computeNoteSalience(
      { pitch: 67, onset: 0, duration: 2 },
      0,
      [4, 4],
      { pitch: 60, onset: -1, duration: 1 },
    );

    expect(downbeatLeap).toBeGreaterThan(stepwiseQuarter);
  });

  it('applies the decay factor multiplicatively', () => {
    const baseline = computeNoteSalience(
      { pitch: 67, onset: 0, duration: 1 },
      0,
      [4, 4],
      { pitch: 60, onset: -1, duration: 1 },
      1,
    );

    const decayed = computeNoteSalience(
      { pitch: 67, onset: 0, duration: 1 },
      0,
      [4, 4],
      { pitch: 60, onset: -1, duration: 1 },
      0.5,
    );

    expect(decayed).toBeCloseTo(baseline * 0.5, 8);
  });
});
