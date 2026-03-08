import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { TwoVoiceViz } from './TwoVoiceViz';

vi.mock('../../utils/dissonanceScoring', () => ({
  scoreDissonance: vi.fn((sim, _sims, i) => {
    if (i < 3) {
      return {
        isConsonant: false,
        category: 'dissonant',
        score: -0.75,
        entryScore: -0.5,
        exitScore: -0.25,
        details: ['mock dissonance'],
        entry: {
          score: -0.5,
          details: ['Similar motion: -0.50'],
          motionComponent: -0.5,
        },
        exit: {
          score: -0.25,
          details: ['Leads to another dissonance: -0.75'],
          baseExitComponent: -0.75,
          v1ResolutionComponent: 0,
          v2ResolutionComponent: 0,
        },
        patterns: [],
        isResolved: true,
        type: 'passing',
      };
    }

    return {
      isConsonant: true,
      category: 'consonant_resolution',
      score: 0.5,
      entryScore: 0,
      exitScore: 0.5,
      details: ['Resolves to imperfect consonance: +1.0'],
      entry: null,
      exit: null,
      patterns: [],
      isResolved: true,
      type: 'consonant',
    };
  }),
  analyzeAllDissonances: vi.fn(() => ({
    all: [
      {
        onset: 0,
        isChainEntry: true,
        chainPosition: 0,
        chainLength: 3,
        chainStartOnset: 0,
        chainEndOnset: 2,
        score: -0.25,
        entryScore: -0.4,
        exitScore: 0.15,
        details: ['D→D penalty mitigated (next passing, 0.63): +0.50'],
      },
      {
        onset: 1,
        isConsecutiveDissonance: true,
        chainPosition: 1,
        chainLength: 3,
        chainStartOnset: 0,
        chainEndOnset: 2,
        score: -0.1,
        entryScore: -0.1,
        exitScore: 0,
        passingMotion: { isPassing: true, mitigation: 0.63 },
        details: ['Passing character (passing motion): +0.50 [entry motion (0.63): +0.50, D→D (own exit, 0.63): +0.50, V1 resolution (0.63): +0.00]'],
      },
      {
        onset: 2,
        isConsecutiveDissonance: true,
        chainPosition: 2,
        chainLength: 3,
        chainStartOnset: 0,
        chainEndOnset: 2,
        score: -0.1,
        entryScore: -0.1,
        exitScore: 0,
        passingMotion: { isPassing: true, mitigation: 0.63 },
        details: ['Passing character (passing motion): +0.50 [entry motion (0.63): +0.50, V1 resolution (0.63): +0.00]'],
      },
      {
        onset: 3,
        isChainResolution: true,
        chainStartOnset: 0,
        chainEndOnset: 2,
      },
    ],
    summary: { totalDissonances: 3, averageScore: -0.15 },
    dissonances: [],
  })),
}));

describe('TwoVoiceViz dissonance chain scoring panel', () => {
  it('shows chain score and mitigation under the entry/exit sections (not separate block)', () => {
    Element.prototype.scrollTo = vi.fn();
    const v1 = [
      { pitch: 60, onset: 0, duration: 1 },
      { pitch: 62, onset: 1, duration: 1 },
      { pitch: 64, onset: 2, duration: 1 },
      { pitch: 65, onset: 3, duration: 1 },
    ];
    const v2 = [
      { pitch: 59, onset: 0, duration: 1 },
      { pitch: 61, onset: 1, duration: 1 },
      { pitch: 63, onset: 2, duration: 1 },
      { pitch: 65, onset: 3, duration: 1 },
    ];

    const { container } = render(
      <TwoVoiceViz
        voice1={v1}
        voice2={v2}
        meter={[4, 4]}
      />
    );

    const clickableGroups = container.querySelectorAll('g[style*="cursor: pointer"]');
    fireEvent.click(clickableGroups[clickableGroups.length - 3]);

    expect(screen.getByTestId('chain-score-banner')).toBeInTheDocument();
    const chainBanner = screen.getByTestId('chain-score-banner');
    expect(screen.getByText(/Chain score \(whole chain\)/i)).toBeInTheDocument();
    expect(within(chainBanner).getByText('-0.45')).toBeInTheDocument();

    expect(screen.getByText(/Mitigation — entry motion/i)).toBeInTheDocument();
    expect(screen.getByText(/Mitigation — D→D \(own exit, 0.63\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Mitigation —/i).length).toBeGreaterThan(1);

    expect(screen.queryByText(/Passing Character Adjustment/i)).not.toBeInTheDocument();
  });
});
