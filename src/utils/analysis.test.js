import { describe, expect, it } from 'vitest';
import { testContourIndependence } from './analysis';
import { getIntervalMagnitude } from './motionClassification';

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

  it('assesses staggered similar motion as partially non-oblique (ABC example)', () => {
    // Subject: E A7- (E=64 eighth, A=69 held)
    // CS: G2 A2 B2 C2 D2 (G=55, A=57, B=59, C=60, D=62 quarter notes)
    // Subject A attacks at beat 0.5, offset from CS quarter-note grid
    const subject = [
      { onset: 0, duration: 0.5, pitch: 64 },    // E4
      { onset: 0.5, duration: 3.5, pitch: 69 },   // A4 (held)
    ];
    const cs = [
      { onset: 0, duration: 1, pitch: 55 },       // G3
      { onset: 1, duration: 1, pitch: 57 },        // A3
      { onset: 2, duration: 1, pitch: 59 },        // B3
      { onset: 3, duration: 1, pitch: 60 },        // C4
    ];

    const result = testContourIndependence(subject, cs, formatter);

    // 4 transitions, all oblique in raw classification
    // T1 (onset 0.5): subject E→A up, nearest CS move is T2 at onset 1.0, offset=0.5
    // T2 (onset 1.0): CS G→A up, nearest subject move is T1 at onset 0.5, offset=0.5
    // T3 (onset 2.0): CS A→B, nearest subject move at 0.5, offset=1.5 (outside window)
    // T4 (onset 3.0): CS B→C, nearest subject move at 0.5, offset=2.5 (outside window)
    // With short-subject window=1.0: offset=0.5 → nonObliqueFraction=0.5
    // Both going up → similar
    expect(result.similarMotions).toBeCloseTo(1.0, 4);  // 0.5 + 0.5
    expect(result.obliqueMotions).toBeCloseTo(3.0, 4);   // 4 - 1.0
    // Total unchanged
    const total = result.parallelMotions + result.similarMotions + result.contraryMotions + result.obliqueMotions;
    expect(total).toBeCloseTo(4.0, 6);
  });

  it('assesses staggered contrary motion as partially non-oblique', () => {
    // V1 moves up, V2 moves down, offset by 0.125 beats (32nd note)
    // Using many notes to avoid short-subject threshold (window stays 0.75)
    const v1 = [
      { onset: 0, duration: 0.5, pitch: 60 },
      { onset: 0.5, duration: 0.5, pitch: 60 },
      { onset: 1.0, duration: 0.5, pitch: 60 },
      { onset: 1.5, duration: 0.5, pitch: 60 },
      { onset: 2.0, duration: 0.5, pitch: 60 },
      { onset: 2.5, duration: 0.5, pitch: 60 },
      { onset: 3.0, duration: 0.5, pitch: 60 },
      { onset: 3.5, duration: 0.5, pitch: 60 },
      { onset: 4.0, duration: 0.5, pitch: 60 },
      // V1 moves up at 4.5
      { onset: 4.5, duration: 0.5, pitch: 62 },
    ];
    const v2 = [
      { onset: 0, duration: 0.5, pitch: 67 },
      { onset: 0.5, duration: 0.5, pitch: 67 },
      { onset: 1.0, duration: 0.5, pitch: 67 },
      { onset: 1.5, duration: 0.5, pitch: 67 },
      { onset: 2.0, duration: 0.5, pitch: 67 },
      { onset: 2.5, duration: 0.5, pitch: 67 },
      { onset: 3.0, duration: 0.5, pitch: 67 },
      { onset: 3.5, duration: 0.5, pitch: 67 },
      // V2 moves down at 4.375 (0.125 before V1's move)
      { onset: 4.375, duration: 0.5, pitch: 65 },
      { onset: 4.875, duration: 0.5, pitch: 65 },
    ];

    const result = testContourIndependence(v1, v2, formatter);

    // The staggered pair: V2 down at 4.375, V1 up at 4.5
    // offset = 0.125, window = 0.75 → nonObliqueFraction = 1 - 0.125/0.75 ≈ 0.833
    // V1 up, V2 down → contrary
    // Each oblique transition in the pair gets ~0.833 contrary
    expect(result.contraryMotions).toBeGreaterThan(0);
    expect(result.obliqueMotions).toBeGreaterThan(0);
    // Total should be preserved
    const total = result.parallelMotions + result.similarMotions + result.contraryMotions + result.obliqueMotions;
    expect(total).toBeCloseTo(
      Math.round(total), // should be integer (count of raw transitions)
      1 // loose tolerance since floats
    );
  });

  it('does not assess same-voice consecutive obliques', () => {
    // V1 moves twice while V2 holds — genuinely oblique
    const v1 = [
      { onset: 0, duration: 0.25, pitch: 60 },
      { onset: 0.25, duration: 0.25, pitch: 62 },
      { onset: 0.5, duration: 0.25, pitch: 64 },
    ];
    const v2 = [
      { onset: 0, duration: 0.75, pitch: 67 },
    ];

    const result = testContourIndependence(v1, v2, formatter);

    // Both transitions are oblique with V1 moving. No V2 moves at all.
    // No nearby V2 move → no assessment → stays pure oblique.
    expect(result.obliqueMotions).toBe(2);
    expect(result.similarMotions).toBe(0);
    expect(result.contraryMotions).toBe(0);
    expect(result.parallelMotions).toBe(0);
  });

  it('does not assess obliques when offset exceeds window', () => {
    // Same as ABC example but with enough notes to use standard window (0.75)
    // and a 1.0-beat offset (> 0.75)
    const v1 = [
      { onset: 0, duration: 0.5, pitch: 60 },
      { onset: 0.5, duration: 0.5, pitch: 60 },
      { onset: 1.0, duration: 0.5, pitch: 60 },
      { onset: 1.5, duration: 0.5, pitch: 60 },
      { onset: 2.0, duration: 0.5, pitch: 60 },
      { onset: 2.5, duration: 0.5, pitch: 60 },
      { onset: 3.0, duration: 0.5, pitch: 60 },
      { onset: 3.5, duration: 0.5, pitch: 60 },
      { onset: 4.0, duration: 0.5, pitch: 60 },
      // V1 moves at 4.0
      { onset: 4.0, duration: 0.5, pitch: 62 },
    ];
    const v2 = [
      { onset: 0, duration: 0.5, pitch: 67 },
      { onset: 0.5, duration: 0.5, pitch: 67 },
      { onset: 1.0, duration: 0.5, pitch: 67 },
      { onset: 1.5, duration: 0.5, pitch: 67 },
      { onset: 2.0, duration: 0.5, pitch: 67 },
      { onset: 2.5, duration: 0.5, pitch: 67 },
      { onset: 3.0, duration: 0.5, pitch: 67 },
      { onset: 3.5, duration: 0.5, pitch: 67 },
      // V2 moves at 5.0 (1.0 beat after V1)
      { onset: 5.0, duration: 0.5, pitch: 65 },
      { onset: 5.5, duration: 0.5, pitch: 65 },
    ];

    const result = testContourIndependence(v1, v2, formatter);

    // offset 1.0 > window 0.75: no assessment
    expect(result.contraryMotions).toBe(0);
    expect(result.similarMotions).toBe(0);
  });
});

describe('getIntervalMagnitude', () => {
  it('classifies tritone (6 semitones) as large_leap, not perfect_leap', () => {
    const result = getIntervalMagnitude(6);
    expect(result.type).toBe('large_leap');
    expect(result.size).toBe(6);
  });

  it('classifies perfect fifth (7 semitones) as perfect_leap', () => {
    expect(getIntervalMagnitude(7).type).toBe('perfect_leap');
  });

  it('classifies perfect fourth (5 semitones) as perfect_leap', () => {
    expect(getIntervalMagnitude(5).type).toBe('perfect_leap');
  });

  it('classifies steps and skips correctly', () => {
    expect(getIntervalMagnitude(0).type).toBe('unison');
    expect(getIntervalMagnitude(1).type).toBe('step');
    expect(getIntervalMagnitude(2).type).toBe('step');
    expect(getIntervalMagnitude(3).type).toBe('skip');
    expect(getIntervalMagnitude(4).type).toBe('skip');
  });

  it('classifies 8-11 semitones as large_leap', () => {
    expect(getIntervalMagnitude(8).type).toBe('large_leap');
    expect(getIntervalMagnitude(9).type).toBe('large_leap');
    expect(getIntervalMagnitude(11).type).toBe('large_leap');
  });

  it('classifies octave correctly', () => {
    expect(getIntervalMagnitude(12).type).toBe('octave');
  });
});
