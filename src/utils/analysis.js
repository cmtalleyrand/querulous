import { NoteEvent, Simultaneity, MelodicMotion, ScaleDegree } from '../types';
import { metricWeight, pitchName } from './formatter';

/**
 * Find all simultaneous note pairs between two voices
 */
export function findSimultaneities(v1, v2) {
  const sims = [];

  for (const n1 of v1) {
    const s1 = n1.onset;
    const e1 = n1.onset + n1.duration;

    for (const n2 of v2) {
      const s2 = n2.onset;
      const e2 = n2.onset + n2.duration;

      if (s1 < e2 && s2 < e1) {
        const start = Math.max(s1, s2);
        sims.push(new Simultaneity(start, n1, n2, metricWeight(start)));
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
    if (![5, 8].includes(curr.interval.class)) continue;

    // Find the next simultaneity where BOTH voices have moved
    for (let j = i + 1; j < uniqueSims.length; j++) {
      const next = uniqueSims[j];

      const v1Moved = next.voice1Note !== curr.voice1Note;
      const v2Moved = next.voice2Note !== curr.voice2Note;
      if (!v1Moved || !v2Moved) continue;

      if (next.interval.class !== curr.interval.class) break;

      const d1 = Math.sign(next.voice1Note.pitch - curr.voice1Note.pitch);
      const d2 = Math.sign(next.voice2Note.pitch - curr.voice2Note.pitch);

      // Parallel motion = same direction
      if (d1 === d2 && d1 !== 0) {
        const checkKey = `${curr.voice1Note.pitch}-${curr.voice2Note.pitch}-${next.voice1Note.pitch}-${next.voice2Note.pitch}`;
        if (!checked.has(checkKey)) {
          checked.add(checkKey);
          const names = { 5: '5ths', 8: '8ves' };
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
 * Analyze contour independence between two voices
 */
export function testContourIndependence(subject, cs, formatter) {
  const sMotions = [];
  const csMotions = [];

  for (let i = 1; i < subject.length; i++) {
    sMotions.push(new MelodicMotion(subject[i].onset, subject[i - 1].pitch, subject[i].pitch));
  }
  for (let i = 1; i < cs.length; i++) {
    csMotions.push(new MelodicMotion(cs[i].onset, cs[i - 1].pitch, cs[i].pitch));
  }

  let parallel = 0,
    similar = 0,
    contrary = 0,
    oblique = 0;
  const details = [];

  for (const sm of sMotions) {
    for (const cm of csMotions) {
      if (Math.abs(sm.time - cm.time) <= 0.25) {
        if (sm.direction === 0 || cm.direction === 0) {
          oblique++;
        } else if (sm.direction === cm.direction) {
          if (sm.semitones === cm.semitones) {
            parallel++;
            if (sm.semitones >= 5) {
              details.push({ description: `Parallel leaps at ${formatter.formatBeat(sm.time)}` });
            }
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
  if (total > 0 && (parallel + similar) / total > 0.6) {
    assessment = 'Voices move together frequently—consider more contrary motion';
  } else if (contraryRatio > 0.35) {
    assessment = 'Good balance of motion types';
  }

  return {
    parallelMotions: parallel,
    similarMotions: similar,
    contraryMotions: contrary,
    obliqueMotions: oblique,
    parallelRatio,
    similarRatio,
    contraryRatio,
    obliqueRatio,
    details,
    assessment,
  };
}

/**
 * Analyze harmonic implications of a subject
 */
export function testHarmonicImplication(subject, tonic, mode, formatter) {
  if (!subject.length) return { error: 'No notes' };

  const degrees = subject.map((n) => n.scaleDegree);
  const observations = [];

  // Opening analysis
  const opening = degrees[0];
  const isTonicChordTone = [[1, 0], [3, 0], [5, 0]].some(
    ([d, a]) => opening.degree === d && opening.alteration === a
  );
  observations.push({
    type: isTonicChordTone ? 'strength' : 'consideration',
    description: isTonicChordTone
      ? `Opens on ${opening}, a tonic chord tone`
      : `Opens on ${opening}, not a tonic chord tone`,
  });

  // Terminal analysis
  const terminal = degrees[degrees.length - 1];
  const ti =
    {
      1: { q: 'strong', d: 'Ends on ^1—clean I→V' },
      2: { q: 'good', d: 'Ends on ^2—pre-dominant' },
      5: { q: 'ambiguous', d: 'Ends on ^5—V→V stasis' },
      7: { q: 'strong', d: 'Ends on ^7—dominant pull' },
      4: { q: 'workable', d: 'Ends on ^4' },
      3: { q: 'workable', d: 'Ends on ^3' },
    }[terminal.degree] || { q: 'unusual', d: `Ends on ${terminal}` };

  observations.push({
    type: ti.q === 'strong' ? 'strength' : ti.q === 'ambiguous' ? 'consideration' : 'info',
    description: ti.d,
  });

  // Dominant arrival
  let domArr = null;
  const subLen = subject[subject.length - 1].onset + subject[subject.length - 1].duration;

  for (let i = 0; i < subject.length; i++) {
    const d = degrees[i];
    if (
      (d.degree === 5 && d.alteration === 0 && metricWeight(subject[i].onset) >= 0.5) ||
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

  return {
    opening: { degree: opening.toString(), isTonicChordTone },
    terminal: { degree: terminal.toString(), ...ti },
    dominantArrival: domArr,
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

  if (unique.length === 1) {
    observations.push({ type: 'consideration', description: `Uniform rhythm (all ${names[0]}s)` });
  } else {
    observations.push({ type: 'info', description: `${unique.length} note values: ${names.join(', ')}` });
  }

  const hasLS = durs.some((d, i) => i > 0 && durs[i - 1] >= d * 2);
  const hasSL = durs.some((d, i) => i > 0 && durs[i - 1] <= d / 2);

  if (hasLS && hasSL) {
    observations.push({ type: 'strength', description: 'Good rhythmic contrast' });
  }

  return { uniqueDurations: unique.length, durationNames: names, observations };
}

/**
 * Analyze rhythmic complementarity between subject and countersubject
 */
export function testRhythmicComplementarity(subject, cs) {
  if (!subject.length || !cs.length) return { error: 'Empty' };

  const sOnsets = new Set(subject.map((n) => Math.round(n.onset * 100) / 100));
  const cOnsets = new Set(cs.map((n) => Math.round(n.onset * 100) / 100));
  const shared = [...sOnsets].filter((o) => cOnsets.has(o));
  const ratio = shared.length / Math.max(sOnsets.size, cOnsets.size);

  const observations = [];
  if (ratio > 0.8) {
    observations.push({
      type: 'consideration',
      description: `${Math.round(ratio * 100)}% attacks coincide—homorhythmic`,
    });
  } else if (ratio < 0.3) {
    observations.push({
      type: 'strength',
      description: `${Math.round(ratio * 100)}% overlap—good complementarity`,
    });
  } else {
    observations.push({ type: 'info', description: `${Math.round(ratio * 100)}% attacks coincide` });
  }

  let strong = 0;
  for (const o of shared) {
    if (metricWeight(o) >= 0.75) strong++;
  }

  return { overlapRatio: ratio, strongBeatCollisions: strong, observations };
}

/**
 * Test stretto viability at various time intervals
 */
export function testStrettoViability(subject, formatter, minOverlap = 0.5, increment = 1, octaveDisp = 12) {
  if (subject.length < 2) return { error: 'Too short' };

  const subLen = subject[subject.length - 1].onset + subject[subject.length - 1].duration;
  const maxDist = subLen * (1 - minOverlap);
  const results = [];

  for (let dist = increment; dist <= maxDist; dist += increment) {
    const comes = subject.map(
      (n) => new NoteEvent(n.pitch + octaveDisp, n.duration, n.onset + dist, n.scaleDegree, n.abcNote)
    );
    const sims = findSimultaneities(subject, comes);
    const issues = [];
    const warnings = [];

    // Check parallel perfects (serious issue)
    for (const v of checkParallelPerfects(sims, formatter)) {
      issues.push({ onset: v.onset, description: v.description, type: 'parallel' });
    }

    // Check strong-beat dissonances (serious issue for beats 1 and 3)
    for (const sim of sims) {
      if (sim.metricWeight >= 0.75 && !sim.interval.isConsonant()) {
        issues.push({
          onset: sim.onset,
          description: `${sim.interval} (${pitchName(sim.voice1Note.pitch)}-${pitchName(sim.voice2Note.pitch)}) on strong beat at ${formatter.formatBeat(sim.onset)}`,
          type: 'dissonance',
        });
      }
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

    // Check direct motion into perfect intervals (warning)
    for (let i = 0; i < uniqueSims.length - 1; i++) {
      const curr = uniqueSims[i];
      const next = uniqueSims[i + 1];

      if ([5, 8].includes(next.interval.class)) {
        const v1Dir = next.voice1Note.pitch - curr.voice1Note.pitch;
        const v2Dir = next.voice2Note.pitch - curr.voice2Note.pitch;

        // Similar motion into a perfect interval with upper voice leap
        if (v1Dir !== 0 && v2Dir !== 0 && Math.sign(v1Dir) === Math.sign(v2Dir)) {
          const upperLeap = Math.abs(v1Dir > v2Dir ? v1Dir : v2Dir) > 2;
          if (upperLeap) {
            warnings.push({
              onset: next.onset,
              description: `Direct ${next.interval.class === 5 ? '5th' : '8ve'} by similar motion at ${formatter.formatBeat(next.onset)}`,
              type: 'direct',
            });
          }
        }
      }
    }

    // Build interval timeline for visualization
    const intervalPoints = [];
    const beatSnapshots = new Map();

    for (const sim of sims) {
      const snapBeat = Math.round(sim.onset * 2) / 2;
      if (!beatSnapshots.has(snapBeat)) {
        beatSnapshots.set(snapBeat, {
          onset: sim.onset,
          beat: snapBeat,
          interval: sim.interval,
          intervalClass: sim.interval.class,
          intervalName: sim.interval.toString(),
          duxPitch: sim.voice1Note.pitch,
          comesPitch: sim.voice2Note.pitch,
          isConsonant: sim.interval.isConsonant(),
          isStrong: sim.metricWeight >= 0.75,
        });
      }
    }

    const sortedBeats = [...beatSnapshots.keys()].sort((a, b) => a - b);
    for (const beat of sortedBeats) {
      intervalPoints.push(beatSnapshots.get(beat));
    }

    results.push({
      distance: dist,
      distanceFormatted: formatter.formatDistance(dist),
      overlapPercent: Math.round(((subLen - dist) / subLen) * 100),
      issueCount: issues.length,
      warningCount: warnings.length,
      issues,
      warnings,
      intervalPoints,
      viable: issues.length === 0,
      clean: issues.length === 0 && warnings.length === 0,
    });
  }

  return {
    subjectLengthBeats: subLen,
    allResults: results,
    viableStrettos: results.filter((r) => r.viable),
    cleanStrettos: results.filter((r) => r.clean),
    problematicStrettos: results.filter((r) => !r.viable),
  };
}

/**
 * Analyze tonal answer requirements
 */
export function testTonalAnswer(subject, mode, keyInfo, formatter) {
  if (!subject.length) return { error: 'Empty' };

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
        if (degrees[j].degree === 1 && degrees[j].alteration === 0 && metricWeight(subject[j].onset) >= 0.5) {
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
      observations.push({ type: 'info', description: `Real transposition resumes at note ${mutationPoint + 1}` });
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

  const analyze = (sims, name) => {
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

    for (const s of strong) {
      if (s.interval.class === 4 && s.voice2Note.pitch < s.voice1Note.pitch) {
        issues.push({
          config: name,
          description: `4th against bass (${pitchName(s.voice1Note.pitch)}-${pitchName(s.voice2Note.pitch)}) at ${formatter.formatBeat(s.onset)}`,
        });
      }
    }

    for (const s of strong) {
      if (!s.interval.isConsonant() && s.metricWeight >= 0.75) {
        issues.push({
          config: name,
          description: `${s.interval} on downbeat at ${formatter.formatBeat(s.onset)}`,
        });
      }
    }

    return {
      issues,
      thirds,
      sixths,
      perfects,
      dissonant,
      imperfectRatio: strong.length > 0 ? (thirds + sixths) / strong.length : 0,
    };
  };

  const orig = analyze(findSimultaneities(subject, cs), 'CS above');
  const csInv = cs.map((n) => new NoteEvent(n.pitch - 12, n.duration, n.onset, n.scaleDegree, n.abcNote));
  const inv = analyze(findSimultaneities(subject, csInv), 'CS below');

  const observations = [];

  observations.push({
    type: 'info',
    description: `Original (CS above): ${orig.thirds} 3rds, ${orig.sixths} 6ths, ${orig.perfects} perfect consonances`,
  });
  observations.push({
    type: 'info',
    description: `Inverted (CS below): ${inv.thirds} 3rds, ${inv.sixths} 6ths, ${inv.perfects} perfect consonances`,
  });

  for (const i of orig.issues) {
    observations.push({ type: 'consideration', description: `Original: ${i.description}` });
  }
  for (const i of inv.issues) {
    observations.push({ type: 'consideration', description: `Inverted: ${i.description}` });
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

  const sims = findSimultaneities(answer, cs);
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

  // Check for strong-beat dissonances
  const strongDissonances = strongSims.filter((s) => !s.interval.isConsonant());
  if (strongDissonances.length > 0) {
    for (const s of strongDissonances.slice(0, 3)) {
      observations.push({
        type: 'consideration',
        description: `Dissonance on strong beat: ${s.interval} at ${formatter.formatBeat(s.onset)}`,
      });
    }
    if (strongDissonances.length > 3) {
      observations.push({
        type: 'consideration',
        description: `...and ${strongDissonances.length - 3} more strong-beat dissonances`,
      });
    }
  }

  return { violations, intervalProfile: { consonant, dissonant, thirds, sixths, perfects }, observations };
}
