import { describe, expect, it } from 'vitest';
import { findSimultaneities } from './analysis';
import { analyzeAllDissonances } from './dissonanceScoring';

const meter = [4, 4];

function getDissonanceAtOnset(results, onset) {
  return results.find((r) => r.onset === onset && !r.isConsonant);
}

describe('dissonance scoring motion classification', () => {
  it('classifies oblique entry symmetrically when voices are swapped', () => {
    const voiceA = [
      { onset: 0, duration: 1, pitch: 60 },
      { onset: 1, duration: 1, pitch: 60 }, // holds while other voice moves
      { onset: 2, duration: 1, pitch: 62 },
    ];

    const voiceB = [
      { onset: 0, duration: 1, pitch: 67 },
      { onset: 1, duration: 1, pitch: 61 }, // moves while voiceA holds -> dissonance at onset 1
      { onset: 2, duration: 1, pitch: 61 },
    ];

    const simsForward = findSimultaneities(voiceA, voiceB, meter);
    const simsSwapped = findSimultaneities(voiceB, voiceA, meter);

    const resultsForward = analyzeAllDissonances(simsForward, { meter }).all;
    const resultsSwapped = analyzeAllDissonances(simsSwapped, { meter }).all;

    const dForward = getDissonanceAtOnset(resultsForward, 1);
    const dSwapped = getDissonanceAtOnset(resultsSwapped, 1);

    expect(dForward).toBeTruthy();
    expect(dSwapped).toBeTruthy();

    expect(dForward.entry.motion.type).toBe('oblique');
    expect(dSwapped.entry.motion.type).toBe('oblique');

    // The moving voice flips when voices are swapped, but classification remains oblique.
    expect(dForward.entry.motion.v1Moved).toBe(false);
    expect(dForward.entry.motion.v2Moved).toBe(true);
    expect(dSwapped.entry.motion.v1Moved).toBe(true);
    expect(dSwapped.entry.motion.v2Moved).toBe(false);
  });
});
