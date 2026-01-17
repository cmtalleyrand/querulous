/**
 * Utility class for formatting beat positions and durations in human-readable form
 */
export class BeatFormatter {
  constructor(defaultNoteLength = 1 / 8, meter = [4, 4]) {
    this.beatsPerMeasure = meter[0];
  }

  /**
   * Format a beat position as "m.X beat Y"
   */
  formatBeat(beatPosition) {
    const measure = Math.floor(beatPosition / this.beatsPerMeasure) + 1;
    const beatInMeasure = beatPosition % this.beatsPerMeasure;
    const wholeBeat = Math.floor(beatInMeasure) + 1;
    const fraction = beatInMeasure - Math.floor(beatInMeasure);

    let sub = '';
    if (fraction > 0.01) {
      if (Math.abs(fraction - 0.5) < 0.05) sub = '½';
      else if (Math.abs(fraction - 0.25) < 0.05) sub = '¼';
      else if (Math.abs(fraction - 0.75) < 0.05) sub = '¾';
    }

    const beatStr = sub ? `${wholeBeat}${sub}` : `${wholeBeat}`;
    return measure === 1 ? `beat ${beatStr}` : `m.${measure} beat ${beatStr}`;
  }

  /**
   * Format a duration as note value (whole, half, quarter, etc.)
   */
  formatDuration(duration) {
    const w = this.beatsPerMeasure;
    if (Math.abs(duration - w) < 0.01) return 'whole';
    if (Math.abs(duration - w / 2) < 0.01) return 'half';
    if (Math.abs(duration - w / 4) < 0.01) return 'quarter';
    if (Math.abs(duration - w / 8) < 0.01) return 'eighth';
    if (Math.abs(duration - w / 16) < 0.01) return 'sixteenth';
    if (Math.abs(duration - (w * 3) / 8) < 0.01) return 'dotted quarter';
    return duration >= 1 ? `${duration.toFixed(1)} beats` : `${Math.round(duration * 100)}%`;
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
    return `${distance.toFixed(2)} beats`;
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
 */
export function metricWeight(onset) {
  const b = onset % 4;
  if (Math.abs(b) < 0.01) return 1.0;
  if (Math.abs(b - 2) < 0.01) return 0.75;
  if (Math.abs(b - 1) < 0.01 || Math.abs(b - 3) < 0.01) return 0.5;
  return 0.25;
}

/**
 * Get metric position descriptor for a beat position
 */
export function metricPosition(onset) {
  const weight = metricWeight(onset);
  if (weight === 1.0) return { weight, label: 'downbeat', severity: 'strong' };
  if (weight === 0.75) return { weight, label: 'secondary accent', severity: 'moderate' };
  if (weight === 0.5) return { weight, label: 'weak beat', severity: 'mild' };
  return { weight, label: 'off-beat', severity: 'negligible' };
}

/**
 * Get severity multiplier for scoring based on metric position
 * Downbeat issues are most severe, off-beat issues are least
 */
export function metricSeverity(onset) {
  const weight = metricWeight(onset);
  if (weight === 1.0) return 1.5; // downbeat - 50% more severe
  if (weight === 0.75) return 1.2; // secondary accent - 20% more severe
  if (weight === 0.5) return 1.0; // weak beat - baseline
  return 0.6; // off-beat - 40% less severe
}
