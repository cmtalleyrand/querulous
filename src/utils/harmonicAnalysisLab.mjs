/**
 * Standalone harmonic analysis lab.
 *
 * Four approaches to chord-sequence DP:
 *   A) Bidirectional lookback — each beat sees past AND future notes (future decayed)
 *   B) Forward + backward DP — run DP both directions, combine
 *   C) Two-pass — unconstrained DP then constrained DP using pass-1 assignments
 *   D) Single-pass path-dependent — boundary carried in DP state
 *
 * Usage:  node src/utils/harmonicAnalysisLab.mjs
 */

// ─── constants ───────────────────────────────────────────────────────────────

const DECAY_RATE = 0.3;
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

function cn(root, type) { return NOTE_NAMES[root] + (TYPE_SHORT[type] ?? type); }
function pcName(pc) { return NOTE_NAMES[((pc % 12) + 12) % 12]; }

// ─── metric weight (4/4 only) ────────────────────────────────────────────────

function metricMult(onset) {
  const pos = ((onset % 4) + 4) % 4;
  if (pos < 0.01) return 1.2;                             // downbeat
  if (Math.abs(pos - 2) < 0.01) return 1.0;               // beat 3
  if (Math.abs(pos - 1) < 0.01 || Math.abs(pos - 3) < 0.01) return 0.75; // beats 2,4
  if (Math.abs(pos % 0.5) < 0.01) return 0.5;             // eighth
  return 0.4;                                               // sixteenth
}

// ─── note construction ───────────────────────────────────────────────────────

function makeNotes(pitchNames, duration) {
  const map = { C:60, D:62, E:64, F:65, G:67, A:69, B:71 };
  let onset = 0;
  return pitchNames.map(name => {
    const n = { pitch: map[name], onset, duration };
    onset += duration;
    return n;
  });
}

function approachMult(interval) {
  if (interval === null) return 1.0;
  const a = Math.abs(interval);
  if (a === 0) return 1.0;       // sustained segment
  if (a <= 2) return 0.8;
  if (a <= 4) return 1.0;
  if (a === 5 || a === 7 || a === 12) return 1.2;
  return 1.0;
}

/** Split notes at beat boundaries. Segments inherit approach from source. */
function preprocessNotes(notes) {
  const segments = [];
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const prev = i > 0 ? notes[i - 1] : null;
    const app = approachMult(prev ? note.pitch - prev.pitch : null);
    const end = note.onset + note.duration;
    for (let b = Math.floor(note.onset); b < end; b++) {
      const s = Math.max(note.onset, b);
      const e = Math.min(end, b + 1);
      if (e <= s) continue;
      segments.push({ pitch: note.pitch, pitchClass: note.pitch % 12, onset: s, duration: e - s, approach: app });
    }
  }
  return segments;
}

// ─── salience ────────────────────────────────────────────────────────────────

function salience(seg, decay) {
  const raw = (seg.duration - PASSING_NOTE_THRESHOLD) * metricMult(seg.onset) * seg.approach;
  return Math.max(raw, MIN_SALIENCE) * decay;
}

/** Collect notes audible at beat b. Past only (standard). */
function collectPast(segments, beat) {
  const out = [];
  for (const seg of segments) {
    const sb = Math.floor(seg.onset);
    if (sb > beat) break;
    const dist = beat - sb;
    const d = Math.max(1.0 - dist * DECAY_RATE, 0);
    if (d <= 0) continue;
    out.push({ pitchClass: seg.pitchClass, pitch: seg.pitch, salience: salience(seg, d), onset: seg.onset, decay: d });
  }
  return out;
}

/** Collect notes audible at beat b. Past AND future (for approach A). */
function collectBidirectional(segments, beat) {
  const out = [];
  for (const seg of segments) {
    const sb = Math.floor(seg.onset);
    const dist = Math.abs(beat - sb);
    const d = Math.max(1.0 - dist * DECAY_RATE, 0);
    if (d <= 0) continue;
    out.push({ pitchClass: seg.pitchClass, pitch: seg.pitch, salience: salience(seg, d), onset: seg.onset, decay: d });
  }
  return out;
}

// ─── chord scoring ───────────────────────────────────────────────────────────

function memberWeight(interval) {
  const n = ((interval % 12) + 12) % 12;
  if (n === 0) return 1.1;
  if (n === 3 || n === 4) return 1.0;
  if (n === 7 || n === 10 || n === 11) return 0.8;
  return 0.6;
}

/**
 * Score chord (root, type) against a note set.
 * Returns null if required intervals missing or < 2 notes.
 */
function scoreChord(root, typeName, notes) {
  const def = CHORD_TYPES[typeName];
  const pcs = new Set(notes.map(n => n.pitchClass));
  for (const req of def.required) { if (!pcs.has((root + req) % 12)) return null; }
  if (notes.length < 2) return null;

  let matchedSal = 0, nctPen = 0;
  const matched = [], nct = [];
  let lowestPitch = Infinity, lowestInterval = null;
  for (const n of notes) {
    if (n.pitch < lowestPitch) { lowestPitch = n.pitch; lowestInterval = ((n.pitchClass - root) + 12) % 12; }
  }
  for (const n of notes) {
    const iv = ((n.pitchClass - root) + 12) % 12;
    if (def.intervals.includes(iv)) {
      const w = memberWeight(iv);
      matchedSal += n.salience * w;
      matched.push({ onset: n.onset, pc: n.pitchClass, sal: n.salience, w, contrib: n.salience * w });
    } else {
      const p = Math.max(n.salience - NON_CHORD_TONE_FLOOR, 0);
      nctPen += p;
      nct.push({ onset: n.onset, pc: n.pitchClass, sal: n.salience, pen: p });
    }
  }
  let bassMult = 1.0;
  if (lowestInterval === 0) bassMult = 1.1;
  else if (lowestInterval === 7) bassMult = 0.9;
  else if (lowestInterval === 10 || lowestInterval === 11) bassMult = 0.8;

  const score = (matchedSal - nctPen) * bassMult;
  return { score, matched, nct, matchedSal, nctPen, bassMult, complexity: def.complexity };
}

function findCandidates(notes) {
  const pcs = new Set(notes.map(n => n.pitchClass));
  const cands = [];
  for (let root = 0; root < 12; root++) {
    if (!pcs.has(root)) continue;
    for (const [t] of Object.entries(CHORD_TYPES)) {
      const r = scoreChord(root, t, notes);
      if (r) cands.push({ root, type: t, ...r });
    }
  }
  cands.sort((a, b) => b.score - a.score);
  return cands;
}

// ─── standard forward DP (used by multiple approaches) ──────────────────────

/**
 * Forward Viterbi DP over per-beat candidate lists.
 * beatData[b] = array of {key, root, type, score, complexity, matched, nct}
 * Returns dp table: dp[b] = Map<key, {total, prev, chord, chain}>
 */
function forwardDP(beatData) {
  const n = beatData.length;
  const dp = Array.from({ length: n }, () => new Map());

  for (let b = 0; b < n; b++) {
    const cands = beatData[b];

    if (b === 0) {
      dp[0].set('null', { total: 0, prev: null, chord: null, chain: 0 });
      for (const c of cands) {
        dp[0].set(c.key, {
          total: c.score - c.complexity * COMPLEXITY_PENALTY,
          prev: null, chord: c, chain: 1,
        });
      }
      continue;
    }

    // null option: best predecessor
    let bestNullTotal = -Infinity, bestNullPrev = null;
    for (const [pk, ps] of dp[b - 1]) {
      if (ps.total > bestNullTotal) { bestNullTotal = ps.total; bestNullPrev = pk; }
    }
    dp[b].set('null', { total: bestNullTotal, prev: bestNullPrev, chord: null, chain: 0 });

    // each candidate: try each predecessor, keep best
    for (const c of cands) {
      let bestTotal = -Infinity, bestPrev = null, bestChain = 1;
      for (const [pk, ps] of dp[b - 1]) {
        const same = ps.chord && ps.chord.root === c.root && ps.chord.type === c.type;
        const chain = same ? ps.chain + 1 : 1;
        const t = ps.total + c.score - c.complexity * COMPLEXITY_PENALTY;
        if (t > bestTotal) { bestTotal = t; bestPrev = pk; bestChain = chain; }
      }
      const existing = dp[b].get(c.key);
      if (!existing || bestTotal > existing.total) {
        dp[b].set(c.key, { total: bestTotal, prev: bestPrev, chord: c, chain: bestChain });
      }
    }
  }
  return dp;
}

/** Backtrack a DP table to get the best path. */
function backtrack(dp) {
  const n = dp.length;
  let bestKey = null, bestTotal = -Infinity;
  for (const [k, s] of dp[n - 1]) { if (s.total > bestTotal) { bestTotal = s.total; bestKey = k; } }
  const path = [];
  let cur = bestKey;
  for (let b = n - 1; b >= 0; b--) {
    const s = dp[b].get(cur);
    path.unshift({ beat: b, key: cur, chord: s.chord, total: s.total, chain: s.chain });
    cur = s.prev;
  }
  return path;
}

/** Backward DP: same logic but iterating from last beat to first. */
function backwardDP(beatData) {
  const n = beatData.length;
  const dp = Array.from({ length: n }, () => new Map());

  for (let b = n - 1; b >= 0; b--) {
    const cands = beatData[b];

    if (b === n - 1) {
      dp[b].set('null', { total: 0, next: null, chord: null, chain: 0 });
      for (const c of cands) {
        dp[b].set(c.key, {
          total: c.score - c.complexity * COMPLEXITY_PENALTY,
          next: null, chord: c, chain: 1,
        });
      }
      continue;
    }

    let bestNullTotal = -Infinity, bestNullNext = null;
    for (const [nk, ns] of dp[b + 1]) {
      if (ns.total > bestNullTotal) { bestNullTotal = ns.total; bestNullNext = nk; }
    }
    dp[b].set('null', { total: bestNullTotal, next: bestNullNext, chord: null, chain: 0 });

    for (const c of cands) {
      let bestTotal = -Infinity, bestNext = null, bestChain = 1;
      for (const [nk, ns] of dp[b + 1]) {
        const same = ns.chord && ns.chord.root === c.root && ns.chord.type === c.type;
        const chain = same ? ns.chain + 1 : 1;
        const t = ns.total + c.score - c.complexity * COMPLEXITY_PENALTY;
        if (t > bestTotal) { bestTotal = t; bestNext = nk; bestChain = chain; }
      }
      const existing = dp[b].get(c.key);
      if (!existing || bestTotal > existing.total) {
        dp[b].set(c.key, { total: bestTotal, next: bestNext, chord: c, chain: bestChain });
      }
    }
  }
  return dp;
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPROACH A : Bidirectional lookback
//
// At each beat, collect notes from BOTH past and future, future decayed by
// forward distance. Then run standard forward DP over these richer collections.
// The DP itself is unchanged; only the note collection per beat is wider.
// ═══════════════════════════════════════════════════════════════════════════════

function approachA(segments, numBeats) {
  const beatData = [];
  for (let b = 0; b < numBeats; b++) {
    const notes = collectBidirectional(segments, b);
    const cands = findCandidates(notes);
    beatData.push(cands.map(c => ({ key: `${c.root}-${c.type}`, ...c })));
  }
  const dp = forwardDP(beatData);
  return { dp, path: backtrack(dp), beatData };
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPROACH B : Forward + Backward DP
//
// Run forward DP (past-only notes) and backward DP (past-only notes) separately.
// For each beat, combine: for each chord, the best combined score is
//   max over all forward paths ending at (beat, chord) + backward paths starting
//   at (beat, chord) — minus the chord's own score (counted in both).
// This lets the forward pass "know" the future indirectly.
// ═══════════════════════════════════════════════════════════════════════════════

function approachB(segments, numBeats) {
  const beatData = [];
  for (let b = 0; b < numBeats; b++) {
    const notes = collectPast(segments, b);
    const cands = findCandidates(notes);
    beatData.push(cands.map(c => ({ key: `${c.root}-${c.type}`, ...c })));
  }

  const fwd = forwardDP(beatData);
  const bwd = backwardDP(beatData);

  // Combine: at each beat, pick the chord that maximises fwd[b][chord].total + bwd[b][chord].total - chordScore
  // (chordScore is counted in both, so subtract once)
  const path = [];
  for (let b = 0; b < numBeats; b++) {
    let bestKey = 'null', bestCombined = -Infinity, bestChord = null;
    const fwdMap = fwd[b];
    const bwdMap = bwd[b];

    for (const [key, fs] of fwdMap) {
      const bs = bwdMap.get(key);
      if (!bs) continue;
      const chordScore = fs.chord ? fs.chord.score - fs.chord.complexity * COMPLEXITY_PENALTY : 0;
      const combined = fs.total + bs.total - chordScore;
      if (combined > bestCombined) {
        bestCombined = combined;
        bestKey = key;
        bestChord = fs.chord;
      }
    }
    path.push({ beat: b, key: bestKey, chord: bestChord, total: bestCombined, fwdTotal: fwdMap.get(bestKey)?.total, bwdTotal: bwdMap.get(bestKey)?.total });
  }

  return { fwd, bwd, path, beatData };
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPROACH C : Two-pass
//
// Pass 1: Standard unconstrained forward DP (past-only notes).
// This gives one best path — the initial chord assignments.
//
// Pass 2: Re-run DP. At each beat M, for each candidate chord D, filter notes:
//
//   From pass 1's best path, collect every note that was MATCHED by a chord
//   that is DIFFERENT from D, on beats before M.  The latest onset among those
//   matched notes is the BOUNDARY.
//
//   A lookback note is available for chord D at beat M only if:
//     Rule A: pass 1 assigned chord D to the note's beat (same harmony), OR
//     Rule B: the note's onset >= boundary
//
//   Unavailable notes are invisible — zero contribution, zero penalty.
//
// The DP in pass 2 is standard Viterbi over the filtered candidate lists.
// It considers all paths, not just pass 1's path — pass 1 only determines
// the note filtering.
// ═══════════════════════════════════════════════════════════════════════════════

function approachC(segments, numBeats) {
  // Pass 1: unconstrained
  const p1BeatData = [];
  for (let b = 0; b < numBeats; b++) {
    const notes = collectPast(segments, b);
    const cands = findCandidates(notes);
    p1BeatData.push(cands.map(c => ({ key: `${c.root}-${c.type}`, ...c })));
  }
  const p1dp = forwardDP(p1BeatData);
  const p1path = backtrack(p1dp);

  // Build: for each beat in pass 1's best path, which note onsets were matched
  const p1info = p1path.map(p => {
    if (!p.chord) return { chordKey: 'null', matchedOnsets: [] };
    return {
      chordKey: p.key,
      matchedOnsets: p.chord.matched.map(m => m.onset),
    };
  });

  // Pass 2: filtered DP
  const p2BeatData = [];
  for (let b = 0; b < numBeats; b++) {
    const allNotes = collectPast(segments, b);

    // For each candidate chord D, compute boundary and filter notes
    const pcs = new Set(allNotes.map(n => n.pitchClass));
    const cands = [];

    for (let root = 0; root < 12; root++) {
      if (!pcs.has(root)) continue;
      for (const [typeName] of Object.entries(CHORD_TYPES)) {
        const candKey = `${root}-${typeName}`;

        // Boundary: max onset among notes matched by pass-1 chords ≠ D, on beats < b
        let boundary = -Infinity;
        for (let pb = 0; pb < b; pb++) {
          if (p1info[pb].chordKey === candKey || p1info[pb].chordKey === 'null') continue;
          for (const onset of p1info[pb].matchedOnsets) {
            if (onset > boundary) boundary = onset;
          }
        }

        // Filter
        const filtered = allNotes.filter(n => {
          // Rule A: note's beat was assigned chord D in pass 1
          const noteBeat = Math.floor(n.onset);
          if (noteBeat < p1info.length && p1info[noteBeat].chordKey === candKey) return true;
          // Rule B: onset >= boundary
          if (n.onset >= boundary) return true;
          return false;
        });

        const result = scoreChord(root, typeName, filtered);
        if (result) cands.push({ key: candKey, root, type: typeName, ...result });
      }
    }
    cands.sort((a, b) => b.score - a.score);
    p2BeatData.push(cands);
  }

  const p2dp = forwardDP(p2BeatData);
  return { p1path, p1dp, p2dp, path: backtrack(p2dp), p1BeatData, p2BeatData };
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPROACH D : Single-pass path-dependent boundary
//
// The DP state is (chordKey, boundary) where boundary is the max onset of
// notes matched by the current chord.  When the DP transitions to a DIFFERENT
// chord at the next beat, only notes with onset >= boundary are available.
// Same chord (rule A): all notes available.
//
// This is the exact version of approach C — every live path carries its own
// boundary, so different paths through the same beat can have different
// available note sets and therefore different candidate scores.
//
// State space: O(beats × chords × distinct_boundaries).
// ═══════════════════════════════════════════════════════════════════════════════

function approachD(segments, numBeats) {
  // dp[b] = Map<stateKey, {total, prevSK, chord, chain, boundary}>
  // stateKey = `${chordKey}|${boundary}`
  const dp = Array.from({ length: numBeats }, () => new Map());

  for (let b = 0; b < numBeats; b++) {
    const allNotes = collectPast(segments, b);

    if (b === 0) {
      dp[0].set('null|-Inf', { total: 0, prevSK: null, chord: null, chain: 0, boundary: -Infinity });
      const cands = findCandidates(allNotes);
      for (const c of cands) {
        const bnd = c.matched.length > 0 ? Math.max(...c.matched.map(m => m.onset)) : -Infinity;
        const sk = `${c.root}-${c.type}|${bnd}`;
        const t = c.score - c.complexity * COMPLEXITY_PENALTY;
        const ex = dp[0].get(sk);
        if (!ex || t > ex.total) {
          dp[0].set(sk, { total: t, prevSK: null, chord: c, chain: 1, boundary: bnd });
        }
      }
      continue;
    }

    const updates = new Map();

    for (const [prevSK, prevState] of dp[b - 1]) {
      const prevChord = prevState.chord;
      const prevBoundary = prevState.boundary;
      const prevCK = prevChord ? `${prevChord.root}-${prevChord.type}` : 'null';

      // Option: null
      {
        const sk = `null|${prevBoundary}`;
        const ex = updates.get(sk);
        if (!ex || prevState.total > ex.total) {
          updates.set(sk, { total: prevState.total, prevSK, chord: null, chain: 0, boundary: prevBoundary });
        }
      }

      // Option: each chord
      const pcsAll = new Set(allNotes.map(n => n.pitchClass));
      for (let root = 0; root < 12; root++) {
        if (!pcsAll.has(root)) continue;
        for (const [typeName] of Object.entries(CHORD_TYPES)) {
          const candCK = `${root}-${typeName}`;
          const same = (candCK === prevCK);

          const filtered = same
            ? allNotes
            : allNotes.filter(n => n.onset >= prevBoundary);

          const result = scoreChord(root, typeName, filtered);
          if (!result) continue;

          const chain = same ? prevState.chain + 1 : 1;
          const t = prevState.total + result.score - result.complexity * COMPLEXITY_PENALTY;
          const bnd = result.matched.length > 0 ? Math.max(...result.matched.map(m => m.onset)) : prevBoundary;
          const sk = `${candCK}|${bnd}`;

          const ex = updates.get(sk);
          if (!ex || t > ex.total) {
            updates.set(sk, { total: t, prevSK, chord: { key: candCK, root, type: typeName, ...result }, chain, boundary: bnd });
          }
        }
      }
    }

    dp[b] = updates;
  }

  // Backtrack
  const n = numBeats;
  let bestSK = null, bestTotal = -Infinity;
  for (const [sk, s] of dp[n - 1]) { if (s.total > bestTotal) { bestTotal = s.total; bestSK = sk; } }
  const path = [];
  let cur = bestSK;
  for (let b = n - 1; b >= 0; b--) {
    const s = dp[b].get(cur);
    path.unshift({ beat: b, key: s.chord ? `${s.chord.root}-${s.chord.type}` : 'null', chord: s.chord, total: s.total, chain: s.chain, boundary: s.boundary });
    cur = s.prevSK;
  }

  return { dp, path };
}

// ─── display ─────────────────────────────────────────────────────────────────

function showBeatDetail(label, dp, beat, top = 4) {
  const map = dp[beat];
  const entries = [...map.entries()]
    .filter(([k, s]) => k !== 'null' && !k.startsWith('null'))
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, top);

  if (entries.length === 0) {
    console.log(`    beat ${beat}: (no candidates)`);
    return;
  }

  const nullEntry = [...map.entries()].find(([k]) => k === 'null' || k.startsWith('null|'));
  const nullTotal = nullEntry ? nullEntry[1].total : -Infinity;

  const lines = entries.map(([k, s]) => {
    const name = s.chord ? cn(s.chord.root, s.chord.type) : '—';
    const local = s.chord ? s.chord.score.toFixed(3) : '0';
    const cplx = s.chord ? `cplx=${s.chord.complexity}` : '';
    const nctInfo = s.chord && s.chord.nct.length > 0
      ? ` nct=[${s.chord.nct.map(n => `${pcName(n.pc)}:${n.pen.toFixed(3)}`).join(',')}]`
      : '';
    const matchInfo = s.chord
      ? ` match=[${s.chord.matched.map(m => `${pcName(m.pc)}@${m.onset}:${m.contrib.toFixed(3)}`).join(',')}]`
      : '';
    const bndInfo = s.boundary !== undefined ? ` bnd=${s.boundary}` : '';
    return `      ${name.padEnd(8)} total=${s.total.toFixed(3)}  local=${local}  ${cplx}${nctInfo}${matchInfo}${bndInfo}`;
  });

  console.log(`    beat ${beat}: (null total=${nullTotal.toFixed(3)})`);
  for (const l of lines) console.log(l);
}

function showResult(label, result, dp, beatData) {
  console.log(`\n  ${label}`);

  // Show per-beat detail
  for (let b = 0; b < dp.length; b++) {
    showBeatDetail(label, dp, b);
  }

  // Progression
  const ranges = [];
  for (const r of result) {
    const name = r.chord ? cn(r.chord.root, r.chord.type) : '—';
    const last = ranges[ranges.length - 1];
    if (last && last.name === name) { last.end = r.beat; }
    else { ranges.push({ start: r.beat, end: r.beat, name }); }
  }
  const prog = ranges.map(r => r.name).filter(n => n !== '—').join(' → ');
  console.log(`\n  RESULT: ${prog}  (total=${result[result.length - 1].total.toFixed(3)})`);
}

// ─── run ─────────────────────────────────────────────────────────────────────

function runTest(pitchNames, duration, label) {
  const notes = makeNotes(pitchNames, duration);
  const segments = preprocessNotes(notes);
  const numBeats = Math.ceil(notes[notes.length - 1].onset + notes[notes.length - 1].duration);

  console.log(`\n${'═'.repeat(78)}`);
  console.log(`  ${label}  (${pitchNames.join(' ')}, dur=${duration}, ${numBeats} beats)`);
  console.log('═'.repeat(78));

  // Show note layout
  console.log('\n  Notes per beat:');
  for (let b = 0; b < numBeats; b++) {
    const past = collectPast(segments, b);
    const desc = past.map(n => `${pcName(n.pitchClass)}@${n.onset}(${n.salience.toFixed(3)})`).join('  ');
    console.log(`    beat ${b}: ${desc}`);
  }

  const a = approachA(segments, numBeats);
  showResult('A — Bidirectional lookback', a.path, a.dp, a.beatData);

  const bRes = approachB(segments, numBeats);
  // For approach B, show the combined path with fwd/bwd totals
  console.log(`\n  B — Forward + Backward DP`);
  for (const p of bRes.path) {
    const name = p.chord ? cn(p.chord.root, p.chord.type) : '—';
    console.log(`    beat ${p.beat}: ${name.padEnd(8)} combined=${p.total?.toFixed(3)}  fwd=${p.fwdTotal?.toFixed(3)}  bwd=${p.bwdTotal?.toFixed(3)}`);
  }
  const bRanges = [];
  for (const r of bRes.path) {
    const name = r.chord ? cn(r.chord.root, r.chord.type) : '—';
    const last = bRanges[bRanges.length - 1];
    if (last && last.name === name) { last.end = r.beat; }
    else { bRanges.push({ start: r.beat, end: r.beat, name }); }
  }
  console.log(`\n  RESULT: ${bRanges.map(r => r.name).filter(n => n !== '—').join(' → ')}`);

  const c = approachC(segments, numBeats);
  console.log(`\n  C — Two-pass`);
  console.log(`    Pass 1: ${c.p1path.map(p => p.chord ? cn(p.chord.root, p.chord.type) : '—').join(' | ')}`);
  showResult('    Pass 2 (constrained):', c.path, c.p2dp, c.p2BeatData);

  const d = approachD(segments, numBeats);
  showResult('D — Path-dependent boundary', d.path, d.dp);
}

console.log('Harmonic Analysis Lab');
console.log(`Decay=${DECAY_RATE}, complexity_penalty=${COMPLEXITY_PENALTY}/level\n`);

const melody = ['C', 'E', 'G', 'B', 'A', 'F', 'A', 'C'];

runTest(melody, 1,    'QUARTER NOTES');
runTest(melody, 0.5,  'EIGHTH NOTES');
runTest(melody, 0.25, 'SIXTEENTH NOTES');
