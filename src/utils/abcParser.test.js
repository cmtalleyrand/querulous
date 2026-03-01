import { describe, expect, it } from 'vitest';
import { extractABCHeaders, generateAnswerABC, generateAnswerABCSameKey, parseABC } from './abcParser';

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
    expect(notes[0].abcNote).toBe('C2');
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

describe('ABC generation from tied subjects', () => {
  const answerData = { tonalMotions: [], mutationPoint: null };

  it('emits combined duration tokens in generateAnswerABC', () => {
    const abc = `K:C
L:1/8
C-C D`;
    const { notes } = parseABC(abc, 60, 'major');

    const out = generateAnswerABC(
      notes,
      { tonic: 0, keySignature: [], mode: 'major' },
      answerData,
      1 / 8,
      [4, 4],
      [1, 8]
    );

    expect(out).toContain('\nG2 A');
    expect(out).not.toContain(' G A');
  });

  it('emits combined duration tokens in generateAnswerABCSameKey', () => {
    const abc = `K:C
L:1/8
C-C D`;
    const { notes } = parseABC(abc, 60, 'major');

    const out = generateAnswerABCSameKey(
      notes,
      { key: 'C', keySignature: [], mode: 'major' },
      answerData,
      1 / 8,
      [4, 4],
      false,
      [1, 8]
    );

    expect(out).toContain('\nG2 A');
    expect(out).not.toContain(' G A');
  });

  it('preserves slash duration tokens in generateAnswerABC', () => {
    const abc = `K:C
L:1/8
C/ D3/2`;
    const { notes } = parseABC(abc, 60, 'major');

    const out = generateAnswerABC(
      notes,
      { tonic: 0, keySignature: [], mode: 'major' },
      answerData,
      1 / 8,
      [4, 4],
      [1, 8]
    );

    expect(out).toContain('\nG/ A3/2');
  });

  it('preserves slash duration tokens in generateAnswerABCSameKey', () => {
    const abc = `K:C
L:1/8
C/ D3/2`;
    const { notes } = parseABC(abc, 60, 'major');

    const out = generateAnswerABCSameKey(
      notes,
      { key: 'C', keySignature: [], mode: 'major' },
      answerData,
      1 / 8,
      [4, 4],
      false,
      [1, 8]
    );

    expect(out).toContain('\nG/ A3/2');
  });
});


describe('ABC key signature modifiers', () => {
  it('parses K: modifiers and applies them to key signature map', () => {
    const headers = extractABCHeaders('K:D Phr ^f');
    expect(headers.key).toBe('D');
    expect(headers.mode).toBe('phrygian');
    expect(headers.keySignatureMap.B).toBe(-1);
    expect(headers.keySignatureMap.E).toBe(-1);
    expect(headers.keySignatureMap.F).toBe(1);
  });

  it('supports naturals and double accidentals in K: modifiers', () => {
    const abc = `K:D =c ^^f __b
L:1/4
C F B`;
    const { notes } = parseABC(abc, 62, 'major');

    expect(notes[0].pitch).toBe(60); // C natural instead of C#
    expect(notes[1].pitch).toBe(67); // F double sharp -> G
    expect(notes[2].pitch).toBe(69); // B double flat -> A
  });
});
