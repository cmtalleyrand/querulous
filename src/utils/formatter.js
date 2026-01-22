/**
 * Utility class for formatting beat positions and durations in human-readable form
 * Supports both simple and compound meters
 */
export class BeatFormatter {
  constructor(defaultNoteLength = 1 / 8, meter = [4, 4]) {
    this.meter = meter;
    this.numerator = meter[0];
    this.denominator = meter[1];

    // Determine if compound meter (6/8, 9/8, 12/8, 3/8)
    this.isCompound = (this.numerator % 3 === 0 && this.denominator === 8 && this.numerator >= 3);

    if (this.isCompound) {
      // In compound meters, group by 3 eighth notes = 1 beat
      this.beatsPerMeasure = this.numerator / 3;
      this.subdivisionsPerBeat = 3;
      this.beatUnit = 3 / this.denominator; // e.g., 3/8 for compound meter
    } else {
      // Simple meters
      this.beatsPerMeasure = this.numerator;
      this.subdivisionsPerBeat = 2;
      this.beatUnit = 1; // Each beat is 1 unit in our internal representation
    }

    // For internal timing: how many internal units per measure
    // In simple 4/4: 4 beats per measure
    // In compound 6/8: 2 main beats per measure, but 6 eighth-note subdivisions
    this.unitsPerMeasure = this.numerator; // Raw numerator for measure calculation
  }

  /**
   * Format a beat position as "m.X beat Y" with proper subdivision handling
   */
  formatBeat(beatPosition) {
    const measure = Math.floor(beatPosition / this.unitsPerMeasure) + 1;
    const posInMeasure = beatPosition % this.unitsPerMeasure;

    if (this.isCompound) {
      // For compound meters, show beat and subdivision within the triplet group
      const mainBeat = Math.floor(posInMeasure / 3) + 1;
      const subInBeat = posInMeasure % 3;

      let subStr = '';
      if (Math.abs(subInBeat - 1) < 0.1) subStr = '⅓';
      else if (Math.abs(subInBeat - 2) < 0.1) subStr = '⅔';
      else if (subInBeat > 0.01) subStr = `+${subInBeat.toFixed(1)}`;

      const beatStr = subStr ? `${mainBeat}${subStr}` : `${mainBeat}`;
      return measure === 1 ? `beat ${beatStr}` : `m.${measure} beat ${beatStr}`;
    } else {
      // Simple meters
      const wholeBeat = Math.floor(posInMeasure) + 1;
      const fraction = posInMeasure - Math.floor(posInMeasure);

      let sub = '';
      if (fraction > 0.01) {
        if (Math.abs(fraction - 0.5) < 0.05) sub = '½';
        else if (Math.abs(fraction - 0.25) < 0.05) sub = '¼';
        else if (Math.abs(fraction - 0.75) < 0.05) sub = '¾';
        else if (Math.abs(fraction - 0.333) < 0.05) sub = '⅓';
        else if (Math.abs(fraction - 0.667) < 0.05) sub = '⅔';
        else sub = `+${fraction.toFixed(2)}`;
      }

      const beatStr = sub ? `${wholeBeat}${sub}` : `${wholeBeat}`;
      return measure === 1 ? `beat ${beatStr}` : `m.${measure} beat ${beatStr}`;
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
      description: this.isCompound
        ? `${this.beatsPerMeasure} main beats per measure (compound)`
        : `${this.beatsPerMeasure} beats per measure (simple)`,
    };
  }
}

/**
 * Get pitch name from MIDI number
 */
export function pitchName(midi) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return names[midi % 12] + (Math.floor(midi / 12) - 1);
}

/**
 * Get metric weight for a beat position (downbeats are stronger)
 * @param {number} onset - The beat position
 * @param {number[]} meter - The meter as [numerator, denominator], defaults to [4, 4]
 */
export function metricWeight(onset, meter = [4, 4]) {
  const numerator = meter[0];
  const denominator = meter[1];

  // Determine if compound meter
  const isCompound = (numerator % 3 === 0 && denominator === 8 && numerator >= 3);

  if (isCompound) {
    // Compound meter: beats grouped in 3s
    // 6/8 = 2 main beats, each subdivided into 3
    // 12/8 = 4 main beats, each subdivided into 3
    const mainBeats = numerator / 3;
    const posInMeasure = onset % numerator;
    const mainBeatPos = Math.floor(posInMeasure / 3);
    const subPos = posInMeasure % 3;

    // Downbeat of measure (beat 1)
    if (Math.abs(posInMeasure) < 0.01) return 1.0;

    // Other main beats (start of each triplet group)
    if (Math.abs(subPos) < 0.01) {
      // In 6/8: beat 4 (second main beat) is secondary accent
      // In 12/8: beats 4, 7, 10 are secondary accents
      if (mainBeats === 2) {
        return 0.75; // Secondary beat in 6/8
      } else if (mainBeats === 4) {
        // In 12/8: beat 7 (third main beat) gets more weight than 4 and 10
        if (mainBeatPos === 2) return 0.75;
        return 0.6;
      } else if (mainBeats === 3) {
        // In 9/8: beats 4 and 7 are secondary
        return 0.65;
      }
      return 0.6;
    }

    // Subdivisions within a beat
    if (Math.abs(subPos - 1) < 0.01 || Math.abs(subPos - 2) < 0.01) {
      return 0.3; // Weak subdivisions
    }

    return 0.2; // Off-beat
  } else {
    // Simple meter
    const posInMeasure = onset % numerator;

    // Downbeat
    if (Math.abs(posInMeasure) < 0.01) return 1.0;

    // Check for secondary accents based on meter
    if (numerator === 4) {
      // 4/4: beat 3 is secondary accent
      if (Math.abs(posInMeasure - 2) < 0.01) return 0.75;
      // Beats 2 and 4
      if (Math.abs(posInMeasure - 1) < 0.01 || Math.abs(posInMeasure - 3) < 0.01) return 0.5;
    } else if (numerator === 3) {
      // 3/4: beats 2 and 3 are weak
      if (Math.abs(posInMeasure - 1) < 0.01 || Math.abs(posInMeasure - 2) < 0.01) return 0.5;
    } else if (numerator === 2) {
      // 2/4: beat 2 is weak
      if (Math.abs(posInMeasure - 1) < 0.01) return 0.5;
    } else if (numerator === 5) {
      // 5/4: typically grouped 3+2 or 2+3, beat 1 strongest, beat 3 or 4 secondary
      if (Math.abs(posInMeasure - 3) < 0.01) return 0.7; // Common 3+2 grouping
      if (Math.abs(posInMeasure - 2) < 0.01) return 0.6;
      return 0.5;
    } else if (numerator === 6) {
      // 6/4: beats 1 and 4 are strong
      if (Math.abs(posInMeasure - 3) < 0.01) return 0.75;
      return 0.5;
    } else {
      // Generic: downbeat strong, others weaker
      return 0.5;
    }

    // Subdivisions (half beats, etc.)
    const beatFraction = posInMeasure - Math.floor(posInMeasure);
    if (beatFraction > 0.01) {
      if (Math.abs(beatFraction - 0.5) < 0.05) return 0.35; // Off-beat eighth
      return 0.25; // Other subdivisions
    }

    return 0.4; // Fallback for beats not explicitly handled
  }
}

/**
 * Get metric position descriptor for a beat position
 */
export function metricPosition(onset, meter = [4, 4]) {
  const weight = metricWeight(onset, meter);
  if (weight >= 0.9) return { weight, label: 'downbeat', severity: 'strong' };
  if (weight >= 0.7) return { weight, label: 'secondary accent', severity: 'moderate' };
  if (weight >= 0.45) return { weight, label: 'weak beat', severity: 'mild' };
  if (weight >= 0.3) return { weight, label: 'subdivision', severity: 'light' };
  return { weight, label: 'off-beat', severity: 'negligible' };
}

/**
 * Get severity multiplier for scoring based on metric position
 * Downbeat issues are most severe, off-beat issues are least
 */
export function metricSeverity(onset, meter = [4, 4]) {
  const weight = metricWeight(onset, meter);
  if (weight >= 0.9) return 1.5; // downbeat - 50% more severe
  if (weight >= 0.7) return 1.2; // secondary accent - 20% more severe
  if (weight >= 0.45) return 1.0; // weak beat - baseline
  if (weight >= 0.3) return 0.8; // subdivision - 20% less severe
  return 0.6; // off-beat - 40% less severe
}
