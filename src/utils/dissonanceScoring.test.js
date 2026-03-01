import { describe, expect, it } from 'vitest';
import { createAnalysisContext, setP4Treatment } from './dissonanceScoring';

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
