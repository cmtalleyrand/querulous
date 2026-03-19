import { describe, expect, it } from 'vitest';
import { mapChainRecordOntoIntervalPoint, mergeChainAnalysisIntoIntervalPoints, normalizeOnsetKey } from './chainMerge.js';

describe('chainMerge utilities', () => {
  it('normalizes onsets to 1/480 quarter-note tick resolution', () => {
    expect(normalizeOnsetKey(1.25 + 0.0009)).toBe(1.25);
    expect(normalizeOnsetKey(1.25 + 0.0012)).toBe(1.25 + (1 / 480));
  });

  it('maps chain and passing metadata onto an interval point', () => {
    const point = { onset: 2.0, score: -1.5 };
    const chain = {
      onset: 2.0,
      isChainEntry: true,
      isConsecutiveDissonance: true,
      chainPosition: 0,
      chainLength: 3,
      chainStartOnset: 2.0,
      chainEndOnset: 3.0,
      chainUnresolved: false,
      isChainResolution: false,
      passingMotion: 'ascending',
      isPassing: true,
      consecutiveMitigationCount: 2,
      consecutiveMitigation: 0.5,
      score: -0.5,
      entryScore: -0.25,
      exitScore: 0,
      chainTotalScore: -0.75,
      passingCharacterAdj: 0.25,
      entryMitigationDetails: ['entry detail'],
      exitMitigationDetails: ['exit detail'],
    };

    mapChainRecordOntoIntervalPoint(point, chain);

    expect(point).toMatchObject({
      isChainEntry: true,
      isConsecutiveDissonance: true,
      chainPosition: 0,
      chainLength: 3,
      chainStartOnset: 2.0,
      chainEndOnset: 3.0,
      chainUnresolved: false,
      isChainResolution: false,
      passingMotion: 'ascending',
      isPassing: true,
      consecutiveMitigationCount: 2,
      consecutiveMitigation: 0.5,
      score: -0.5,
      entryScore: -0.25,
      exitScore: 0,
      chainTotalScore: -0.75,
      passingCharacterAdj: 0.25,
      entryMitigationDetails: ['entry detail'],
      exitMitigationDetails: ['exit detail'],
    });
  });

  it('merges records whose onsets quantize to the same tick', () => {
    const points = [{ onset: 1.25, isPassing: false }];
    const records = [{ onset: 1.2509, isPassing: true }];

    mergeChainAnalysisIntoIntervalPoints(points, records);

    expect(points[0].isPassing).toBe(true);
  });

  it('does not merge records quantized to different ticks', () => {
    const points = [{ onset: 1.249, isPassing: false }];
    const records = [{ onset: 1.2512, isPassing: true }];

    mergeChainAnalysisIntoIntervalPoints(points, records);

    expect(points[0].isPassing).toBe(false);
  });
});
