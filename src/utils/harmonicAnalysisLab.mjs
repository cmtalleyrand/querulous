/**
 * Standalone harmonic analysis lab.
 * Three approaches to chord-sequence DP, runnable independently.
 *
 * Usage:  node src/utils/harmonicAnalysisLab.mjs
 */

// ─── constants ───────────────────────────────────────────────────────────────

const DECAY_RATE = 0.3;          // linear decay per beat distance
const PASSING_NOTE_THRESHOLD = 0.125;
const MIN_SALIENCE = 0.025;
const NON_CHORD_TONE_FLOOR = 0.05;
const COMPLEXITY_PENALTY = 0.05;

const CHORD_TYPES = {
  major:       { intervals: [0, 4, 7],     required: [0, 4],         complexity: 1 },
  minor:       { intervals: [0, 3, 7],     required: [0, 3],         complexity: 1 },
  diminished:  { intervals: [0, 3, 6],     required: [0, 3, 6],     complexity: 2 },
  augmented:   { intervals: [0, 4, 8],     required: [0, 4, 8],     complexity: 2 },
  dominant_7:  { intervals: [0, 4, 7, 10], required: [0, 4, 10],    complexity: 3 },
  major_7:     { intervals: [0, 4, 7, 11], required: [0, 4, 11],    complexity: 3 },
  minor_7:     { intervals: [0, 3, 7, 10], required: [0, 3, 10],    complexity: 3 },
  half_dim_7:  { intervals: [0, 3, 6, 10], required: [0, 3, 6, 10], complexity: 4 },
  dim_7:       { intervals: [0, 3, 6, 9],  required: [0, 3, 6, 9],  complexity: 4 },
  min_maj_7:   { intervals: [0, 3, 7, 11], required: [0, 3, 11],    complexity: 4 },
  major_6:     { intervals: [0, 4, 7, 9],  required: [0, 4, 9],     complexity: 3 },
  minor_6:     { intervals: [0, 3, 7, 9],  required: [0, 3, 9],     complexity: 3 },
};

const NOTE_NAMES = ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const TYPE_SHORT = {
  major:'', minor:'m', diminished:'dim', augmented:'aug',
  dominant_7:'7', major_7:'maj7', minor_7:'m7',
  half_dim_7:'m7b5', dim_7:'dim7', min_maj_7:'m(maj7)',
  major_6:'6', minor_6:'m6',
};

function chordName(root, type) {
  return NOTE_NAMES[root] + (TYPE_SHORT[type] ?? type);
}

// ─── metric weight (4/4 simple meter) ────────────────────────────────────────

function metricWeight(onset) {
  // 4/4, beatUnit = 1
  const pos = onset % 4;
  if (Math.abs(pos) < 0.01) return 1.0;           // downbeat
  if (Math.abs(pos - 2) < 0.01) return 0.75;      // beat 3
  if (Math.abs(pos - 1) < 0.01 || Math.abs(pos - 3) < 0.01) return 0.5; // beats 2,4
  if (Math.abs(pos % 0.5) < 0.01) return 0.3;     // eighth-note level
  return 0.2;                                       // sixteenth
}

function metricMult(onset) {
  const w = metricWeight(onset);
  if (w >= 1.0) return 1.2;
  if (w >= 0.75) return 1.0;
  if (w >= 0.5) return 0.75;
  return 0.5;
}

// ─── note helpers ────────────────────────────────────────────────────────────

/** Build note list from pitch names + uniform duration. */
function makeNotes(pitchNames, duration) {
  const map = { C:60, D:62, E:64, F:65, G:67, A:69, B:71 };
  let onset = 0;
  return pitchNames.map(name => {
    const n = { pitch: map[name], onset, duration };
    onset += duration;
    return n;
  });
}

/**
 * Approach multiplier: interval from previous note.
 * Segments of the same original note inherit 1.0 (not the 0.8 repeated-note penalty).
 */
function approachMult(interval) {
  if (interval === null) return 1.0;       // first note
  const abs = Math.abs(interval);
  if (abs === 0) return 1.0;               // segment continuation — not a repeat
  if (abs <= 2) return 0.8;                // step
  if (abs <= 4) return 1.0;                // skip
  if (abs === 5 || abs === 7 || abs === 12) return 1.2; // P4/P5/P8
  return 1.0;
}

/**
 * Split notes at beat boundaries.  Return array of {pitch, pitchClass, onset, duration, originalOnset, approach}.
 */
function preprocessNotes(notes) {
  const segments = [];
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const prevNote = i > 0 ? notes[i - 1] : null;
    const interval = prevNote ? note.pitch - prevNote.pitch : null;
    const app = approachMult(interval);
    const end = note.onset + note.duration;
    let cur = note.onset;
    const startBeat = Math.floor(note.onset);

    for (let beat = startBeat; beat < end; beat += 1) {
      const segStart = Math.max(cur, beat);
      const segEnd = Math.min(end, beat + 1);
      if (segEnd <= segStart) continue;
      segments.push({
        pitch: note.pitch,
        pitchClass: note.pitch % 12,
        onset: segStart,
        duration: segEnd - segStart,
        originalOnset: note.onset,
        approach: app,                       // inherited from source note
      });
      cur = segEnd;
    }
  }
  return segments;
}

// ─── salience & note collection ──────────────────────────────────────────────

function calcSalience(seg, decay) {
  const raw = (seg.duration - PASSING_NOTE_THRESHOLD) * metricMult(seg.onset) * seg.approach;
  return Math.max(raw, MIN_SALIENCE) * decay;
}

/**
 * Collect notes audible at a given beat, with decay.
 * Returns [{pitchClass, salience, onset, pitch, beatDistance, decay}]
 */
function collectNotes(segments, beat) {
  const out = [];
  for (const seg of segments) {
    const segBeat = Math.floor(seg.onset);
    if (segBeat > beat) break;               // future
    const dist = beat - segBeat;
    const decay = Math.max(1.0 - dist * DECAY_RATE, 0);
    if (decay <= 0) continue;
    out.push({
      pitchClass: seg.pitchClass,
      pitch: seg.pitch,
      salience: calcSalience(seg, decay),
      onset: seg.onset,
      beatDistance: dist,
      decay,
    });
  }
  return out;
}

// ─── chord scoring ───────────────────────────────────────────────────────────

function memberWeight(interval) {
  const n = ((interval % 12) + 12) % 12;
  if (n === 0) return 1.1;                  // root
  if (n === 3 || n === 4) return 1.0;       // third
  if (n === 7 || n === 10 || n === 11) return 0.8; // fifth, seventh
  return 0.6;                                // sixth, aug5, etc.
}

/**
 * Score a chord against a set of notes.
 * Returns {score, matched:[{onset,pitchClass,salience}], nct:[...], matchedSalience, nctPenalty}.
 */
function scoreChord(root, typeName, notes) {
  const def = CHORD_TYPES[typeName];
  let matchedSal = 0;
  let nctPen = 0;
  const matched = [];
  const nct = [];

  // check required intervals present
  const pcs = new Set(notes.map(n => n.pitchClass));
  for (const req of def.required) {
    if (!pcs.has((root + req) % 12)) return null; // missing required
  }
  if (notes.length < 2) return null;

  let lowestPitch = Infinity, lowestInterval = null;
  for (const n of notes) {
    if (n.pitch < lowestPitch) {
      lowestPitch = n.pitch;
      lowestInterval = ((n.pitchClass - root) + 12) % 12;
    }
  }

  for (const n of notes) {
    const interval = ((n.pitchClass - root) + 12) % 12;
    if (def.intervals.includes(interval)) {
      const w = memberWeight(interval);
      const contrib = n.salience * w;
      matchedSal += contrib;
      matched.push({ onset: n.onset, pitchClass: n.pitchClass, salience: n.salience, weight: w, contrib });
    } else {
      const pen = Math.max(n.salience - NON_CHORD_TONE_FLOOR, 0);
      nctPen += pen;
      nct.push({ onset: n.onset, pitchClass: n.pitchClass, salience: n.salience, penalty: pen });
    }
  }

  let bassMult = 1.0;
  if (lowestInterval === 0) bassMult = 1.1;
  else if (lowestInterval === 7) bassMult = 0.9;
  else if (lowestInterval === 10 || lowestInterval === 11) bassMult = 0.8;

  const score = (matchedSal - nctPen) * bassMult;
  return { score, matched, nct, matchedSal, nctPenalty: nctPen, bassMult, complexity: def.complexity };
}

/** Find all valid chord candidates for a note set. */
function findCandidates(notes) {
  const pcs = new Set(notes.map(n => n.pitchClass));
  const cands = [];
  for (let root = 0; root < 12; root++) {
    if (!pcs.has(root)) continue;
    for (const [typeName] of Object.entries(CHORD_TYPES)) {
      const result = scoreChord(root, typeName, notes);
      if (result && result.score > -Infinity) {
        cands.push({ root, type: typeName, ...result });
      }
    }
  }
  cands.sort((a, b) => b.score - a.score);
  return cands;
}

// ─── APPROACH 1 : unconstrained forward DP (current behaviour) ───────────────

function approach1_unconstrained(segments, numBeats) {
  // Collect notes per beat
  const beatNotes = [];
  for (let b = 0; b < numBeats; b++) {
    beatNotes.push(collectNotes(segments, b));
  }

  // DP: dp[beat] = Map<chordKey, {totalScore, prevKey, chord, chainLen}>
  const dp = Array.from({ length: numBeats }, () => new Map());

  for (let b = 0; b < numBeats; b++) {
    const notes = beatNotes[b];
    const cands = findCandidates(notes);

    if (b === 0) {
      dp[0].set('null', { totalScore: 0, prevKey: null, chord: null, chainLen: 0 });
      for (const c of cands) {
        const key = `${c.root}-${c.type}`;
        dp[0].set(key, {
          totalScore: c.score - c.complexity * COMPLEXITY_PENALTY,
          prevKey: null,
          chord: c,
          chainLen: 1,
        });
      }
      continue;
    }

    // null option
    let bestNull = -Infinity, bestNullPrev = null;
    for (const [pk, ps] of dp[b - 1]) {
      if (ps.totalScore > bestNull) { bestNull = ps.totalScore; bestNullPrev = pk; }
    }
    dp[b].set('null', { totalScore: bestNull, prevKey: bestNullPrev, chord: null, chainLen: 0 });

    // chord options
    for (const c of cands) {
      const key = `${c.root}-${c.type}`;
      let bestScore = -Infinity, bestPrev = null, bestChain = 1;
      for (const [pk, ps] of dp[b - 1]) {
        const same = ps.chord && ps.chord.root === c.root && ps.chord.type === c.type;
        const chain = same ? ps.chainLen + 1 : 1;
        const total = ps.totalScore + c.score - c.complexity * COMPLEXITY_PENALTY;
        if (total > bestScore) { bestScore = total; bestPrev = pk; bestChain = chain; }
      }
      const existing = dp[b].get(key);
      if (!existing || bestScore > existing.totalScore) {
        dp[b].set(key, { totalScore: bestScore, prevKey: bestPrev, chord: c, chainLen: bestChain });
      }
    }
  }

  return backtrack(dp, numBeats);
}

// ─── APPROACH 2 : two-pass (unconstrained then constrained) ──────────────────

/**
 * Pass 1: unconstrained DP (same as approach 1) → chord assignments.
 * Pass 2: re-run DP, but at each beat the available notes are filtered:
 *   - For a candidate chord D at beat M, a lookback note is available only if:
 *     A) pass 1 assigned the same chord D to the note's beat, OR
 *     B) note.onset >= boundary, where boundary = max onset of notes matched
 *        by any pass-1 chord ≠ D on beats < M.
 *   - Unavailable notes are invisible: no contribution, no NCT penalty.
 */
function approach2_twoPass(segments, numBeats) {
  // Pass 1
  const pass1 = approach1_unconstrained(segments, numBeats);

  // Build pass-1 matched-notes map: for each beat, which note onsets matched which chord
  const pass1Matched = [];  // [{chordKey, matchedOnsets: Set}]
  for (let b = 0; b < numBeats; b++) {
    const entry = pass1[b];
    if (entry.chord) {
      pass1Matched.push({
        beat: b,
        chordKey: `${entry.chord.root}-${entry.chord.type}`,
        matchedOnsets: new Set(entry.chord.matched.map(m => m.onset)),
      });
    }
  }

  // For a candidate chord D at beat M, compute boundary:
  // max onset among all notes matched by pass-1 chords ≠ D on beats < M.
  function getBoundary(beatM, candidateKey) {
    let boundary = -Infinity;
    for (const pm of pass1Matched) {
      if (pm.beat >= beatM) break;
      if (pm.chordKey === candidateKey) continue;  // same chord: no constraint
      for (const onset of pm.matchedOnsets) {
        if (onset > boundary) boundary = onset;
      }
    }
    return boundary;
  }

  // Pass 2: DP with filtered notes
  const dp = Array.from({ length: numBeats }, () => new Map());

  for (let b = 0; b < numBeats; b++) {
    const allNotes = collectNotes(segments, b);

    if (b === 0) {
      const cands = findCandidates(allNotes);
      dp[0].set('null', { totalScore: 0, prevKey: null, chord: null, chainLen: 0 });
      for (const c of cands) {
        const key = `${c.root}-${c.type}`;
        dp[0].set(key, {
          totalScore: c.score - c.complexity * COMPLEXITY_PENALTY,
          prevKey: null, chord: c, chainLen: 1,
        });
      }
      continue;
    }

    // null option
    let bestNull = -Infinity, bestNullPrev = null;
    for (const [pk, ps] of dp[b - 1]) {
      if (ps.totalScore > bestNull) { bestNull = ps.totalScore; bestNullPrev = pk; }
    }
    dp[b].set('null', { totalScore: bestNull, prevKey: bestNullPrev, chord: null, chainLen: 0 });

    // For each possible candidate chord, filter notes then score
    // We need to try all 12 roots × all types, but only on filtered note sets
    // First, collect all possible chordKeys to test
    const pcsAll = new Set(allNotes.map(n => n.pitchClass));

    for (let root = 0; root < 12; root++) {
      if (!pcsAll.has(root)) continue;
      for (const [typeName] of Object.entries(CHORD_TYPES)) {
        const candKey = `${root}-${typeName}`;
        const boundary = getBoundary(b, candKey);

        // Filter: keep notes with onset >= boundary, or that were on a beat assigned this same chord in pass 1
        const filtered = allNotes.filter(n => {
          // Rule A: note's beat had same chord in pass 1
          const noteBeat = Math.floor(n.onset);
          const p1entry = pass1[noteBeat];
          if (p1entry.chord && `${p1entry.chord.root}-${p1entry.chord.type}` === candKey) return true;
          // Rule B: onset >= boundary
          if (n.onset >= boundary) return true;
          return false;
        });

        const result = scoreChord(root, typeName, filtered);
        if (!result) continue;

        const key = candKey;
        let bestScore = -Infinity, bestPrev = null, bestChain = 1;
        for (const [pk, ps] of dp[b - 1]) {
          const same = ps.chord && ps.chord.root === root && ps.chord.type === typeName;
          const chain = same ? ps.chainLen + 1 : 1;
          const total = ps.totalScore + result.score - result.complexity * COMPLEXITY_PENALTY;
          if (total > bestScore) { bestScore = total; bestPrev = pk; bestChain = chain; }
        }
        const existing = dp[b].get(key);
        if (!existing || bestScore > existing.totalScore) {
          dp[b].set(key, { totalScore: bestScore, prevKey: bestPrev, chord: { root, type: typeName, ...result }, chainLen: bestChain });
        }
      }
    }
  }

  return backtrack(dp, numBeats);
}

// ─── APPROACH 3 : single-pass DP with path-dependent boundary ────────────────

/**
 * The DP state includes the "freshness boundary" — the max onset of notes
 * matched by the previous chord.  When transitioning to a different chord,
 * only notes with onset >= boundary are available.  Same chord (rule A) gets
 * all notes.  Unavailable notes are invisible (no score, no penalty).
 *
 * State key: `${chordKey}@${boundary}` (boundary quantised to 0.01).
 */
function approach3_pathDependent(segments, numBeats) {
  // dp[beat] = Map<stateKey, {totalScore, prevStateKey, chord, chainLen, boundary}>
  const dp = Array.from({ length: numBeats }, () => new Map());

  for (let b = 0; b < numBeats; b++) {
    const allNotes = collectNotes(segments, b);

    if (b === 0) {
      // No previous state: all notes available
      const cands = findCandidates(allNotes);
      dp[0].set('null@-Inf', { totalScore: 0, prevStateKey: null, chord: null, chainLen: 0, boundary: -Infinity });
      for (const c of cands) {
        const maxOnset = Math.max(...c.matched.map(m => m.onset));
        const stateKey = `${c.root}-${c.type}@${maxOnset}`;
        dp[0].set(stateKey, {
          totalScore: c.score - c.complexity * COMPLEXITY_PENALTY,
          prevStateKey: null,
          chord: c,
          chainLen: 1,
          boundary: maxOnset,
        });
      }
      continue;
    }

    // Collect transitions from all previous states
    const updates = new Map(); // stateKey -> best {totalScore, prevStateKey, chord, chainLen, boundary}

    for (const [prevSK, prevState] of dp[b - 1]) {
      const prevChord = prevState.chord;
      const prevBoundary = prevState.boundary;
      const prevKey = prevChord ? `${prevChord.root}-${prevChord.type}` : 'null';

      // Option A: null at this beat (inherit score, boundary stays)
      {
        const sk = `null@${prevBoundary}`;
        const existing = updates.get(sk);
        if (!existing || prevState.totalScore > existing.totalScore) {
          updates.set(sk, {
            totalScore: prevState.totalScore,
            prevStateKey: prevSK,
            chord: null,
            chainLen: 0,
            boundary: prevBoundary,
          });
        }
      }

      // Option B: each chord candidate with filtered notes
      const pcsAll = new Set(allNotes.map(n => n.pitchClass));
      for (let root = 0; root < 12; root++) {
        if (!pcsAll.has(root)) continue;
        for (const [typeName] of Object.entries(CHORD_TYPES)) {
          const candKey = `${root}-${typeName}`;
          const sameChord = (candKey === prevKey);

          // Filter notes
          const filtered = sameChord
            ? allNotes  // Rule A: same chord, all notes available
            : allNotes.filter(n => n.onset >= prevBoundary);  // Rule B

          const result = scoreChord(root, typeName, filtered);
          if (!result) continue;

          const chain = sameChord ? prevState.chainLen + 1 : 1;
          const total = prevState.totalScore + result.score - result.complexity * COMPLEXITY_PENALTY;
          const newBoundary = Math.max(...result.matched.map(m => m.onset));
          const sk = `${candKey}@${newBoundary}`;

          const existing = updates.get(sk);
          if (!existing || total > existing.totalScore) {
            updates.set(sk, {
              totalScore: total,
              prevStateKey: prevSK,
              chord: { root, type: typeName, ...result },
              chainLen: chain,
              boundary: newBoundary,
            });
          }
        }
      }
    }

    dp[b] = updates;
  }

  // Backtrack
  let bestSK = null, bestScore = -Infinity;
  for (const [sk, state] of dp[numBeats - 1]) {
    if (state.totalScore > bestScore) { bestScore = state.totalScore; bestSK = sk; }
  }

  const result = [];
  let curSK = bestSK;
  for (let b = numBeats - 1; b >= 0; b--) {
    const state = dp[b].get(curSK);
    result.unshift({
      beat: b,
      chord: state.chord ? { root: state.chord.root, type: state.chord.type, score: state.chord.score, matched: state.chord.matched, nct: state.chord.nct } : null,
      totalScore: state.totalScore,
      chainLen: state.chainLen,
      boundary: state.boundary,
    });
    curSK = state.prevStateKey;
  }
  return result;
}

// ─── backtrack helper for approaches 1 & 2 ──────────────────────────────────

function backtrack(dp, numBeats) {
  let bestKey = null, bestScore = -Infinity;
  for (const [k, s] of dp[numBeats - 1]) {
    if (s.totalScore > bestScore) { bestScore = s.totalScore; bestKey = k; }
  }
  const result = [];
  let cur = bestKey;
  for (let b = numBeats - 1; b >= 0; b--) {
    const state = dp[b].get(cur);
    result.unshift({
      beat: b,
      chord: state.chord ? { root: state.chord.root, type: state.chord.type, score: state.chord.score, matched: state.chord.matched, nct: state.chord.nct } : null,
      totalScore: state.totalScore,
      chainLen: state.chainLen,
    });
    cur = state.prevKey ?? state.prevStateKey;
  }
  return result;
}

// ─── display ─────────────────────────────────────────────────────────────────

function display(label, result) {
  console.log(`\n  ${label}`);

  // Collapse consecutive same-chord beats into ranges
  const ranges = [];
  for (const r of result) {
    const name = r.chord ? chordName(r.chord.root, r.chord.type) : '—';
    const last = ranges[ranges.length - 1];
    if (last && last.name === name) {
      last.end = r.beat;
    } else {
      ranges.push({ start: r.beat, end: r.beat, name, score: r.chord?.score });
    }
  }

  const summary = ranges.map(r =>
    r.start === r.end
      ? `  beat ${r.start}: ${r.name}`
      : `  beats ${r.start}-${r.end}: ${r.name}`
  ).join('\n');
  console.log(summary);

  // One-line chord progression
  const progression = ranges.map(r => r.name).filter(n => n !== '—').join(' → ');
  console.log(`  Progression: ${progression}`);
  console.log(`  Final DP score: ${result[result.length - 1].totalScore.toFixed(3)}`);
}

// ─── run tests ───────────────────────────────────────────────────────────────

function runTest(pitchNames, duration, label) {
  const notes = makeNotes(pitchNames, duration);
  const segments = preprocessNotes(notes);
  const numBeats = Math.ceil(notes[notes.length - 1].onset + notes[notes.length - 1].duration);

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`${label}  (${pitchNames.join(' ')}, dur=${duration}, ${numBeats} beats)`);
  console.log('═'.repeat(70));

  const r1 = approach1_unconstrained(segments, numBeats);
  display('Approach 1 — unconstrained forward DP:', r1);

  const r2 = approach2_twoPass(segments, numBeats);
  display('Approach 2 — two-pass (unconstrained → constrained):', r2);

  const r3 = approach3_pathDependent(segments, numBeats);
  display('Approach 3 — single-pass path-dependent boundary:', r3);
}

console.log('Harmonic Analysis Lab');
console.log(`Decay rate: ${DECAY_RATE}, complexity penalty: ${COMPLEXITY_PENALTY}/level`);

const melody = ['C', 'E', 'G', 'B', 'A', 'F', 'A', 'C'];

runTest(melody, 1,    'QUARTER NOTES');
runTest(melody, 0.5,  'EIGHTH NOTES');
runTest(melody, 0.25, 'SIXTEENTH NOTES');
