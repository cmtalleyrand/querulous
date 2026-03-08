import { describe, expect, it } from 'vitest';
import {
  STRETTO_TRANSPOSITION_OPTIONS,
  COUNTERPOINT_VIZ_TRANSPOSITION_OPTIONS,
} from './constants/transpositionOptions';

describe('transposition option profiles', () => {
  it('keeps stretto profile conservative and interval-class annotated', () => {
    expect(STRETTO_TRANSPOSITION_OPTIONS).toHaveLength(13);
    expect(STRETTO_TRANSPOSITION_OPTIONS[0]).toMatchObject({
      value: '0',
      label: 'Unison',
      shortLabel: 'Unison',
      intervalClass: 0,
    });

    for (const option of STRETTO_TRANSPOSITION_OPTIONS) {
      expect(typeof option.value).toBe('string');
      expect(typeof option.shortLabel).toBe('string');
      expect(typeof option.intervalClass).toBe('number');
    }
  });

  it('gives counterpoint viz full semitone coverage from +24 to -24', () => {
    expect(COUNTERPOINT_VIZ_TRANSPOSITION_OPTIONS).toHaveLength(49);

    const values = COUNTERPOINT_VIZ_TRANSPOSITION_OPTIONS.map((o) => o.value);
    expect(values[0]).toBe(24);
    expect(values.at(-1)).toBe(-24);

    // every semitone included exactly once
    const expected = Array.from({ length: 49 }, (_, i) => 24 - i);
    expect(values).toEqual(expected);
  });

  it('preserves concise short labels for common named intervals', () => {
    const byValue = new Map(COUNTERPOINT_VIZ_TRANSPOSITION_OPTIONS.map((o) => [o.value, o]));

    expect(byValue.get(12)?.shortLabel).toBe('+8ve');
    expect(byValue.get(7)?.shortLabel).toBe('+5th');
    expect(byValue.get(0)?.shortLabel).toBe('orig');
    expect(byValue.get(-12)?.shortLabel).toBe('-8ve');
    expect(byValue.get(19)?.shortLabel).toBe('+12th');
    expect(byValue.get(-19)?.shortLabel).toBe('-12th');
  });
});
