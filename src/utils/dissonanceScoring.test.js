import { describe, expect, it } from 'vitest';
import { createAnalysisContext, setP4Treatment } from './dissonanceScoring';
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

describe('dissonance exit voice-resolution scoring', () => {
  it('preserves per-voice non-step exit leap penalty reason and component delta', () => {
    const sims = [
      new Simultaneity(0, makeNote(64, 0, 1), makeNote(60, 0, 1), 1),
      new Simultaneity(1, makeNote(65, 1, 1), makeNote(60, 1, 1), 0.5),
      new Simultaneity(2, makeNote(64, 2, 1), makeNote(57, 2, 1), 1),
    ];

    const result = scoreDissonance(sims[1], sims, 1, [], { treatP4AsDissonant: true });

    expect(result.exit.details).toContain('V2 leaves dissonance by melodic skip: -0.50');
    expect(result.exit.v2ResolutionComponent).toBe(-0.5);
    expect(result.exit.v1ResolutionComponent).toBe(0);
  });
});
