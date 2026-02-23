import { describe, expect, it } from 'vitest';
import { parseABC } from './abcParser';

describe('parseABC ties', () => {
  it('merges tied notes into a single NoteEvent duration', () => {
    const abc = `K:C
L:1/8
C-C G`;
    const { notes } = parseABC(abc, 60, 'major');

    expect(notes).toHaveLength(2);
    expect(notes[0].pitch).toBe(60);
    expect(notes[0].onset).toBe(0);
    expect(notes[0].duration).toBe(1);
    expect(notes[1].onset).toBe(1);
  });

  it('does not merge across a tie marker when the next pitch differs', () => {
    const abc = `K:C
L:1/8
C-D`;
    const { notes } = parseABC(abc, 60, 'major');

    expect(notes).toHaveLength(2);
    expect(notes[0].pitch).toBe(60);
    expect(notes[0].duration).toBe(0.5);
    expect(notes[1].pitch).toBe(62);
    expect(notes[1].onset).toBe(0.5);
  });
});
