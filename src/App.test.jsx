import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';
import { AVAILABLE_MODES } from './utils/modes';

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
      target: { value: 'F2 G2 A2 B2 | c2 d2 e2 f2 |]' },
    });

    const analyzeButton = screen.getByRole('button', { name: 'Analyze' });
    expect(() => fireEvent.click(analyzeButton)).not.toThrow();

    expect(
      screen.queryByText(/Cannot read properties of undefined \(reading 'toFixed'\)/)
    ).not.toBeInTheDocument();
  });


  it('uses derived non-experimental mode options in both mode dropdowns', () => {
    render(<App />);

    const expectedLabels = AVAILABLE_MODES.map((mode) => mode.label);
    const expectedSignature = expectedLabels.join('|');

    const findModeSelect = () => screen
      .getAllByRole('combobox')
      .find((select) => Array.from(select.options).map((option) => option.textContent).join('|') === expectedSignature);

    const analysisModeSelect = findModeSelect();
    expect(analysisModeSelect).toBeDefined();

    const analysisLabels = Array.from(analysisModeSelect.options).map((option) => option.textContent);
    expect(analysisLabels).toEqual(expectedLabels);
    expect(analysisLabels).not.toContain('Locrian');

    fireEvent.click(screen.getByLabelText('Use separate spelling key (parse accidentals from a different key signature)'));

    const modeSelects = screen
      .getAllByRole('combobox')
      .filter((select) => Array.from(select.options).map((option) => option.textContent).join('|') === expectedSignature);

    expect(modeSelects).toHaveLength(2);
  });


  it('runs analysis successfully with key-signature modifier selections', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Add modifier' }));

    const modifierSelects = screen.getAllByRole('combobox');
    const accidentalSelect = modifierSelects.find((select) =>
      Array.from(select.options).some((option) => option.value === '^^')
    );
    const noteSelect = modifierSelects.find((select) =>
      Array.from(select.options).map((option) => option.value).join(',') === 'A,B,C,D,E,F,G'
    );

    expect(accidentalSelect).toBeDefined();
    expect(noteSelect).toBeDefined();

    fireEvent.change(accidentalSelect, { target: { value: '^^' } });
    fireEvent.change(noteSelect, { target: { value: 'C' } });

    const analyzeButton = screen.getByRole('button', { name: 'Analyze' });
    expect(() => fireEvent.click(analyzeButton)).not.toThrow();

    expect(screen.getByText(/Analysis:/)).toBeInTheDocument();
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
