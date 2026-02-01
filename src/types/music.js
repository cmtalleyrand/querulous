/**
 * Represents a scale degree with optional alteration (sharp/flat)
 */
export class ScaleDegree {
  constructor(degree, alteration = 0) {
    this.degree = degree;
    this.alteration = alteration;
  }

  toString() {
    const prefix = this.alteration === -1 ? '♭' : this.alteration === 1 ? '♯' : '';
    return `^${prefix}${this.degree}`;
  }
}

/**
 * Represents a single note event with pitch, duration, timing, and scale degree
 */
export class NoteEvent {
  constructor(pitch, duration, onset, scaleDegree, abcNote = '', preferFlats = false) {
    this.pitch = pitch;
    this.duration = duration;
    this.onset = onset;
    this.scaleDegree = scaleDegree;
    this.abcNote = abcNote;
    this.preferFlats = preferFlats; // True if key signature uses flats or note was spelled with flat
  }
}

/**
 * Represents a musical interval between two pitches
 */
export class Interval {
  constructor(semitones) {
    this.semitones = ((semitones % 12) + 12) % 12;
    const intervalData = {
      0: { class: 1, quality: 'perfect' },
      1: { class: 2, quality: 'minor' },
      2: { class: 2, quality: 'major' },
      3: { class: 3, quality: 'minor' },
      4: { class: 3, quality: 'major' },
      5: { class: 4, quality: 'perfect' },
      6: { class: 4, quality: 'augmented' },
      7: { class: 5, quality: 'perfect' },
      8: { class: 6, quality: 'minor' },
      9: { class: 6, quality: 'major' },
      10: { class: 7, quality: 'minor' },
      11: { class: 7, quality: 'major' },
    };
    const data = intervalData[this.semitones];
    this.class = data.class;
    this.quality = data.quality;
  }

  isConsonant() {
    return (
      [1, 3, 5, 6, 8].includes(this.class) &&
      this.quality !== 'augmented' &&
      this.quality !== 'diminished'
    );
  }

  toString() {
    const qualAbbr = { perfect: 'P', major: 'M', minor: 'm', augmented: 'A', diminished: 'd' };
    return `${qualAbbr[this.quality]}${this.class}`;
  }
}

/**
 * Represents melodic motion between consecutive notes
 */
export class MelodicMotion {
  constructor(time, fromPitch, toPitch) {
    this.time = time;
    this.semitones = Math.abs(toPitch - fromPitch);
    this.direction = Math.sign(toPitch - fromPitch);
  }
}

/**
 * Represents two simultaneous notes from different voices
 */
export class Simultaneity {
  constructor(onset, voice1Note, voice2Note, metricWeight) {
    this.onset = onset;
    this.voice1Note = voice1Note;
    this.voice2Note = voice2Note;
    this.interval = new Interval(Math.abs(voice1Note.pitch - voice2Note.pitch));
    this.metricWeight = metricWeight;
  }
}
