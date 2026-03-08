/**
 * MIDI note numbers for note names
 */
export const NOTE_TO_MIDI = {
  C: 60, D: 62, E: 64, F: 65, G: 67, A: 69, B: 71,
  c: 72, d: 74, e: 76, f: 77, g: 79, a: 81, b: 83,
};

/**
 * Key signatures mapping (sharps/flats for each key)
 */
export const KEY_SIGNATURES = {
  // Major keys with sharps
  C: [],
  G: ['F#'],
  D: ['F#', 'C#'],
  A: ['F#', 'C#', 'G#'],
  E: ['F#', 'C#', 'G#', 'D#'],
  B: ['F#', 'C#', 'G#', 'D#', 'A#'],
  'F#': ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'],
  'C#': ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#'],
  // Theoretical sharp keys (enharmonic equivalents)
  'G#': ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#', 'Fx'],
  'D#': ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#', 'Fx', 'Cx'],
  'A#': ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#', 'Fx', 'Cx', 'Gx'],

  // Major keys with flats
  F: ['Bb'],
  Bb: ['Bb', 'Eb'],
  Eb: ['Bb', 'Eb', 'Ab'],
  Ab: ['Bb', 'Eb', 'Ab', 'Db'],
  Db: ['Bb', 'Eb', 'Ab', 'Db', 'Gb'],
  Gb: ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'],
  Cb: ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb'],

  // Minor keys with sharps
  Am: [],
  Em: ['F#'],
  Bm: ['F#', 'C#'],
  'F#m': ['F#', 'C#', 'G#'],
  'C#m': ['F#', 'C#', 'G#', 'D#'],
  'G#m': ['F#', 'C#', 'G#', 'D#', 'A#'],
  'D#m': ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'],
  'A#m': ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#'],

  // Minor keys with flats
  Dm: ['Bb'],
  Gm: ['Bb', 'Eb'],
  Cm: ['Bb', 'Eb', 'Ab'],
  Fm: ['Bb', 'Eb', 'Ab', 'Db'],
  Bbm: ['Bb', 'Eb', 'Ab', 'Db', 'Gb'],
  Ebm: ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'],
  Abm: ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb'],
};

/**
 * Mode intervals mapping (semitones to scale degrees)
 */
export const MODE_INTERVALS = {
  major: { 0: 1, 2: 2, 4: 3, 5: 4, 7: 5, 9: 6, 11: 7 },
  natural_minor: { 0: 1, 2: 2, 3: 3, 5: 4, 7: 5, 8: 6, 10: 7 },
  harmonic_minor: { 0: 1, 2: 2, 3: 3, 5: 4, 7: 5, 8: 6, 11: 7 },
  dorian: { 0: 1, 2: 2, 3: 3, 5: 4, 7: 5, 9: 6, 10: 7 },
  phrygian: { 0: 1, 1: 2, 3: 3, 5: 4, 7: 5, 8: 6, 10: 7 },
  lydian: { 0: 1, 2: 2, 4: 3, 6: 4, 7: 5, 9: 6, 11: 7 },
  mixolydian: { 0: 1, 2: 2, 4: 3, 5: 4, 7: 5, 9: 6, 10: 7 },
  locrian: { 0: 1, 1: 2, 3: 3, 5: 4, 6: 5, 8: 6, 10: 7 },
};
