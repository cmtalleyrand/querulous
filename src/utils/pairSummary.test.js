import { describe, expect, it } from 'vitest';
import { buildAvailablePairSummaries, buildPairSummary, extractParallelPerfectIssues } from './pairSummary.js';

describe('buildPairSummary', () => {
  it('computes the direct pair summary with the shared weighted formula', () => {
    const pairSummary = buildPairSummary({
      label: 'Subject 1 vs CS1',
      meter: [4, 4],
      analysisResult: {
        original: {
          issues: [{ type: 'parallel' }],
          detailedScoring: {
            all: [
              { onset: 0, isConsonant: false, score: 1.0 },
              { onset: 1, isConsonant: false, score: -1.0 },
            ],
            summary: {
              overallAvgScore: 0.5,
              averageScore: 0.25,
            },
          },
        },
      },
      summaryAccessor: (pairResult) => pairResult.original?.detailedScoring?.summary,
      violationAccessor: (pairResult) => extractParallelPerfectIssues(pairResult.original?.issues),
      allAccessor: (pairResult) => pairResult.original?.detailedScoring?.all,
    });

    expect(pairSummary).toEqual({
      label: 'Subject 1 vs CS1',
      pairQuality: -1.6,
      components: {
        allIntervalDurationWeightedMean: 0.5,
        salienceWeightedDissonanceHandling: 0.3,
        averageDissonanceHandling: 0.3,
      },
      parallelPerfectPenalty: 2,
      finalPairScore: -1.6,
    });
  });



  it('detects parallel-perfect penalties from the persisted issue descriptions', () => {
    const pairSummary = buildPairSummary({
      label: 'Answer vs CS1',
      meter: [4, 4],
      analysisResult: {
        original: {
          issues: [
            {
              onset: 0,
              description: 'Parallel 5ths: C4-G3 ↑ D4-A3 (M1.B1 to M1.B2)',
              config: 'original',
            },
          ],
          detailedScoring: {
            all: [{ onset: 0, isConsonant: false, score: 1 }],
            summary: {
              overallAvgScore: 1,
              averageScore: 1,
            },
          },
        },
      },
      summaryAccessor: (pairResult) => pairResult.original?.detailedScoring?.summary,
      violationAccessor: (pairResult) => extractParallelPerfectIssues(pairResult.original?.issues),
      allAccessor: (pairResult) => pairResult.original?.detailedScoring?.all,
    });

    expect(pairSummary.parallelPerfectPenalty).toBe(2);
    expect(pairSummary.finalPairScore).toBe(-1);
  });

  it('omits unavailable pairs whose analysis payload reports an error', () => {
    const pairSummaries = buildAvailablePairSummaries([
      {
        label: 'Subject 1 vs CS1',
        analysisResult: {
          detailedScoring: {
            all: [{ onset: 0, isConsonant: false, score: 0.5 }],
            summary: { overallAvgScore: 0.4, averageScore: 0.5 },
          },
        },
      },
      {
        label: 'Subject 2 vs CS1',
        analysisResult: { error: 'Empty' },
      },
    ], [4, 4]);

    expect(pairSummaries).toHaveLength(1);
    expect(pairSummaries[0].label).toBe('Subject 1 vs CS1');
  });
});
