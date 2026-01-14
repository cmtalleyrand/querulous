import React, { useState } from 'react';

// ============ DATA STRUCTURES ============

class ScaleDegree {
  constructor(degree, alteration = 0) {
    this.degree = degree;
    this.alteration = alteration;
  }
  toString() {
    const prefix = this.alteration === -1 ? '♭' : this.alteration === 1 ? '♯' : '';
    return `^${prefix}${this.degree}`;
  }
}

class NoteEvent {
  constructor(pitch, duration, onset, scaleDegree, abcNote = '') {
    this.pitch = pitch;
    this.duration = duration;
    this.onset = onset;
    this.scaleDegree = scaleDegree;
    this.abcNote = abcNote;
  }
}

class Interval {
  constructor(semitones) {
    this.semitones = ((semitones % 12) + 12) % 12;
    const intervalData = {
      0: { class: 1, quality: "perfect" }, 1: { class: 2, quality: "minor" }, 2: { class: 2, quality: "major" },
      3: { class: 3, quality: "minor" }, 4: { class: 3, quality: "major" }, 5: { class: 4, quality: "perfect" },
      6: { class: 4, quality: "augmented" }, 7: { class: 5, quality: "perfect" }, 8: { class: 6, quality: "minor" },
      9: { class: 6, quality: "major" }, 10: { class: 7, quality: "minor" }, 11: { class: 7, quality: "major" }
    };
    const data = intervalData[this.semitones];
    this.class = data.class;
    this.quality = data.quality;
  }
  isConsonant() {
    return [1, 3, 5, 6, 8].includes(this.class) && this.quality !== "augmented" && this.quality !== "diminished";
  }
  toString() {
    const names = {1: "unison", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th", 7: "7th", 8: "8ve"};
    const qualAbbr = {perfect: "P", major: "M", minor: "m", augmented: "A", diminished: "d"};
    return `${qualAbbr[this.quality]}${names[this.class]}`;
  }
}

class MelodicMotion {
  constructor(time, fromPitch, toPitch) {
    this.time = time;
    this.semitones = Math.abs(toPitch - fromPitch);
    this.direction = Math.sign(toPitch - fromPitch);
  }
}

class Simultaneity {
  constructor(onset, voice1Note, voice2Note, metricWeight) {
    this.onset = onset;
    this.voice1Note = voice1Note;
    this.voice2Note = voice2Note;
    this.interval = new Interval(Math.abs(voice1Note.pitch - voice2Note.pitch));
    this.metricWeight = metricWeight;
  }
}

// ============ BEAT FORMATTING ============

class BeatFormatter {
  constructor(defaultNoteLength = 1/8, meter = [4, 4]) {
    this.beatsPerMeasure = meter[0];
  }
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
  formatDuration(duration) {
    const w = this.beatsPerMeasure;
    if (Math.abs(duration - w) < 0.01) return 'whole';
    if (Math.abs(duration - w/2) < 0.01) return 'half';
    if (Math.abs(duration - w/4) < 0.01) return 'quarter';
    if (Math.abs(duration - w/8) < 0.01) return 'eighth';
    if (Math.abs(duration - w/16) < 0.01) return 'sixteenth';
    if (Math.abs(duration - w*3/8) < 0.01) return 'dotted quarter';
    return duration >= 1 ? `${duration.toFixed(1)} beats` : `${Math.round(duration * 100)}%`;
  }
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

// ============ ABC PARSING ============

const NOTE_TO_MIDI = { 'C': 60, 'D': 62, 'E': 64, 'F': 65, 'G': 67, 'A': 69, 'B': 71, 'c': 72, 'd': 74, 'e': 76, 'f': 77, 'g': 79, 'a': 81, 'b': 83 };

const KEY_SIGNATURES = {
  'C': [], 'G': ['F#'], 'D': ['F#', 'C#'], 'A': ['F#', 'C#', 'G#'], 'E': ['F#', 'C#', 'G#', 'D#'], 'B': ['F#', 'C#', 'G#', 'D#', 'A#'],
  'F#': ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'], 'Gb': ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'],
  'F': ['Bb'], 'Bb': ['Bb', 'Eb'], 'Eb': ['Bb', 'Eb', 'Ab'], 'Ab': ['Bb', 'Eb', 'Ab', 'Db'], 'Db': ['Bb', 'Eb', 'Ab', 'Db', 'Gb'],
  'Am': [], 'Em': ['F#'], 'Bm': ['F#', 'C#'], 'F#m': ['F#', 'C#', 'G#'], 'C#m': ['F#', 'C#', 'G#', 'D#'], 'G#m': ['F#', 'C#', 'G#', 'D#', 'A#'],
  'Dm': ['Bb'], 'Gm': ['Bb', 'Eb'], 'Cm': ['Bb', 'Eb', 'Ab'], 'Fm': ['Bb', 'Eb', 'Ab', 'Db'], 'Bbm': ['Bb', 'Eb', 'Ab', 'Db', 'Gb']
};

const MODE_INTERVALS = {
  major: { 0: 1, 2: 2, 4: 3, 5: 4, 7: 5, 9: 6, 11: 7 },
  natural_minor: { 0: 1, 2: 2, 3: 3, 5: 4, 7: 5, 8: 6, 10: 7 },
  harmonic_minor: { 0: 1, 2: 2, 3: 3, 5: 4, 7: 5, 8: 6, 11: 7 },
  dorian: { 0: 1, 2: 2, 3: 3, 5: 4, 7: 5, 9: 6, 10: 7 },
  phrygian: { 0: 1, 1: 2, 3: 3, 5: 4, 7: 5, 8: 6, 10: 7 },
  lydian: { 0: 1, 2: 2, 4: 3, 6: 4, 7: 5, 9: 6, 11: 7 },
  mixolydian: { 0: 1, 2: 2, 4: 3, 5: 4, 7: 5, 9: 6, 10: 7 }
};

function extractABCHeaders(abcText) {
  let key = null, mode = null, noteLength = null;
  for (const line of abcText.split('\n')) {
    const t = line.trim();
    if (t.startsWith('L:')) {
      const m = t.match(/L:\s*(\d+)\/(\d+)/);
      if (m) noteLength = parseInt(m[1]) / parseInt(m[2]);
    }
    if (t.startsWith('K:')) {
      const km = t.match(/K:\s*([A-Ga-g][#b]?)\s*(m|min|minor|dor|dorian|phr|phrygian|lyd|lydian|mix|mixolydian|harm|harmonic)?/i);
      if (km) {
        key = km[1].charAt(0).toUpperCase() + (km[1].slice(1) || '');
        if (km[2]) {
          const x = km[2].toLowerCase();
          if (x.startsWith('m') && !x.startsWith('mix')) mode = 'natural_minor';
          else if (x.startsWith('dor')) mode = 'dorian';
          else if (x.startsWith('phr')) mode = 'phrygian';
          else if (x.startsWith('lyd')) mode = 'lydian';
          else if (x.startsWith('mix')) mode = 'mixolydian';
          else if (x.startsWith('harm')) mode = 'harmonic_minor';
          else mode = 'major';
        }
      }
    }
  }
  return { key, mode, noteLength };
}

function computeScaleDegree(pitch, tonic, mode) {
  const interval = ((pitch - tonic) % 12 + 12) % 12;
  const mi = MODE_INTERVALS[mode] || MODE_INTERVALS.major;
  if (interval in mi) return new ScaleDegree(mi[interval], 0);
  const raised = ((interval - 1) % 12 + 12) % 12;
  if (raised in mi) return new ScaleDegree(mi[raised], 1);
  const lowered = (interval + 1) % 12;
  if (lowered in mi) return new ScaleDegree(mi[lowered], -1);
  return new ScaleDegree(1, 0);
}

function parseABC(abcText, tonic, mode, defaultNoteLengthOverride = null) {
  let noteText = '', defaultNoteLength = defaultNoteLengthOverride || 1/8, keySignature = [];
  for (const line of abcText.split('\n')) {
    const t = line.trim();
    if (t.startsWith('L:')) {
      const m = t.match(/L:\s*(\d+)\/(\d+)/);
      if (m && !defaultNoteLengthOverride) defaultNoteLength = parseInt(m[1]) / parseInt(m[2]);
    } else if (t.startsWith('K:')) {
      const km = t.match(/K:\s*([A-Ga-g][#b]?m?)/);
      if (km) keySignature = KEY_SIGNATURES[km[1]] || [];
    } else if (!t.startsWith('%') && !t.match(/^[A-Z]:/)) {
      noteText += ' ' + t;
    }
  }
  noteText = noteText.replace(/\|/g, ' ').replace(/\[.*?\]/g, ' ').replace(/"/g, ' ');
  const notes = [];
  let currentOnset = 0, activeAccidentals = {};
  const pat = /(\^{1,2}|_{1,2}|=)?([A-Ga-g])([,']*)([\d]*\/?[\d]*)?/g;
  let m;
  while ((m = pat.exec(noteText)) !== null) {
    const [, acc, letter, octMod, durStr] = m;
    let pitch = NOTE_TO_MIDI[letter];
    if (pitch === undefined) continue;
    for (const c of octMod || '') { if (c === "'") pitch += 12; if (c === ",") pitch -= 12; }
    const base = letter.toUpperCase();
    let accStr = '';
    if (acc) {
      if (acc.includes('^')) { pitch += acc.length; activeAccidentals[base] = acc.length; accStr = acc; }
      else if (acc.includes('_')) { pitch -= acc.length; activeAccidentals[base] = -acc.length; accStr = acc; }
      else if (acc === '=') { activeAccidentals[base] = 0; accStr = '='; }
    } else if (base in activeAccidentals) {
      pitch += activeAccidentals[base];
    } else {
      if (keySignature.includes(base + '#')) pitch += 1;
      if (keySignature.includes(base + 'b')) pitch -= 1;
    }
    let dur = defaultNoteLength;
    if (durStr) {
      if (durStr.includes('/')) {
        const p = durStr.split('/');
        dur = defaultNoteLength * (p[0] ? parseInt(p[0]) : 1) / (p[1] ? parseInt(p[1]) : 2);
      } else { dur = defaultNoteLength * parseInt(durStr); }
    }
    notes.push(new NoteEvent(pitch, dur * 4, currentOnset, computeScaleDegree(pitch, tonic, mode), accStr + letter + (octMod || '') + (durStr || '')));
    currentOnset += dur * 4;
  }
  return { notes, defaultNoteLength };
}

// ============ ABC GENERATION ============

function midiToABC(pitch, keySignature) {
  const noteNames = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  const isSharp = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  const octave = Math.floor(pitch / 12) - 5;
  const pc = pitch % 12;
  let name = noteNames[pc], acc = '';
  if (isSharp[pc]) { if (!keySignature.includes(name + '#')) acc = '^'; }
  else { if (keySignature.includes(name + '#') || keySignature.includes(name + 'b')) acc = '='; }
  let octMod = '';
  if (octave >= 1) { name = name.toLowerCase(); octMod = "'".repeat(octave - 1); }
  else if (octave <= -1) { octMod = ",".repeat(-octave); }
  return acc + name + octMod;
}

function generateAnswerABC(subject, keyInfo, answerData, defaultNoteLength, meter = [4, 4]) {
  const { tonic, keySignature, mode } = keyInfo;
  const { tonalMotions, mutationPoint } = answerData;
  const keyNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const flatNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const answerTonic = (tonic + 7) % 12;
  const useFlats = keySignature.some(k => k.includes('b'));
  const answerKey = useFlats ? flatNames[answerTonic] : keyNames[answerTonic];
  let modeSuffix = ['natural_minor', 'harmonic_minor'].includes(mode) ? 'm' : mode === 'dorian' ? ' dor' : '';
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const lNum = Math.round(defaultNoteLength * 100), g = gcd(lNum, 100);
  const measDur = meter[0] * (4 / meter[1]);
  const answerKeySig = KEY_SIGNATURES[answerKey + (['natural_minor', 'harmonic_minor', 'dorian'].includes(mode) ? 'm' : '')] || KEY_SIGNATURES[answerKey] || [];
  let tokens = [], measCount = 0;
  for (let i = 0; i < subject.length; i++) {
    const n = subject[i];
    let newPitch = n.pitch + 7;
    if (tonalMotions.length > 0 && mutationPoint !== null && i < mutationPoint) {
      const d = n.scaleDegree;
      if (d.degree === 1 && d.alteration === 0) newPitch = n.pitch + 7;
      else if (d.degree === 5 && d.alteration === 0) newPitch = n.pitch + 5;
    }
    const durMatch = n.abcNote.match(/[\d\/]+$/);
    const noteMeas = Math.floor(n.onset / measDur);
    if (noteMeas > measCount && tokens.length > 0) {
      while (measCount < noteMeas) { measCount++; tokens.push(measCount % 4 === 0 ? '|\n' : '|'); }
    }
    tokens.push(midiToABC(newPitch, answerKeySig) + (durMatch ? durMatch[0] : ''));
  }
  tokens.push('|]');
  let body = '', line = '';
  for (const t of tokens) {
    if (t === '|\n') { body += line + ' |\n'; line = ''; }
    else if (t === '|' || t === '|]') { line += ' ' + t; }
    else { line += (line && !line.endsWith('|') ? ' ' : '') + t; }
  }
  if (line.trim()) body += line;
  return `K:${answerKey}${modeSuffix}\nL:${lNum/g}/${100/g}\n${body.trim()}`;
}

function formatSubjectABC(subject, keyInfo, defaultNoteLength, meter = [4, 4]) {
  const { key, mode } = keyInfo;
  let modeSuffix = ['natural_minor', 'harmonic_minor'].includes(mode) ? 'm' : mode === 'dorian' ? ' dor' : '';
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const lNum = Math.round(defaultNoteLength * 100), g = gcd(lNum, 100);
  const measDur = meter[0] * (4 / meter[1]);
  let tokens = [], measCount = 0;
  for (const n of subject) {
    const noteMeas = Math.floor(n.onset / measDur);
    if (noteMeas > measCount && tokens.length > 0) {
      while (measCount < noteMeas) { measCount++; tokens.push(measCount % 4 === 0 ? '|\n' : '|'); }
    }
    tokens.push(n.abcNote);
  }
  tokens.push('|]');
  let body = '', line = '';
  for (const t of tokens) {
    if (t === '|\n') { body += line + ' |\n'; line = ''; }
    else if (t === '|' || t === '|]') { line += ' ' + t; }
    else { line += (line && !line.endsWith('|') ? ' ' : '') + t; }
  }
  if (line.trim()) body += line;
  return `K:${key}${modeSuffix}\nL:${lNum/g}/${100/g}\n${body.trim()}`;
}

// ============ ANALYSIS ============

function metricWeight(onset) {
  const b = onset % 4;
  if (Math.abs(b) < 0.01) return 1.0;
  if (Math.abs(b - 2) < 0.01) return 0.75;
  if (Math.abs(b - 1) < 0.01 || Math.abs(b - 3) < 0.01) return 0.5;
  return 0.25;
}

function findSimultaneities(v1, v2) {
  const sims = [];
  for (const n1 of v1) {
    const s1 = n1.onset, e1 = n1.onset + n1.duration;
    for (const n2 of v2) {
      const s2 = n2.onset, e2 = n2.onset + n2.duration;
      if (s1 < e2 && s2 < e1) {
        const start = Math.max(s1, s2);
        sims.push(new Simultaneity(start, n1, n2, metricWeight(start)));
      }
    }
  }
  return sims.sort((a, b) => a.onset - b.onset);
}

function pitchName(midi) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return names[midi % 12] + (Math.floor(midi / 12) - 1);
}

function checkParallelPerfects(sims, formatter) {
  // First, deduplicate: only keep one simultaneity per unique (v1Note, v2Note) pair
  const seen = new Set();
  const uniqueSims = [];
  for (const s of sims) {
    const key = `${s.voice1Note.onset}-${s.voice1Note.pitch}-${s.voice2Note.onset}-${s.voice2Note.pitch}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSims.push(s);
    }
  }
  
  // Sort by onset
  uniqueSims.sort((a, b) => a.onset - b.onset);
  
  // Now check for parallel motion between consecutive perfect intervals
  const violations = [];
  const checked = new Set();
  
  for (let i = 0; i < uniqueSims.length; i++) {
    const curr = uniqueSims[i];
    if (![5, 8].includes(curr.interval.class)) continue;
    
    // Find the next simultaneity where BOTH voices have moved
    for (let j = i + 1; j < uniqueSims.length; j++) {
      const next = uniqueSims[j];
      
      // Both voices must have moved to different notes
      const v1Moved = next.voice1Note !== curr.voice1Note;
      const v2Moved = next.voice2Note !== curr.voice2Note;
      if (!v1Moved || !v2Moved) continue;
      
      // Must be the same interval class (5th to 5th, or 8ve to 8ve)
      if (next.interval.class !== curr.interval.class) break;
      
      // Check direction
      const d1 = Math.sign(next.voice1Note.pitch - curr.voice1Note.pitch);
      const d2 = Math.sign(next.voice2Note.pitch - curr.voice2Note.pitch);
      
      // Parallel motion = same direction (both up or both down)
      if (d1 === d2 && d1 !== 0) {
        const checkKey = `${curr.voice1Note.pitch}-${curr.voice2Note.pitch}-${next.voice1Note.pitch}-${next.voice2Note.pitch}`;
        if (!checked.has(checkKey)) {
          checked.add(checkKey);
          const names = {5: '5ths', 8: '8ves'};
          const dir = d1 > 0 ? '↑' : '↓';
          violations.push({ 
            onset: curr.onset, 
            description: `Parallel ${names[curr.interval.class]}: ${pitchName(curr.voice1Note.pitch)}-${pitchName(curr.voice2Note.pitch)} ${dir} ${pitchName(next.voice1Note.pitch)}-${pitchName(next.voice2Note.pitch)} (${formatter.formatBeat(curr.onset)} to ${formatter.formatBeat(next.onset)})`
          });
        }
      }
      break; // Only check the immediate next motion
    }
  }
  return violations;
}

function testContourIndependence(subject, cs, formatter) {
  const sMotions = [], csMotions = [];
  for (let i = 1; i < subject.length; i++) sMotions.push(new MelodicMotion(subject[i].onset, subject[i-1].pitch, subject[i].pitch));
  for (let i = 1; i < cs.length; i++) csMotions.push(new MelodicMotion(cs[i].onset, cs[i-1].pitch, cs[i].pitch));
  
  let parallel = 0, similar = 0, contrary = 0, oblique = 0;
  const details = [];
  
  for (const sm of sMotions) {
    for (const cm of csMotions) {
      if (Math.abs(sm.time - cm.time) <= 0.25) {
        if (sm.direction === 0 || cm.direction === 0) {
          oblique++;
        } else if (sm.direction === cm.direction) {
          if (sm.semitones === cm.semitones) {
            parallel++;
            if (sm.semitones >= 5) details.push({ description: `Parallel leaps at ${formatter.formatBeat(sm.time)}` });
          } else {
            similar++;
          }
        } else {
          contrary++;
        }
        break;
      }
    }
  }
  
  const total = parallel + similar + contrary + oblique;
  const parallelRatio = total > 0 ? parallel / total : 0;
  const similarRatio = total > 0 ? similar / total : 0;
  const contraryRatio = total > 0 ? contrary / total : 0;
  const obliqueRatio = total > 0 ? oblique / total : 0;
  
  let assessment = 'Independent contours';
  if (total > 0 && (parallel + similar) / total > 0.6) assessment = 'Voices move together frequently—consider more contrary motion';
  else if (contraryRatio > 0.35) assessment = 'Good balance of motion types';
  
  return { parallelMotions: parallel, similarMotions: similar, contraryMotions: contrary, obliqueMotions: oblique, parallelRatio, similarRatio, contraryRatio, obliqueRatio, details, assessment };
}

function testHarmonicImplication(subject, tonic, mode, formatter) {
  if (!subject.length) return { error: 'No notes' };
  const degrees = subject.map(n => n.scaleDegree);
  const observations = [];
  const opening = degrees[0];
  const isTonicChordTone = [[1,0],[3,0],[5,0]].some(([d,a]) => opening.degree === d && opening.alteration === a);
  observations.push({ type: isTonicChordTone ? 'strength' : 'consideration', description: isTonicChordTone ? `Opens on ${opening}, a tonic chord tone` : `Opens on ${opening}, not a tonic chord tone` });
  const terminal = degrees[degrees.length - 1];
  const ti = {1:{q:'strong',d:'Ends on ^1—clean I→V'},2:{q:'good',d:'Ends on ^2—pre-dominant'},5:{q:'ambiguous',d:'Ends on ^5—V→V stasis'},7:{q:'strong',d:'Ends on ^7—dominant pull'},4:{q:'workable',d:'Ends on ^4'},3:{q:'workable',d:'Ends on ^3'}}[terminal.degree] || {q:'unusual',d:`Ends on ${terminal}`};
  observations.push({ type: ti.q === 'strong' ? 'strength' : ti.q === 'ambiguous' ? 'consideration' : 'info', description: ti.d });
  let domArr = null;
  const subLen = subject[subject.length - 1].onset + subject[subject.length - 1].duration;
  for (let i = 0; i < subject.length; i++) {
    const d = degrees[i];
    if ((d.degree === 5 && d.alteration === 0 && metricWeight(subject[i].onset) >= 0.5) || (d.degree === 7 && d.alteration === 0)) {
      domArr = { location: formatter.formatBeat(subject[i].onset), ratio: subject[i].onset / subLen, degree: d.toString() };
      break;
    }
  }
  if (domArr) {
    const timing = domArr.ratio < 0.3 ? 'Early' : domArr.ratio > 0.6 ? 'Late' : 'Mid-subject';
    observations.push({ type: 'info', description: `${timing} dominant arrival on ${domArr.degree} at ${domArr.location}` });
  }
  return { opening: { degree: opening.toString(), isTonicChordTone }, terminal: { degree: terminal.toString(), ...ti }, dominantArrival: domArr, observations };
}

function testRhythmicVariety(subject, formatter) {
  if (subject.length < 2) return { error: 'Too short' };
  const durs = subject.map(n => n.duration);
  const unique = [...new Set(durs.map(d => Math.round(d * 1000) / 1000))];
  const names = unique.map(d => formatter.formatDuration(d));
  const observations = [];
  if (unique.length === 1) observations.push({ type: 'consideration', description: `Uniform rhythm (all ${names[0]}s)` });
  else observations.push({ type: 'info', description: `${unique.length} note values: ${names.join(', ')}` });
  const hasLS = durs.some((d, i) => i > 0 && durs[i-1] >= d * 2);
  const hasSL = durs.some((d, i) => i > 0 && durs[i-1] <= d / 2);
  if (hasLS && hasSL) observations.push({ type: 'strength', description: 'Good rhythmic contrast' });
  return { uniqueDurations: unique.length, durationNames: names, observations };
}

function testRhythmicComplementarity(subject, cs) {
  if (!subject.length || !cs.length) return { error: 'Empty' };
  const sOnsets = new Set(subject.map(n => Math.round(n.onset * 100) / 100));
  const cOnsets = new Set(cs.map(n => Math.round(n.onset * 100) / 100));
  const shared = [...sOnsets].filter(o => cOnsets.has(o));
  const ratio = shared.length / Math.max(sOnsets.size, cOnsets.size);
  const observations = [];
  if (ratio > 0.8) observations.push({ type: 'consideration', description: `${Math.round(ratio * 100)}% attacks coincide—homorhythmic` });
  else if (ratio < 0.3) observations.push({ type: 'strength', description: `${Math.round(ratio * 100)}% overlap—good complementarity` });
  else observations.push({ type: 'info', description: `${Math.round(ratio * 100)}% attacks coincide` });
  let strong = 0;
  for (const o of shared) if (metricWeight(o) >= 0.75) strong++;
  return { overlapRatio: ratio, strongBeatCollisions: strong, observations };
}

function testStrettoViability(subject, formatter, minOverlap = 0.5, increment = 1, octaveDisp = 12) {
  if (subject.length < 2) return { error: 'Too short' };
  const subLen = subject[subject.length - 1].onset + subject[subject.length - 1].duration;
  const maxDist = subLen * (1 - minOverlap);
  const results = [];
  for (let dist = increment; dist <= maxDist; dist += increment) {
    const comes = subject.map(n => new NoteEvent(n.pitch + octaveDisp, n.duration, n.onset + dist, n.scaleDegree, n.abcNote));
    const sims = findSimultaneities(subject, comes);
    const issues = [];
    
    // Check parallel perfects
    for (const v of checkParallelPerfects(sims, formatter)) {
      issues.push({ onset: v.onset, description: v.description });
    }
    
    // Check strong-beat dissonances with pitch detail
    for (const sim of sims) {
      if (sim.metricWeight >= 0.75 && !sim.interval.isConsonant()) {
        issues.push({ 
          onset: sim.onset, 
          description: `${sim.interval} (${pitchName(sim.voice1Note.pitch)}-${pitchName(sim.voice2Note.pitch)}) on strong beat at ${formatter.formatBeat(sim.onset)}` 
        });
      }
    }
    
    results.push({ 
      distance: dist, 
      distanceFormatted: formatter.formatDistance(dist), 
      overlapPercent: Math.round((subLen - dist) / subLen * 100), 
      issueCount: issues.length, 
      issues, 
      viable: issues.length === 0 
    });
  }
  return { subjectLengthBeats: subLen, allResults: results, viableStrettos: results.filter(r => r.viable), problematicStrettos: results.filter(r => !r.viable) };
}

function testTonalAnswer(subject, mode, keyInfo, formatter) {
  if (!subject.length) return { error: 'Empty' };
  const degrees = subject.map(n => n.scaleDegree);
  const tonalMotions = [];
  let mutationPoint = null;
  const observations = [];
  for (let i = 0; i < degrees.length - 1; i++) {
    const c = degrees[i], n = degrees[i + 1];
    if (c.alteration !== 0 || n.alteration !== 0) continue;
    if (c.degree === 1 && n.degree === 5) {
      tonalMotions.push({ type: '1-5', description: `^1→^5 at ${formatter.formatBeat(subject[i].onset)} triggers tonal mutation` });
      mutationPoint = i + 1; break;
    }
    if (c.degree === 5 && n.degree === 1) {
      tonalMotions.push({ type: '5-1', description: `^5→^1 at ${formatter.formatBeat(subject[i].onset)} triggers tonal mutation` });
      mutationPoint = i + 1; break;
    }
    if (i === 0 && c.degree === 5) {
      tonalMotions.push({ type: 'initial-5', description: 'Begins on ^5; answer begins on ^1' });
      for (let j = 1; j < degrees.length; j++) {
        if (degrees[j].degree === 1 && degrees[j].alteration === 0 && metricWeight(subject[j].onset) >= 0.5) { mutationPoint = j; break; }
      }
      break;
    }
  }
  const answerType = tonalMotions.length > 0 ? 'tonal' : 'real';
  if (answerType === 'real') observations.push({ type: 'info', description: 'No ^1-^5 motion—real transposition (up 5th)' });
  else { for (const m of tonalMotions) observations.push({ type: 'info', description: m.description }); if (mutationPoint !== null) observations.push({ type: 'info', description: `Real transposition resumes at note ${mutationPoint + 1}` }); }
  const terminal = degrees[degrees.length - 1];
  const junc = {'1-0':{p:'I→V',q:'strong'},'2-0':{p:'ii→V',q:'good'},'5-0':{p:'V→V',q:'static'},'7-0':{p:'vii°→V',q:'strong'},'4-0':{p:'IV→V',q:'strong'},'3-0':{p:'I→V',q:'good'}}[`${terminal.degree}-${terminal.alteration}`] || {p:'?→V',q:'unusual'};
  observations.push({ type: junc.q === 'static' ? 'consideration' : 'info', description: `Junction: ${junc.p} (${junc.q})` });
  return { answerType, tonalMotions, mutationPoint, junction: junc, observations };
}

function testDoubleCounterpoint(subject, cs, formatter) {
  if (!subject.length || !cs.length) return { error: 'Empty' };
  
  const analyze = (sims, name) => {
    let thirds = 0, sixths = 0, perfects = 0, dissonant = 0;
    const strong = sims.filter(s => s.metricWeight >= 0.5);
    for (const s of strong) { 
      if (s.interval.class === 3) thirds++; 
      else if (s.interval.class === 6) sixths++; 
      else if ([1, 5, 8].includes(s.interval.class) && s.interval.quality === 'perfect') perfects++;
      else if (!s.interval.isConsonant()) dissonant++;
    }
    const issues = [];
    for (const v of checkParallelPerfects(sims, formatter)) issues.push({ ...v, config: name });
    for (const s of strong) {
      if (s.interval.class === 4 && s.voice2Note.pitch < s.voice1Note.pitch) {
        issues.push({ config: name, description: `4th against bass (${pitchName(s.voice1Note.pitch)}-${pitchName(s.voice2Note.pitch)}) at ${formatter.formatBeat(s.onset)}` });
      }
    }
    // Check for strong-beat dissonances
    for (const s of strong) {
      if (!s.interval.isConsonant() && s.metricWeight >= 0.75) {
        issues.push({ config: name, description: `${s.interval} on downbeat at ${formatter.formatBeat(s.onset)}` });
      }
    }
    return { issues, thirds, sixths, perfects, dissonant, imperfectRatio: strong.length > 0 ? (thirds + sixths) / strong.length : 0 };
  };
  
  const orig = analyze(findSimultaneities(subject, cs), 'CS above');
  const csInv = cs.map(n => new NoteEvent(n.pitch - 12, n.duration, n.onset, n.scaleDegree, n.abcNote));
  const inv = analyze(findSimultaneities(subject, csInv), 'CS below');
  const observations = [];
  
  observations.push({ type: 'info', description: `Original (CS above): ${orig.thirds} 3rds, ${orig.sixths} 6ths, ${orig.perfects} perfect consonances` });
  observations.push({ type: 'info', description: `Inverted (CS below): ${inv.thirds} 3rds, ${inv.sixths} 6ths, ${inv.perfects} perfect consonances` });
  
  for (const i of orig.issues) observations.push({ type: 'consideration', description: `Original: ${i.description}` });
  for (const i of inv.issues) observations.push({ type: 'consideration', description: `Inverted: ${i.description}` });
  
  if (!orig.issues.length && !inv.issues.length) {
    observations.push({ type: 'strength', description: 'Clean invertibility—no parallel perfects or problematic dissonances in either position' });
  }
  
  return { original: orig, inverted: inv, observations };
}

function testModulatoryRobustness(subject, cs, formatter) {
  if (!subject.length || !cs.length) return { error: 'Empty' };
  const answer = subject.map(n => new NoteEvent(n.pitch + 7, n.duration, n.onset, new ScaleDegree(((n.scaleDegree.degree + 4 - 1) % 7) + 1, n.scaleDegree.alteration), n.abcNote));
  const sims = findSimultaneities(answer, cs);
  const violations = checkParallelPerfects(sims, formatter);
  const observations = [];
  
  // Analyze interval profile against answer
  const strongSims = sims.filter(s => s.metricWeight >= 0.5);
  let consonant = 0, dissonant = 0, thirds = 0, sixths = 0, perfects = 0;
  for (const s of strongSims) {
    if (s.interval.isConsonant()) {
      consonant++;
      if (s.interval.class === 3) thirds++;
      else if (s.interval.class === 6) sixths++;
      else if ([1, 5, 8].includes(s.interval.class)) perfects++;
    } else {
      dissonant++;
    }
  }
  
  if (strongSims.length > 0) {
    const consPercent = Math.round(consonant / strongSims.length * 100);
    observations.push({ type: consPercent >= 80 ? 'strength' : consPercent >= 60 ? 'info' : 'consideration', 
      description: `Against answer: ${consPercent}% consonant on strong beats (${thirds} 3rds, ${sixths} 6ths, ${perfects} perfect)` });
  }
  
  if (violations.length) {
    for (const v of violations) observations.push({ type: 'consideration', description: v.description });
  } else {
    observations.push({ type: 'strength', description: 'No parallel 5ths or 8ves against answer' });
  }
  
  // Check for dissonances on strong beats
  const strongDissonances = strongSims.filter(s => !s.interval.isConsonant());
  if (strongDissonances.length > 0) {
    for (const s of strongDissonances.slice(0, 3)) { // Show first 3
      observations.push({ type: 'consideration', description: `Dissonance on strong beat: ${s.interval} at ${formatter.formatBeat(s.onset)}` });
    }
    if (strongDissonances.length > 3) {
      observations.push({ type: 'consideration', description: `...and ${strongDissonances.length - 3} more strong-beat dissonances` });
    }
  }
  
  return { violations, intervalProfile: { consonant, dissonant, thirds, sixths, perfects }, observations };
}

// ============ PIANO ROLL ============

const IntervalTimeline = ({ sims, title, maxTime }) => {
  if (!sims.length) return null;
  const w = 560, h = 50;
  const tScale = (w - 50) / maxTime;
  const tToX = t => 45 + t * tScale;
  
  // Color code: green = consonant, red = dissonant, darker on strong beats
  const getColor = (sim) => {
    const base = sim.interval.isConsonant() ? [100, 180, 100] : [200, 80, 80];
    const factor = sim.metricWeight >= 0.75 ? 1 : 0.6;
    return `rgb(${base.map(c => Math.round(c * factor)).join(',')})`;
  };
  
  return (
    <div style={{ marginTop: '8px' }}>
      {title && <div style={{ fontSize: '11px', color: '#546e7a', marginBottom: '3px' }}>{title}</div>}
      <svg width={w} height={h} style={{ backgroundColor: '#fafafa', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
        {/* Beat lines */}
        {Array.from({ length: Math.ceil(maxTime) + 1 }, (_, i) => (
          <line key={i} x1={tToX(i)} y1={5} x2={tToX(i)} y2={h - 5} stroke={i % 4 === 0 ? '#bdbdbd' : '#eee'} strokeWidth={i % 4 === 0 ? 1 : 0.5} />
        ))}
        {/* Interval blocks */}
        {sims.map((s, i) => {
          const x = tToX(s.onset);
          const nextOnset = i < sims.length - 1 ? sims[i + 1].onset : maxTime;
          const width = Math.max(4, (nextOnset - s.onset) * tScale - 1);
          return (
            <g key={i}>
              <rect x={x} y={10} width={width} height={30} fill={getColor(s)} rx={2} opacity={0.8} />
              <text x={x + width/2} y={29} fontSize="9" fill="white" textAnchor="middle" fontWeight="500">
                {s.interval.class === 1 ? 'U' : s.interval.class === 8 ? '8' : s.interval.class}
              </text>
            </g>
          );
        })}
        {/* Legend */}
        <rect x={w - 80} y={5} width={12} height={12} fill="rgb(100,180,100)" rx={2} />
        <text x={w - 65} y={14} fontSize="8" fill="#546e7a">cons.</text>
        <rect x={w - 80} y={20} width={12} height={12} fill="rgb(200,80,80)" rx={2} />
        <text x={w - 65} y={29} fontSize="8" fill="#546e7a">diss.</text>
      </svg>
    </div>
  );
};

const PianoRoll = ({ voices, title }) => {
  const all = voices.flatMap(v => v.notes);
  if (!all.length) return null;
  const minP = Math.min(...all.map(n => n.pitch)) - 2, maxP = Math.max(...all.map(n => n.pitch)) + 2;
  const maxT = Math.max(...all.map(n => n.onset + n.duration));
  const pRange = maxP - minP, nH = Math.max(8, Math.min(16, 200 / pRange));
  const h = pRange * nH + 44, w = 560, tScale = (w - 52) / maxT;
  const pToY = p => h - 20 - (p - minP) * nH, tToX = t => 46 + t * tScale;
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const labels = [];
  for (let p = minP; p <= maxP; p++) if (p % 12 === 0 || p === minP || p === maxP) labels.push({ p, l: `${noteNames[((p % 12) + 12) % 12]}${Math.floor(p / 12) - 1}` });
  return (
    <div style={{ marginTop: '8px' }}>
      {title && <div style={{ fontSize: '12px', color: '#546e7a', marginBottom: '4px' }}>{title}</div>}
      <svg width={w} height={h} style={{ backgroundColor: '#fafafa', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
        {Array.from({ length: Math.ceil(maxT) + 1 }, (_, i) => <line key={i} x1={tToX(i)} y1={14} x2={tToX(i)} y2={h - 20} stroke={i % 4 === 0 ? '#bdbdbd' : '#eee'} strokeWidth={i % 4 === 0 ? 1 : 0.5} />)}
        {labels.map((l, i) => <g key={i}><line x1={46} y1={pToY(l.p)} x2={w - 6} y2={pToY(l.p)} stroke="#eee" strokeWidth={0.5} /><text x={42} y={pToY(l.p) + 3} fontSize="8" fill="#9e9e9e" textAnchor="end">{l.l}</text></g>)}
        {voices.map((v, vi) => v.notes.map((n, ni) => <rect key={`${vi}-${ni}`} x={tToX(n.onset)} y={pToY(n.pitch) - nH/2 + 1} width={Math.max(2, n.duration * tScale - 1)} height={nH - 2} fill={v.color} rx={2} opacity={v.opacity || 1} />))}
        <g transform={`translate(${w - 120}, 6)`}>{voices.map((v, i) => <g key={i} transform={`translate(0, ${i * 14})`}><rect x={0} y={0} width={10} height={10} fill={v.color} rx={2} opacity={v.opacity || 1} /><text x={14} y={8} fontSize="9" fill="#546e7a">{v.label}</text></g>)}</g>
      </svg>
    </div>
  );
};

const StrettoViz = ({ subject, distance, issues, formatter, octaveDisp }) => {
  if (!subject?.length) return null;
  const subEnd = subject[subject.length - 1].onset + subject[subject.length - 1].duration;
  const dux = subject, comes = subject.map(n => ({ ...n, pitch: n.pitch + octaveDisp, onset: n.onset + distance }));
  const all = [...dux, ...comes];
  const minP = Math.min(...all.map(n => n.pitch)) - 2, maxP = Math.max(...all.map(n => n.pitch)) + 2;
  const pRange = maxP - minP, nH = Math.max(7, Math.min(12, 140 / pRange));
  const h = pRange * nH + 40, w = 480, tScale = (w - 40) / (subEnd + distance);
  const pToY = p => h - 18 - (p - minP) * nH, tToX = t => 36 + t * tScale;
  return (
    <svg width={w} height={h} style={{ backgroundColor: issues.length ? '#fff8e1' : '#e8f5e9', borderRadius: '4px', border: `1px solid ${issues.length ? '#ffe082' : '#a5d6a7'}` }}>
      {Array.from({ length: Math.ceil(subEnd + distance) + 1 }, (_, i) => <line key={i} x1={tToX(i)} y1={10} x2={tToX(i)} y2={h - 18} stroke={i % 4 === 0 ? '#bdbdbd' : '#e0e0e0'} strokeWidth={i % 4 === 0 ? 1 : 0.5} />)}
      {dux.map((n, i) => <rect key={`d${i}`} x={tToX(n.onset)} y={pToY(n.pitch) - nH/2 + 1} width={Math.max(2, n.duration * tScale - 1)} height={nH - 2} fill="#5c6bc0" rx={2} />)}
      {comes.map((n, i) => <rect key={`c${i}`} x={tToX(n.onset)} y={pToY(n.pitch) - nH/2 + 1} width={Math.max(2, n.duration * tScale - 1)} height={nH - 2} fill="#ef5350" rx={2} opacity={0.85} />)}
      {issues.map((is, i) => <g key={i}><circle cx={tToX(is.onset || 0)} cy={7} r={5} fill="#ff5722" /><text x={tToX(is.onset || 0)} y={10} fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">!</text></g>)}
      <text x={tToX(0)} y={h - 5} fontSize="9" fill="#5c6bc0" fontWeight="500">Dux</text>
      <text x={tToX(distance)} y={h - 5} fontSize="9" fill="#ef5350" fontWeight="500">Comes (+{formatter.formatDistance(distance)})</text>
    </svg>
  );
};

// ============ UI ============

const Obs = ({ o }) => {
  const s = { strength: { bg: '#e8f5e9', b: '#66bb6a', t: '#2e7d32', i: '✓' }, consideration: { bg: '#fff3e0', b: '#ffb74d', t: '#e65100', i: '⚠' }, info: { bg: '#e3f2fd', b: '#64b5f6', t: '#1565c0', i: 'ℹ' } }[o.type] || { bg: '#e3f2fd', b: '#64b5f6', t: '#1565c0', i: 'ℹ' };
  return <div style={{ padding: '8px 12px', backgroundColor: s.bg, borderLeft: `3px solid ${s.b}`, marginBottom: '6px', borderRadius: '0 4px 4px 0', display: 'flex', gap: '8px' }}><span>{s.i}</span><span style={{ color: s.t, fontSize: '13px' }}>{o.description}</span></div>;
};

const Section = ({ title, children }) => (
  <div style={{ marginBottom: '18px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
    <div style={{ padding: '11px 14px', backgroundColor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}><h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#37474f' }}>{title}</h3></div>
    <div style={{ padding: '12px 14px' }}>{children}</div>
  </div>
);

const ABCBox = ({ abc, label }) => (
  <div>
    <div style={{ fontSize: '11px', color: '#757575', marginBottom: '2px' }}>{label}</div>
    <pre style={{ fontFamily: 'monospace', fontSize: '11px', padding: '8px', backgroundColor: '#fafafa', borderRadius: '4px', border: '1px solid #e0e0e0', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{abc}</pre>
  </div>
);

const DataRow = ({ data }) => <div style={{ marginBottom: '8px' }}>{Object.entries(data).map(([k, v]) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}><span style={{ color: '#757575' }}>{k}</span><span style={{ color: '#212121', fontWeight: '500' }}>{v}</span></div>)}</div>;

const Select = ({ label, value, onChange, options, style }) => (
  <div style={style}>
    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#546e7a', marginBottom: '5px' }}>{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', backgroundColor: '#fff' }}>
      {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

// ============ MAIN ============

export default function FugueAnalyzer() {
  const [subjectInput, setSubjectInput] = useState(`D2 A2 F E | D C _B, A, | G, A, _B, C | D4`);
  const [csInput, setCsInput] = useState(`F2 E D | C D E F | G F E D | C4`);
  const [answerInput, setAnswerInput] = useState('');
  const [selKey, setSelKey] = useState('D');
  const [selMode, setSelMode] = useState('natural_minor');
  const [selNoteLen, setSelNoteLen] = useState('1/8');
  const [strettoStep, setStrettoStep] = useState('1');
  const [strettoOctave, setStrettoOctave] = useState('12');
  const [selectedStretto, setSelectedStretto] = useState(null);
  const [csPos, setCsPos] = useState('above');
  const [csShift, setCsShift] = useState('0');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const keys = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'].map(k => ({ v: k, l: k }));
  const modes = [{ v: 'major', l: 'Major' }, { v: 'natural_minor', l: 'Minor' }, { v: 'harmonic_minor', l: 'Harmonic Minor' }, { v: 'dorian', l: 'Dorian' }, { v: 'phrygian', l: 'Phrygian' }, { v: 'lydian', l: 'Lydian' }, { v: 'mixolydian', l: 'Mixolydian' }];
  const noteLens = [{ v: '1/4', l: '1/4' }, { v: '1/8', l: '1/8' }, { v: '1/16', l: '1/16' }];
  const strettoSteps = [{ v: '1', l: '1 beat' }, { v: '2', l: '2 beats' }, { v: '0.5', l: '½ beat' }];
  const octaves = [{ v: '0', l: 'Unison' }, { v: '12', l: '+1 octave' }, { v: '-12', l: '-1 octave' }, { v: '24', l: '+2 octaves' }, { v: '-24', l: '-2 octaves' }];
  const csPositions = [{ v: 'above', l: 'Above' }, { v: 'below', l: 'Below' }];

  const analyze = () => {
    try {
      setError(null); setSelectedStretto(null);
      const h = extractABCHeaders(subjectInput);
      const effKey = h.key || selKey, effMode = h.mode || selMode;
      const effNL = h.noteLength || parseFloat(selNoteLen.split('/')[0]) / parseFloat(selNoteLen.split('/')[1]);
      const keyBase = effKey.replace('#', '').replace('b', '');
      let tonic = NOTE_TO_MIDI[keyBase] || 60;
      if (effKey.includes('#')) tonic += 1; if (effKey.includes('b')) tonic -= 1;
      let keyForSig = effKey; if (['natural_minor', 'harmonic_minor'].includes(effMode)) keyForSig = keyBase + 'm';
      const keySig = KEY_SIGNATURES[keyForSig] || KEY_SIGNATURES[keyBase] || [];
      const keyInfo = { key: effKey, tonic, mode: effMode, keySignature: keySig };
      const meter = [4, 4];
      const subjectParsed = parseABC(subjectInput, tonic, effMode, effNL);
      const subject = subjectParsed.notes;
      if (!subject.length) { setError('No notes parsed'); return; }
      const formatter = new BeatFormatter(effNL, meter);
      const cs = csInput.trim() ? parseABC(csInput, tonic, effMode, effNL).notes : null;
      let answerNotes = answerInput.trim() ? parseABC(answerInput, tonic, effMode, effNL).notes : null;
      const res = { keyInfo, formatter, subject, countersubject: cs, defaultNoteLength: effNL, meter, parsedInfo: { key: effKey, mode: effMode, defaultNoteLength: effNL, subjectNotes: subject.length, csNotes: cs?.length || 0 } };
      res.harmonicImplication = testHarmonicImplication(subject, tonic, effMode, formatter);
      res.rhythmicVariety = testRhythmicVariety(subject, formatter);
      res.stretto = testStrettoViability(subject, formatter, 0.5, parseFloat(strettoStep), parseInt(strettoOctave));
      res.tonalAnswer = testTonalAnswer(subject, effMode, keyInfo, formatter);
      res.answerABC = generateAnswerABC(subject, keyInfo, res.tonalAnswer, effNL, meter);
      res.subjectABC = formatSubjectABC(subject, keyInfo, effNL, meter);
      if (!answerNotes) answerNotes = subject.map(n => new NoteEvent(n.pitch + 7, n.duration, n.onset, new ScaleDegree(((n.scaleDegree.degree + 4 - 1) % 7) + 1, n.scaleDegree.alteration), n.abcNote));
      res.answerNotes = answerNotes;
      if (cs?.length) {
        res.doubleCounterpoint = testDoubleCounterpoint(subject, cs, formatter);
        res.rhythmicComplementarity = testRhythmicComplementarity(subject, cs);
        res.contourIndependence = testContourIndependence(subject, cs, formatter);
        res.modulatoryRobustness = testModulatoryRobustness(subject, cs, formatter);
        // Store simultaneities for interval visualization
        res.subjectCsSims = findSimultaneities(subject, cs);
        res.answerCsSims = findSimultaneities(answerNotes, cs);
      }
      setResults(res);
    } catch (e) { setError(`Error: ${e.message}`); }
  };

  const csOctaveShift = (csPos === 'below' ? -12 : 0) + parseInt(csShift);
  const strettoOctaveVal = parseInt(strettoOctave);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f3ee', fontFamily: 'Georgia, serif' }}>
      <header style={{ background: 'linear-gradient(135deg, #2c3e50, #34495e)', color: '#f8f6f1', padding: '18px 24px', borderBottom: '3px solid #c9a227' }}>
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          <h1 style={{ margin: 0, fontSize: '21px', fontWeight: '600' }}>Fugue Subject Analyzer</h1>
          <p style={{ margin: '3px 0 0', opacity: 0.8, fontSize: '12px' }}>Assess contrapuntal viability</p>
        </div>
      </header>
      
      <main style={{ maxWidth: '880px', margin: '0 auto', padding: '18px 24px' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e0e0e0', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
            <Select label="Key" value={selKey} onChange={setSelKey} options={keys} />
            <Select label="Mode" value={selMode} onChange={setSelMode} options={modes} />
            <Select label="Note Length (L:)" value={selNoteLen} onChange={setSelNoteLen} options={noteLens} />
            <Select label="Stretto Step" value={strettoStep} onChange={setStrettoStep} options={strettoSteps} />
          </div>
          <p style={{ fontSize: '10px', color: '#888', margin: '10px 0 0' }}>K: and L: in ABC override these settings</p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#2c3e50', fontSize: '12px' }}>Subject</label>
            <textarea value={subjectInput} onChange={e => setSubjectInput(e.target.value)} style={{ width: '100%', height: '90px', padding: '9px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#2c3e50', fontSize: '12px' }}>Countersubject</label>
            <textarea value={csInput} onChange={e => setCsInput(e.target.value)} style={{ width: '100%', height: '90px', padding: '9px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} placeholder="Optional" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#2c3e50', fontSize: '12px' }}>Answer (auto if empty)</label>
            <textarea value={answerInput} onChange={e => setAnswerInput(e.target.value)} style={{ width: '100%', height: '90px', padding: '9px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} placeholder="Leave empty" />
          </div>
        </div>
        
        <button onClick={analyze} style={{ width: '100%', padding: '11px', backgroundColor: '#c9a227', color: '#2c3e50', border: 'none', borderRadius: '5px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Analyze</button>
        
        {error && <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#ffebee', borderLeft: '3px solid #e53935', color: '#c62828', borderRadius: '0 4px 4px 0' }}>{error}</div>}
        
        {results && (
          <div style={{ marginTop: '18px' }}>
            <div style={{ padding: '10px 14px', backgroundColor: '#fff', borderRadius: '6px', marginBottom: '16px', border: '1px solid #e0e0e0', fontSize: '13px', color: '#546e7a' }}>
              Key: <strong style={{ color: '#2c3e50' }}>{results.parsedInfo.key} {results.parsedInfo.mode.replace('_', ' ')}</strong> · Subject: <strong style={{ color: '#2c3e50' }}>{results.parsedInfo.subjectNotes} notes</strong> · L: <strong style={{ color: '#2c3e50' }}>1/{Math.round(1/results.parsedInfo.defaultNoteLength)}</strong>
              {results.parsedInfo.csNotes > 0 && <> · CS: <strong style={{ color: '#2c3e50' }}>{results.parsedInfo.csNotes} notes</strong></>}
            </div>

            <Section title="Subject">
              <PianoRoll voices={[{ notes: results.subject, color: '#5c6bc0', label: 'Subject' }]} />
            </Section>

            {results.countersubject && (
              <>
                <Section title="Countersubject + Answer">
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: '#546e7a', marginBottom: '4px' }}>CS Position</label>
                      <select value={csPos} onChange={e => setCsPos(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}>
                        {csPositions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: '#546e7a', marginBottom: '4px' }}>Octave Shift</label>
                      <select value={csShift} onChange={e => setCsShift(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}>
                        {octaves.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </div>
                  </div>
                  <PianoRoll voices={[
                    { notes: results.answerNotes, color: '#ffb74d', label: 'Answer' },
                    { notes: results.countersubject.map(n => ({ ...n, pitch: n.pitch + csOctaveShift })), color: '#81c784', label: 'CS', opacity: 0.85 }
                  ]} title="Answer with Countersubject" />
                  {results.answerCsSims && (
                    <IntervalTimeline 
                      sims={results.answerCsSims} 
                      title="Interval profile (Answer + CS)" 
                      maxTime={Math.max(...results.answerNotes.map(n => n.onset + n.duration), ...results.countersubject.map(n => n.onset + n.duration))} 
                    />
                  )}
                </Section>

                <Section title="Subject + Countersubject">
                  <PianoRoll voices={[
                    { notes: results.subject, color: '#5c6bc0', label: 'Subject' },
                    { notes: results.countersubject.map(n => ({ ...n, pitch: n.pitch + csOctaveShift })), color: '#81c784', label: 'CS', opacity: 0.85 }
                  ]} title="Subject with Countersubject" />
                  {results.subjectCsSims && (
                    <IntervalTimeline 
                      sims={results.subjectCsSims} 
                      title="Interval profile (Subject + CS)" 
                      maxTime={Math.max(...results.subject.map(n => n.onset + n.duration), ...results.countersubject.map(n => n.onset + n.duration))} 
                    />
                  )}
                </Section>
              </>
            )}

            <Section title="Harmonic Implication">
              <DataRow data={{ 'Opening': `${results.harmonicImplication.opening.degree} ${results.harmonicImplication.opening.isTonicChordTone ? '(tonic)' : ''}`, 'Terminal': results.harmonicImplication.terminal.degree, 'Dominant arrival': results.harmonicImplication.dominantArrival ? `${results.harmonicImplication.dominantArrival.degree} at ${results.harmonicImplication.dominantArrival.location}` : 'None' }} />
              {results.harmonicImplication.observations.map((o, i) => <Obs key={i} o={o} />)}
            </Section>

            <Section title="Tonal Answer">
              <DataRow data={{ 'Type': results.tonalAnswer.answerType, 'Mutation': results.tonalAnswer.mutationPoint !== null ? `Note ${results.tonalAnswer.mutationPoint + 1}` : 'N/A', 'Junction': `${results.tonalAnswer.junction.p} (${results.tonalAnswer.junction.q})` }} />
              {results.tonalAnswer.observations.map((o, i) => <Obs key={i} o={o} />)}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <ABCBox abc={results.subjectABC} label="Subject:" />
                <ABCBox abc={results.answerABC} label="Generated Answer:" />
              </div>
            </Section>

            <Section title="Stretto Viability">
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#546e7a', marginBottom: '4px' }}>Octave Displacement</label>
                  <select value={strettoOctave} onChange={e => { setStrettoOctave(e.target.value); setSelectedStretto(null); }} style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}>
                    {octaves.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
                <span style={{ fontSize: '12px', color: '#757575', paddingBottom: '8px' }}>Testing at {strettoStep}-beat intervals</span>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#37474f', marginBottom: '6px' }}>Select distance:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {results.stretto.allResults.map((s, i) => (
                    <button key={i} onClick={() => setSelectedStretto(s.distance)} style={{ padding: '5px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', border: '1px solid', backgroundColor: selectedStretto === s.distance ? '#37474f' : s.viable ? '#e8f5e9' : '#fff3e0', borderColor: selectedStretto === s.distance ? '#37474f' : s.viable ? '#a5d6a7' : '#ffcc80', color: selectedStretto === s.distance ? 'white' : s.viable ? '#2e7d32' : '#e65100' }}>
                      {s.distanceFormatted} {s.viable ? '✓' : `(${s.issueCount})`}
                    </button>
                  ))}
                </div>
              </div>
              {selectedStretto !== null && (() => {
                const s = results.stretto.allResults.find(r => r.distance === selectedStretto);
                if (!s) return null;
                return (
                  <div style={{ padding: '12px', backgroundColor: '#fafafa', borderRadius: '5px', border: '1px solid #e0e0e0' }}>
                    <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: s.viable ? '#2e7d32' : '#e65100' }}>{s.distanceFormatted} — {s.overlapPercent}% overlap — {s.viable ? 'Clean' : `${s.issueCount} issue${s.issueCount > 1 ? 's' : ''}`}</div>
                    <StrettoViz subject={results.subject} distance={s.distance} issues={s.issues} formatter={results.formatter} octaveDisp={strettoOctaveVal} />
                    {s.issues.length > 0 && <div style={{ marginTop: '8px' }}>{s.issues.map((is, j) => <div key={j} style={{ fontSize: '12px', color: '#bf360c', marginTop: '3px', paddingLeft: '7px', borderLeft: '2px solid #ffcc80' }}>{is.description}</div>)}</div>}
                  </div>
                );
              })()}
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#546e7a' }}><strong>Summary:</strong> {results.stretto.viableStrettos.length} clean, {results.stretto.problematicStrettos.length} with issues</div>
            </Section>

            <Section title="Rhythmic Profile">
              <DataRow data={{ 'Note values': results.rhythmicVariety.uniqueDurations, 'Used': results.rhythmicVariety.durationNames?.join(', ') || 'N/A' }} />
              {results.rhythmicVariety.observations.map((o, i) => <Obs key={i} o={o} />)}
            </Section>

            {results.countersubject && (
              <>
                <h2 style={{ fontSize: '15px', color: '#2c3e50', borderBottom: '2px solid #81c784', paddingBottom: '5px', marginBottom: '14px', marginTop: '22px' }}>Countersubject Analysis</h2>
                
                <Section title="Double Counterpoint">
                  <DataRow data={{ 
                    'Original (CS above)': `${results.doubleCounterpoint.original.thirds} 3rds, ${results.doubleCounterpoint.original.sixths} 6ths, ${results.doubleCounterpoint.original.perfects} perfect`,
                    'Inverted (CS below)': `${results.doubleCounterpoint.inverted.thirds} 3rds, ${results.doubleCounterpoint.inverted.sixths} 6ths, ${results.doubleCounterpoint.inverted.perfects} perfect`
                  }} />
                  {results.doubleCounterpoint.observations.map((o, i) => <Obs key={i} o={o} />)}
                </Section>
                
                <Section title="Rhythmic Complementarity">
                  <DataRow data={{ 'Overlap': `${Math.round(results.rhythmicComplementarity.overlapRatio * 100)}%`, 'Strong beat collisions': results.rhythmicComplementarity.strongBeatCollisions }} />
                  {results.rhythmicComplementarity.observations.map((o, i) => <Obs key={i} o={o} />)}
                </Section>
                
                <Section title="Contour Independence">
                  <DataRow data={{
                    'Parallel': `${results.contourIndependence.parallelMotions} (${Math.round(results.contourIndependence.parallelRatio * 100)}%)`,
                    'Similar': `${results.contourIndependence.similarMotions} (${Math.round(results.contourIndependence.similarRatio * 100)}%)`,
                    'Contrary': `${results.contourIndependence.contraryMotions} (${Math.round(results.contourIndependence.contraryRatio * 100)}%)`,
                    'Oblique': `${results.contourIndependence.obliqueMotions} (${Math.round(results.contourIndependence.obliqueRatio * 100)}%)`
                  }} />
                  <Obs o={{ type: 'info', description: results.contourIndependence.assessment }} />
                  {results.contourIndependence.details.map((d, i) => <Obs key={i} o={{ type: 'consideration', description: d.description }} />)}
                </Section>
                
                <Section title="Modulatory Robustness">
                  <p style={{ fontSize: '12px', color: '#546e7a', marginBottom: '8px' }}>How well does the countersubject work against the answer?</p>
                  {results.modulatoryRobustness.intervalProfile && (
                    <DataRow data={{
                      'Consonant on strong beats': `${results.modulatoryRobustness.intervalProfile.consonant} (${results.modulatoryRobustness.intervalProfile.thirds} 3rds, ${results.modulatoryRobustness.intervalProfile.sixths} 6ths, ${results.modulatoryRobustness.intervalProfile.perfects} perfect)`,
                      'Dissonant on strong beats': results.modulatoryRobustness.intervalProfile.dissonant
                    }} />
                  )}
                  {results.modulatoryRobustness.observations.map((o, i) => <Obs key={i} o={o} />)}
                </Section>
              </>
            )}
          </div>
        )}
      </main>
      <footer style={{ textAlign: 'center', padding: '12px', color: '#9e9e9e', fontSize: '10px', borderTop: '1px solid #e0e0e0', marginTop: '24px' }}>Fugue Analysis Tool</footer>
    </div>
  );
}
