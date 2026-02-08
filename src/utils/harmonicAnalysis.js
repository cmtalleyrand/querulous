/**
 * Harmonic Implication Analysis
 * Uses DP optimization to find optimal chord sequence with cross-beat arpeggiation support
 */

import { metricWeight } from './formatter';
import { ANALYSIS_THRESHOLDS } from './constants';

// Complete chord vocabulary with semitone intervals
// Note: sus2/sus4 removed - suspensions are non-chord tones handled separately
const CHORD_TYPES = {
  // Triads (ordered by preference/simplicity)
  major: { intervals: [0, 4, 7], required: [0, 4], complexity: 1 },
  minor: { intervals: [0, 3, 7], required: [0, 3], complexity: 1 },
  diminished: { intervals: [0, 3, 6], required: [0, 3, 6], complexity: 2 },
  augmented: { intervals: [0, 4, 8], required: [0, 4, 8], complexity: 2 },

  // Seventh chords
  dominant_7: { intervals: [0, 4, 7, 10], required: [0, 4, 10], complexity: 3 },
  major_7: { intervals: [0, 4, 7, 11], required: [0, 4, 11], complexity: 3 },
  minor_7: { intervals: [0, 3, 7, 10], required: [0, 3, 10], complexity: 3 },
  half_diminished_7: { intervals: [0, 3, 6, 10], required: [0, 3, 6, 10], complexity: 4 },
  diminished_7: { intervals: [0, 3, 6, 9], required: [0, 3, 6, 9], complexity: 4 },
  minor_major_7: { intervals: [0, 3, 7, 11], required: [0, 3, 11], complexity: 4 },

  // Sixth chords
  major_6: { intervals: [0, 4, 7, 9], required: [0, 4, 9], complexity: 3 },
  minor_6: { intervals: [0, 3, 7, 9], required: [0, 3, 9], complexity: 3 },
};

// Bass position multipliers
const BASS_ROOT_BONUS = 1.1;      // Bonus when lowest note is root
const BASS_FIFTH_PENALTY = 0.9;   // Penalty when lowest note is fifth
const BASS_SEVENTH_PENALTY = 0.8; // Penalty when lowest note is seventh

/**
 * Get the metric multiplier for salience calculation
 */
function getMetricMultiplier(onset, meter) {
  const weight = metricWeight(onset, meter);
  const {
    SALIENCE_DOWNBEAT_MULT,
    SALIENCE_STRONG_BEAT_MULT,
    SALIENCE_OTHER_BEAT_MULT,
    SALIENCE_OFF_BEAT_MULT,
  } = ANALYSIS_THRESHOLDS;

  if (weight >= 1.0) return SALIENCE_DOWNBEAT_MULT;
  if (weight >= 0.75) return SALIENCE_STRONG_BEAT_MULT;
  if (weight >= 0.5) return SALIENCE_OTHER_BEAT_MULT;
  return SALIENCE_OFF_BEAT_MULT;
}

/**
 * Calculate approach multiplier based on melodic interval from previous note
 */
function getApproachMultiplier(note, prevNote) {
  if (!prevNote) return 1.0;

  const interval = Math.abs(note.pitch - prevNote.pitch);

  // Step approach (1-2 semitones) - passing/neighbor, less structural
  if (interval <= 2) return 0.8;

  // Skip (3-4 semitones) - normal melodic motion
  if (interval <= 4) return 1.0;

  // Perfect intervals (P4, P5, P8) - structurally important
  if (interval === 5 || interval === 7 || interval === 12) return 1.2;

  // Other leaps - moderate importance
  return 1.0;
}

/**
 * Calculate salience for a note contributing to a specific beat
 * Salience = max[(duration - PASSING_NOTE_THRESHOLD) * metric_mult * approach, MIN_SALIENCE] * decay
 */
function calculateSalience(note, beatTime, meter, prevNote, decay = 1.0) {
  const {
    PASSING_NOTE_THRESHOLD,
    MIN_SALIENCE,
  } = ANALYSIS_THRESHOLDS;

  const duration = note.duration;
  const metricMult = getMetricMultiplier(note.onset, meter);
  const approach = getApproachMultiplier(note, prevNote);

  const rawSalience = (duration - PASSING_NOTE_THRESHOLD) * metricMult * approach;
  const baseSalience = Math.max(rawSalience, MIN_SALIENCE);

  return baseSalience * decay;
}

/**
 * Preprocess notes: split long notes at beat boundaries, merge repeated pitches
 *
 * Important: We do NOT merge segments from sustained notes (isSegment=true).
 * A whole note spanning 4 beats should contribute to each beat's chord analysis.
 * We only merge truly repeated notes (separate attacks on same pitch).
 */
function preprocessNotes(notes, beatUnit) {
  const processed = [];

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const noteEnd = note.onset + note.duration;

    // Find all beat boundaries this note crosses
    const startBeat = Math.floor(note.onset / beatUnit) * beatUnit;
    let currentOnset = note.onset;
    const spansMultipleBeats = noteEnd > startBeat + beatUnit;

    for (let beat = startBeat; beat < noteEnd; beat += beatUnit) {
      const nextBeat = beat + beatUnit;
      const segmentEnd = Math.min(noteEnd, nextBeat);
      const segmentStart = Math.max(currentOnset, beat);

      if (segmentEnd > segmentStart) {
        processed.push({
          ...note,
          onset: segmentStart,
          duration: segmentEnd - segmentStart,
          originalNote: note,
          isSegment: spansMultipleBeats,
          originalOnset: note.onset, // Keep track of true onset for sustained notes
        });
      }
      currentOnset = segmentEnd;
    }
  }

  // Sort by onset
  processed.sort((a, b) => a.onset - b.onset);

  // Merge consecutive notes with same pitch ONLY if they are truly repeated attacks
  // (not segments from a sustained note)
  const merged = [];
  for (const note of processed) {
    const last = merged[merged.length - 1];
    if (last && last.pitch === note.pitch && !note.isSegment && !last.isSegment) {
      const gap = note.onset - (last.onset + last.duration);
      if (gap < 0.01) {
        // Merge truly repeated notes (separate attacks)
        last.duration = (note.onset + note.duration) - last.onset;
        continue;
      }
    }
    merged.push({ ...note });
  }

  return merged;
}

/**
 * Collect notes sounding during a beat with their salience
 * Notes from neighboring beats contribute with decay
 */
function collectBeatNotes(notes, beatIdx, beatUnit, meter, maxLookback = 2) {
  const beatStart = beatIdx * beatUnit;
  const beatEnd = beatStart + beatUnit;
  const { SALIENCE_DECAY } = ANALYSIS_THRESHOLDS;

  const beatNotes = [];

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const noteEnd = note.onset + note.duration;

    // Check if note sounds during or near this beat
    if (noteEnd <= beatStart - (maxLookback * beatUnit)) continue;
    if (note.onset >= beatEnd + beatUnit) break;

    // Calculate beat distance for decay
    const noteBeatIdx = Math.floor(note.onset / beatUnit);
    const beatDistance = Math.abs(noteBeatIdx - beatIdx);

    // Only include notes from current beat or recent past (for arpeggiation)
    if (beatDistance > maxLookback) continue;
    if (note.onset > beatEnd) continue; // Don't include future notes

    const decay = Math.pow(SALIENCE_DECAY, beatDistance);
    const prevNote = i > 0 ? notes[i - 1] : null;
    const salience = calculateSalience(note, beatStart, meter, prevNote, decay);

    beatNotes.push({
      pitch: note.pitch,
      pitchClass: ((note.pitch % 12) + 12) % 12,
      salience,
      onset: note.onset,
      duration: note.duration,
      beatDistance,
    });
  }

  return beatNotes;
}

/**
 * Get chord member weight based on interval role
 */
function getChordMemberWeight(interval) {
  const {
    ROOT_WEIGHT,
    THIRD_WEIGHT,
    FIFTH_SEVENTH_WEIGHT,
    SIXTH_AUGFIFTH_WEIGHT,
  } = ANALYSIS_THRESHOLDS;

  const normalized = ((interval % 12) + 12) % 12;

  switch (normalized) {
    case 0: return ROOT_WEIGHT;           // Root
    case 3: case 4: return THIRD_WEIGHT;  // Third (major or minor)
    case 7: return FIFTH_SEVENTH_WEIGHT;  // Perfect fifth
    case 10: case 11: return FIFTH_SEVENTH_WEIGHT; // Seventh
    case 6: return SIXTH_AUGFIFTH_WEIGHT; // Tritone/dim5
    case 8: return SIXTH_AUGFIFTH_WEIGHT; // Aug5/min6
    case 9: return SIXTH_AUGFIFTH_WEIGHT; // Sixth
    default: return 0.5;                  // Other extensions
  }
}

/**
 * Score a chord candidate against beat notes
 * Returns total weighted salience of matching notes minus penalty for non-chord tones
 * Non-chord tone penalty: sum of max[(salience - 0.05), 0] for each unmatched note
 * Includes bass position scoring: bonus for root in bass, penalty for 5th/7th in bass
 */
function scoreChordCandidate(root, chordType, beatNotes) {
  const { NON_CHORD_TONE_SALIENCE_FLOOR } = ANALYSIS_THRESHOLDS;

  let matchedSalience = 0;
  let nonChordPenalty = 0;
  const matches = [];
  const nonChordTones = [];

  // Find the lowest note for bass position scoring
  let lowestPitch = Infinity;
  let lowestInterval = null;
  for (const note of beatNotes) {
    if (note.pitch < lowestPitch) {
      lowestPitch = note.pitch;
      lowestInterval = ((note.pitchClass - root) + 12) % 12;
    }
  }

  for (const note of beatNotes) {
    const interval = ((note.pitchClass - root) + 12) % 12;

    // Check if this interval is in the chord
    const isInChord = chordType.intervals.includes(interval);

    if (isInChord) {
      const weight = getChordMemberWeight(interval);
      matchedSalience += note.salience * weight;
      matches.push({
        pitch: note.pitch,
        interval,
        salience: note.salience,
        weight,
      });
    } else {
      // Penalty = max[(salience - 0.05), 0] - penalizes high salience non-chord tones more
      const penalty = Math.max(note.salience - NON_CHORD_TONE_SALIENCE_FLOOR, 0);
      nonChordPenalty += penalty;
      nonChordTones.push({
        pitch: note.pitch,
        interval,
        salience: note.salience,
        penalty,
      });
    }
  }

  // Base score = matched salience - non-chord tone penalty
  let score = matchedSalience - nonChordPenalty;

  // Apply bass position multiplier
  let bassMultiplier = 1.0;
  if (lowestInterval !== null) {
    if (lowestInterval === 0) {
      // Root in bass - bonus
      bassMultiplier = BASS_ROOT_BONUS;
    } else if (lowestInterval === 7) {
      // Fifth in bass - penalty
      bassMultiplier = BASS_FIFTH_PENALTY;
    } else if (lowestInterval === 10 || lowestInterval === 11) {
      // Seventh in bass - larger penalty
      bassMultiplier = BASS_SEVENTH_PENALTY;
    }
  }
  score *= bassMultiplier;

  return {
    score,
    matchedSalience,
    nonChordPenalty,
    matches,
    nonChordTones,
    matchCount: matches.length,
    bassMultiplier,
    lowestInterval,
  };
}

/**
 * Check if chord candidate has required intervals present
 */
function hasRequiredIntervals(root, chordType, presentPCs) {
  for (const interval of chordType.required) {
    const targetPC = (root + interval) % 12;
    if (!presentPCs.has(targetPC)) {
      return false;
    }
  }
  return true;
}

/**
 * Find all valid chord candidates for a beat
 * Requires at least 2 notes to consider any chord
 */
function findChordCandidates(beatNotes) {
  const { MIN_NOTES_FOR_CHORD } = ANALYSIS_THRESHOLDS;

  // Need at least 2 notes to imply a chord
  if (beatNotes.length < MIN_NOTES_FOR_CHORD) return [];

  const presentPCs = new Set(beatNotes.map(n => n.pitchClass));
  const candidates = [];

  // Try all roots and chord types
  for (let root = 0; root < 12; root++) {
    // Root must be present in the notes
    if (!presentPCs.has(root)) continue;

    for (const [typeName, chordType] of Object.entries(CHORD_TYPES)) {
      // Check required intervals
      if (!hasRequiredIntervals(root, chordType, presentPCs)) continue;

      const result = scoreChordCandidate(root, chordType, beatNotes);

      candidates.push({
        root,
        type: typeName,
        chordDef: chordType,
        ...result,
        complexity: chordType.complexity,
      });
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  return candidates;
}

/**
 * Check if a chord can extend a chain (same root and type)
 */
function canExtendChain(prevChord, currChord) {
  if (!prevChord || !currChord) return false;
  return prevChord.root === currChord.root && prevChord.type === currChord.type;
}

/**
 * Check if chain should break due to salient non-chord tone
 */
function chainBrokenByNonChordTone(chord, beatNotes) {
  const { CHAIN_BREAK_SALIENCE } = ANALYSIS_THRESHOLDS;

  for (const nct of chord.nonChordTones) {
    if (nct.salience >= CHAIN_BREAK_SALIENCE) {
      return true;
    }
  }
  return false;
}

/**
 * DP optimization to find optimal chord sequence
 * State: best[beatIdx][chordKey] = { score, chainLength, path }
 * Includes audit trail for debugging chord determination
 */
function findOptimalChordSequence(beats, tonic) {
  const { COMPLEXITY_PENALTY } = ANALYSIS_THRESHOLDS;

  const n = beats.length;
  if (n === 0) return [];

  // DP table: best[beat][chordKey] = { score, chainLen, prevChordKey, path, audit }
  // chordKey = `${root}-${type}` or 'null' for no chord
  const dp = Array(n).fill(null).map(() => new Map());

  // Initialize first beat
  const firstBeat = beats[0];
  const firstCandidates = firstBeat.candidates;

  // Add null option (no chord)
  dp[0].set('null', {
    score: 0,
    chainLen: 0,
    chord: null,
    prevKey: null,
    audit: { reason: 'no chord assigned' },
  });

  // Add each candidate
  for (const cand of firstCandidates) {
    const key = `${cand.root}-${cand.type}`;
    const complexityPen = cand.complexity * COMPLEXITY_PENALTY;
    const finalScore = cand.score - complexityPen;

    dp[0].set(key, {
      score: finalScore,
      chainLen: 1,
      chord: cand,
      prevKey: null,
      audit: {
        baseScore: cand.score,
        complexityPenalty: complexityPen,
        finalScore,
        matchedSalience: cand.matchedSalience,
        nonChordPenalty: cand.nonChordPenalty,
        bassMultiplier: cand.bassMultiplier,
        matches: cand.matches,
        nonChordTones: cand.nonChordTones,
      },
    });
  }

  // Fill DP table
  for (let i = 1; i < n; i++) {
    const currBeat = beats[i];
    const currCandidates = currBeat.candidates;

    // Option 1: No chord at this beat
    let bestNullScore = -Infinity;
    let bestNullPrev = null;

    for (const [prevKey, prevState] of dp[i - 1].entries()) {
      if (prevState.score > bestNullScore) {
        bestNullScore = prevState.score;
        bestNullPrev = prevKey;
      }
    }

    dp[i].set('null', {
      score: bestNullScore,
      chainLen: 0,
      chord: null,
      prevKey: bestNullPrev,
      audit: { reason: 'no chord assigned', inheritedScore: bestNullScore },
    });

    // Option 2: Each chord candidate
    for (const cand of currCandidates) {
      const currKey = `${cand.root}-${cand.type}`;
      let bestScore = -Infinity;
      let bestPrevKey = null;
      let bestChainLen = 1;

      for (const [prevKey, prevState] of dp[i - 1].entries()) {
        let transitionScore = prevState.score;
        let newChainLen = 1;

        if (prevKey !== 'null' && prevState.chord) {
          const sameChord = prevState.chord.root === cand.root &&
                           prevState.chord.type === cand.type;

          if (sameChord && !chainBrokenByNonChordTone(cand, currBeat.notes)) {
            // Extend chain (no bonus, just track length)
            newChainLen = prevState.chainLen + 1;
          }
        }

        const complexityPen = cand.complexity * COMPLEXITY_PENALTY;
        const totalScore = transitionScore + cand.score - complexityPen;

        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestPrevKey = prevKey;
          bestChainLen = newChainLen;
        }
      }

      // Update if this is better than existing entry for this chord
      const existing = dp[i].get(currKey);
      if (!existing || bestScore > existing.score) {
        const complexityPen = cand.complexity * COMPLEXITY_PENALTY;
        dp[i].set(currKey, {
          score: bestScore,
          chainLen: bestChainLen,
          chord: cand,
          prevKey: bestPrevKey,
          audit: {
            baseScore: cand.score,
            complexityPenalty: complexityPen,
            inheritedScore: bestScore - cand.score + complexityPen,
            finalScore: bestScore,
            matchedSalience: cand.matchedSalience,
            nonChordPenalty: cand.nonChordPenalty,
            bassMultiplier: cand.bassMultiplier,
            matches: cand.matches,
            nonChordTones: cand.nonChordTones,
            prevChord: bestPrevKey,
          },
        });
      }
    }
  }

  // Backtrack to find optimal path
  let bestFinalKey = null;
  let bestFinalScore = -Infinity;

  for (const [key, state] of dp[n - 1].entries()) {
    if (state.score > bestFinalScore) {
      bestFinalScore = state.score;
      bestFinalKey = key;
    }
  }

  // Reconstruct path with audit trail
  const result = Array(n).fill(null);
  let currKey = bestFinalKey;

  for (let i = n - 1; i >= 0; i--) {
    const state = dp[i].get(currKey);
    if (state) {
      result[i] = {
        chord: state.chord,
        chainLen: state.chainLen,
        score: state.score,
        audit: state.audit,
      };
      currKey = state.prevKey;
    }
  }

  return result;
}

/**
 * Format pitch class as note name
 */
function pitchClassName(pc) {
  const names = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  return names[((pc % 12) + 12) % 12];
}

/**
 * Format chord type name
 */
function formatChordType(type) {
  const formats = {
    major: '',
    minor: 'm',
    diminished: 'dim',
    augmented: 'aug',
    major_6: '6',
    minor_6: 'm6',
    major_7: 'maj7',
    dominant_7: '7',
    minor_7: 'm7',
    minor_major_7: 'm(maj7)',
    half_diminished_7: 'm7b5',
    diminished_7: 'dim7',
  };
  return formats[type] || type;
}

/**
 * Analyze harmonic implications of a melody
 * @param {Object[]} notes - Array of NoteEvent objects
 * @param {number[]} meter - Time signature [num, denom]
 * @param {number} tonic - Tonic pitch class (0-11)
 * @param {Object} options - Optional settings
 * @param {Set<string>} options.suspensions - Set of "pitch-onset" keys for suspension notes to exclude
 * @returns {Object} Harmonic analysis results
 */
export function analyzeHarmonicImplication(notes, meter, tonic = 0, options = {}) {
  if (!meter || !Array.isArray(meter) || meter.length < 2) {
    throw new Error(`analyzeHarmonicImplication: meter is invalid (${JSON.stringify(meter)}). Must pass [numerator, denominator] array.`);
  }
  if (!notes || notes.length === 0) {
    return { chords: [], summary: { error: 'No notes' } };
  }

  const { suspensions = new Set() } = options;

  // Calculate beat unit
  const isCompound = meter[1] >= 8 && meter[0] % 3 === 0;
  const beatUnit = isCompound ? 1.5 : 1;

  // Preprocess notes, excluding suspensions
  const filteredNotes = notes.filter(n => {
    const key = `${n.pitch}-${n.onset}`;
    return !suspensions.has(key);
  });
  const processedNotes = preprocessNotes(filteredNotes, beatUnit);

  // Calculate number of beats
  const lastNote = notes[notes.length - 1];
  const totalDuration = lastNote.onset + lastNote.duration;
  const numBeats = Math.ceil(totalDuration / beatUnit);

  // Collect notes and candidates for each beat
  const beats = [];
  for (let i = 0; i < numBeats; i++) {
    const beatNotes = collectBeatNotes(processedNotes, i, beatUnit, meter);
    const candidates = findChordCandidates(beatNotes);

    beats.push({
      beatIdx: i,
      beatTime: i * beatUnit,
      notes: beatNotes,
      candidates,
    });
  }

  // Run DP optimization
  const optimalPath = findOptimalChordSequence(beats, tonic);

  // Build result with chain information
  const chords = [];
  let currentChainStart = null;

  for (let i = 0; i < numBeats; i++) {
    const beat = beats[i];
    const dpResult = optimalPath[i];
    const chord = dpResult?.chord || null;

    // Track chain boundaries
    let isChainStart = false;
    let isChainEnd = false;
    let chainLength = dpResult?.chainLen || 0;

    if (chord) {
      const prevChord = i > 0 ? optimalPath[i - 1]?.chord : null;
      const nextChord = i < numBeats - 1 ? optimalPath[i + 1]?.chord : null;

      const continuesFromPrev = prevChord &&
        prevChord.root === chord.root && prevChord.type === chord.type;
      const continuesToNext = nextChord &&
        nextChord.root === chord.root && nextChord.type === chord.type;

      isChainStart = !continuesFromPrev;
      isChainEnd = !continuesToNext;
    }

    chords.push({
      beat: beat.beatTime,
      chord: chord ? {
        root: chord.root,
        type: chord.type,
        name: `${pitchClassName(chord.root)}${formatChordType(chord.type)}`,
        score: chord.score,
        matchedSalience: chord.matchedSalience,
        matches: chord.matches,
        nonChordTones: chord.nonChordTones,
        complexity: chord.complexity,
        confidence: chord.matchCount / Math.max(beat.notes.length, 1),
      } : null,
      notes: beat.notes,
      chainLength,
      isChainStart,
      isChainEnd,
      isArpeggiation: chainLength > 1,
      // Audit trail for debugging chord determination
      audit: dpResult?.audit || null,
      // All candidates considered for this beat (for comparison)
      allCandidates: beat.candidates.slice(0, 5).map(c => ({
        name: `${pitchClassName(c.root)}${formatChordType(c.type)}`,
        score: c.score,
        matchedSalience: c.matchedSalience,
        nonChordPenalty: c.nonChordPenalty,
        bassMultiplier: c.bassMultiplier,
      })),
    });
  }

  // Build summary
  const nonNullChords = chords.filter(c => c.chord !== null);
  const uniqueRoots = new Set(nonNullChords.map(c => c.chord?.root));
  const uniqueChords = new Set(nonNullChords.map(c => `${c.chord?.root}-${c.chord?.type}`));

  // Tonic analysis
  const firstChord = chords.find(c => c.chord !== null)?.chord;
  const lastChord = [...chords].reverse().find(c => c.chord !== null)?.chord;
  const startsOnTonic = firstChord && firstChord.root === tonic;
  const endsOnTonic = lastChord && lastChord.root === tonic;

  // Dominant detection (V or V7 in relation to tonic)
  const dominantRoot = (tonic + 7) % 12;
  const impliesDominant = nonNullChords.some(c =>
    c.chord && (c.chord.root === dominantRoot ||
                (c.chord.type === 'dominant_7' && c.chord.root === dominantRoot))
  );

  // Calculate average confidence
  const avgConfidence = nonNullChords.length > 0
    ? nonNullChords.reduce((sum, c) => sum + (c.chord?.confidence || 0), 0) / nonNullChords.length
    : 0;

  // Count arpeggiations (chains of length > 1)
  const arpeggiations = chords.filter(c => c.isChainStart && c.chainLength > 1);

  return {
    chords,
    summary: {
      totalBeats: numBeats,
      analyzedBeats: nonNullChords.length,
      uniqueRoots: uniqueRoots.size,
      uniqueHarmonies: uniqueChords.size,
      startsOnTonic,
      endsOnTonic,
      impliesDominant,
      harmonicClarity: avgConfidence,
      arpeggiationCount: arpeggiations.length,
      avgChainLength: arpeggiations.length > 0
        ? arpeggiations.reduce((sum, c) => sum + c.chainLength, 0) / arpeggiations.length
        : 0,
    },
  };
}

export default { analyzeHarmonicImplication };
