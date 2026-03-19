import { describe, expect, it } from 'vitest';
import { analyzeAllDissonances, createAnalysisContext, setP4Treatment } from './dissonanceScoring';
import { computeNoteSalience } from './harmonicAnalysis';
import { NoteEvent, ScaleDegree, Simultaneity } from '../types/music';
import { scoreDissonance } from './dissonanceScoring';

describe('dissonanceScoring P4 defaults', () => {
  it('defaults context to treating P4 as dissonant', () => {
    setP4Treatment(true);
    const ctx = createAnalysisContext();
    expect(ctx.treatP4AsDissonant).toBe(true);
  });

  it('inherits updated global P4 treatment when option is omitted', () => {
    setP4Treatment(false);
    const ctx = createAnalysisContext();
    expect(ctx.treatP4AsDissonant).toBe(false);

    // Restore default for subsequent tests/callers
    setP4Treatment(true);
  });

  it('respects explicit per-call override even when global differs', () => {
    setP4Treatment(true);
    const ctx = createAnalysisContext({ treatP4AsDissonant: false });
    expect(ctx.treatP4AsDissonant).toBe(false);
  });
});

function makeNote(pitch, onset, duration) {
  return new NoteEvent(pitch, duration, onset, new ScaleDegree(1));
}

describe('dissonance rest-resolution messaging', () => {
  it('does not emit invalid-both-rests message when only one voice rests before resolution', () => {
    // Curr dissonance at t=1: P4 (65 vs 60), next consonance at t=2: m3 (64 vs 60)
    // Voice 1 ends early at 1.2 -> long rest to t=2
    // Voice 2 sustains through to t=2 -> no rest
    const sims = [
      new Simultaneity(0, makeNote(64, 0, 1), makeNote(60, 0, 1), 1),
      new Simultaneity(1, makeNote(65, 1, 0.2), makeNote(60, 1, 1.0), 0.5),
      new Simultaneity(2, makeNote(64, 2, 1), makeNote(60, 2, 1), 1),
    ];

    const result = scoreDissonance(sims[1], sims, 1, [], { treatP4AsDissonant: true });
    const exitDetails = result.exit.details.join(' | ');

    expect(exitDetails).toContain('Delayed resolution (v1 rested');
    expect(exitDetails).not.toContain('Invalid resolution (both voices rested then moved');
  });

  it('emits invalid-both-rests message only when both voices have long rests', () => {
    const sims = [
      new Simultaneity(0, makeNote(64, 0, 1), makeNote(60, 0, 1), 1),
      // Both voices end early at 1.2 -> long rests to t=2
      new Simultaneity(1, makeNote(65, 1, 0.2), makeNote(60, 1, 0.2), 0.5),
      // Both voices also move at re-entry
      new Simultaneity(2, makeNote(63, 2, 1), makeNote(59, 2, 1), 1),
    ];

    const result = scoreDissonance(sims[1], sims, 1, [], { treatP4AsDissonant: true });
    const exitDetails = result.exit.details.join(' | ');

    expect(exitDetails).toContain('Invalid resolution (both voices rested then moved');
  });

  it('treats both-rested-but-not-both-moved as delayed rather than invalid', () => {
    const sims = [
      new Simultaneity(0, makeNote(64, 0, 1), makeNote(60, 0, 1), 1),
      // Both voices end early at 1.2 -> long rests to t=2
      new Simultaneity(1, makeNote(65, 1, 0.2), makeNote(60, 1, 0.2), 0.5),
      // Re-entry on same pitches as dissonance -> no melodic movement into next simultaneity
      new Simultaneity(2, makeNote(65, 2, 1), makeNote(60, 2, 1), 1),
    ];

    const result = scoreDissonance(sims[1], sims, 1, [], { treatP4AsDissonant: true });
    const exitDetails = result.exit.details.join(' | ');

    expect(exitDetails).toContain('Delayed resolution (both voices rested, but not both moved');
    expect(exitDetails).not.toContain('Invalid resolution (both voices rested then moved');
  });
});


describe('analyzeAllDissonances passing-sequence exit bonus', () => {
  function makeThreeSimPassage({ middleDuration = 1, middleOnset = 1 }) {
    return [
      new Simultaneity(0, makeNote(64, 0, 1), makeNote(60, 0, 1), 1),
      new Simultaneity(middleOnset, makeNote(62, middleOnset, middleDuration), makeNote(60, middleOnset, middleDuration), 0.5),
      new Simultaneity(2, makeNote(64, 2, 1), makeNote(60, 2, 1), 1),
    ];
  }

  it('adds +0.25 only when both passing motion and sequence membership hold', () => {
    const passingNoSequence = analyzeAllDissonances(makeThreeSimPassage({ middleDuration: 0.125, middleOnset: 1 }), {
      treatP4AsDissonant: true,
      sequenceBeatRanges: [],
    }).all[1];

    const passingWithSequence = analyzeAllDissonances(makeThreeSimPassage({ middleDuration: 0.125, middleOnset: 1 }), {
      treatP4AsDissonant: true,
      sequenceBeatRanges: [{ startBeat: 1, endBeat: 1 }],
    }).all[1];

    const nonPassingNoSequence = analyzeAllDissonances(makeThreeSimPassage({ middleDuration: 1, middleOnset: 1 }), {
      treatP4AsDissonant: true,
      sequenceBeatRanges: [],
    }).all[1];

    const nonPassingWithSequence = analyzeAllDissonances(makeThreeSimPassage({ middleDuration: 1, middleOnset: 1 }), {
      treatP4AsDissonant: true,
      sequenceBeatRanges: [{ startBeat: 1, endBeat: 1 }],
    }).all[1];

    expect(passingWithSequence.score - passingNoSequence.score).toBeCloseTo(0.25, 5);
    expect(passingWithSequence.exitScore - passingNoSequence.exitScore).toBeCloseTo(0.25, 5);
    expect((passingWithSequence.patterns || []).some((pattern) => pattern.type === 'passing_sequence_exit' && pattern.exitBonus === 0.25)).toBe(true);

    expect((passingNoSequence.patterns || []).some((pattern) => pattern.type === 'passing_sequence_exit')).toBe(false);
    expect(nonPassingWithSequence.score).toBeCloseTo(nonPassingNoSequence.score, 5);
    expect((nonPassingWithSequence.patterns || []).some((pattern) => pattern.type === 'passing_sequence_exit')).toBe(false);
  });
  it('is symmetric under voice reassignment for equivalent interval/motion patterns', () => {
    const baseSims = [
      new Simultaneity(0, makeNote(64, 0, 1), makeNote(60, 0, 1), 1),
      new Simultaneity(1, makeNote(65, 1, 1), makeNote(60, 1, 1), 0.5),
      new Simultaneity(2, makeNote(64, 2, 1), makeNote(57, 2, 1), 1),
    ];

    const swappedSims = [
      new Simultaneity(0, makeNote(60, 0, 1), makeNote(64, 0, 1), 1),
      new Simultaneity(1, makeNote(60, 1, 1), makeNote(65, 1, 1), 0.5),
      new Simultaneity(2, makeNote(57, 2, 1), makeNote(64, 2, 1), 1),
    ];

    const base = scoreDissonance(baseSims[1], baseSims, 1, [], { treatP4AsDissonant: true });
    const swapped = scoreDissonance(swappedSims[1], swappedSims, 1, [], { treatP4AsDissonant: true });

    expect(Math.abs(base.exit.v1ResolutionComponent ?? 0)).toBe(Math.abs(swapped.exit.v2ResolutionComponent ?? 0));
    expect(Math.abs(base.exit.v2ResolutionComponent ?? 0)).toBe(Math.abs(swapped.exit.v1ResolutionComponent ?? 0));
  });

});

describe('passingness assignment and D→D base penalty policy', () => {
  it('assigns passingMotion for dissonances even when they are non-passing', () => {
    const nonPassing = analyzeAllDissonances([
      new Simultaneity(0, makeNote(64, 0, 1), makeNote(60, 0, 1), 1),
      new Simultaneity(1, makeNote(62, 1, 1), makeNote(60, 1, 1), 0.5),
      new Simultaneity(2, makeNote(64, 2, 1), makeNote(60, 2, 1), 1),
    ], { treatP4AsDissonant: true }).all[1];

    expect(nonPassing.passingMotion).toBeTruthy();
    expect(nonPassing.passingMotion.isPassing).toBe(false);
    expect(nonPassing.passingMotion.mitigation).toBe(0);
  });

  it('keeps D→D base penalty at -0.75 before passingness mitigation', () => {
    const sims = [
      new Simultaneity(0, makeNote(64, 0, 1), makeNote(60, 0, 1), 1),
      new Simultaneity(0.5, makeNote(62, 0.5, 0.125), makeNote(60, 0.5, 0.125), 0.25),
      new Simultaneity(1, makeNote(65, 1, 1), makeNote(60, 1, 1), 1),
    ];

    const result = scoreDissonance(sims[1], sims, 1, [], { treatP4AsDissonant: true });
    expect(result.exit.baseExitComponent).toBeCloseTo(-0.75, 5);
    expect(result.exit.details.join(' | ')).toContain('Leads to another dissonance (no resolution): -0.75');
  });

  it('applies mitigation when passingness is positive even if isPassing is false', () => {
    const base = analyzeAllDissonances([
      new Simultaneity(0, makeNote(64, 0, 1), makeNote(60, 0, 1), 1),
      new Simultaneity(1, makeNote(65, 1, 1), makeNote(60, 1, 1), 0.5),
      new Simultaneity(2, makeNote(64, 2, 1), makeNote(60, 2, 1), 1),
    ], { treatP4AsDissonant: true }).all[1];

    const partial = analyzeAllDissonances([
      new Simultaneity(0, makeNote(64, 0, 1), makeNote(60, 0, 1), 1),
      new Simultaneity(1.5, makeNote(65, 1.5, 0.5), makeNote(60, 1.5, 0.5), 0.25),
      new Simultaneity(2, makeNote(64, 2, 1), makeNote(60, 2, 1), 1),
    ], { treatP4AsDissonant: true }).all[1];

    expect(partial.passingMotion).toBeTruthy();
    expect(partial.passingMotion.isPassing).toBe(false);
    expect(partial.passingMotion.passingness).toBeGreaterThan(0);
    expect(partial.passingMotion.passingness).toBeLessThan(1);
    expect(partial.passingMotion.mitigation).toBeGreaterThan(0);
    expect(Math.abs(partial.passingCharacterAdj || 0)).toBeGreaterThan(0);
    expect((partial.entryMitigationDetails || []).length + (partial.exitMitigationDetails || []).length).toBeGreaterThan(0);
    expect(partial.score).not.toBeCloseTo(base.score, 5);
  });
});


describe('pair-quality summary statistics', () => {
  function makeSimultaneity(onset, v1Pitch, v1Duration, v2Pitch = 60, v2Duration = v1Duration) {
    return new Simultaneity(
      onset,
      makeNote(v1Pitch, onset, v1Duration),
      makeNote(v2Pitch, onset, v2Duration),
      1
    );
  }

  it('weights an equally bad downbeat dissonance more heavily than an equally bad weak-beat dissonance', () => {
    const sims = [
      makeSimultaneity(0, 61, 1),
      makeSimultaneity(1, 67, 1),
      makeSimultaneity(2, 63, 1),
      makeSimultaneity(2.5, 71, 0.5),
      makeSimultaneity(3, 63, 1),
      makeSimultaneity(4, 64, 1),
      makeSimultaneity(5, 65, 1),
      makeSimultaneity(6, 64, 1),
    ];

    const analysis = analyzeAllDissonances(sims, { treatP4AsDissonant: true, meter: [4, 4] });
    const dissonances = analysis.all.filter((result) => !result.isConsonant);
    const [downbeatBad, weakBad, goodDissonance] = dissonances;

    expect(downbeatBad.score).toBeCloseTo(-1, 5);
    expect(weakBad.score).toBeCloseTo(-1, 5);
    expect(goodDissonance.score).toBeGreaterThan(0);

    const downbeatSalience = Math.max(
      computeNoteSalience(sims[0].voice1Note, null, [4, 4]),
      computeNoteSalience(sims[0].voice2Note, null, [4, 4])
    );
    const weakSalience = Math.max(
      computeNoteSalience(sims[3].voice1Note, sims[2].voice1Note, [4, 4]),
      computeNoteSalience(sims[3].voice2Note, sims[2].voice2Note, [4, 4])
    );
    const goodSalience = Math.max(
      computeNoteSalience(sims[6].voice1Note, sims[5].voice1Note, [4, 4]),
      computeNoteSalience(sims[6].voice2Note, sims[5].voice2Note, [4, 4])
    );

    expect(downbeatSalience).toBeGreaterThan(weakSalience);

    const manualWeightedMean = (
      downbeatBad.score * downbeatSalience +
      weakBad.score * weakSalience +
      goodDissonance.score * goodSalience
    ) / (downbeatSalience + weakSalience + goodSalience);

    expect(analysis.summary.pairQualityComponents.salienceWeightedDissonanceHandling).toBeCloseTo(manualWeightedMean, 10);
    expect(analysis.summary.pairQualityComponents.salienceWeightedDissonanceHandling).toBeLessThan(analysis.summary.pairQualityComponents.averageDissonanceHandling);
  });

  it('computes pairQualityBeforeParallels exactly from the 40/30/30 component formula', () => {
    const sims = [
      makeSimultaneity(0, 64, 1),
      makeSimultaneity(0.5, 65, 0.5),
      makeSimultaneity(1, 64, 1),
    ];

    const analysis = analyzeAllDissonances(sims, { treatP4AsDissonant: true, meter: [4, 4] });
    const {
      allIntervalDurationWeightedMean,
      salienceWeightedDissonanceHandling,
      averageDissonanceHandling,
    } = analysis.summary.pairQualityComponents;

    expect(allIntervalDurationWeightedMean).not.toBeCloseTo(averageDissonanceHandling, 10);

    const manualPairQuality = (
      0.4 * allIntervalDurationWeightedMean +
      0.3 * salienceWeightedDissonanceHandling +
      0.3 * averageDissonanceHandling
    );

    expect(allIntervalDurationWeightedMean).toBeCloseTo(analysis.summary.overallAvgScore, 10);
    expect(analysis.summary.pairQualityBeforeParallels).toBeCloseTo(manualPairQuality, 10);
  });
});
