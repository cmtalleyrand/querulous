/**
 * Available keys for selection
 */
export const AVAILABLE_KEYS = [
  { value: 'C', label: 'C' },
  { value: 'C#', label: 'C#' },
  { value: 'Db', label: 'Db' },
  { value: 'D', label: 'D' },
  { value: 'D#', label: 'D#' },
  { value: 'Eb', label: 'Eb' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
  { value: 'F#', label: 'F#' },
  { value: 'Gb', label: 'Gb' },
  { value: 'G', label: 'G' },
  { value: 'G#', label: 'G#' },
  { value: 'Ab', label: 'Ab' },
  { value: 'A', label: 'A' },
  { value: 'A#', label: 'A#' },
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
 * Note length options (including compound meter values)
 */
export const NOTE_LENGTH_OPTIONS = [
  { value: '1/2', label: '1/2' },
  { value: '1/4', label: '1/4' },
  { value: '1/6', label: '1/6 (compound)' },
  { value: '1/8', label: '1/8' },
  { value: '1/12', label: '1/12 (compound)' },
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
 * Stretto transposition options
 * Includes octave displacements and interval transpositions (P4, P5)
 * These are the transposition classes tested in testStrettoViability
 */
export const STRETTO_TRANSPOSITION_OPTIONS = [
  { value: '0', label: 'Unison', intervalClass: 0 },
  { value: '12', label: '+P8 (octave up)', intervalClass: 0 },
  { value: '-12', label: '-P8 (octave down)', intervalClass: 0 },
  { value: '7', label: '+P5 (5th up)', intervalClass: 7 },
  { value: '-7', label: '-P5 (5th down)', intervalClass: 7 },
  { value: '5', label: '+P4 (4th up)', intervalClass: 5 },
  { value: '-5', label: '-P4 (4th down)', intervalClass: 5 },
  { value: '19', label: '+P12 (5th + octave up)', intervalClass: 7 },
  { value: '-19', label: '-P12 (5th + octave down)', intervalClass: 7 },
  { value: '17', label: '+P11 (4th + octave up)', intervalClass: 5 },
  { value: '-17', label: '-P11 (4th + octave down)', intervalClass: 5 },
  { value: '24', label: '+2 octaves', intervalClass: 0 },
  { value: '-24', label: '-2 octaves', intervalClass: 0 },
];

/**
 * Countersubject position options
 */
export const CS_POSITION_OPTIONS = [
  { value: 'above', label: 'Above' },
  { value: 'below', label: 'Below' },
];
