/**
 * Utility class for formatting beat positions and durations in human-readable form
 * Supports both simple and compound meters
 *
 * IMPORTANT: Internal timing in this codebase uses "quarter-note units":
 * - duration = noteLength * 4 (so an eighth note L:1/8 = 0.5 units)
 * - This means 1 unit = 1 quarter note duration
 *
 * Meter handling converts between internal units and logical beats:
 * - In 4/4: 1 beat = 1 quarter note = 1 internal unit
 * - In 6/8: 1 measure = 6 eighth notes = 3 internal units
 * - In 3/4: 1 measure = 3 quarter notes = 3 internal units
 */
export class BeatFormatter {
  constructor(defaultNoteLength = 1 / 8, meter) {
    if (!meter || !Array.isArray(meter) || meter.length < 2) {
      throw new Error(`BeatFormatter: meter is invalid (${JSON.stringify(meter)}). Must pass [numerator, denominator] array.`);
    }
    this.meter = meter;
    this.numerator = meter[0];
    this.denominator = meter[1];

    // Determine if compound meter (6/8, 9/8, 12/8)
    // Note: 3/8 is typically simple, not compound
    this.isCompound = (this.numerator % 3 === 0 && this.denominator === 8 && this.numerator >= 6);

    // Calculate how many internal units (quarter notes) per measure
    // A measure = numerator / denominator whole notes = numerator * 4 / denominator quarter notes
    this.internalUnitsPerMeasure = (this.numerator * 4) / this.denominator;

    if (this.isCompound) {
      // In compound meters, group by 3 eighth notes = 1 beat
      this.beatsPerMeasure = this.numerator / 3;
      this.subdivisionsPerBeat = 3;
      // Internal units per main beat: 3 eighth notes = 1.5 quarter notes
      this.internalUnitsPerBeat = 1.5;
    } else {
      // Simple meters
      this.beatsPerMeasure = this.numerator;
      this.subdivisionsPerBeat = 2;
      // Internal units per beat depends on denominator
      // In 4/4: beat = quarter note = 1 internal unit
      // In 2/2: beat = half note = 2 internal units
      // In 3/8: beat = eighth note = 0.5 internal units
      this.internalUnitsPerBeat = 4 / this.denominator;
    }
  }

  /**
   * Convert internal onset to position within measure (0 to beatsPerMeasure)
   */
  getPositionInMeasure(onset) {
    const measureNum = Math.floor(onset / this.internalUnitsPerMeasure);
    const posInMeasureUnits = onset - (measureNum * this.internalUnitsPerMeasure);
    return posInMeasureUnits / this.internalUnitsPerBeat;
  }

  /**
   * Format a beat position as M{measure}.B{beat}.{subdivision}.{fraction}
   * Example: M3.B3.3.5 = midpoint of the 3rd eighth of the 3rd beat of the 3rd measure
   *
   * Subdivision is which subdivision of the beat (e.g., which 8th)
   * Fraction is position within that subdivision (0-9, where 5 is midpoint)
   */
  formatBeat(beatPosition) {
    const measure = Math.floor(beatPosition / this.internalUnitsPerMeasure) + 1;
    const posInMeasureUnits = beatPosition % this.internalUnitsPerMeasure;
    const posInBeats = posInMeasureUnits / this.internalUnitsPerBeat;

    const beat = Math.floor(posInBeats) + 1;
    const fractionOfBeat = posInBeats - Math.floor(posInBeats);

    // Determine subdivisions per beat based on meter
    // In simple meters: typically 2 eighths per quarter beat
    // In compound meters: 3 eighths per dotted quarter beat
    const subsPerBeat = this.isCompound ? 3 : 2;

    // Which subdivision within the beat (1-indexed)
    const subPosition = fractionOfBeat * subsPerBeat;
    const subdivision = Math.floor(subPosition) + 1;

    // Fraction within that subdivision (0-9 scale, 5 = midpoint)
    const fractionInSub = (subPosition - Math.floor(subPosition)) * 10;
    const fractionDigit = Math.round(fractionInSub);

    // Build the string
    // If exactly on the beat, show M{m}.B{b}
    // If on a subdivision, show M{m}.B{b}.{s}
    // If between subdivisions, show M{m}.B{b}.{s}.{f}

    if (fractionOfBeat < 0.01) {
      // Exactly on the beat
      return `M${measure}.B${beat}`;
    } else if (fractionDigit === 0 || fractionDigit === 10) {
      // Exactly on a subdivision
      const actualSub = fractionDigit === 10 ? subdivision + 1 : subdivision;
      return `M${measure}.B${beat}.${actualSub}`;
    } else {
      // Between subdivisions
      return `M${measure}.B${beat}.${subdivision}.${fractionDigit}`;
    }
  }

  /**
   * Format a duration as note value (whole, half, quarter, etc.)
   */
  formatDuration(duration) {
    // Standard note values relative to a whole note = 4 quarter notes
    if (Math.abs(duration - 4) < 0.01) return 'whole';
    if (Math.abs(duration - 2) < 0.01) return 'half';
    if (Math.abs(duration - 1) < 0.01) return 'quarter';
    if (Math.abs(duration - 0.5) < 0.01) return 'eighth';
    if (Math.abs(duration - 0.25) < 0.01) return 'sixteenth';
    if (Math.abs(duration - 1.5) < 0.01) return 'dotted quarter';
    if (Math.abs(duration - 3) < 0.01) return 'dotted half';
    if (Math.abs(duration - 0.75) < 0.01) return 'dotted eighth';
    // Compound meter values
    if (Math.abs(duration - 0.333) < 0.02) return 'triplet eighth';
    if (Math.abs(duration - 0.667) < 0.02) return 'triplet quarter';
    return duration >= 1 ? `${duration.toFixed(2)} beats` : `${(duration * 100).toFixed(0)}% beat`;
  }

  /**
   * Format a time distance in beats
   */
  formatDistance(distance) {
    if (Math.abs(distance - Math.round(distance)) < 0.01) {
      const b = Math.round(distance);
      return b === 1 ? '1 beat' : `${b} beats`;
    }
    const frac = distance - Math.floor(distance);
    const whole = Math.floor(distance);
    if (Math.abs(frac - 0.5) < 0.05) return whole === 0 ? '½ beat' : `${whole}½ beats`;
    if (Math.abs(frac - 0.25) < 0.05) return whole === 0 ? '¼ beat' : `${whole}¼ beats`;
    if (Math.abs(frac - 0.75) < 0.05) return `${whole}¾ beats`;
    if (Math.abs(frac - 0.333) < 0.05) return whole === 0 ? '⅓ beat' : `${whole}⅓ beats`;
    if (Math.abs(frac - 0.667) < 0.05) return whole === 0 ? '⅔ beat' : `${whole}⅔ beats`;
    return `${distance.toFixed(2)} beats`;
  }

  /**
   * Get info about this meter for display
   */
  getMeterInfo() {
    return {
      display: `${this.numerator}/${this.denominator}`,
      beatsPerMeasure: this.beatsPerMeasure,
      isCompound: this.isCompound,
      internalUnitsPerMeasure: this.internalUnitsPerMeasure,
      internalUnitsPerBeat: this.internalUnitsPerBeat,
      description: this.isCompound
        ? `${this.beatsPerMeasure} main beats per measure (compound)`
        : `${this.beatsPerMeasure} beats per measure (simple)`,
    };
  }
}

/**
 * Get pitch name from MIDI number
 * @param {number} midi - MIDI note number
 * @param {boolean} preferFlats - If true, use flats (Bb, Eb, etc.) instead of sharps
 */
export function pitchName(midi, preferFlats = false) {
  const sharpNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const flatNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const names = preferFlats ? flatNames : sharpNames;
  return names[midi % 12] + (Math.floor(midi / 12) - 1);
}

/**
 * Get metric weight for a beat position (downbeats are stronger)
 * @param {number} onset - The internal position (in quarter-note units)
 * @param {number[]} meter - The meter as [numerator, denominator], defaults to [4, 4]
 *
 * Internal timing uses quarter-note units:
 * - 4/4: measure = 4 internal units (4 quarter notes)
 * - 6/8: measure = 3 internal units (6 eighth notes = 3 quarter notes)
 * - 3/4: measure = 3 internal units (3 quarter notes)
 * - 2/2: measure = 4 internal units (2 half notes = 4 quarter notes)
 */
export function metricWeight(onset, meter) {
  if (!meter || !Array.isArray(meter) || meter.length < 2) {
    throw new Error(`metricWeight: meter is invalid (${JSON.stringify(meter)}). Must pass [numerator, denominator] array.`);
  }
  const numerator = meter[0];
  const denominator = meter[1];

  // Calculate internal units per measure
  // A measure has (numerator / denominator) whole notes = (numerator * 4 / denominator) quarter notes
  const unitsPerMeasure = (numerator * 4) / denominator;

  // Determine if compound meter (6/8, 9/8, 12/8 but NOT 3/8)
  const isCompound = (numerator % 3 === 0 && denominator === 8 && numerator >= 6);

  // Get position within measure (in internal units)
  const posInMeasure = onset % unitsPerMeasure;

  if (isCompound) {
    // Compound meter: beats grouped in 3 eighth notes = 1.5 internal units
    const mainBeats = numerator / 3;
    const unitsPerMainBeat = 1.5; // 3 eighth notes = 1.5 quarter notes

    // Which main beat are we on?
    const mainBeatNum = Math.floor(posInMeasure / unitsPerMainBeat);
    const posInMainBeat = posInMeasure % unitsPerMainBeat;

    // Downbeat of measure
    if (Math.abs(posInMeasure) < 0.05) return 1.0;

    // Start of other main beats
    if (Math.abs(posInMainBeat) < 0.05) {
      // 12/8: 4 beats - Strong (1), Medium (3), Weak (2, 4)
      if (mainBeats === 4) {
        if (mainBeatNum === 2) return 0.75; // Beat 3 is medium
        return 0.5; // Beats 2, 4 are weak
      }
      // 6/8: 2 beats - Strong (1), Weak (2) - NO medium
      // 9/8: 3 beats - Strong (1), Weak (2, 3) - NO medium
      return 0.5;
    }

    // Subdivisions within the main beat (2nd and 3rd eighth of the triplet)
    // 0.5 units = 2nd eighth, 1.0 units = 3rd eighth
    if (Math.abs(posInMainBeat - 0.5) < 0.05 || Math.abs(posInMainBeat - 1.0) < 0.05) {
      return 0.3;
    }

    return 0.2; // Off-beat
  } else {
    // Simple meter
    // Units per beat depends on denominator: 4/4 = 1 unit/beat, 2/2 = 2 units/beat, 3/8 = 0.5 units/beat
    const unitsPerBeat = 4 / denominator;
    const beatNum = Math.floor(posInMeasure / unitsPerBeat);
    const posInBeat = posInMeasure % unitsPerBeat;

    // Downbeat
    if (Math.abs(posInMeasure) < 0.05) return 1.0;

    // On a beat boundary?
    const onBeat = Math.abs(posInBeat) < 0.05;

    if (onBeat) {
      // Check for secondary accents based on meter
      if (numerator === 4) {
        // 4/4: beat 3 is secondary accent
        if (beatNum === 2) return 0.75;
        // Beats 2 and 4
        return 0.5;
      } else if (numerator === 3) {
        // 3/4: beats 2 and 3 are weak
        return 0.5;
      } else if (numerator === 2) {
        // 2/4 or 2/2: beat 2 is weak
        return 0.5;
      } else if (numerator === 5) {
        // 5/4: typically grouped 3+2, beat 4 is secondary
        if (beatNum === 3) return 0.7;
        if (beatNum === 2) return 0.6;
        return 0.5;
      } else if (numerator === 6 && denominator === 4) {
        // 6/4: beat 4 is secondary accent
        if (beatNum === 3) return 0.75;
        return 0.5;
      } else {
        // Generic: other beats are weaker
        return 0.5;
      }
    }

    // Subdivisions (not on a beat boundary)
    const beatFraction = posInBeat / unitsPerBeat;
    if (Math.abs(beatFraction - 0.5) < 0.05) return 0.35; // Off-beat (e.g., eighth in 4/4)
    if (Math.abs(beatFraction - 0.25) < 0.05 || Math.abs(beatFraction - 0.75) < 0.05) return 0.25; // Sixteenths
    return 0.2; // Other subdivisions
  }
}

/**
 * Get metric position descriptor for a beat position
 */
export function metricPosition(onset, meter = [4, 4]) {
  const weight = metricWeight(onset, meter);
  if (weight >= 0.95) return { weight, label: 'strong beat', severity: 'strong' };
  if (weight >= 0.75) return { weight, label: 'medium beat', severity: 'moderate' };
  if (weight >= 0.45) return { weight, label: 'weak beat', severity: 'mild' };
  if (weight >= 0.3) return { weight, label: 'off beat', severity: 'light' };
  return { weight, label: 'off primary subdivision of the beat', severity: 'negligible' };
}

/**
 * Get severity multiplier for scoring based on metric position
 * Downbeat issues are most severe, off-beat issues are least
 */
export function metricSeverity(onset, meter = [4, 4]) {
  const weight = metricWeight(onset, meter);
  if (weight >= 0.95) return 1.5; // downbeat - 50% more severe
  if (weight >= 0.7) return 1.2; // secondary accent - 20% more severe
  if (weight >= 0.45) return 1.0; // weak beat - baseline
  if (weight >= 0.3) return 0.8; // subdivision - 20% less severe
  return 0.6; // off-beat - 40% less severe
}

/**
 * Check if a given onset is during a rest in a voice
 * @param {number} onset - The time position to check
 * @param {Array} notes - The array of NoteEvents for the voice
 * @returns {boolean} - True if the onset falls during a gap between notes (rest)
 */
export function isDuringRest(onset, notes) {
  if (!notes || notes.length === 0) return true;

  for (const note of notes) {
    const start = note.onset;
    const end = note.onset + note.duration;
    if (onset >= start && onset < end) {
      return false; // Onset is during this note, not a rest
    }
  }
  return true; // Onset is not during any note = rest
}
