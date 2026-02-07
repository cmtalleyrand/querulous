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
 * Time signature options with compound meter support
 * For compound meters (6/8, 9/8, 12/8), beatsPerMeasure is the number of main beats (2, 3, 4)
 * and subdivisionsPerBeat is 3. For simple meters, subdivisionsPerBeat is 2.
 */
export const TIME_SIGNATURE_OPTIONS = [
  // Simple duple/triple/quadruple
  { value: '2/4', label: '2/4', meter: [2, 4], beatsPerMeasure: 2, subdivisions: 2, isCompound: false },
  { value: '3/4', label: '3/4', meter: [3, 4], beatsPerMeasure: 3, subdivisions: 2, isCompound: false },
  { value: '4/4', label: '4/4', meter: [4, 4], beatsPerMeasure: 4, subdivisions: 2, isCompound: false },
  { value: '5/4', label: '5/4', meter: [5, 4], beatsPerMeasure: 5, subdivisions: 2, isCompound: false },
  { value: '2/2', label: '2/2 (cut time)', meter: [2, 2], beatsPerMeasure: 2, subdivisions: 2, isCompound: false },
  { value: '3/2', label: '3/2', meter: [3, 2], beatsPerMeasure: 3, subdivisions: 2, isCompound: false },
  { value: '6/4', label: '6/4', meter: [6, 4], beatsPerMeasure: 6, subdivisions: 2, isCompound: false },
  // Compound meters (grouped in 3s)
  { value: '3/8', label: '3/8', meter: [3, 8], beatsPerMeasure: 1, subdivisions: 3, isCompound: true },
  { value: '6/8', label: '6/8', meter: [6, 8], beatsPerMeasure: 2, subdivisions: 3, isCompound: true },
  { value: '9/8', label: '9/8', meter: [9, 8], beatsPerMeasure: 3, subdivisions: 3, isCompound: true },
  { value: '12/8', label: '12/8', meter: [12, 8], beatsPerMeasure: 4, subdivisions: 3, isCompound: true },
];

/**
 * Analysis thresholds and constants
 * Centralized for consistency across analysis functions
 */
export const ANALYSIS_THRESHOLDS = {
  // Melodic intervals
  LEAP_THRESHOLD: 4,              // semitones - intervals > this are "leaps"
  STEP_MAX: 2,                    // semitones - intervals <= this are "steps"
  SKIP_MAX: 4,                    // semitones - intervals <= this are "skips" (3rds/4ths)

  // Metric weight thresholds
  STRONG_BEAT_WEIGHT: 0.5,        // metric weight >= this is "strong"
  DOWNBEAT_WEIGHT: 1.0,           // metric weight for downbeats
  OFF_BEAT_WEIGHT: 0.75,          // metric weight < this is "off-beat"

  // Focal point detection
  FOCAL_POINT_MIDDLE_START: 0.25, // relative position - climax must be after this
  FOCAL_POINT_MIDDLE_END: 0.85,   // relative position - climax must be before this
  FOCAL_POINT_MIN_RANGE: 5,       // semitones - minimum range for climax detection

  // Short note detection (sub-subdivision level)
  // Threshold = subdivision / 3 (triplet of subdivision)
  // For 4/4: subdivision = 0.5, threshold ≈ 0.167
  // For 6/8: subdivision = 0.33, threshold ≈ 0.111

  // Sequence detection
  SEQUENCE_MIN_NOTES: 3,          // minimum notes in a sequence unit
  SEQUENCE_MIN_REPS: 2,           // minimum repetitions to qualify
  SEQUENCE_OVERLAP_THRESHOLD: 0.5, // overlap ratio to filter duplicates

  // Contour independence
  MOTION_SIMILARITY_WINDOW: 0.25, // beats - time window for concurrent motion detection

  // Parallel detection
  PARALLEL_INTERVAL_CLASSES: [5, 8], // interval classes for parallel 5ths/8ves

  // Dissonance scoring
  P4_BONUS: 0.5,                  // P4 is less severe dissonance
  CONSECUTIVE_DISSONANCE_PENALTY: -0.75,
  CONSECUTIVE_DISSONANCE_PENALTY_SHORT: -0.375, // halved for short notes on off-beat

  // Penalty multipliers
  SEQUENCE_PENALTY_MULT: 0.25,    // 75% reduction for parallels in sequences
  SHORT_NOTE_PENALTY_MULT: 0.5,   // 50% reduction for short notes (non-repeated)
  ASYNC_MOTION_PENALTY_MULT: 0.5, // 50% reduction for asynchronous motion
};

/**
 * Get adjusted thresholds for small note counts
 * Motion independence ratios become less meaningful with few notes
 */
export function getAdjustedThresholds(noteCount) {
  const base = { ...ANALYSIS_THRESHOLDS };

  // Widen motion similarity window for short subjects
  if (noteCount <= 8) {
    base.MOTION_SIMILARITY_WINDOW = 0.5; // More tolerant
  }

  return base;
}

