import { describe, expect, it } from 'vitest';
import { runDefaultAnalysis } from './defaultAnalysis';

describe('runDefaultAnalysis', () => {
  it('runs baseline analysis and returns a scored result', () => {
    const { results, scoreResult } = runDefaultAnalysis();

    expect(results.subject.length).toBeGreaterThan(0);
    expect(results.countersubject.length).toBeGreaterThan(0);
    expect(typeof results.countersubjectShift).toBe('number');
    expect(scoreResult).toBeTruthy();
    expect(typeof scoreResult.overall).toBe('number');
  });



  it('uses updated C# minor 2/2 defaults', () => {
    const { input } = runDefaultAnalysis();

    expect(input.key).toBe('C#');
    expect(input.mode).toBe('natural_minor');
    expect(input.noteLength).toBe('1/8');
    expect(input.meter).toEqual([2, 2]);
    expect(input.subject).toContain('C8');
    expect(input.countersubject).toContain('e2 d2 e2 f2');
    expect(input.countersubject2).toContain('c2 B2 c2 d2');
    expect(input.answer).toContain('G8');
  });

  it('applies CS position/shift controls to countersubject pitches', () => {
    const base = runDefaultAnalysis({ csPos: 'above', csShift: '0' });
    const shifted = runDefaultAnalysis({ csPos: 'below', csShift: '0' });

    expect(base.results.countersubjectShift).toBe(0);
    expect(shifted.results.countersubjectShift).toBe(-12);

    expect(shifted.results.countersubject[0].pitch).toBe(base.results.countersubject[0].pitch - 12);
  });
});
