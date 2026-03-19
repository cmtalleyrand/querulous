import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreDashboard } from './ScoreDashboard';

const scoreResult = {
  overall: 4.2,
  internalScore: 4.2,
  rating: 'Fair',
  color: '#558b2f',
  bgColor: '#fafafa',
  categories: {
    rhythmicCharacter: { internal: 1, details: [] },
    melodicVariety: { internal: 2, details: [] },
    strettoPotential: { internal: 3, details: [] },
    invertibility: { internal: 4, details: [] },
    voiceIndependence: { internal: 5, details: [] },
    transpositionStability: { internal: 6, details: [] },
  },
};

describe('ScoreDashboard pairwise counterpoint section', () => {
  it('renders each pair summary with the direct component rows', () => {
    render(
      <ScoreDashboard
        scoreResult={scoreResult}
        hasCountersubject={true}
        pairSummaries={[
          {
            label: 'Subject 1 vs CS1',
            pairQuality: 1.2,
            finalPairScore: 1.2,
            parallelPerfectPenalty: 2,
            components: {
              allIntervalDurationWeightedMean: 0.9,
              salienceWeightedDissonanceHandling: 0.7,
              averageDissonanceHandling: 0.5,
            },
          },
          {
            label: 'Answer vs CS1',
            pairQuality: -0.4,
            finalPairScore: -0.4,
            parallelPerfectPenalty: 0,
            components: {
              allIntervalDurationWeightedMean: 0.2,
              salienceWeightedDissonanceHandling: -0.3,
              averageDissonanceHandling: -0.6,
            },
          },
        ]}
      />
    );

    expect(screen.getByText('Pairwise Counterpoint')).toBeInTheDocument();
    expect(screen.getByText('Subject 1 vs CS1')).toBeInTheDocument();
    expect(screen.getByText('Answer vs CS1')).toBeInTheDocument();
    expect(screen.getAllByText('All-interval duration-weighted mean')).toHaveLength(2);
    expect(screen.getAllByText('Salience-weighted dissonance handling')).toHaveLength(2);
    expect(screen.getAllByText('Average dissonance handling')).toHaveLength(2);
    expect(screen.getAllByText('Parallel-perfect penalty')).toHaveLength(2);
    expect(screen.getByText('Final pair score: 1.2')).toBeInTheDocument();
    expect(screen.getByText('Final pair score: -0.4')).toBeInTheDocument();
  });
});
