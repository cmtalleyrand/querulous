import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

const SUBJECT = `K: Cm
L: 1/16
M: 4/4

z2 c =B c2 G2 A2 c =B c2 d2 | G2 c =B z12 |]`;

describe('App analyze flow', () => {


  it('boots with the updated C# minor defaults including second countersubject', () => {
    render(<App />);

    expect(screen.getByLabelText('Subject in ABC notation').value).toContain('C8 | ^B,4 E4 | D8 |');
    expect(screen.getByLabelText('Countersubject in ABC notation (optional)').value).toContain('e2 d2 e2 f2');
    expect(screen.getByLabelText('Second countersubject in ABC notation (optional)').value).toContain('c2 B2 c2 d2');
    expect(screen.getByLabelText('Answer in ABC notation (optional, auto-generated if empty)').value).toContain('G8 | =G4 B4 | ^A8 |');
  });
  it('runs analysis for the provided subject without a toFixed runtime crash', () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText('Subject in ABC notation'), {
      target: { value: SUBJECT },
    });
    fireEvent.change(screen.getByLabelText('Countersubject in ABC notation (optional)'), {
      target: { value: '' },
    });

    const analyzeButton = screen.getByRole('button', { name: 'Analyze' });
    expect(() => fireEvent.click(analyzeButton)).not.toThrow();

    expect(
      screen.queryByText(/Cannot read properties of undefined \(reading 'toFixed'\)/)
    ).not.toBeInTheDocument();
  });
});
