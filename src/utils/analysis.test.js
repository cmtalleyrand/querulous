import { describe, expect, it } from 'vitest';
import { checkParallelPerfects, findSimultaneities } from './analysis';
import { NoteEvent, ScaleDegree } from '../types/music';

const meter = [4, 4];
const formatter = {
  meter,
  formatBeat: (onset) => `T${onset}`,
};

function note(pitch, onset, duration = 1) {
  return new NoteEvent(pitch, duration, onset, new ScaleDegree(1, 0));
}

describe('checkParallelPerfects', () => {
  it('does not skip intervening single-voice changes to create false parallel octaves', () => {
    const v1 = [
      note(74, 0, 1), // D5
      note(72, 1, 1), // C5 (intervening change only in v1)
      note(71, 2, 1), // B4
    ];

    const v2 = [
      note(62, 0, 2), // D4 held across onset 1
      note(59, 2, 1), // B3
    ];

    const sims = findSimultaneities(v1, v2, meter);
    const violations = checkParallelPerfects(sims, formatter);

    expect(violations).toHaveLength(0);
  });

  it('flags genuine adjacent parallel octaves when both voices move together', () => {
    const v1 = [
      note(74, 0, 1), // D5
      note(72, 1, 1), // C5
    ];

    const v2 = [
      note(62, 0, 1), // D4
      note(60, 1, 1), // C4
    ];

    const sims = findSimultaneities(v1, v2, meter);
    const violations = checkParallelPerfects(sims, formatter);

    expect(violations).toHaveLength(1);
    expect(violations[0].description).toContain('Parallel 8ves');
    expect(violations[0].description).toContain('D5-D4 ↓ C5-C4');
  });
});
