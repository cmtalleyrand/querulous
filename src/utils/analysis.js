import { NoteEvent, Simultaneity, ScaleDegree } from '../types';
import { metricWeight, pitchName, isDuringRest } from './formatter';
import { scoreDissonance, analyzeAllDissonances } from './dissonanceScoring';
import { analyzeHarmonicImplication as analyzeChords } from './harmonicAnalysis';
import { ANALYSIS_THRESHOLDS, getAdjustedThresholds } from './constants';
import { classifyMotion } from './motionClassification';

/**
 * Classify a dissonance according to species counterpoint practice
 * Returns: 'suspension', 'passing', 'neighbor', 'anticipation', 'appoggiatura', or 'unprepared'
 */
export function classifyDissonance(sim, allSims, v1Notes, v2Notes, formatter) {
  if (sim.interval.isConsonant()) return { type: 'consonant', label: null };

  const currentOnset = sim.onset;
  const v1Note = sim.voice1Note;
  const v2Note = sim.voice2Note;

  // Find the previous and next simultaneities
  const prevSims = allSims.filter(s => s.onset < currentOnset);
  const nextSims = allSims.filter(s => s.onset > currentOnset);
  const prevSim = prevSims.length > 0 ? prevSims[prevSims.length - 1] : null;
  const nextSim = nextSims.length > 0 ? nextSims[0] : null;

  // Find melodic context for each voice
  const v1Idx = v1Notes.findIndex(n => n === v1Note);
  const v2Idx = v2Notes.findIndex(n => n === v2Note);

  const v1Prev = v1Idx > 0 ? v1Notes[v1Idx - 1] : null;
  const v1Next = v1Idx < v1Notes.length - 1 ? v1Notes[v1Idx + 1] : null;
  const v2Prev = v2Idx > 0 ? v2Notes[v2Idx - 1] : null;
  const v2Next = v2Idx < v2Notes.length - 1 ? v2Notes[v2Idx + 1] : null;

  // Helper: check if interval is a step (1 or 2 semitones)
  const isStep = (a, b) => Math.abs(a - b) <= 2;

  // Check for SUSPENSION in voice 1 (dissonant note held from previous consonance, resolves down)
  if (v1Prev && prevSim && prevSim.interval.isConsonant()) {
    // Same pitch as previous (preparation)
    if (v1Note.pitch === v1Prev.pitch) {
      // Check resolution: next note steps down
      if (v1Next && v1Next.pitch < v1Note.pitch && isStep(v1Note.pitch, v1Next.pitch)) {
        return {
          type: 'suspension',
          label: `${sim.interval.class}-${sim.interval.class - 1} sus`,
          voice: 1,
          description: `Suspension: ${pitchName(v1Note.pitch)} prepared, resolves to ${pitchName(v1Next.pitch)}`,
        };
      }
    }
  }

  // Check for SUSPENSION in voice 2
  if (v2Prev && prevSim && prevSim.interval.isConsonant()) {
    if (v2Note.pitch === v2Prev.pitch) {
      if (v2Next && v2Next.pitch < v2Note.pitch && isStep(v2Note.pitch, v2Next.pitch)) {
        return {
          type: 'suspension',
          label: `${sim.interval.class}-${sim.interval.class - 1} sus`,
          voice: 2,
          description: `Suspension: ${pitchName(v2Note.pitch)} prepared, resolves to ${pitchName(v2Next.pitch)}`,
        };
      }
    }
  }

  // Check for PASSING TONE in voice 1 (stepwise through, weak beat)
  if (v1Prev && v1Next && sim.metricWeight < 0.75) {
    const dir1 = v1Note.pitch - v1Prev.pitch;
    const dir2 = v1Next.pitch - v1Note.pitch;
    // Same direction, both steps
    if (Math.sign(dir1) === Math.sign(dir2) && dir1 !== 0 && isStep(v1Prev.pitch, v1Note.pitch) && isStep(v1Note.pitch, v1Next.pitch)) {
      return {
        type: 'passing',
        label: 'PT',
        voice: 1,
        description: `Passing tone: ${pitchName(v1Note.pitch)} connects ${pitchName(v1Prev.pitch)} to ${pitchName(v1Next.pitch)}`,
      };
    }
  }

  // Check for PASSING TONE in voice 2
  if (v2Prev && v2Next && sim.metricWeight < 0.75) {
    const dir1 = v2Note.pitch - v2Prev.pitch;
    const dir2 = v2Next.pitch - v2Note.pitch;
    if (Math.sign(dir1) === Math.sign(dir2) && dir1 !== 0 && isStep(v2Prev.pitch, v2Note.pitch) && isStep(v2Note.pitch, v2Next.pitch)) {
      return {
        type: 'passing',
        label: 'PT',
        voice: 2,
        description: `Passing tone: ${pitchName(v2Note.pitch)} connects ${pitchName(v2Prev.pitch)} to ${pitchName(v2Next.pitch)}`,
      };
    }
  }

  // Check for NEIGHBOR TONE in voice 1 (step away and back)
  if (v1Prev && v1Next && sim.metricWeight < 0.75) {
    if (v1Prev.pitch === v1Next.pitch && isStep(v1Prev.pitch, v1Note.pitch)) {
      return {
        type: 'neighbor',
        label: 'N',
        voice: 1,
        description: `Neighbor tone: ${pitchName(v1Note.pitch)} decorates ${pitchName(v1Prev.pitch)}`,
      };
    }
  }

  // Check for NEIGHBOR TONE in voice 2
  if (v2Prev && v2Next && sim.metricWeight < 0.75) {
    if (v2Prev.pitch === v2Next.pitch && isStep(v2Prev.pitch, v2Note.pitch)) {
      return {
        type: 'neighbor',
        label: 'N',
        voice: 2,
        description: `Neighbor tone: ${pitchName(v2Note.pitch)} decorates ${pitchName(v2Prev.pitch)}`,
      };
    }
  }

  // Check for ANTICIPATION in voice 1 (arrives early, same as next consonance)
  if (v1Next && nextSim && nextSim.interval.isConsonant()) {
    if (v1Note.pitch === v1Next.pitch && sim.metricWeight < 0.5) {
      return {
        type: 'anticipation',
        label: 'Ant',
        voice: 1,
        description: `Anticipation: ${pitchName(v1Note.pitch)} arrives early`,
      };
    }
  }

  // Check for ANTICIPATION in voice 2
  if (v2Next && nextSim && nextSim.interval.isConsonant()) {
    if (v2Note.pitch === v2Next.pitch && sim.metricWeight < 0.5) {
      return {
        type: 'anticipation',
        label: 'Ant',
        voice: 2,
        description: `Anticipation: ${pitchName(v2Note.pitch)} arrives early`,
      };
    }
  }

  // Check for APPOGGIATURA in voice 1 (leap to dissonance on strong beat, resolves by step)
  if (v1Prev && v1Next && sim.metricWeight >= 0.5) {
    const approach = Math.abs(v1Note.pitch - v1Prev.pitch);
    if (approach > 2 && isStep(v1Note.pitch, v1Next.pitch)) {
      return {
        type: 'appoggiatura',
        label: 'App',
        voice: 1,
        description: `Appoggiatura: leap to ${pitchName(v1Note.pitch)}, resolves to ${pitchName(v1Next.pitch)}`,
      };
    }
  }

  // Check for APPOGGIATURA in voice 2
  if (v2Prev && v2Next && sim.metricWeight >= 0.5) {
    const approach = Math.abs(v2Note.pitch - v2Prev.pitch);
    if (approach > 2 && isStep(v2Note.pitch, v2Next.pitch)) {
      return {
        type: 'appoggiatura',
        label: 'App',
        voice: 2,
        description: `Appoggiatura: leap to ${pitchName(v2Note.pitch)}, resolves to ${pitchName(v2Next.pitch)}`,
      };
    }
  }

  // Unprepared/unresolved dissonance
  return {
    type: 'unprepared',
    label: '!',
    description: `Unprepared dissonance: ${sim.interval} at ${formatter.formatBeat(currentOnset)}`,
  };
}

/**
 * Analyze all dissonances in a set of simultaneities
 */
export function analyzeDissonances(sims, v1Notes, v2Notes, formatter) {
  const results = {
    suspensions: [],
    passingTones: [],
    neighborTones: [],
    anticipations: [],
    appoggiaturas: [],
    unprepared: [],
    summary: {},
  };

  for (const sim of sims) {
    if (!sim.interval.isConsonant()) {
      const classification = classifyDissonance(sim, sims, v1Notes, v2Notes, formatter);
      const entry = {
        onset: sim.onset,
        interval: sim.interval.toString(),
        pitches: `${pitchName(sim.voice1Note.pitch)}-${pitchName(sim.voice2Note.pitch)}`,
        metricWeight: sim.metricWeight,
        ...classification,
      };

      switch (classification.type) {
        case 'suspension':
          results.suspensions.push(entry);
          break;
        case 'passing':
          results.passingTones.push(entry);
          break;
        case 'neighbor':
          results.neighborTones.push(entry);
          break;
        case 'anticipation':
          results.anticipations.push(entry);
          break;
        case 'appoggiatura':
          results.appoggiaturas.push(entry);
          break;
        default:
          results.unprepared.push(entry);
      }
    }
  }

  const total = results.suspensions.length + results.passingTones.length +
    results.neighborTones.length + results.anticipations.length +
    results.appoggiaturas.length + results.unprepared.length;

  results.summary = {
    total,
    prepared: total - results.unprepared.length,
    unpreparedCount: results.unprepared.length,
    preparedRatio: total > 0 ? (total - results.unprepared.length) / total : 1,
  };

  return results;
}

/**
 * Find all simultaneous note pairs between two voices
 *
 * IMPORTANT: This only creates simultaneities when actual notes overlap.
 * Rests in one voice do NOT create simultaneities - they are silence.
 * If v1 has notes A (0-1) and B (2-3), and v2 has note C (0-3),
 * we get simultaneities at A-C and B-C, but NOT during 1-2 (rest in v1).
 *
 * @param {NoteEvent[]} v1 - First voice notes
 * @param {NoteEvent[]} v2 - Second voice notes
 * @param {number[]} meter - Time signature [numerator, denominator]
 */
export function findSimultaneities(v1, v2, meter) {
  if (!meter || !Array.isArray(meter) || meter.length < 2) {
    throw new Error(`findSimultaneities: meter is invalid (${JSON.stringify(meter)}). Caller must pass valid [numerator, denominator] array.`);
  }
  const sims = [];

  for (const n1 of v1) {
    const s1 = n1.onset;
    const e1 = n1.onset + n1.duration;

    for (const n2 of v2) {
      const s2 = n2.onset;
      const e2 = n2.onset + n2.duration;

      // Only create simultaneity if BOTH notes are sounding
      // This correctly excludes rest periods (gaps between notes)
      if (s1 < e2 && s2 < e1) {
        const start = Math.max(s1, s2);
        sims.push(new Simultaneity(start, n1, n2, metricWeight(start, meter)));
      }
    }
  }

  return sims.sort((a, b) => a.onset - b.onset);
}

/**
 * Check for parallel perfect intervals (5ths and 8ves)
 */
export function checkParallelPerfects(sims, formatter) {
  // Deduplicate: only keep one simultaneity per unique note pair
  const seen = new Set();
  const uniqueSims = [];

  for (const s of sims) {
    const key = `${s.voice1Note.onset}-${s.voice1Note.pitch}-${s.voice2Note.onset}-${s.voice2Note.pitch}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSims.push(s);
    }
  }

  uniqueSims.sort((a, b) => a.onset - b.onset);

  const violations = [];
  const checked = new Set();

  for (let i = 0; i < uniqueSims.length; i++) {
    const curr = uniqueSims[i];
    // Only check perfect 5ths and octaves (unisons are class 1 for octaves reduced mod 12)
    if (![1, 5].includes(curr.interval.class)) continue;
    // Must be consonant (not a dissonance like augmented/diminished)
    if (!curr.interval.isConsonant()) continue;

    // Find the IMMEDIATELY next simultaneity where BOTH voices have moved
    let foundNext = false;
    for (let j = i + 1; j < uniqueSims.length; j++) {
      const next = uniqueSims[j];

      const v1Moved = next.voice1Note !== curr.voice1Note;
      const v2Moved = next.voice2Note !== curr.voice2Note;
      if (!v1Moved || !v2Moved) continue;

      // Found the next simultaneity where both voices moved
      foundNext = true;

      // BOTH intervals must be perfect 5ths or octaves (class 1 or 5)
      // AND both must be consonant (perfect quality, not augmented/diminished)
      if (![1, 5].includes(next.interval.class)) break;
      if (!next.interval.isConsonant()) break;

      // Both must be the same interval class (5th to 5th, or 8ve to 8ve)
      if (next.interval.class !== curr.interval.class) break;

      const d1 = Math.sign(next.voice1Note.pitch - curr.voice1Note.pitch);
      const d2 = Math.sign(next.voice2Note.pitch - curr.voice2Note.pitch);

      // Parallel motion = same direction
      if (d1 === d2 && d1 !== 0) {
        const checkKey = `${curr.voice1Note.pitch}-${curr.voice2Note.pitch}-${next.voice1Note.pitch}-${next.voice2Note.pitch}`;
        if (!checked.has(checkKey)) {
          checked.add(checkKey);
          const names = { 1: '8ves', 5: '5ths' };
          const dir = d1 > 0 ? '↑' : '↓';
          violations.push({
            onset: curr.onset,
            description: `Parallel ${names[curr.interval.class]}: ${pitchName(curr.voice1Note.pitch)}-${pitchName(curr.voice2Note.pitch)} ${dir} ${pitchName(next.voice1Note.pitch)}-${pitchName(next.voice2Note.pitch)} (${formatter.formatBeat(curr.onset)} to ${formatter.formatBeat(next.onset)})`,
          });
        }
      }
      break;
    }
  }

  return violations;
}

/**
 * Assess each oblique transition against the other voice's nearest move.
 *
 * For each oblique transition, finds the closest transition where the other
 * voice moved. If within window, splits the oblique count fractionally:
 * the non-oblique fraction goes to the classified direction type
 * (contrary/similar/parallel) and the remainder stays oblique.
 *
 * No merging, no pairing, no change to the total transition count.
 */
function assessAsyncObliques(transitions, window) {
  // Build indices: transitions where each voice moved
  const v1Moves = [];
  const v2Moves = [];
  for (const t of transitions) {
    if (t.motion.v1Moved) v1Moves.push(t);
    if (t.motion.v2Moved) v2Moves.push(t);
  }

  const adjustments = { contrary: 0, similar: 0, parallel: 0, obliqueReduction: 0 };

  for (const t of transitions) {
    if (t.motion.type !== 'oblique') continue;

    // Which voice moved, which held?
    const movedV1 = t.motion.v1Moved;
    const otherMoves = movedV1 ? v2Moves : v1Moves;

    // Direction of the voice that moved in this transition
    const movedDir = movedV1
      ? Math.sign(t.currSim.voice1Note.pitch - t.prevSim.voice1Note.pitch)
      : Math.sign(t.currSim.voice2Note.pitch - t.prevSim.voice2Note.pitch);

    // Find the nearest transition where the OTHER voice moved
    let nearest = null;
    let minOffset = Infinity;
    for (const candidate of otherMoves) {
      const offset = Math.abs(candidate.onset - t.onset);
      if (offset < minOffset) {
        minOffset = offset;
        nearest = candidate;
      }
    }

    if (nearest === null || minOffset > window) continue;

    // Direction and interval of the other voice in its nearest transition
    const otherDir = movedV1
      ? Math.sign(nearest.currSim.voice2Note.pitch - nearest.prevSim.voice2Note.pitch)
      : Math.sign(nearest.currSim.voice1Note.pitch - nearest.prevSim.voice1Note.pitch);
    const movedInterval = movedV1 ? t.motion.v1Interval : t.motion.v2Interval;
    const otherInterval = movedV1 ? nearest.motion.v2Interval : nearest.motion.v1Interval;

    const nonObliqueFraction = 1 - minOffset / window;

    // Classify the directional relationship
    if (movedDir === -otherDir) {
      adjustments.contrary += nonObliqueFraction;
    } else if (movedDir === otherDir && movedInterval === otherInterval) {
      adjustments.parallel += nonObliqueFraction;
    } else {
      adjustments.similar += nonObliqueFraction;
    }
    adjustments.obliqueReduction += nonObliqueFraction;
  }

  return adjustments;
}

/**
 * Analyze contour independence between two voices
 * Thresholds adjusted for small note counts (<=8 notes)
 */
export function testContourIndependence(subject, cs, formatter) {
  const noteCount = Math.min(subject.length, cs.length);
  const thresholds = getAdjustedThresholds(noteCount);

  const parallelWarningThreshold = noteCount <= 8 ? 0.7 : 0.6;
  const contraryGoodThreshold = noteCount <= 8 ? 0.25 : 0.35;

  const rawSims = findSimultaneities(subject, cs, formatter?.meter || [4, 4]);
  const seen = new Set();
  const uniqueSims = [];

  for (const sim of rawSims) {
    const key = `${sim.voice1Note.onset}-${sim.voice1Note.pitch}-${sim.voice2Note.onset}-${sim.voice2Note.pitch}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSims.push(sim);
    }
  }

  uniqueSims.sort((a, b) => a.onset - b.onset);

  let parallel = 0,
    similar = 0,
    contrary = 0,
    oblique = 0;
  const details = [];
  const transitions = [];

  for (let i = 1; i < uniqueSims.length; i++) {
    const prev = uniqueSims[i - 1];
    const curr = uniqueSims[i];

    const motion = classifyMotion(prev, curr);

    if (motion.type === 'static' || motion.type === 'unknown') continue;

    transitions.push({ motion, prevSim: prev, currSim: curr, onset: curr.onset });

    if (motion.type === 'oblique') {
      oblique++;
    } else if (motion.type === 'contrary') {
      contrary++;
    } else if (motion.type === 'parallel') {
      parallel++;
      if (motion.v1Interval > ANALYSIS_THRESHOLDS.LEAP_THRESHOLD) {
        details.push({ description: `Parallel leaps at ${formatter.formatBeat(curr.onset)}` });
      }
    } else {
      similar++;
    }
  }

  // Per-transition async assessment: redistribute oblique fractions
  const adj = assessAsyncObliques(transitions, thresholds.MOTION_SIMILARITY_WINDOW);
  const adjParallel = parallel + adj.parallel;
  const adjSimilar = similar + adj.similar;
  const adjContrary = contrary + adj.contrary;
  const adjOblique = oblique - adj.obliqueReduction;

  const total = adjParallel + adjSimilar + adjContrary + adjOblique;
  const parallelRatio = total > 0 ? adjParallel / total : 0;
  const similarRatio = total > 0 ? adjSimilar / total : 0;
  const contraryRatio = total > 0 ? adjContrary / total : 0;
  const obliqueRatio = total > 0 ? adjOblique / total : 0;

  let assessment = 'Independent contours';
  if (total > 0 && (adjParallel + adjSimilar) / total > parallelWarningThreshold) {
    assessment = 'Voices move together frequently—consider more contrary motion';
  } else if (contraryRatio > contraryGoodThreshold) {
    assessment = 'Good balance of motion types';
  }

  return {
    parallelMotions: adjParallel,
    similarMotions: adjSimilar,
    contraryMotions: adjContrary,
    obliqueMotions: adjOblique,
    parallelRatio,
    similarRatio,
    contraryRatio,
    obliqueRatio,
    details,
    assessment,
    noteCount,
  };
}

/**
 * Analyze melodic contour characteristics of a subject
 * Separated from harmonic analysis for proper separation of concerns
 */
export function testMelodicContour(subject, formatter) {
  if (!subject.length) return { error: 'No notes' };

  const meter = formatter.meter;
  const observations = [];
  const { LEAP_THRESHOLD, STEP_MAX, FOCAL_POINT_MIDDLE_START, FOCAL_POINT_MIDDLE_END,
          FOCAL_POINT_MIN_RANGE, STRONG_BEAT_WEIGHT } = ANALYSIS_THRESHOLDS;

  // 1. Leap recovery: penalize unrecovered leaps, small bonus for good recovery
  let leapRecoveries = 0;
  let unresolvedLeaps = 0;
  for (let i = 1; i < subject.length - 1; i++) {
    const interval1 = subject[i].pitch - subject[i - 1].pitch;
    const interval2 = subject[i + 1].pitch - subject[i].pitch;
    const absInt1 = Math.abs(interval1);

    // Check if first interval is a leap
    if (absInt1 > LEAP_THRESHOLD) {
      const absInt2 = Math.abs(interval2);
      // Recovery = step in opposite direction
      const isOppositeDirection = (interval1 > 0 && interval2 < 0) || (interval1 < 0 && interval2 > 0);
      const isStep = absInt2 <= STEP_MAX;

      if (isStep && isOppositeDirection) {
        leapRecoveries++;
      } else if (absInt2 > LEAP_THRESHOLD) {
        // Two consecutive leaps without recovery
        unresolvedLeaps++;
      }
    }
  }

  let leapRecoveryScore = 0;
  if (leapRecoveries > 0 && unresolvedLeaps === 0) {
    leapRecoveryScore = 0.25;
    observations.push({
      type: 'strength',
      description: `Good leap recovery (${leapRecoveries} recovered leap${leapRecoveries > 1 ? 's' : ''})`,
    });
  } else if (unresolvedLeaps > 0) {
    observations.push({
      type: 'consideration',
      description: `${unresolvedLeaps} unrecovered leap${unresolvedLeaps > 1 ? 's' : ''}`,
    });
  }

  // 2. Focal point/climax detection: bonus up to +3.0 based on clarity
  const pitches = subject.map(n => n.pitch);
  const maxPitch = Math.max(...pitches);
  const minPitch = Math.min(...pitches);
  const range = maxPitch - minPitch;

  const highIndices = pitches.map((p, i) => p === maxPitch ? i : -1).filter(i => i >= 0);
  const lowIndices = pitches.map((p, i) => p === minPitch ? i : -1).filter(i => i >= 0);

  let focalPointScore = 0;
  let focalPointDetails = null;

  // Check for clear high point (climax)
  if (highIndices.length === 1 && range >= FOCAL_POINT_MIN_RANGE) {
    const idx = highIndices[0];
    const relativePosition = idx / (subject.length - 1);
    const isInMiddle = relativePosition >= FOCAL_POINT_MIDDLE_START && relativePosition <= FOCAL_POINT_MIDDLE_END;
    const weight = metricWeight(subject[idx].onset, meter);
    const isMetricallyStrong = weight >= STRONG_BEAT_WEIGHT;

    if (isInMiddle) {
      focalPointScore = 1.5;
      if (isMetricallyStrong) focalPointScore += 1.0;
      if (range >= 12) focalPointScore += 0.5;
      focalPointScore = Math.min(focalPointScore, 3.0);

      focalPointDetails = {
        type: 'high',
        pitch: maxPitch,
        position: idx,
        relativePosition,
        metricallyStrong: isMetricallyStrong,
        range,
      };

      const strengthLevel = focalPointScore >= 2.5 ? 'excellent' : focalPointScore >= 2.0 ? 'good' : 'present';
      observations.push({
        type: 'strength',
        description: `Clear melodic climax (${strengthLevel}): high point at ${formatter.formatBeat(subject[idx].onset)}`,
      });
    }
  }

  // If no clear high point climax, check for expressive low point
  if (focalPointScore === 0 && lowIndices.length === 1 && range >= FOCAL_POINT_MIN_RANGE) {
    const idx = lowIndices[0];
    const relativePosition = idx / (subject.length - 1);
    const isInMiddle = relativePosition >= FOCAL_POINT_MIDDLE_START && relativePosition <= FOCAL_POINT_MIDDLE_END;
    const weight = metricWeight(subject[idx].onset, meter);
    const isMetricallyStrong = weight >= STRONG_BEAT_WEIGHT;

    if (isInMiddle) {
      focalPointScore = 0.5;
      if (isMetricallyStrong) focalPointScore += 0.5;
      focalPointScore = Math.min(focalPointScore, 1.5);

      focalPointDetails = {
        type: 'low',
        pitch: minPitch,
        position: idx,
        relativePosition,
        metricallyStrong: isMetricallyStrong,
      };

      observations.push({
        type: 'info',
        description: `Expressive low point at ${formatter.formatBeat(subject[idx].onset)}`,
      });
    }
  }

  return {
    leapRecoveryScore,
    leapRecoveries,
    unresolvedLeaps,
    focalPointScore,
    focalPointDetails,
    range,
    observations,
  };
}

/**
 * Analyze harmonic implications of a subject
 * Now focused purely on harmony: dominant arrival and chord analysis
 */
export function testHarmonicImplication(subject, tonic, mode, formatter) {
  if (!subject.length) return { error: 'No notes' };

  const meter = formatter.meter;
  const degrees = subject.map((n) => n.scaleDegree);
  const observations = [];

  // Dominant arrival detection
  let domArr = null;
  const subLen = subject[subject.length - 1].onset + subject[subject.length - 1].duration;

  for (let i = 0; i < subject.length; i++) {
    const d = degrees[i];
    if (
      (d.degree === 5 && d.alteration === 0 && metricWeight(subject[i].onset, meter) >= 0.5) ||
      (d.degree === 7 && d.alteration === 0)
    ) {
      domArr = {
        location: formatter.formatBeat(subject[i].onset),
        ratio: subject[i].onset / subLen,
        degree: d.toString(),
      };
      break;
    }
  }

  if (domArr) {
    const timing = domArr.ratio < 0.3 ? 'Early' : domArr.ratio > 0.6 ? 'Late' : 'Mid-subject';
    observations.push({
      type: 'info',
      description: `${timing} dominant arrival on ${domArr.degree} at ${domArr.location}`,
    });
  }

  // Chord/Harmony analysis
  let chordAnalysis = null;
  let harmonicClarityScore = 0;

  try {
    const tonicPitchClass = typeof tonic === 'number' ? tonic % 12 : 0;
    chordAnalysis = analyzeChords(subject, meter, tonicPitchClass);

    if (chordAnalysis && chordAnalysis.summary) {
      const { harmonicClarity, startsOnTonic, endsOnTonic, impliesDominant, uniqueHarmonies } = chordAnalysis.summary;

      harmonicClarityScore = harmonicClarity >= 0.8 ? 2.0 :
                            harmonicClarity >= 0.6 ? 1.0 :
                            harmonicClarity >= 0.4 ? 0.5 : 0;

      if (startsOnTonic && endsOnTonic) {
        harmonicClarityScore += 0.5;
        observations.push({
          type: 'strength',
          description: 'Strong tonal framing: starts and ends on tonic harmony',
        });
      } else if (startsOnTonic || endsOnTonic) {
        observations.push({
          type: 'info',
          description: `${startsOnTonic ? 'Starts' : 'Ends'} on tonic harmony`,
        });
      }

      if (impliesDominant) {
        observations.push({
          type: 'info',
          description: 'Melody implies dominant function',
        });
      }

      if (harmonicClarity >= 0.7) {
        observations.push({
          type: 'strength',
          description: `Clear harmonic implications (${uniqueHarmonies} chord${uniqueHarmonies !== 1 ? 's' : ''} suggested)`,
        });
      } else if (harmonicClarity < 0.4) {
        observations.push({
          type: 'consideration',
          description: 'Ambiguous harmonic implications',
        });
      }
    }
  } catch (e) {
    console.warn('Chord analysis failed:', e);
  }

  return {
    dominantArrival: domArr,
    chordAnalysis,
    harmonicClarityScore,
    observations,
  };
}

/**
 * Analyze rhythmic variety in a subject
 */
export function testRhythmicVariety(subject, formatter) {
  if (subject.length < 2) return { error: 'Too short' };

  const durs = subject.map((n) => n.duration);
  const unique = [...new Set(durs.map((d) => Math.round(d * 1000) / 1000))];
  const names = unique.map((d) => formatter.formatDuration(d));
  const observations = [];
  const meter = formatter.meter;

  // Note value variety
  if (unique.length === 1) {
    observations.push({ type: 'consideration', description: `Uniform rhythm (all ${names[0]}s)` });
  } else {
    observations.push({ type: 'info', description: `${unique.length} note values: ${names.join(', ')}` });
  }

  // Long-short / short-long contrast
  const hasLS = durs.some((d, i) => i > 0 && durs[i - 1] >= d * 2);
  const hasSL = durs.some((d, i) => i > 0 && durs[i - 1] <= d / 2);

  if (hasLS && hasSL) {
    observations.push({ type: 'strength', description: 'Good rhythmic contrast' });
  }

  // Rest detection: gaps between notes create rhythmic variety
  let restCount = 0;
  let totalRestDuration = 0;
  for (let i = 1; i < subject.length; i++) {
    const prevEnd = subject[i - 1].onset + subject[i - 1].duration;
    const gap = subject[i].onset - prevEnd;
    if (gap > 0.01) { // Small tolerance for rounding
      restCount++;
      totalRestDuration += gap;
    }
  }

  if (restCount > 0) {
    observations.push({
      type: 'info',
      description: `${restCount} rest${restCount > 1 ? 's' : ''} (${totalRestDuration.toFixed(2)} beats total)`,
    });
    if (restCount >= 2 || totalRestDuration >= 1) {
      observations.push({ type: 'strength', description: 'Rests add rhythmic variety' });
    }
  }

  // Off-beat (syncopated) attacks: notes starting off the beat create variety
  // even with uniform note values
  const measureLength = (meter[0] * 4) / meter[1]; // Internal units per measure
  const beatUnit = meter[1] >= 8 && meter[0] % 3 === 0 ? 1.5 : 1; // Compound vs simple
  let offBeatCount = 0;
  let onBeatCount = 0;

  for (const note of subject) {
    const beatPosition = note.onset % beatUnit;
    const isOnBeat = beatPosition < 0.05 || beatPosition > beatUnit - 0.05;
    if (isOnBeat) {
      onBeatCount++;
    } else {
      offBeatCount++;
    }
  }

  const offBeatRatio = offBeatCount / subject.length;

  if (offBeatCount > 0) {
    observations.push({
      type: 'info',
      description: `${offBeatCount}/${subject.length} off-beat attacks (${Math.round(offBeatRatio * 100)}%)`,
    });
    if (offBeatRatio >= 0.2 && offBeatRatio <= 0.6) {
      observations.push({ type: 'strength', description: 'Good syncopation/off-beat variety' });
    } else if (offBeatRatio > 0.6) {
      observations.push({ type: 'consideration', description: 'Heavily syncopated (may obscure meter)' });
    }
  }

  // Melodic interval variety analysis
  // Good variety = any combination involving a step (step+step, step+skip, step+leap)
  // OR combinations of skips (3-4 semitones) and perfect leaps (5, 7, 12 semitones)
  const intervals = [];
  const intervalTypes = { step: 0, skip: 0, perfectLeap: 0, otherLeap: 0 };

  for (let i = 1; i < subject.length; i++) {
    const semitones = Math.abs(subject[i].pitch - subject[i - 1].pitch);
    intervals.push(semitones);

    if (semitones <= 2) {
      intervalTypes.step++;
    } else if (semitones <= 4) {
      intervalTypes.skip++; // m3, M3 (3-4 semitones)
    } else if (semitones === 5 || semitones === 7 || semitones === 12) {
      intervalTypes.perfectLeap++; // P4, P5, P8
    } else {
      intervalTypes.otherLeap++; // 6ths, 7ths, etc.
    }
  }

  // Evaluate melodic variety
  const hasSteps = intervalTypes.step > 0;
  const hasSkips = intervalTypes.skip > 0;
  const hasLeaps = intervalTypes.perfectLeap + intervalTypes.otherLeap > 0;
  const uniqueIntervalSizes = [...new Set(intervals)].length;

  let melodicVarietyScore = 0;
  const melodicObservations = [];

  if (hasSteps && (hasSkips || hasLeaps)) {
    // Good: steps combined with skips or leaps
    melodicVarietyScore = 2;
    melodicObservations.push({
      type: 'strength',
      description: 'Good melodic variety: steps combined with larger intervals',
    });
  } else if (hasSkips && intervalTypes.perfectLeap > 0) {
    // Good: skips with perfect leaps (check for 2+ semitone difference)
    const skipSizes = intervals.filter(i => i >= 3 && i <= 4);
    const perfectSizes = intervals.filter(i => i === 5 || i === 7 || i === 12);
    const hasVariety = skipSizes.some(s =>
      perfectSizes.some(p => Math.abs(s - p) >= 2)
    );
    if (hasVariety) {
      melodicVarietyScore = 1.5;
      melodicObservations.push({
        type: 'strength',
        description: 'Melodic variety through skip/leap combinations',
      });
    }
  } else if (uniqueIntervalSizes >= 3) {
    melodicVarietyScore = 1;
    melodicObservations.push({
      type: 'info',
      description: `${uniqueIntervalSizes} distinct interval sizes`,
    });
  } else if (uniqueIntervalSizes === 1) {
    melodicVarietyScore = -1;
    melodicObservations.push({
      type: 'consideration',
      description: 'Monotonous: only one interval size used',
    });
  }

  observations.push(...melodicObservations);

  // Add interval type summary
  const typeSummary = [];
  if (intervalTypes.step > 0) typeSummary.push(`${intervalTypes.step} steps`);
  if (intervalTypes.skip > 0) typeSummary.push(`${intervalTypes.skip} skips`);
  if (intervalTypes.perfectLeap > 0) typeSummary.push(`${intervalTypes.perfectLeap} perfect leaps`);
  if (intervalTypes.otherLeap > 0) typeSummary.push(`${intervalTypes.otherLeap} other leaps`);

  if (typeSummary.length > 0) {
    observations.push({
      type: 'info',
      description: `Melodic intervals: ${typeSummary.join(', ')}`,
    });
  }

  return {
    uniqueDurations: unique.length,
    durationNames: names,
    restCount,
    totalRestDuration,
    offBeatCount,
    offBeatRatio,
    intervalTypes,
    melodicVarietyScore,
    observations,
  };
}

/**
 * Analyze rhythmic complementarity between subject and countersubject
 *
 * Main metric: Solo onset ratio - % of note onsets that occur in only one voice
 * Measures the "interlocking" quality. Desirable: 33-66%
 *
 * Secondary metric: Strong beat simultaneity - % of strong beats with both voices attacking
 * Measures structural lockstep. Punish >90%, reward <80%
 */
export function testRhythmicComplementarity(subject, cs, meter) {
  if (!meter || !Array.isArray(meter) || meter.length < 2) {
    throw new Error(`testRhythmicComplementarity: meter is invalid (${JSON.stringify(meter)}). Caller must pass valid [numerator, denominator] array.`);
  }
  if (!subject.length || !cs.length) return { error: 'Empty' };

  const beatsPerMeasure = meter[0];

  // Get all onsets rounded for comparison
  const sOnsets = new Set(subject.map((n) => Math.round(n.onset * 100) / 100));
  const cOnsets = new Set(cs.map((n) => Math.round(n.onset * 100) / 100));

  // All unique onsets (union)
  const allOnsets = new Set([...sOnsets, ...cOnsets]);

  // Shared onsets (intersection)
  const sharedOnsets = [...sOnsets].filter((o) => cOnsets.has(o));

  // Solo onsets = onsets in only one voice
  const soloOnsetCount = allOnsets.size - sharedOnsets.length;
  const soloOnsetRatio = soloOnsetCount / allOnsets.size;

  // Strong beat simultaneity
  // Strong beats = downbeat (weight 1.0) and medium-strong beats (weight 0.75)
  // Uses metricWeight function for proper handling of all time signatures
  const isStrongBeat = (onset) => {
    return metricWeight(onset, meter) >= 0.75;
  };

  // Find all strong beats that have ANY note onset
  const strongBeatsWithOnsets = new Set();
  for (const onset of allOnsets) {
    if (isStrongBeat(onset)) {
      strongBeatsWithOnsets.add(Math.round(onset * 100) / 100);
    }
  }

  // Count strong beats where BOTH voices attack
  let strongBeatsBothAttack = 0;
  for (const beat of strongBeatsWithOnsets) {
    if (sOnsets.has(beat) && cOnsets.has(beat)) {
      strongBeatsBothAttack++;
    }
  }

  const strongBeatSimultaneity = strongBeatsWithOnsets.size > 0
    ? strongBeatsBothAttack / strongBeatsWithOnsets.size
    : 0;

  const observations = [];

  // Main metric assessment: solo onset ratio
  // Desirable: 33-66%, penalize <20% or >80%
  if (soloOnsetRatio < 0.20) {
    observations.push({
      type: 'consideration',
      description: `Only ${Math.round(soloOnsetRatio * 100)}% solo attacks—voices shadow each other`,
    });
  } else if (soloOnsetRatio > 0.80) {
    observations.push({
      type: 'consideration',
      description: `${Math.round(soloOnsetRatio * 100)}% solo attacks—voices rarely coincide`,
    });
  } else if (soloOnsetRatio >= 0.33 && soloOnsetRatio <= 0.66) {
    observations.push({
      type: 'strength',
      description: `${Math.round(soloOnsetRatio * 100)}% solo attacks—good interlocking`,
    });
  } else {
    observations.push({
      type: 'info',
      description: `${Math.round(soloOnsetRatio * 100)}% solo attacks`,
    });
  }

  // Secondary metric: strong beat simultaneity
  if (strongBeatSimultaneity > 0.90) {
    observations.push({
      type: 'consideration',
      description: `${Math.round(strongBeatSimultaneity * 100)}% strong beats have simultaneous attacks`,
    });
  } else if (strongBeatSimultaneity < 0.80) {
    observations.push({
      type: 'strength',
      description: `${Math.round(strongBeatSimultaneity * 100)}% strong beat simultaneity—rhythmic independence`,
    });
  }

  return {
    soloOnsetRatio,
    strongBeatSimultaneity,
    overlapRatio: 1 - soloOnsetRatio, // For backwards compatibility
    observations,
  };
}

/**
 * Test stretto viability at various time intervals
 * Issues are weighted by: beat strength, note duration, and consecutiveness
 */
export function testStrettoViability(subject, formatter, minOverlap = 0.5, increment = 1, octaveDisp = 12, scoringOptions = {}) {
  if (subject.length < 2) return { error: 'Too short' };

  const meter = formatter.meter;
  const subLen = subject[subject.length - 1].onset + subject[subject.length - 1].duration;
  const maxDist = subLen * (1 - minOverlap);

  // Build set of transposition intervals to test
  // Full set: octaves, fifths, fourths, compound fifths/fourths, double octaves
  // NOTE: We do NOT deduplicate by mod 12 anymore because octave displacement
  // DOES matter: P5 from the bass is consonant, but P4 from the bass (= P5 + octave
  // inverted) is dissonant. So +7 (P5) and +19 (P12 = P5+P8) produce different
  // interval analyses when the entry below vs above changes which voice is bass.
  const allTranspositions = [0, 12, -12, 7, -7, 5, -5, 19, -19, 17, -17, 24, -24];

  const results = [];

  // Calculate average note duration for relative weighting
  const avgDuration = subject.reduce((sum, n) => sum + n.duration, 0) / subject.length;

  for (const transp of allTranspositions) {
  for (let dist = increment; dist <= maxDist; dist += increment) {
    const comes = subject.map(
      (n) => new NoteEvent(n.pitch + transp, n.duration, n.onset + dist, n.scaleDegree, n.abcNote)
    );
    const sims = findSimultaneities(subject, comes, meter);
    const issues = [];
    const warnings = [];

    // Analyze dissonances with new scoring system (needed for passing motion detection)
    const dissonanceAnalysis = analyzeAllDissonances(sims);

    // Parallel perfects ARE flagged per-pair as warnings (not used in viability determination,
    // but shown when viewing an individual stretto pair — consistent with direct 5ths/8ves)
    const parallelPerfects = checkParallelPerfects(sims, formatter);
    for (const pp of parallelPerfects) {
      warnings.push({
        onset: pp.onset,
        description: pp.description,
        type: 'parallel',
      });
    }

    // Evaluate each dissonance based on score
    for (const d of dissonanceAnalysis.dissonances) {
      const sim = sims.find(s => s.onset === d.onset);
      if (!sim) continue;

      const metricLabel = sim.metricWeight === 1.0 ? 'downbeat' : (sim.metricWeight >= 0.75 ? 'strong beat' : 'weak beat');
      const noteDur = Math.max(sim.voice1Note.duration, sim.voice2Note.duration);

      // Passing consecutive dissonances (isPassing = passingness >= 1) are minor issues only —
      // they do not impair stretto viability. Downgrade them to warnings.
      if (d.isPassing) {
        warnings.push({
          onset: d.onset,
          description: `Passing consecutive ${d.interval} at ${formatter.formatBeat(d.onset)} (minor)`,
          type: 'passing_consecutive',
          interval: d.interval,
          score: d.score,
          details: d.details,
          metricWeight: sim.metricWeight,
          duration: noteDur,
        });
        continue;
      }

      if (d.score < -1.0) {
        // Serious issue - badly handled dissonance
        issues.push({
          onset: d.onset,
          description: `${d.type === 'unprepared' ? 'Unprepared' : 'Poorly resolved'} ${d.interval} on ${metricLabel}: Dux ${d.v1Pitch} vs Comes ${d.v2Pitch} at ${formatter.formatBeat(d.onset)} (score: ${d.score.toFixed(1)})`,
          type: d.type,
          interval: d.interval,
          duxPitch: d.v1Pitch,
          comesPitch: d.v2Pitch,
          score: d.score,
          details: d.details,
          metricWeight: sim.metricWeight,
          duration: noteDur,
          baseSeverity: Math.abs(d.score),
        });
      } else if (d.score < 0 && d.isStrongBeat) {
        // Warning - marginal dissonance on strong beat
        warnings.push({
          onset: d.onset,
          description: `${d.type} ${d.interval} on ${metricLabel}: ${d.v1Pitch}-${d.v2Pitch} at ${formatter.formatBeat(d.onset)} (score: ${d.score.toFixed(1)})`,
          type: d.type,
          interval: d.interval,
          score: d.score,
          details: d.details,
          metricWeight: sim.metricWeight,
          duration: noteDur,
        });
      }
      // Score >= 0 means acceptable dissonance treatment
    }

    // Calculate weighted severity for issues
    // Weight factors: beat strength (1-2x), duration (0.5-2x), consecutiveness (1.5x for each consecutive)
    issues.sort((a, b) => a.onset - b.onset);
    let totalWeightedSeverity = 0;
    let consecutiveCount = 0;
    let lastOnset = -Infinity;

    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];

      // Beat strength multiplier: downbeat = 2x, strong beat = 1.5x, weak beat = 1x
      const beatMultiplier = issue.metricWeight >= 1.0 ? 2.0 :
                            issue.metricWeight >= 0.75 ? 1.5 :
                            issue.metricWeight >= 0.5 ? 1.2 : 1.0;

      // Duration multiplier: longer notes = more severe (relative to average)
      const durationRatio = (issue.duration || avgDuration) / avgDuration;
      const durationMultiplier = Math.max(0.5, Math.min(2.0, durationRatio));

      // Consecutiveness: issues within 1 beat of each other compound
      const isConsecutive = (issue.onset - lastOnset) <= 1.0;
      if (isConsecutive) {
        consecutiveCount++;
      } else {
        consecutiveCount = 0;
      }
      const consecutiveMultiplier = 1.0 + (consecutiveCount * 0.5);

      // Calculate weighted severity
      const baseSeverity = issue.baseSeverity || 1.0;
      const weightedSeverity = baseSeverity * beatMultiplier * durationMultiplier * consecutiveMultiplier;

      issue.weightedSeverity = weightedSeverity;
      issue.severityFactors = {
        beat: beatMultiplier,
        duration: durationMultiplier,
        consecutive: consecutiveMultiplier,
      };

      totalWeightedSeverity += weightedSeverity;
      lastOnset = issue.onset;
    }

    // Deduplicate simultaneities for motion analysis
    const uniqueSims = [];
    const seenKeys = new Set();
    for (const s of sims) {
      const key = `${s.voice1Note.onset}-${s.voice2Note.onset}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueSims.push(s);
      }
    }
    uniqueSims.sort((a, b) => a.onset - b.onset);

    // Check direct motion into perfect intervals (5ths/octaves)
    // Scoring: -0.5 if strong/medium beat, -0.25 if weak beat, additional -0.25 if upper voice leaps/skips
    for (let i = 0; i < uniqueSims.length - 1; i++) {
      const curr = uniqueSims[i];
      const next = uniqueSims[i + 1];

      // Only check perfect 5ths and octaves (class 1 for octaves, 5 for fifths)
      // Note: class 1/5 with quality 'perfect' are always consonant, no need to check isConsonant()
      if ([1, 5].includes(next.interval.class)) {
        const v1Dir = next.voice1Note.pitch - curr.voice1Note.pitch;
        const v2Dir = next.voice2Note.pitch - curr.voice2Note.pitch;

        // Similar motion (both voices moving in same direction) into a perfect interval
        if (v1Dir !== 0 && v2Dir !== 0 && Math.sign(v1Dir) === Math.sign(v2Dir)) {
          const dir = v1Dir > 0 ? 'ascending' : 'descending';
          const upperVoiceInterval = Math.abs(v1Dir > v2Dir ? v1Dir : v2Dir);
          const upperLeapOrSkip = upperVoiceInterval > 2; // > major 2nd

          // Calculate penalty
          const isStrongBeat = next.metricWeight >= 0.75; // strong or medium strong
          let penalty = isStrongBeat ? -0.5 : -0.25;
          if (upperLeapOrSkip) penalty -= 0.25;

          warnings.push({
            onset: next.onset,
            description: `Direct ${next.interval.class === 5 ? '5th' : '8ve'} (${dir}): ${pitchName(curr.voice1Note.pitch)}-${pitchName(curr.voice2Note.pitch)} to ${pitchName(next.voice1Note.pitch)}-${pitchName(next.voice2Note.pitch)} at ${formatter.formatBeat(next.onset)}`,
            type: 'direct',
            interval: next.interval.toString(),
            score: penalty,
            details: [
              `Beat strength: ${isStrongBeat ? 'strong/medium' : 'weak'} (${penalty >= -0.5 ? penalty : penalty + 0.25})`,
              upperLeapOrSkip ? `Upper voice ${upperVoiceInterval > 4 ? 'leap' : 'skip'}: -0.25` : null,
            ].filter(Boolean),
          });
        }
      }
    }

    // Build interval timeline for visualization with scores
    const intervalPoints = [];
    const beatSnapshots = new Map();

    for (const sim of sims) {
      const snapBeat = Math.round(sim.onset * 2) / 2;
      if (!beatSnapshots.has(snapBeat)) {
        // Get dissonance scoring
        const scoring = scoreDissonance(sim, sims);

        beatSnapshots.set(snapBeat, {
          onset: sim.onset,
          beat: snapBeat,
          interval: sim.interval,
          intervalClass: sim.interval.class,
          intervalName: sim.interval.toString(),
          duxPitch: sim.voice1Note.pitch,
          comesPitch: sim.voice2Note.pitch,
          isConsonant: scoring.isConsonant,
          isStrong: sim.metricWeight >= 0.75,
          dissonanceLabel: scoring.label,
          dissonanceType: scoring.type,
          score: scoring.score,
          entryScore: scoring.entryScore,  // NEW: for purple-red coloring
          exitScore: scoring.exitScore,    // NEW: for emerald-amber coloring
          entry: scoring.entry,            // NEW: for detailed display
          exit: scoring.exit,              // NEW: for detailed display
          scoreDetails: scoring.details,
          patterns: scoring.patterns,
        });
      }
    }

    const sortedBeats = [...beatSnapshots.keys()].sort((a, b) => a - b);
    for (const beat of sortedBeats) {
      intervalPoints.push(beatSnapshots.get(beat));
    }

    // Merge chain info from dissonanceAnalysis into intervalPoints
    if (dissonanceAnalysis?.all) {
      const chainByOnset = new Map();
      for (const r of dissonanceAnalysis.all) {
        chainByOnset.set(Math.round(r.onset * 4) / 4, r);
      }
      for (const pt of intervalPoints) {
        const chain = chainByOnset.get(Math.round(pt.onset * 4) / 4);
        if (chain) {
          pt.isChainEntry = chain.isChainEntry || false;
          pt.isConsecutiveDissonance = chain.isConsecutiveDissonance || false;
          pt.chainPosition = chain.chainPosition;
          pt.chainLength = chain.chainLength || 0;
          pt.chainStartOnset = chain.chainStartOnset;
          pt.chainEndOnset = chain.chainEndOnset;
          pt.chainUnresolved = chain.chainUnresolved || false;
          pt.isChainResolution = chain.isChainResolution || false;
          pt.consecutiveMitigationCount = chain.consecutiveMitigationCount || 0;
          pt.consecutiveMitigation = chain.consecutiveMitigation || 0;
          pt.passingMotion = chain.passingMotion || null;
          pt.isPassing = chain.isPassing || false;
          pt.isRepeated = chain.isRepeated || false;
          pt.isResolved = chain.isResolved !== false;
          pt.isParallel = chain.isParallel || false;
        }
      }
    }

    // Calculate quality rating based on weighted severity (not just count)
    // Thresholds: clean = 0, good < 2, acceptable < 4, marginal < 6, problematic >= 6
    let qualityRating = 'clean';
    if (totalWeightedSeverity > 0) {
      if (totalWeightedSeverity >= 6) {
        qualityRating = 'problematic';
      } else if (totalWeightedSeverity >= 4) {
        qualityRating = 'marginal';
      } else if (totalWeightedSeverity >= 2) {
        qualityRating = 'acceptable';
      } else {
        qualityRating = 'good';
      }
    } else if (warnings.length > 0) {
      qualityRating = warnings.length > 2 ? 'acceptable' : 'good';
    }

    // Determine consecutive issues count (for summary)
    let maxConsecutiveIssues = 0;
    let currentConsecutive = 0;
    let prevOnset = -Infinity;
    for (const issue of issues) {
      if (issue.onset - prevOnset <= 1.0) {
        currentConsecutive++;
        maxConsecutiveIssues = Math.max(maxConsecutiveIssues, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
      prevOnset = issue.onset;
    }

    results.push({
      distance: dist,
      transposition: transp,
      transpositionClass: ((transp % 12) + 12) % 12,
      distanceFormatted: formatter.formatDistance(dist),
      overlapPercent: Math.round(((subLen - dist) / subLen) * 100),
      issueCount: issues.length,
      warningCount: warnings.length,
      weightedSeverity: totalWeightedSeverity,
      maxConsecutiveIssues,
      issues,
      warnings,
      intervalPoints,
      viable: issues.length === 0,
      clean: issues.length === 0 && warnings.length === 0,
      qualityRating,
      // Include full dissonance analysis for base-zero scoring
      dissonanceAnalysis: {
        summary: dissonanceAnalysis.summary,
        // avgDissonanceScore: this is the key metric for stretto scoring
        // It represents the average counterpoint quality at this distance
      },
    });
  }
  } // end for transp

  // Generate summary with counts by category (based on weighted severity)
  const cleanCount = results.filter(r => r.clean).length;
  const viableCount = results.filter(r => r.viable).length;
  const marginalCount = results.filter(r => r.qualityRating === 'marginal').length;
  const problematicCount = results.filter(r => r.qualityRating === 'problematic').length;
  const acceptableCount = results.filter(r => r.qualityRating === 'acceptable').length;

  // Calculate severity statistics
  const allSeverities = results.map(r => r.weightedSeverity);
  const avgSeverity = allSeverities.reduce((a, b) => a + b, 0) / (allSeverities.length || 1);
  const maxSeverity = Math.max(...allSeverities);

  // Find best stretto (lowest weighted severity among non-clean)
  const nonClean = results.filter(r => !r.clean);
  const bestNonClean = nonClean.length > 0
    ? nonClean.reduce((best, r) => r.weightedSeverity < best.weightedSeverity ? r : best)
    : null;

  // Transposition diversity statistics
  const testedTranspositions = allTranspositions;
  const viableTranspositions = [...new Set(results.filter(r => r.viable).map(r => r.transposition))];
  const viableDistances = [...new Set(results.filter(r => r.viable).map(r => r.distance))];
  const totalDistancesPerTransposition = Math.max(1, Math.floor(maxDist / increment));

  // Results filtered to the user-selected transposition (for UI display)
  // Now matches exact transposition value since octave displacement matters
  const selectedResults = results.filter(r => r.transposition === octaveDisp);

  return {
    subjectLengthBeats: subLen,
    allResults: results,
    selectedResults,
    viableStrettos: results.filter((r) => r.viable),
    cleanStrettos: results.filter((r) => r.clean),
    problematicStrettos: results.filter((r) => !r.viable),
    summary: {
      totalTested: results.length,
      clean: cleanCount,
      viable: viableCount,
      acceptable: acceptableCount,
      marginal: marginalCount,
      problematic: problematicCount,
      avgWeightedSeverity: avgSeverity,
      maxWeightedSeverity: maxSeverity,
      bestDistance: cleanCount > 0 ? results.find(r => r.clean)?.distanceFormatted :
                    viableCount > 0 ? results.find(r => r.viable)?.distanceFormatted : null,
      bestNonCleanDistance: bestNonClean?.distanceFormatted || null,
      bestNonCleanSeverity: bestNonClean?.weightedSeverity || null,
      viableTranspositionCount: viableTranspositions.length,
      viableDistanceCount: viableDistances.length,
      totalDistancesPerTransposition,
      testedTranspositionCount: allTranspositions.length,
    },
  };
}

/**
 * Analyze tonal answer requirements
 */
export function testTonalAnswer(subject, mode, keyInfo, formatter) {
  if (!subject.length) return { error: 'Empty' };

  const meter = formatter.meter;
  const degrees = subject.map((n) => n.scaleDegree);
  const tonalMotions = [];
  let mutationPoint = null;
  const observations = [];

  for (let i = 0; i < degrees.length - 1; i++) {
    const c = degrees[i];
    const n = degrees[i + 1];

    if (c.alteration !== 0 || n.alteration !== 0) continue;

    if (c.degree === 1 && n.degree === 5) {
      tonalMotions.push({
        type: '1-5',
        description: `^1→^5 at ${formatter.formatBeat(subject[i].onset)} triggers tonal mutation`,
      });
      mutationPoint = i + 1;
      break;
    }

    if (c.degree === 5 && n.degree === 1) {
      tonalMotions.push({
        type: '5-1',
        description: `^5→^1 at ${formatter.formatBeat(subject[i].onset)} triggers tonal mutation`,
      });
      mutationPoint = i + 1;
      break;
    }

    if (i === 0 && c.degree === 5) {
      tonalMotions.push({ type: 'initial-5', description: 'Begins on ^5; answer begins on ^1' });
      for (let j = 1; j < degrees.length; j++) {
        if (degrees[j].degree === 1 && degrees[j].alteration === 0 && metricWeight(subject[j].onset, meter) >= 0.5) {
          mutationPoint = j;
          break;
        }
      }
      break;
    }
  }

  const answerType = tonalMotions.length > 0 ? 'tonal' : 'real';

  if (answerType === 'real') {
    observations.push({ type: 'info', description: 'No ^1-^5 motion—real transposition (up 5th)' });
  } else {
    for (const m of tonalMotions) {
      observations.push({ type: 'info', description: m.description });
    }
    if (mutationPoint !== null) {
      const mutationNote = subject[mutationPoint];
      const beatPos = mutationNote && formatter ? formatter.formatBeat(mutationNote.onset) : `note ${mutationPoint + 1}`;
      observations.push({ type: 'info', description: `Real transposition resumes at ${beatPos}` });
    }
  }

  const terminal = degrees[degrees.length - 1];
  const junc =
    {
      '1-0': { p: 'I→V', q: 'strong' },
      '2-0': { p: 'ii→V', q: 'good' },
      '5-0': { p: 'V→V', q: 'static' },
      '7-0': { p: 'vii°→V', q: 'strong' },
      '4-0': { p: 'IV→V', q: 'strong' },
      '3-0': { p: 'I→V', q: 'good' },
    }[`${terminal.degree}-${terminal.alteration}`] || { p: '?→V', q: 'unusual' };

  observations.push({
    type: junc.q === 'static' ? 'consideration' : 'info',
    description: `Junction: ${junc.p} (${junc.q})`,
  });

  return { answerType, tonalMotions, mutationPoint, junction: junc, observations };
}

/**
 * Test double counterpoint (invertibility)
 */
export function testDoubleCounterpoint(subject, cs, formatter) {
  if (!subject.length || !cs.length) return { error: 'Empty' };

  const meter = formatter.meter;

  const analyze = (sims, v1, v2, name) => {
    let thirds = 0,
      sixths = 0,
      perfects = 0,
      dissonant = 0;
    const strong = sims.filter((s) => s.metricWeight >= 0.5);

    for (const s of strong) {
      if (s.interval.class === 3) thirds++;
      else if (s.interval.class === 6) sixths++;
      else if ([1, 5, 8].includes(s.interval.class) && s.interval.quality === 'perfect') perfects++;
      else if (!s.interval.isConsonant()) dissonant++;
    }

    const issues = [];
    for (const v of checkParallelPerfects(sims, formatter)) {
      issues.push({ ...v, config: name });
    }

    // P4s against bass are handled by the standard dissonance scoring system
    // (they can resolve like any other dissonance, not just 4-3)

    // Analyze dissonances with classification
    const dissonanceAnalysis = analyzeDissonances(sims, v1, v2, formatter);

    // Get detailed scoring from dissonanceScoring module
    const detailedScoring = analyzeAllDissonances(sims);

    // Only flag unprepared strong-beat dissonances as issues
    for (const d of dissonanceAnalysis.unprepared) {
      if (d.metricWeight >= 0.75) {
        issues.push({
          config: name,
          description: `Unprepared ${d.interval} on strong beat at ${formatter.formatBeat(d.onset)}`,
        });
      }
    }

    return {
      issues,
      thirds,
      sixths,
      perfects,
      dissonant,
      dissonanceAnalysis,
      detailedScoring, // Include detailed scores for use in scoring.js
      totalIntervals: sims.length,
      imperfectRatio: strong.length > 0 ? (thirds + sixths) / strong.length : 0,
    };
  };

  const origSims = findSimultaneities(subject, cs, meter);
  const orig = analyze(origSims, subject, cs, 'CS above');

  const csInv = cs.map((n) => new NoteEvent(n.pitch - 12, n.duration, n.onset, n.scaleDegree, n.abcNote));
  const invSims = findSimultaneities(subject, csInv, meter);
  const inv = analyze(invSims, subject, csInv, 'CS below');

  const observations = [];

  observations.push({
    type: 'info',
    description: `Original (CS above): ${orig.thirds} 3rds, ${orig.sixths} 6ths, ${orig.perfects} perfect consonances`,
  });
  observations.push({
    type: 'info',
    description: `Inverted (CS below): ${inv.thirds} 3rds, ${inv.sixths} 6ths, ${inv.perfects} perfect consonances`,
  });

  // Report dissonance treatment
  const origDA = orig.dissonanceAnalysis;
  const invDA = inv.dissonanceAnalysis;

  if (origDA.summary.total > 0) {
    const parts = [];
    if (origDA.suspensions.length) parts.push(`${origDA.suspensions.length} sus`);
    if (origDA.passingTones.length) parts.push(`${origDA.passingTones.length} PT`);
    if (origDA.neighborTones.length) parts.push(`${origDA.neighborTones.length} N`);
    if (origDA.anticipations.length) parts.push(`${origDA.anticipations.length} ant`);
    if (origDA.appoggiaturas.length) parts.push(`${origDA.appoggiaturas.length} app`);
    if (origDA.unprepared.length) parts.push(`${origDA.unprepared.length} unprepared`);

    observations.push({
      type: origDA.unprepared.length === 0 ? 'strength' : 'info',
      description: `Original dissonances: ${parts.join(', ')}`,
    });
  }

  if (invDA.summary.total > 0) {
    const parts = [];
    if (invDA.suspensions.length) parts.push(`${invDA.suspensions.length} sus`);
    if (invDA.passingTones.length) parts.push(`${invDA.passingTones.length} PT`);
    if (invDA.neighborTones.length) parts.push(`${invDA.neighborTones.length} N`);
    if (invDA.anticipations.length) parts.push(`${invDA.anticipations.length} ant`);
    if (invDA.appoggiaturas.length) parts.push(`${invDA.appoggiaturas.length} app`);
    if (invDA.unprepared.length) parts.push(`${invDA.unprepared.length} unprepared`);

    observations.push({
      type: invDA.unprepared.length === 0 ? 'strength' : 'info',
      description: `Inverted dissonances: ${parts.join(', ')}`,
    });
  }

  if (!orig.issues.length && !inv.issues.length) {
    observations.push({
      type: 'strength',
      description: 'Clean invertibility—no parallel perfects or problematic dissonances in either position',
    });
  }

  return { original: orig, inverted: inv, observations };
}

/**
 * Test modulatory robustness (CS against answer)
 */
export function testModulatoryRobustness(subject, cs, formatter) {
  if (!subject.length || !cs.length) return { error: 'Empty' };

  const meter = formatter.meter;

  const answer = subject.map(
    (n) =>
      new NoteEvent(
        n.pitch + 7,
        n.duration,
        n.onset,
        new ScaleDegree(((n.scaleDegree.degree + 4 - 1) % 7) + 1, n.scaleDegree.alteration),
        n.abcNote
      )
  );

  const sims = findSimultaneities(answer, cs, meter);
  const violations = checkParallelPerfects(sims, formatter);
  const observations = [];

  // Analyze interval profile
  const strongSims = sims.filter((s) => s.metricWeight >= 0.5);
  let consonant = 0,
    dissonant = 0,
    thirds = 0,
    sixths = 0,
    perfects = 0;

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
    const consPercent = Math.round((consonant / strongSims.length) * 100);
    observations.push({
      type: consPercent >= 80 ? 'strength' : consPercent >= 60 ? 'info' : 'consideration',
      description: `Against answer: ${consPercent}% consonant on strong beats (${thirds} 3rds, ${sixths} 6ths, ${perfects} perfect)`,
    });
  }

  if (violations.length) {
    for (const v of violations) {
      observations.push({ type: 'consideration', description: v.description });
    }
  } else {
    observations.push({ type: 'strength', description: 'No parallel 5ths or 8ves against answer' });
  }

  // Get detailed dissonance scoring
  const detailedScoring = analyzeAllDissonances(sims);

  // Check for strong-beat dissonances - only flag those that are poorly handled
  // Well-handled dissonances (suspensions, passing tones, etc.) are not issues
  if (detailedScoring?.dissonances) {
    const poorDissonances = detailedScoring.dissonances.filter(d =>
      d.isStrongBeat && d.score < -1.0
    );
    if (poorDissonances.length > 0) {
      for (const d of poorDissonances.slice(0, 3)) {
        observations.push({
          type: 'issue',
          description: `Poorly handled dissonance vs answer: ${d.interval} at ${formatter.formatBeat(d.onset)} (score: ${d.score.toFixed(1)})`,
          onset: d.onset,
        });
      }
      if (poorDissonances.length > 3) {
        observations.push({
          type: 'issue',
          description: `...and ${poorDissonances.length - 3} more poorly handled dissonances vs answer`,
        });
      }
    }
  }

  return {
    violations,
    intervalProfile: { consonant, dissonant, thirds, sixths, perfects },
    observations,
    detailedScoring, // Include for use in scoring.js
  };
}

/**
 * Convert semitone interval to sequence class for pattern matching.
 * For MELODIC sequences, we match the melodic shape - direction matters!
 *
 * - 2nds (1-2 st), 3rds (3-4 st): same class regardless of M/m, but direction preserved
 * - 6ths (8-9 st), 7ths (10-11 st): same class regardless of M/m, direction preserved
 * - Unison (0) and Octave (±12): same class
 * - P4 (5 st) and P5 (7 st): SEPARATE classes, direction preserved
 *   (P4 up ≠ P5 down for melodic sequences - the melodic shape is different)
 *
 * Note: Inversion equivalence (P4 up ≡ P5 down) applies to HARMONIC intervals,
 * not melodic sequence matching where the contour matters.
 */
function toSequenceClass(semitones) {
  const abs = Math.abs(semitones);
  const sign = Math.sign(semitones);

  // Unison and octave are same class
  if (abs === 0 || abs === 12) return { class: 1, dir: sign || 1 };

  // 2nds (1-2 semitones)
  if (abs === 1 || abs === 2) return { class: 2, dir: sign };

  // 3rds (3-4 semitones)
  if (abs === 3 || abs === 4) return { class: 3, dir: sign };

  // P4 and P5: separate classes, direction preserved
  // P4 up (+5) is NOT equivalent to P5 down (-7) for melodic sequences
  if (abs === 5) return { class: 4, dir: sign };  // P4
  if (abs === 7) return { class: 5, dir: sign };  // P5

  // Tritone
  if (abs === 6) return { class: 'TT', dir: sign };

  // 6ths (8-9 semitones)
  if (abs === 8 || abs === 9) return { class: 6, dir: sign };

  // 7ths (10-11 semitones)
  if (abs === 10 || abs === 11) return { class: 7, dir: sign };

  // Larger intervals: use semitones directly
  return { class: abs, dir: sign };
}

function sequenceClassesEqual(a, b) {
  return a.class === b.class && a.dir === b.dir;
}

function intervalClassPatternsMatch(pattern1, pattern2) {
  if (pattern1.length !== pattern2.length) return false;
  for (let i = 0; i < pattern1.length; i++) {
    if (!sequenceClassesEqual(pattern1[i], pattern2[i])) return false;
  }
  return true;
}

/**
 * Detect melodic sequences in a voice
 * A sequence is a melodic pattern that repeats (with or without transposition)
 * Uses interval CLASSES not exact semitones (M3 and m3 are both "3rd")
 * @param {NoteEvent[]} notes - Array of notes to analyze
 * @param {number} minLength - Minimum number of notes in a sequence unit (default 3)
 * @returns {Object} - Detected sequences with their patterns
 */
export function detectSequences(notes, minLength = 3) {
  if (notes.length < minLength * 2) {
    return { sequences: [], hasSequences: false, noteRanges: [] };
  }

  // Build interval pattern using sequence classes (not raw semitones)
  const intervalClasses = [];
  const rawIntervals = [];
  for (let i = 1; i < notes.length; i++) {
    const semitones = notes[i].pitch - notes[i - 1].pitch;
    intervalClasses.push(toSequenceClass(semitones));
    rawIntervals.push(semitones);
  }

  // Build rhythm pattern (relative durations)
  const rhythms = notes.map(n => n.duration);

  const sequences = [];

  // Try different sequence unit lengths
  for (let unitLen = minLength; unitLen <= Math.floor(notes.length / 2); unitLen++) {
    // Try each starting position
    for (let start = 0; start <= notes.length - unitLen * 2; start++) {
      const intervalPattern = intervalClasses.slice(start, start + unitLen - 1);
      const rawIntervalPattern = rawIntervals.slice(start, start + unitLen - 1);
      const rhythmPattern = rhythms.slice(start, start + unitLen);

      // Look for CONSECUTIVE repetitions of this pattern
      // A true melodic sequence must have adjacent repetitions - not scattered occurrences
      let repetitions = 1;
      let matches = [{ startNote: start, endNote: start + unitLen - 1 }];
      let nextPos = start + unitLen;

      // Only look at the immediately following position - sequences must be consecutive
      while (nextPos <= notes.length - unitLen) {
        const candidateIntervals = intervalClasses.slice(nextPos, nextPos + unitLen - 1);
        const candidateRhythms = rhythms.slice(nextPos, nextPos + unitLen);

        // Check if interval CLASSES AND rhythms match
        const intervalsMatch = intervalClassPatternsMatch(intervalPattern, candidateIntervals);
        const rhythmsMatch = rhythmsSimilar(rhythmPattern, candidateRhythms);

        if (intervalsMatch && rhythmsMatch) {
          repetitions++;
          matches.push({ startNote: nextPos, endNote: nextPos + unitLen - 1 });
          nextPos = nextPos + unitLen; // Move to the next consecutive position
        } else {
          // No match at the consecutive position - stop looking
          // This ensures we only detect true sequences, not scattered motifs
          break;
        }
      }

      // If we found at least one repetition, record it
      if (repetitions >= 2) {
        // Get the end note index from the last match
        const lastMatch = matches[matches.length - 1];
        const endNoteIdx = lastMatch.endNote;

        // Don't record if we already have a longer sequence covering this region
        const overlaps = sequences.some(seq =>
          seq.startNoteIndex <= start && seq.endNoteIndex >= endNoteIdx && seq.unitLength >= unitLen
        );

        if (!overlaps) {
          // Calculate transposition info (may be 0 for exact repetitions)
          const transpositions = matches.slice(1).map(m =>
            notes[m.startNote].pitch - notes[matches[0].startNote].pitch
          );

          sequences.push({
            startNoteIndex: start,
            endNoteIndex: endNoteIdx,
            unitLength: unitLen,
            repetitions,
            intervalPattern: rawIntervalPattern, // Store raw semitones for display
            intervalClassPattern: intervalPattern, // Store classes for reference
            rhythmPattern,
            matches,
            transpositions,
            isExactRepetition: transpositions.every(t => t === 0),
            startBeat: notes[start].onset,
            endBeat: notes[endNoteIdx].onset + notes[endNoteIdx].duration,
          });
        }
      }
    }
  }

  // Sort by total coverage (longer sequences covering more notes are more significant)
  sequences.sort((a, b) => (b.unitLength * b.repetitions) - (a.unitLength * a.repetitions));

  // Remove sequences that significantly overlap with longer/better sequences
  // A sequence is removed if:
  // 1. It's fully contained in a longer sequence, OR
  // 2. It overlaps >50% with a longer sequence (prefer the longer one)
  const filtered = sequences.filter((seq, i) => {
    for (let j = 0; j < i; j++) {
      const other = sequences[j];

      // Check for full containment
      if (seq.startNoteIndex >= other.startNoteIndex && seq.endNoteIndex <= other.endNoteIndex) {
        return false;
      }

      // Check for significant overlap (>50%)
      const overlapStart = Math.max(seq.startNoteIndex, other.startNoteIndex);
      const overlapEnd = Math.min(seq.endNoteIndex, other.endNoteIndex);
      if (overlapStart <= overlapEnd) {
        const overlapSize = overlapEnd - overlapStart + 1;
        const seqSize = seq.endNoteIndex - seq.startNoteIndex + 1;
        const overlapRatio = overlapSize / seqSize;
        if (overlapRatio > 0.5) {
          // More than 50% overlap with a better sequence - remove this one
          return false;
        }
      }
    }
    return true;
  });

  // Build note ranges covered by sequences (for leap penalty mitigation)
  const noteRanges = [];
  for (const seq of filtered) {
    for (const match of seq.matches) {
      noteRanges.push({ start: match.startNote, end: match.endNote });
    }
  }
  // Merge overlapping ranges
  noteRanges.sort((a, b) => a.start - b.start);
  const mergedRanges = [];
  for (const range of noteRanges) {
    if (mergedRanges.length === 0 || range.start > mergedRanges[mergedRanges.length - 1].end + 1) {
      mergedRanges.push({ ...range });
    } else {
      mergedRanges[mergedRanges.length - 1].end = Math.max(mergedRanges[mergedRanges.length - 1].end, range.end);
    }
  }

  return {
    sequences: filtered,
    hasSequences: filtered.length > 0,
    longestSequence: filtered[0] || null,
    totalSequentialNotes: mergedRanges.reduce((sum, r) => sum + (r.end - r.start + 1), 0),
    sequenceRatio: mergedRanges.reduce((sum, r) => sum + (r.end - r.start + 1), 0) / notes.length,
    noteRanges: mergedRanges,
  };
}

/**
 * Check if two rhythm patterns are similar (within 10% tolerance)
 */
function rhythmsSimilar(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ratio = a[i] / b[i];
    if (ratio < 0.9 || ratio > 1.1) return false;
  }
  return true;
}

/**
 * Format interval as readable string (e.g., "+P5", "-3rd")
 */
function formatIntervalName(semitones) {
  const abs = Math.abs(semitones);
  const sign = semitones > 0 ? '+' : '-';

  const intervalNames = {
    0: 'unison', 1: 'm2', 2: 'M2', 3: 'm3', 4: 'M3', 5: 'P4',
    6: 'TT', 7: 'P5', 8: 'm6', 9: 'M6', 10: 'm7', 11: 'M7', 12: 'P8',
  };

  const name = intervalNames[abs] || `${abs}st`;
  return semitones === 0 ? 'unison' : `${sign}${name}`;
}

/**
 * Format duration as readable string
 */
function formatSeqDuration(beats) {
  if (beats === 4) return 'whole';
  if (beats === 2) return 'half';
  if (beats === 1) return 'quarter';
  if (beats === 0.5) return '8th';
  if (beats === 0.25) return '16th';
  if (beats === 3) return 'dotted half';
  if (beats === 1.5) return 'dotted quarter';
  if (beats === 0.75) return 'dotted 8th';
  return `${beats}`;
}

/**
 * Analyze sequences in a voice - returns factual description only
 * No interpretive commentary, just the pattern itself
 */
export function testSequentialPotential(notes, formatter) {
  const sequenceAnalysis = detectSequences(notes, 3);
  const detailedSequences = [];

  for (const seq of sequenceAnalysis.sequences) {
    // Build factual pattern description: duration and interval from previous
    const patternNotes = notes.slice(seq.startNoteIndex, seq.startNoteIndex + seq.unitLength);
    const patternSteps = [];

    for (let i = 0; i < patternNotes.length; i++) {
      const note = patternNotes[i];
      const dur = formatSeqDuration(note.duration);

      if (i === 0) {
        patternSteps.push({ step: i + 1, duration: dur, interval: null });
      } else {
        const interval = note.pitch - patternNotes[i - 1].pitch;
        patternSteps.push({ step: i + 1, duration: dur, interval: formatIntervalName(interval) });
      }
    }

    // Transposition between repetitions (factual)
    let transposition = null;
    if (!seq.isExactRepetition && seq.transpositions.length > 0) {
      const avgTransp = seq.transpositions.reduce((a, b) => a + b, 0) / seq.transpositions.length;
      const rounded = Math.round(avgTransp);
      if (rounded !== 0) {
        transposition = `${rounded > 0 ? '+' : ''}${rounded} semitones`;
      }
    }

    detailedSequences.push({
      startNote: seq.startNoteIndex + 1,
      endNote: seq.endNoteIndex + 1,
      unitLength: seq.unitLength,
      repetitions: seq.repetitions,
      isExact: seq.isExactRepetition,
      transposition,
      pattern: patternSteps,
      noteRanges: seq.matches.map(m => ({ start: m.startNote, end: m.endNote })),
    });
  }

  return {
    ...sequenceAnalysis,
    detailedSequences,
  };
}

// Helper function
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
