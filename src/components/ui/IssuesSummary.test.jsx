import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IssuesSummary } from './IssuesSummary';

describe('IssuesSummary anchors', () => {
  it('drills down for non-time warnings using scoreCategory anchors', () => {
    const onHighlight = vi.fn();
    const results = {
      stretto: { viableStrettos: [], allResults: [{}] },
    };

    render(<IssuesSummary results={results} onHighlight={onHighlight} highlightedItem={null} />);

    fireEvent.click(screen.getByRole('button', { name: /Stretto Viability/i }));
    fireEvent.click(screen.getByText(/No viable stretto found/i));

    expect(onHighlight).toHaveBeenCalledWith(expect.objectContaining({
      scoreCategory: 'strettoPotential',
      id: 'stretto-no-viable',
    }));
  });

  it('preserves onset anchor for contour warnings', () => {
    const onHighlight = vi.fn();
    const results = {
      contourIndependence: {
        details: [{ description: 'Parallel leaps at b2', onset: 2 }],
      },
    };

    render(<IssuesSummary results={results} onHighlight={onHighlight} highlightedItem={null} />);

    fireEvent.click(screen.getByRole('button', { name: /Contour Independence/i }));
    fireEvent.click(screen.getByText(/Parallel leaps/i));

    expect(onHighlight).toHaveBeenCalledWith(expect.objectContaining({ onset: 2 }));
  });

  it('uses category defaults for rhythmic and invertibility observations without onsets', () => {
    const onHighlight = vi.fn();
    const results = {
      rhythmicComplementarity: {
        observations: [{ type: 'consideration', description: 'Rhythms lock too often' }],
      },
      doubleCounterpoint: {
        observations: [{ type: 'consideration', description: 'Intervals are dense' }],
      },
    };

    render(<IssuesSummary results={results} onHighlight={onHighlight} highlightedItem={null} />);

    fireEvent.click(screen.getByRole('button', { name: /Rhythmic Complementarity/i }));
    fireEvent.click(screen.getByText(/Rhythms lock too often/i));

    fireEvent.click(screen.getByRole('button', { name: /Invertible Counterpoint/i }));
    fireEvent.click(screen.getByText(/Intervals are dense/i));

    expect(onHighlight).toHaveBeenNthCalledWith(1, expect.objectContaining({
      scoreCategory: 'rhythmicInterplay',
      id: expect.stringMatching(/^rhythmicInterplay-/),
    }));

    expect(onHighlight).toHaveBeenNthCalledWith(2, expect.objectContaining({
      scoreCategory: 'invertibility',
      id: expect.stringMatching(/^invertibility-/),
    }));
  });
});
