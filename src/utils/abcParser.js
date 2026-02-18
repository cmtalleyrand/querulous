import { ScaleDegree, NoteEvent } from '../types';
import { NOTE_TO_MIDI, KEY_SIGNATURES, MODE_INTERVALS } from './constants';

/**
 * Validate ABC notation against time signature
 * Returns array of warnings about measure duration mismatches
 * @param {string} abcText - The ABC notation
 * @param {number[]} meter - Time signature [numerator, denominator]
 * @param {number} defaultNoteLength - Default note length as decimal (e.g., 0.125 for 1/8)
 * @returns {Array<{measure: number, expected: number, actual: number, message: string}>}
 */
export function validateABCTiming(abcText, meter, defaultNoteLength = 1/8) {
  if (!meter || !Array.isArray(meter) || meter.length < 2) {
    throw new Error(`validateABCTiming: meter is invalid (${JSON.stringify(meter)}). Must pass [numerator, denominator] array.`);
  }
  const warnings = [];
  const measureDuration = (meter[0] * 4) / meter[1]; // Duration in quarter notes

  let noteText = '';
  for (const line of abcText.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('%') && !t.match(/^[A-Z]:/)) {
      noteText += ' ' + t;
    }
  }

  // Clean up
  noteText = noteText.replace(/\[.*?\]/g, ' ').replace(/"/g, ' ');

  // Split by bar lines
  const measures = noteText.split(/\|+:?|:\|+/).filter(m => m.trim());

  for (let i = 0; i < measures.length; i++) {
    const measureContent = measures[i].trim();
    if (!measureContent || measureContent === ']') continue;

    let totalDuration = 0;

    // Parse notes and rests in this measure
    const pat = /([zx])([\d]*\/?[\d]*)?|(\^{1,2}|_{1,2}|=)?([A-Ga-g])([,']*)([\d]*\/?[\d]*)?/g;
    let m;

    while ((m = pat.exec(measureContent)) !== null) {
      let dur = defaultNoteLength;
      const durStr = m[2] || m[6]; // rest duration or note duration

      if (durStr) {
        if (durStr.includes('/')) {
          const p = durStr.split('/');
          dur = (defaultNoteLength * (p[0] ? parseInt(p[0]) : 1)) / (p[1] ? parseInt(p[1]) : 2);
        } else {
          dur = defaultNoteLength * parseInt(durStr);
        }
      }

      totalDuration += dur * 4; // Convert to quarter notes
    }

    // Check if measure duration matches expected
    // Allow small tolerance for floating point
    if (totalDuration > 0 && Math.abs(totalDuration - measureDuration) > 0.01) {
      // Skip final measure if it's incomplete (pickup/anacrusis or ending)
      const isFirst = i === 0;
      const isLast = i === measures.length - 1 || (i === measures.length - 2 && !measures[i+1].trim());

      // Only warn for middle measures with wrong duration
      if (!isFirst && !isLast) {
        warnings.push({
          measure: i + 1,
          expected: measureDuration,
          actual: totalDuration,
          message: `Measure ${i + 1}: expected ${measureDuration} beats, found ${totalDuration.toFixed(2)} beats`,
        });
      } else if (isFirst && totalDuration > measureDuration) {
        // First measure can be a pickup (less than full) but not more
        warnings.push({
          measure: 1,
          expected: measureDuration,
          actual: totalDuration,
          message: `Measure 1: ${totalDuration.toFixed(2)} beats exceeds ${measureDuration} (time signature mismatch?)`,
        });
      }
    }
  }

  return warnings;
}

/**
 * Extract header information from ABC notation text
 */
export function extractABCHeaders(abcText) {
  let key = null,
    mode = null,
    noteLength = null,
    noteLengthFraction = null, // Store as [numerator, denominator]
    meter = null;

  for (const line of abcText.split('\n')) {
    const t = line.trim();

    // Parse note length (L:)
    if (t.startsWith('L:')) {
      const m = t.match(/L:\s*(\d+)\/(\d+)/);
      if (m) {
        const num = parseInt(m[1]);
        const denom = parseInt(m[2]);
        noteLength = num / denom;
        noteLengthFraction = [num, denom];
      }
    }

    // Parse time signature (M:)
    if (t.startsWith('M:')) {
      const mm = t.match(/M:\s*(\d+)\/(\d+)/);
      if (mm) meter = [parseInt(mm[1]), parseInt(mm[2])];
    }

    // Parse key signature (K:)
    if (t.startsWith('K:')) {
      // More flexible regex that handles Maj, Major, minor, m, etc.
      const km = t.match(
        /K:\s*([A-Ga-g][#b]?)\s*(maj|major|m|min|minor|dor|dorian|phr|phrygian|lyd|lydian|mix|mixolydian|harm|harmonic|loc|locrian|ion|ionian|aeo|aeolian)?/i
      );
      if (km) {
        key = km[1].charAt(0).toUpperCase() + (km[1].slice(1) || '');
        if (km[2]) {
          const x = km[2].toLowerCase();
          // Check for major indicators first (before checking 'm' for minor)
          if (x.startsWith('maj') || x.startsWith('ion')) {
            mode = 'major';
          } else if (x.startsWith('m') && !x.startsWith('mix') && !x.startsWith('maj')) {
            mode = 'natural_minor';
          } else if (x.startsWith('aeo')) {
            mode = 'natural_minor';
          } else if (x.startsWith('dor')) {
            mode = 'dorian';
          } else if (x.startsWith('phr')) {
            mode = 'phrygian';
          } else if (x.startsWith('lyd')) {
            mode = 'lydian';
          } else if (x.startsWith('mix')) {
            mode = 'mixolydian';
          } else if (x.startsWith('harm')) {
            mode = 'harmonic_minor';
          } else if (x.startsWith('loc')) {
            mode = 'locrian';
          } else {
            mode = 'major';
          }
        } else {
          // No mode specified - default to major
          mode = 'major';
        }
      }
    }
  }

  return { key, mode, noteLength, noteLengthFraction, meter };
}

/**
 * Compute the scale degree for a given pitch in a key and mode
 */
export function computeScaleDegree(pitch, tonic, mode) {
  const interval = ((pitch - tonic) % 12 + 12) % 12;
  const mi = MODE_INTERVALS[mode] || MODE_INTERVALS.major;

  if (interval in mi) return new ScaleDegree(mi[interval], 0);

  const raised = ((interval - 1) % 12 + 12) % 12;
  if (raised in mi) return new ScaleDegree(mi[raised], 1);

  const lowered = (interval + 1) % 12;
  if (lowered in mi) return new ScaleDegree(mi[lowered], -1);

  return new ScaleDegree(1, 0);
}

/**
 * Parse ABC notation text into an array of NoteEvents
 * @param abcText - The ABC notation text
 * @param tonic - The MIDI note number of the tonic (for scale degree analysis)
 * @param mode - The mode for scale degree analysis
 * @param defaultNoteLengthOverride - Override for default note length
 * @param keySignatureOverride - Optional key signature array to use instead of parsing K: header
 */
export function parseABC(abcText, tonic, mode, defaultNoteLengthOverride = null, keySignatureOverride = null) {
  let noteText = '',
    defaultNoteLength = defaultNoteLengthOverride || 1 / 8,
    defaultNoteLengthFraction = defaultNoteLengthOverride ? null : [1, 8], // [numerator, denominator]
    keySignature = keySignatureOverride || [];

  for (const line of abcText.split('\n')) {
    const t = line.trim();

    if (t.startsWith('L:')) {
      const m = t.match(/L:\s*(\d+)\/(\d+)/);
      if (m && !defaultNoteLengthOverride) {
        const num = parseInt(m[1]);
        const denom = parseInt(m[2]);
        defaultNoteLength = num / denom;
        defaultNoteLengthFraction = [num, denom];
      }
    } else if (t.startsWith('K:') && !keySignatureOverride) {
      // Only use K: header for key signature if no override provided
      const km = t.match(/K:\s*([A-Ga-g][#b]?m?)/);
      if (km) keySignature = KEY_SIGNATURES[km[1]] || [];
    } else if (!t.startsWith('%') && !t.match(/^[A-Z]:/)) {
      noteText += ' ' + t;
    }
  }

  // Clean up the note text - preserve bar lines for accidental reset, remove other non-note elements
  noteText = noteText.replace(/\[.*?\]/g, ' ').replace(/"/g, ' ');

  // Determine if key signature uses flats (for display preference)
  const keyUsesFlats = keySignature.some(s => s.endsWith('b'));

  const notes = [];
  let currentOnset = 0;

  // Pattern matches bar lines, rests, OR notes
  // Rests are 'z' (audible rest) or 'x' (invisible rest) followed by optional duration
  const pat = /(\|+:?|:\|+)|([zx])([\d]*\/?[\d]*)?|(\^{1,2}|_{1,2}|=)?([A-Ga-g])([,']*)([\d]*\/?[\d]*)?/g;
  let m;

  while ((m = pat.exec(noteText)) !== null) {
    // Skip bar lines - they don't affect accidentals in ABC (accidentals don't carry through bars)
    if (m[1]) {
      continue;
    }

    // Check if this is a rest - advance time but don't create a note
    if (m[2]) {
      const restDurStr = m[3];
      let restDur = defaultNoteLength;
      if (restDurStr) {
        if (restDurStr.includes('/')) {
          const p = restDurStr.split('/');
          restDur = (defaultNoteLength * (p[0] ? parseInt(p[0]) : 1)) / (p[1] ? parseInt(p[1]) : 2);
        } else {
          restDur = defaultNoteLength * parseInt(restDurStr);
        }
      }
      currentOnset += restDur * 4;
      continue;
    }

    const [, , , , acc, letter, octMod, durStr] = m;
    if (!letter) continue;

    let pitch = NOTE_TO_MIDI[letter];
    if (pitch === undefined) continue;

    // Apply octave modifiers
    for (const c of octMod || '') {
      if (c === "'") pitch += 12;
      if (c === ',') pitch -= 12;
    }

    const base = letter.toUpperCase();
    let accStr = '';
    let usesFlat = false;

    // ABC accidentals: apply ONLY to the note they immediately precede
    // Notes without explicit accidentals use KEY SIGNATURE only (no bar-carry)
    if (acc) {
      if (acc.includes('^')) {
        pitch += acc.length;
        accStr = acc;
      } else if (acc.includes('_')) {
        pitch -= acc.length;
        accStr = acc;
        usesFlat = true;
      } else if (acc === '=') {
        // Natural sign - explicitly override key signature for this note
        accStr = '=';
      }
    } else {
      // No explicit accidental - use key signature
      if (keySignature.includes(base + '#')) pitch += 1;
      if (keySignature.includes(base + 'b')) {
        pitch -= 1;
        usesFlat = true;
      }
    }

    // Parse duration
    let dur = defaultNoteLength;
    if (durStr) {
      if (durStr.includes('/')) {
        const p = durStr.split('/');
        dur = (defaultNoteLength * (p[0] ? parseInt(p[0]) : 1)) / (p[1] ? parseInt(p[1]) : 2);
      } else {
        dur = defaultNoteLength * parseInt(durStr);
      }
    }

    // Use flat display if this note uses a flat (explicit or from key sig)
    const noteUsesFlat = usesFlat || (keyUsesFlats && !accStr.includes('^'));

    notes.push(
      new NoteEvent(
        pitch,
        dur * 4,
        currentOnset,
        computeScaleDegree(pitch, tonic, mode),
        accStr + letter + (octMod || '') + (durStr || ''),
        noteUsesFlat
      )
    );
    currentOnset += dur * 4;
  }

  return { notes, defaultNoteLength, defaultNoteLengthFraction };
}

/**
 * Convert a MIDI pitch to ABC notation
 */
export function midiToABC(pitch, keySignature) {
  const noteNames = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  const isSharp = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  const octave = Math.floor(pitch / 12) - 5;
  const pc = pitch % 12;

  let name = noteNames[pc];
  let acc = '';

  if (isSharp[pc]) {
    if (!keySignature.includes(name + '#')) acc = '^';
  } else {
    if (keySignature.includes(name + '#') || keySignature.includes(name + 'b')) acc = '=';
  }

  let octMod = '';
  if (octave >= 1) {
    name = name.toLowerCase();
    octMod = "'".repeat(octave - 1);
  } else if (octave <= -1) {
    octMod = ','.repeat(-octave);
  }

  return acc + name + octMod;
}

/**
 * Generate ABC notation for the tonal answer
 * @param {Array} subject - Array of NoteEvents
 * @param {Object} keyInfo - Key information {tonic, keySignature, mode}
 * @param {Object} answerData - Answer analysis {tonalMotions, mutationPoint}
 * @param {number} defaultNoteLength - Note length as decimal
 * @param {number[]} meter - Time signature as [numerator, denominator]
 * @param {number[]} noteLengthFraction - Note length as [numerator, denominator] fraction
 */
export function generateAnswerABC(subject, keyInfo, answerData, defaultNoteLength, meter, noteLengthFraction = null) {
  if (!meter || !Array.isArray(meter) || meter.length < 2) {
    throw new Error(`generateAnswerABC: meter is invalid (${JSON.stringify(meter)}). Must pass [numerator, denominator] array.`);
  }
  const { tonic, keySignature, mode } = keyInfo;
  const { tonalMotions, mutationPoint } = answerData;

  const keyNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const flatNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  const answerTonic = (tonic + 7) % 12;
  const useFlats = keySignature.some((k) => k.includes('b'));
  const answerKey = useFlats ? flatNames[answerTonic] : keyNames[answerTonic];

  let modeSuffix = ['natural_minor', 'harmonic_minor'].includes(mode)
    ? 'm'
    : mode === 'dorian'
      ? ' dor'
      : '';

  // Use the fraction directly if provided, otherwise try to reconstruct
  let lNumDisplay, lDenomDisplay;
  if (noteLengthFraction && noteLengthFraction[0] && noteLengthFraction[1]) {
    lNumDisplay = noteLengthFraction[0];
    lDenomDisplay = noteLengthFraction[1];
  } else {
    // Fallback: try common note lengths
    const commonFractions = [
      [1, 1], [1, 2], [1, 4], [1, 8], [1, 16], [1, 32],
      [3, 4], [3, 8], [3, 16]
    ];
    let found = false;
    for (const [n, d] of commonFractions) {
      if (Math.abs(defaultNoteLength - n / d) < 0.001) {
        lNumDisplay = n;
        lDenomDisplay = d;
        found = true;
        break;
      }
    }
    if (!found) {
      // Last resort: use decimal approximation
      lNumDisplay = Math.round(defaultNoteLength * 16);
      lDenomDisplay = 16;
    }
  }

  // Calculate measure duration in internal units (quarter notes)
  // A measure = numerator / denominator whole notes = numerator * 4 / denominator quarter notes
  const measDur = (meter[0] * 4) / meter[1];

  const answerKeySig =
    KEY_SIGNATURES[answerKey + (['natural_minor', 'harmonic_minor', 'dorian'].includes(mode) ? 'm' : '')] ||
    KEY_SIGNATURES[answerKey] ||
    [];

  const tokens = [];
  let measCount = 0;

  for (let i = 0; i < subject.length; i++) {
    const n = subject[i];
    let newPitch = n.pitch + 7;

    // Apply tonal mutation if needed
    if (tonalMotions.length > 0 && mutationPoint !== null && i < mutationPoint) {
      const d = n.scaleDegree;
      if (d.degree === 1 && d.alteration === 0) newPitch = n.pitch + 7;
      else if (d.degree === 5 && d.alteration === 0) newPitch = n.pitch + 5;
    }

    const durMatch = n.abcNote.match(/[\d\/]+$/);
    const noteMeas = Math.floor(n.onset / measDur);

    if (noteMeas > measCount && tokens.length > 0) {
      while (measCount < noteMeas) {
        measCount++;
        tokens.push(measCount % 4 === 0 ? '|\n' : '|');
      }
    }

    tokens.push(midiToABC(newPitch, answerKeySig) + (durMatch ? durMatch[0] : ''));
  }

  tokens.push('|]');

  let body = '';
  let line = '';

  for (const t of tokens) {
    if (t === '|\n') {
      body += line + ' |\n';
      line = '';
    } else if (t === '|' || t === '|]') {
      line += ' ' + t;
    } else {
      line += (line && !line.endsWith('|') ? ' ' : '') + t;
    }
  }

  if (line.trim()) body += line;

  return `K:${answerKey}${modeSuffix}\nL:${lNumDisplay}/${lDenomDisplay}\n${body.trim()}`;
}

/**
 * Generate ABC notation for the answer in the SAME key as the subject.
 * This avoids confusion by keeping the same key signature.
 * @param {Array} subject - Array of NoteEvents
 * @param {Object} keyInfo - Key information {key, keySignature, mode}
 * @param {Object} answerData - Answer analysis {tonalMotions, mutationPoint, answerType}
 * @param {number} defaultNoteLength - Note length as decimal
 * @param {number[]} meter - Time signature
 * @param {boolean} forceReal - If true, generate a real (non-tonal) answer
 * @param {number[]} noteLengthFraction - Optional note length fraction
 */
export function generateAnswerABCSameKey(subject, keyInfo, answerData, defaultNoteLength, meter, forceReal = false, noteLengthFraction = null, octaveShift = 0) {
  if (!meter || !Array.isArray(meter) || meter.length < 2) {
    throw new Error(`generateAnswerABCSameKey: meter is invalid (${JSON.stringify(meter)})`);
  }
  const { key, keySignature, mode } = keyInfo;

  let modeSuffix = ['natural_minor', 'harmonic_minor'].includes(mode)
    ? 'm'
    : mode === 'dorian'
      ? ' dor'
      : '';

  // Use the fraction directly if provided
  let lNumDisplay, lDenomDisplay;
  if (noteLengthFraction && noteLengthFraction[0] && noteLengthFraction[1]) {
    lNumDisplay = noteLengthFraction[0];
    lDenomDisplay = noteLengthFraction[1];
  } else {
    const commonFractions = [
      [1, 1], [1, 2], [1, 4], [1, 8], [1, 16], [1, 32],
      [3, 4], [3, 8], [3, 16]
    ];
    let found = false;
    for (const [n, d] of commonFractions) {
      if (Math.abs(defaultNoteLength - n / d) < 0.001) {
        lNumDisplay = n;
        lDenomDisplay = d;
        found = true;
        break;
      }
    }
    if (!found) {
      lNumDisplay = Math.round(defaultNoteLength * 16);
      lDenomDisplay = 16;
    }
  }

  const measDur = (meter[0] * 4) / meter[1];
  const { tonalMotions, mutationPoint } = answerData;

  const tokens = [];
  let measCount = 0;

  for (let i = 0; i < subject.length; i++) {
    const n = subject[i];
    let newPitch;

    if (forceReal) {
      // Real answer: always transpose up a 5th (7 semitones) + octave shift
      newPitch = n.pitch + 7 + octaveShift;
    } else {
      // Tonal answer: apply mutation + octave shift
      newPitch = n.pitch + 7 + octaveShift;
      if (tonalMotions.length > 0 && mutationPoint !== null && i < mutationPoint) {
        const d = n.scaleDegree;
        if (d.degree === 1 && d.alteration === 0) newPitch = n.pitch + 7 + octaveShift;
        else if (d.degree === 5 && d.alteration === 0) newPitch = n.pitch + 5 + octaveShift;
      }
    }

    const durMatch = n.abcNote.match(/[\d\/]+$/);
    const noteMeas = Math.floor(n.onset / measDur);

    if (noteMeas > measCount && tokens.length > 0) {
      while (measCount < noteMeas) {
        measCount++;
        tokens.push(measCount % 4 === 0 ? '|\n' : '|');
      }
    }

    // Write in subject key, using accidentals as needed
    tokens.push(midiToABC(newPitch, keySignature) + (durMatch ? durMatch[0] : ''));
  }

  tokens.push('|]');

  let body = '';
  let line = '';

  for (const t of tokens) {
    if (t === '|\n') {
      body += line + ' |\n';
      line = '';
    } else if (t === '|' || t === '|]') {
      line += ' ' + t;
    } else {
      line += (line && !line.endsWith('|') ? ' ' : '') + t;
    }
  }

  if (line.trim()) body += line;

  const answerLabel = forceReal ? 'Real' : 'Tonal';
  return `K:${key}${modeSuffix}\nL:${lNumDisplay}/${lDenomDisplay}\n${body.trim()}`;
}

/**
 * Format the subject as ABC notation
 * @param {Array} subject - Array of NoteEvents
 * @param {Object} keyInfo - Key information {key, mode}
 * @param {number} defaultNoteLength - Note length as decimal
 * @param {number[]} meter - Time signature as [numerator, denominator]
 * @param {number[]} noteLengthFraction - Note length as [numerator, denominator] fraction
 */
export function formatSubjectABC(subject, keyInfo, defaultNoteLength, meter, noteLengthFraction = null) {
  if (!meter || !Array.isArray(meter) || meter.length < 2) {
    throw new Error(`formatSubjectABC: meter is invalid (${JSON.stringify(meter)}). Must pass [numerator, denominator] array.`);
  }
  const { key, mode } = keyInfo;

  let modeSuffix = ['natural_minor', 'harmonic_minor'].includes(mode)
    ? 'm'
    : mode === 'dorian'
      ? ' dor'
      : '';

  // Use the fraction directly if provided, otherwise try to reconstruct
  let lNumDisplay, lDenomDisplay;
  if (noteLengthFraction && noteLengthFraction[0] && noteLengthFraction[1]) {
    lNumDisplay = noteLengthFraction[0];
    lDenomDisplay = noteLengthFraction[1];
  } else {
    // Fallback: try common note lengths
    const commonFractions = [
      [1, 1], [1, 2], [1, 4], [1, 8], [1, 16], [1, 32],
      [3, 4], [3, 8], [3, 16]
    ];
    let found = false;
    for (const [n, d] of commonFractions) {
      if (Math.abs(defaultNoteLength - n / d) < 0.001) {
        lNumDisplay = n;
        lDenomDisplay = d;
        found = true;
        break;
      }
    }
    if (!found) {
      lNumDisplay = Math.round(defaultNoteLength * 16);
      lDenomDisplay = 16;
    }
  }

  // Calculate measure duration in internal units
  const measDur = (meter[0] * 4) / meter[1];

  const tokens = [];
  let measCount = 0;

  for (const n of subject) {
    const noteMeas = Math.floor(n.onset / measDur);
    if (noteMeas > measCount && tokens.length > 0) {
      while (measCount < noteMeas) {
        measCount++;
        tokens.push(measCount % 4 === 0 ? '|\n' : '|');
      }
    }
    tokens.push(n.abcNote);
  }

  tokens.push('|]');

  let body = '';
  let line = '';

  for (const t of tokens) {
    if (t === '|\n') {
      body += line + ' |\n';
      line = '';
    } else if (t === '|' || t === '|]') {
      line += ' ' + t;
    } else {
      line += (line && !line.endsWith('|') ? ' ' : '') + t;
    }
  }

  if (line.trim()) body += line;

  return `K:${key}${modeSuffix}\nL:${lNumDisplay}/${lDenomDisplay}\n${body.trim()}`;
}
