import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

const SUBJECT = `K: Cm
L: 1/16
M: 4/4

z2 c =B c2 G2 A2 c =B c2 d2 | G2 c =B z12 |]`;

describe('App analyze flow', () => {
  it('runs analysis for the provided subject without a toFixed runtime crash', () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText('Subject in ABC notation'), {
      target: { value: SUBJECT },
    });
    fireEvent.change(screen.getByLabelText('Countersubject in ABC notation (optional)'), {
      target: { value: 'F2 G2 A2 B2 | c2 d2 e2 f2 |]' },
    });

    const analyzeButton = screen.getByRole('button', { name: 'Analyze' });
    expect(() => fireEvent.click(analyzeButton)).not.toThrow();

    expect(
      screen.queryByText(/Cannot read properties of undefined \(reading 'toFixed'\)/)
    ).not.toBeInTheDocument();
  });

  it('supports second subject input and analyzes answer against countersubject 2', () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText('Subject in ABC notation'), {
      target: { value: 'C2 D2 E2 F2 | G2 A2 B2 c2 |]' },
    });
    fireEvent.change(screen.getByLabelText('Second subject in ABC notation (optional)'), {
      target: { value: 'E2 F2 G2 A2 | B2 c2 d2 e2 |]' },
    });
    fireEvent.change(screen.getByLabelText('Countersubject in ABC notation (optional)'), {
      target: { value: 'F2 G2 A2 B2 | c2 d2 e2 f2 |]' },
    });
    fireEvent.change(screen.getByLabelText('Second countersubject in ABC notation (optional)'), {
      target: { value: 'G2 A2 B2 c2 | d2 e2 f2 g2 |]' },
    });
    fireEvent.change(screen.getByLabelText('Answer in ABC notation (optional, auto-generated if empty)'), {
      target: { value: 'G2 A2 B2 c2 | d2 e2 f2 g2 |]' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));

    expect(screen.getByText('CS2 vs Answer')).toBeInTheDocument();
    expect(screen.getByText('Second Subject vs Subject')).toBeInTheDocument();
    expect(screen.getByText('Second Subject vs CS1')).toBeInTheDocument();
    expect(screen.getByText('Second Subject vs CS2')).toBeInTheDocument();
    expect(screen.getByLabelText('Score view:')).toBeInTheDocument();
  });
});
