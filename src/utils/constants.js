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

  // Major keys with flats
  F: ['Bb'],
  Bb: ['Bb', 'Eb'],
  Eb: ['Bb', 'Eb', 'Ab'],
  Ab: ['Bb', 'Eb', 'Ab', 'Db'],
  Db: ['Bb', 'Eb', 'Ab', 'Db', 'Gb'],
  Gb: ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'],

  // Minor keys with sharps
  Am: [],
  Em: ['F#'],
  Bm: ['F#', 'C#'],
  'F#m': ['F#', 'C#', 'G#'],
  'C#m': ['F#', 'C#', 'G#', 'D#'],
  'G#m': ['F#', 'C#', 'G#', 'D#', 'A#'],

  // Minor keys with flats
  Dm: ['Bb'],
  Gm: ['Bb', 'Eb'],
  Cm: ['Bb', 'Eb', 'Ab'],
  Fm: ['Bb', 'Eb', 'Ab', 'Db'],
  Bbm: ['Bb', 'Eb', 'Ab', 'Db', 'Gb'],
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

/**
 * Available keys for selection
 */
export const AVAILABLE_KEYS = [
  { value: 'C', label: 'C' },
  { value: 'C#', label: 'C#' },
  { value: 'Db', label: 'Db' },
  { value: 'D', label: 'D' },
  { value: 'Eb', label: 'Eb' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
  { value: 'F#', label: 'F#' },
  { value: 'Gb', label: 'Gb' },
  { value: 'G', label: 'G' },
  { value: 'Ab', label: 'Ab' },
  { value: 'A', label: 'A' },
  { value: 'Bb', label: 'Bb' },
  { value: 'B', label: 'B' },
];

/**
 * Available modes for selection
 */
export const AVAILABLE_MODES = [
  { value: 'major', label: 'Major' },
  { value: 'natural_minor', label: 'Minor' },
  { value: 'harmonic_minor', label: 'Harmonic Minor' },
  { value: 'dorian', label: 'Dorian' },
  { value: 'phrygian', label: 'Phrygian' },
  { value: 'lydian', label: 'Lydian' },
  { value: 'mixolydian', label: 'Mixolydian' },
];

/**
 * Note length options
 */
export const NOTE_LENGTH_OPTIONS = [
  { value: '1/4', label: '1/4' },
  { value: '1/8', label: '1/8' },
  { value: '1/16', label: '1/16' },
];

/**
 * Stretto step options
 */
export const STRETTO_STEP_OPTIONS = [
  { value: '1', label: '1 beat' },
  { value: '2', label: '2 beats' },
  { value: '0.5', label: '½ beat' },
];

/**
 * Octave displacement options
 */
export const OCTAVE_OPTIONS = [
  { value: '0', label: 'Unison' },
  { value: '12', label: '+1 octave' },
  { value: '-12', label: '-1 octave' },
  { value: '24', label: '+2 octaves' },
  { value: '-24', label: '-2 octaves' },
];

/**
 * Countersubject position options
 */
export const CS_POSITION_OPTIONS = [
  { value: 'above', label: 'Above' },
  { value: 'below', label: 'Below' },
];

/**
 * Time signature options
 */
export const TIME_SIGNATURE_OPTIONS = [
  { value: '4/4', label: '4/4', meter: [4, 4] },
  { value: '3/4', label: '3/4', meter: [3, 4] },
  { value: '2/4', label: '2/4', meter: [2, 4] },
  { value: '6/8', label: '6/8', meter: [6, 8] },
  { value: '9/8', label: '9/8', meter: [9, 8] },
  { value: '12/8', label: '12/8', meter: [12, 8] },
  { value: '2/2', label: '2/2 (cut time)', meter: [2, 2] },
  { value: '3/2', label: '3/2', meter: [3, 2] },
];
