import { describe, expect, it } from 'vitest';
import { Interval } from './music';

describe('Interval tritone behavior', () => {
  it('labels six semitones as TT', () => {
    const interval = new Interval(6);
    expect(interval.toString()).toBe('TT');
  });

  it('treats six semitones as dissonant', () => {
    const interval = new Interval(6);
    expect(interval.isConsonant()).toBe(false);
  });
});
