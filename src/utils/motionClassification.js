/**
 * Shared motion classification across analysis/scoring pipelines.
 *
 * This provides a single source of truth for between-voice motion labels
 * so contour-independence and dissonance scoring consume the same definitions.
 */

export function getIntervalMagnitude(semitones) {
  const abs = Math.abs(semitones);
  if (abs === 0) return { type: 'unison', size: abs };
  if (abs <= 2) return { type: 'step', size: abs };
  if (abs <= 4) return { type: 'skip', size: abs };
  if (abs <= 7) return { type: 'perfect_leap', size: abs };
  if (abs === 12) return { type: 'octave', size: abs };
  return { type: 'large_leap', size: abs };
}

/**
 * Determine motion type between two simultaneities.
 *
 * Returns one of:
 * 'unknown' | 'static' | 'reentry' | 'oblique' | 'contrary'
 * | 'parallel' | 'similar_step' | 'similar_same_type' | 'similar'
 */
export function classifyMotion(prevSim, currSim, restContext = null) {
  if (!prevSim) {
    return {
      type: 'unknown', v1Moved: true, v2Moved: true,
      v1Interval: 0, v2Interval: 0, fromRest: false, isReentry: false,
    };
  }

  const v1Moved = currSim.voice1Note !== prevSim.voice1Note &&
                  currSim.voice1Note.pitch !== prevSim.voice1Note.pitch;
  const v2Moved = currSim.voice2Note !== prevSim.voice2Note &&
                  currSim.voice2Note.pitch !== prevSim.voice2Note.pitch;

  const v1Interval = v1Moved ? Math.abs(currSim.voice1Note.pitch - prevSim.voice1Note.pitch) : 0;
  const v2Interval = v2Moved ? Math.abs(currSim.voice2Note.pitch - prevSim.voice2Note.pitch) : 0;

  const v1FromRest = restContext?.entryFromRest?.v1 || false;
  const v2FromRest = restContext?.entryFromRest?.v2 || false;
  const fromRest = v1FromRest || v2FromRest;

  let isReentry = false;
  if (restContext) {
    const v1RestDur = restContext.entryFromRest?.v1RestDuration || 0;
    const v2RestDur = restContext.entryFromRest?.v2RestDuration || 0;
    const v1LastNoteDur = prevSim.voice1Note.duration;
    const v2LastNoteDur = prevSim.voice2Note.duration;

    const v1IsReentry = v1FromRest && v1RestDur > 1.0 && v1RestDur > 2 * v1LastNoteDur;
    const v2IsReentry = v2FromRest && v2RestDur > 1.0 && v2RestDur > 2 * v2LastNoteDur;
    isReentry = v1IsReentry || v2IsReentry;
  }

  if (!v1Moved && !v2Moved) {
    return { type: 'static', v1Moved: false, v2Moved: false, v1Interval: 0, v2Interval: 0, fromRest, isReentry };
  }
  if (isReentry) {
    return { type: 'reentry', v1Moved, v2Moved, v1Interval, v2Interval, fromRest, isReentry: true };
  }
  if (!v1Moved || !v2Moved) {
    return { type: 'oblique', v1Moved, v2Moved, v1Interval, v2Interval, fromRest, isReentry };
  }

  const v1Dir = Math.sign(currSim.voice1Note.pitch - prevSim.voice1Note.pitch);
  const v2Dir = Math.sign(currSim.voice2Note.pitch - prevSim.voice2Note.pitch);

  if (v1Dir === -v2Dir) {
    return { type: 'contrary', v1Moved: true, v2Moved: true, v1Interval, v2Interval, fromRest, isReentry };
  }

  if (v1Interval === v2Interval) {
    return { type: 'parallel', v1Moved: true, v2Moved: true, v1Interval, v2Interval, fromRest, isReentry };
  }

  const v1IsStep = v1Interval <= 2;
  const v2IsStep = v2Interval <= 2;
  if (v1IsStep || v2IsStep) {
    return { type: 'similar_step', v1Moved: true, v2Moved: true, v1Interval, v2Interval, fromRest, isReentry };
  }

  const v1Mag = getIntervalMagnitude(v1Interval);
  const v2Mag = getIntervalMagnitude(v2Interval);
  if (v1Mag.type === v2Mag.type) {
    return { type: 'similar_same_type', v1Moved: true, v2Moved: true, v1Interval, v2Interval, intervalType: v1Mag.type, fromRest, isReentry };
  }

  return { type: 'similar', v1Moved: true, v2Moved: true, v1Interval, v2Interval, fromRest, isReentry };
}
