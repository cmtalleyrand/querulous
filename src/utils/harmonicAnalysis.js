/**
 * Harmonic Implication Analysis
 * Analyzes what harmonies a melodic line implies
 */

import { metricWeight } from './formatter';

// Complete chord vocabulary with semitone intervals
const CHORD_TYPES = {
  // Triads
  power5: { intervals: [0, 7], required: [0], complexity: 1 },
  major: { intervals: [0, 4, 7], required: [0, 4], complexity: 2 },
  minor: { intervals: [0, 3, 7], required: [0, 3], complexity: 2 },
  diminished: { intervals: [0, 3, 6], required: [0, 3, 6], complexity: 3 },
  augmented: { intervals: [0, 4, 8], required: [0, 4, 8], complexity: 3 },

  // Suspended
  sus2: { intervals: [0, 2, 7], required: [0, 2], complexity: 4 },
  sus4: { intervals: [0, 5, 7], required: [0, 5], complexity: 4 },

  // Sixth chords
  major_6: { intervals: [0, 4, 7, 9], required: [0, 4, 9], complexity: 5 },
  minor_6: { intervals: [0, 3, 7, 9], required: [0, 3, 9], complexity: 5 },
  minor_b6: { intervals: [0, 3, 7, 8], required: [0, 3, 8], complexity: 5 },

  // Seventh chords
  major_7: { intervals: [0, 4, 7, 11], required: [0, 4, 11], complexity: 6 },
  dominant_7: { intervals: [0, 4, 7, 10], required: [0, 4, 10], complexity: 6 },
  minor_7: { intervals: [0, 3, 7, 10], required: [0, 3, 10], complexity: 6 },
  minor_major_7: { intervals: [0, 3, 7, 11], required: [0, 3, 11], complexity: 6 },
  half_diminished_7: { intervals: [0, 3, 6, 10], required: [0, 3, 6, 10], complexity: 6 },
  diminished_7: { intervals: [0, 3, 6, 9], required: [0, 3, 6, 9], complexity: 6 },
  augmented_7: { intervals: [0, 4, 8, 10], required: [0, 4, 8, 10], complexity: 6 },
  augmented_major_7: { intervals: [0, 4, 8, 11], required: [0, 4, 8, 11], complexity: 6 },

  // Add chords
  add9: { intervals: [0, 4, 7, 14], required: [0, 4, 14], complexity: 7 },
  minor_add9: { intervals: [0, 3, 7, 14], required: [0, 3, 14], complexity: 7 },
  add_b9: { intervals: [0, 4, 7, 13], required: [0, 4, 13], complexity: 7 },
  add_sharp4: { intervals: [0, 4, 6, 7], required: [0, 4, 6], complexity: 7 },

  // Extended chords (9th, 11th, 13th)
  major_9: { intervals: [0, 4, 7, 11, 14], required: [0, 4, 11, 14], complexity: 8 },
  dominant_9: { intervals: [0, 4, 7, 10, 14], required: [0, 4, 10, 14], complexity: 8 },
  minor_9: { intervals: [0, 3, 7, 10, 14], required: [0, 3, 10, 14], complexity: 8 },

  // Altered chords
  dom7b5: { intervals: [0, 4, 6, 10], required: [0, 4, 6, 10], complexity: 9 },
  dom7sharp5: { intervals: [0, 4, 8, 10], required: [0, 4, 8, 10], complexity: 9 },
  dom7b9: { intervals: [0, 4, 7, 10, 13], required: [0, 4, 10, 13], complexity: 9 },
  dom7sharp9: { intervals: [0, 4, 7, 10, 15], required: [0, 4, 10, 15], complexity: 9 },
};

// Match weight by interval role
const MATCH_WEIGHTS = {
  root: 1.0,
  third: 0.9,
  seventh: 0.8,
  fifth: 0.7,
  sixth: 0.7,
  ninth: 0.6,
  eleventh: 0.6,
  thirteenth: 0.6,
  alteration: 0.5,
};

// Get role for an interval
function getIntervalRole(interval) {
  const normalized = ((interval % 12) + 12) % 12;
  switch (normalized) {
    case 0: return 'root';
    case 3: case 4: return 'third';
    case 6: case 7: return 'fifth';
    case 8: case 9: return 'sixth';
    case 10: case 11: return 'seventh';
    case 2: case 14: return 'ninth';
    case 5: case 17: return 'eleventh';
    case 21: return 'thirteenth';
    default: return 'alteration';
  }
}

/**
 * Calculate note salience for a note on a beat
 * @param {Object} note - The note event
 * @param {number} beatTime - Time of the beat being analyzed
 * @param {number[]} meter - Time signature [num, denom]
 * @param {Object} prevNote - Previous note for approach analysis
 * @returns {number} Salience score
 */
function calculateNoteSalience(note, beatTime, meter, prevNote = null) {
  // Duration in quarters (including any ties/repetitions in beat)
  const duration = note.duration;

  // Metric weight: 1.0 strong, 0.75 medium, 0.5 other, 0.3 off-beat
  const weight = metricWeight(note.onset, meter);
  let metricMult;
  if (weight >= 1.0) metricMult = 1.0;      // Downbeat
  else if (weight >= 0.75) metricMult = 0.75; // Strong beat
  else if (weight >= 0.5) metricMult = 0.5;   // Other main beat
  else metricMult = 0.3;                       // Off-beat

  // Approach modifier
  let approachMod = 1.0;
  if (prevNote) {
    const interval = Math.abs(note.pitch - prevNote.pitch);
    if (interval <= 2) {
      // Step approach - less structurally important
      approachMod = 0.8;
    } else if (interval === 5 || interval === 7 || interval === 12) {
      // Perfect interval leap - more structurally important
      approachMod = 1.2;
    }
  }

  // Final salience formula
  const rawSalience = duration * metricMult * approachMod;
  return Math.max(rawSalience - 0.1, 0.01);
}

/**
 * Collect notes sounding during a beat with their salience
 * @param {Object[]} notes - All notes in the melody
 * @param {number} beatStart - Start time of the beat
 * @param {number} beatEnd - End time of the beat
 * @param {number[]} meter - Time signature
 * @returns {Object[]} Notes with their salience scores
 */
function collectBeatNotes(notes, beatStart, beatEnd, meter) {
  const beatNotes = [];

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const noteEnd = note.onset + note.duration;

    // Check if note sounds during this beat
    if (note.onset < beatEnd && noteEnd > beatStart) {
      const prevNote = i > 0 ? notes[i - 1] : null;
      const salience = calculateNoteSalience(note, beatStart, meter, prevNote);

      beatNotes.push({
        pitch: note.pitch,
        pitchClass: ((note.pitch % 12) + 12) % 12,
        salience,
        onset: note.onset,
        duration: note.duration,
      });
    }
  }

  return beatNotes;
}

/**
 * Check if a chord candidate has all required intervals
 * @param {number} root - Root pitch class (0-11)
 * @param {Object} chordType - Chord type definition
 * @param {Set} presentPitchClasses - Pitch classes present in the beat
 * @returns {boolean}
 */
function hasRequiredIntervals(root, chordType, presentPitchClasses) {
  for (const interval of chordType.required) {
    const targetPC = (root + interval) % 12;
    if (!presentPitchClasses.has(targetPC)) {
      return false;
    }
  }
  return true;
}

/**
 * Score a chord candidate against the notes on a beat
 * @param {number} root - Root pitch class
 * @param {Object} chordType - Chord type definition
 * @param {Object[]} beatNotes - Notes with salience
 * @returns {Object} Score and match details
 */
function scoreChordCandidate(root, chordType, beatNotes) {
  let totalFit = 0;
  let matchedNotes = 0;
  let unmatchedSalience = 0;
  const matches = [];

  for (const note of beatNotes) {
    const interval = ((note.pitchClass - root) + 12) % 12;

    // Check if this interval is in the chord
    const isInChord = chordType.intervals.includes(interval) ||
                      chordType.intervals.includes(interval + 12);

    if (isInChord) {
      const role = getIntervalRole(interval);
      const matchWeight = MATCH_WEIGHTS[role] || 0.5;
      totalFit += note.salience * matchWeight;
      matchedNotes++;
      matches.push({ pitch: note.pitch, interval, role, salience: note.salience });
    } else {
      unmatchedSalience += note.salience;
    }
  }

  return {
    fit: totalFit,
    matchedNotes,
    unmatchedSalience,
    matches,
    complexity: chordType.complexity,
  };
}

/**
 * Find the best chord candidate for a beat
 * @param {Object[]} beatNotes - Notes sounding on this beat with salience
 * @returns {Object|null} Best chord candidate or null if no good match
 */
function findBestChordForBeat(beatNotes) {
  if (beatNotes.length === 0) return null;

  // Get present pitch classes
  const presentPCs = new Set(beatNotes.map(n => n.pitchClass));

  // If only one pitch class, return power chord
  if (presentPCs.size === 1) {
    const root = [...presentPCs][0];
    return {
      root,
      type: 'power5',
      name: `${pitchClassName(root)}5`,
      fit: beatNotes.reduce((sum, n) => sum + n.salience, 0),
      confidence: 0.5,
    };
  }

  let bestCandidate = null;
  let bestScore = -Infinity;

  // Try all roots (0-11) and all chord types
  for (let root = 0; root < 12; root++) {
    // Root must be present
    if (!presentPCs.has(root)) continue;

    for (const [typeName, chordType] of Object.entries(CHORD_TYPES)) {
      // Check required intervals
      if (!hasRequiredIntervals(root, chordType, presentPCs)) continue;

      // Score this candidate
      const result = scoreChordCandidate(root, chordType, beatNotes);

      // Score = fit - complexity penalty (parsimony)
      // Higher fit is better, lower complexity is better when fits are similar
      const score = result.fit - (result.complexity * 0.1);

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = {
          root,
          type: typeName,
          name: `${pitchClassName(root)} ${formatChordType(typeName)}`,
          fit: result.fit,
          matchedNotes: result.matchedNotes,
          unmatchedSalience: result.unmatchedSalience,
          matches: result.matches,
          complexity: result.complexity,
          confidence: result.matchedNotes / beatNotes.length,
        };
      }
    }
  }

  return bestCandidate;
}

/**
 * Format pitch class as note name
 */
function pitchClassName(pc) {
  const names = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  return names[pc % 12];
}

/**
 * Format chord type name
 */
function formatChordType(type) {
  const formats = {
    power5: '5',
    major: '',
    minor: 'm',
    diminished: 'dim',
    augmented: 'aug',
    sus2: 'sus2',
    sus4: 'sus4',
    major_6: '6',
    minor_6: 'm6',
    minor_b6: 'm(b6)',
    major_7: 'maj7',
    dominant_7: '7',
    minor_7: 'm7',
    minor_major_7: 'm(maj7)',
    half_diminished_7: 'm7b5',
    diminished_7: 'dim7',
    augmented_7: 'aug7',
    augmented_major_7: 'aug(maj7)',
    add9: 'add9',
    minor_add9: 'm(add9)',
    add_b9: 'add(b9)',
    add_sharp4: 'add(#4)',
    major_9: 'maj9',
    dominant_9: '9',
    minor_9: 'm9',
    dom7b5: '7b5',
    dom7sharp5: '7#5',
    dom7b9: '7b9',
    dom7sharp9: '7#9',
  };
  return formats[type] || type;
}

/**
 * Analyze harmonic implications of a melody
 * @param {Object[]} notes - Array of NoteEvent objects
 * @param {number[]} meter - Time signature [num, denom]
 * @param {number} tonic - Tonic pitch class (0-11)
 * @returns {Object} Harmonic analysis results
 */
export function analyzeHarmonicImplication(notes, meter, tonic = 0) {
  if (!notes || notes.length === 0) {
    return { chords: [], summary: { error: 'No notes' } };
  }

  // Calculate beat boundaries
  const measureLength = (meter[0] * 4) / meter[1];
  const isCompound = meter[1] >= 8 && meter[0] % 3 === 0;
  const beatUnit = isCompound ? 1.5 : 1; // Dotted quarter for compound, quarter for simple

  const lastNote = notes[notes.length - 1];
  const totalDuration = lastNote.onset + lastNote.duration;

  const chords = [];

  // Analyze each beat
  for (let beatStart = 0; beatStart < totalDuration; beatStart += beatUnit) {
    const beatEnd = beatStart + beatUnit;

    // Collect notes for this beat
    const beatNotes = collectBeatNotes(notes, beatStart, beatEnd, meter);

    if (beatNotes.length === 0) {
      chords.push({
        beat: beatStart,
        chord: null,
        notes: [],
      });
      continue;
    }

    // Find best chord
    const bestChord = findBestChordForBeat(beatNotes);

    chords.push({
      beat: beatStart,
      chord: bestChord,
      notes: beatNotes,
    });
  }

  // Global refinement: look for consistent harmonic progressions
  const refinedChords = refineChordProgression(chords, tonic);

  // Build summary
  const nonNullChords = refinedChords.filter(c => c.chord !== null);
  const uniqueRoots = new Set(nonNullChords.map(c => c.chord?.root));

  // Check for tonic implications at boundaries
  const firstChord = refinedChords.find(c => c.chord !== null)?.chord;
  const lastChord = [...refinedChords].reverse().find(c => c.chord !== null)?.chord;

  const startsOnTonic = firstChord && firstChord.root === tonic;
  const endsOnTonic = lastChord && lastChord.root === tonic;
  const impliesDominant = nonNullChords.some(c =>
    c.chord && ((c.chord.root + 7) % 12 === tonic ||
                c.chord.type.includes('7'))
  );

  return {
    chords: refinedChords,
    summary: {
      totalBeats: chords.length,
      analyzedBeats: nonNullChords.length,
      uniqueHarmonies: uniqueRoots.size,
      startsOnTonic,
      endsOnTonic,
      impliesDominant,
      harmonicClarity: nonNullChords.length > 0
        ? nonNullChords.reduce((sum, c) => sum + (c.chord?.confidence || 0), 0) / nonNullChords.length
        : 0,
    },
  };
}

/**
 * Refine chord progression using context
 * Prefer continuity and common progressions
 */
function refineChordProgression(chords, tonic) {
  const refined = [...chords];

  // Look for arpeggiation patterns - consecutive beats with same chord
  for (let i = 1; i < refined.length; i++) {
    const prev = refined[i - 1];
    const curr = refined[i];

    if (prev.chord && curr.chord) {
      // If same root, prefer continuity
      if (prev.chord.root === curr.chord.root) {
        // Keep the simpler chord type if they're the same root
        if (prev.chord.complexity < curr.chord.complexity && curr.chord.confidence < 0.7) {
          refined[i] = {
            ...curr,
            chord: { ...prev.chord, confidence: curr.chord.confidence },
            arpeggiation: true,
          };
        }
      }
    }
  }

  return refined;
}

/**
 * Format beat position
 */
function formatBeat(beat, meter) {
  const measureLength = (meter[0] * 4) / meter[1];
  const measure = Math.floor(beat / measureLength) + 1;
  const beatInMeasure = ((beat % measureLength) / (4 / meter[1])) + 1;
  return `m.${measure} beat ${beatInMeasure.toFixed(1).replace('.0', '')}`;
}

export default { analyzeHarmonicImplication };
