import { NOTE_TO_MIDI, KEY_SIGNATURES } from './constants/musicTheory';
import { parseABC, generateAnswerABC } from './abcParser';
import {
  findSimultaneities,
  testMelodicContour,
  testHarmonicImplication,
  testRhythmicVariety,
  testRhythmicComplementarity,
  testStrettoViability,
  testTonalAnswer,
  testDoubleCounterpoint,
  testContourIndependence,
  testModulatoryRobustness,
  testSequentialPotential,
} from './analysis';
import { calculateOverallScore } from './scoring';
import { BeatFormatter } from './formatter';
import { setMeter, setP4Treatment } from './dissonanceScoring';

export const DEFAULT_ANALYSIS_INPUT = {
  subject: 'C8 | ^B,4 E4 | D8 |',
  countersubject: 'e2 d2 e2 f2 | g2 f2 g2 a2 | g2 f2 e2 g2 | f2 e2 f2 g2 |',
  countersubject2: 'c2 B2 c2 d2 | e2 d2 e2 f2 | e2 d2 c2 e2 | d2 c2 d2 e2 |',
  answer: 'G8 | =G4 B4 | ^A8 |',
  key: 'C#',
  mode: 'natural_minor',
  noteLength: '1/8',
  meter: [2, 2],
  csPos: 'above',
  csShift: '0',
};

export function runDefaultAnalysis(overrides = {}) {
  const input = {
    ...DEFAULT_ANALYSIS_INPUT,
    ...overrides,
  };

  const defaultNoteLength =
    typeof input.noteLength === 'string'
      ? parseFloat(input.noteLength.split('/')[0]) / parseFloat(input.noteLength.split('/')[1])
      : input.noteLength;

  const keyBase = input.key.replace('#', '').replace('b', '');
  let tonic = NOTE_TO_MIDI[keyBase] || 60;
  if (input.key.includes('#')) tonic += 1;
  if (input.key.includes('b')) tonic -= 1;

  let keyForSig = input.key;
  if (['natural_minor', 'harmonic_minor'].includes(input.mode)) keyForSig = `${input.key}m`;
  const keySignature = KEY_SIGNATURES[keyForSig] || KEY_SIGNATURES[input.key] || [];

  setP4Treatment(true);
  setMeter(input.meter);

  const formatter = new BeatFormatter(defaultNoteLength, input.meter);
  const subject = parseABC(input.subject, tonic, input.mode, defaultNoteLength, keySignature).notes;
  const countersubject = input.countersubject
    ? parseABC(input.countersubject, tonic, input.mode, defaultNoteLength, keySignature).notes
    : null;

  const csOctaveShiftVal = (input.csPos === 'below' ? -12 : 0) + parseInt(input.csShift, 10);
  const shiftedCs = countersubject?.length
    ? countersubject.map((n) => ({ ...n, pitch: n.pitch + csOctaveShiftVal }))
    : null;

  const keyInfo = { key: input.key, tonic, mode: input.mode, keySignature };

  const results = {
    keyInfo,
    formatter,
    meter: input.meter,
    defaultNoteLength,
    subject,
    countersubject: shiftedCs,
    countersubjectOriginal: countersubject,
    countersubjectShift: csOctaveShiftVal,
    melodicContour: testMelodicContour(subject, formatter),
    harmonicImplication: testHarmonicImplication(subject, tonic, input.mode, formatter),
    rhythmicVariety: testRhythmicVariety(subject, formatter),
    sequences: {
      subject: testSequentialPotential(subject, formatter),
    },
  };

  results.stretto = testStrettoViability(subject, formatter, 0.5, 1, 12);
  results.tonalAnswer = testTonalAnswer(subject, input.mode, keyInfo, formatter);
  results.answerABC = generateAnswerABC(subject, keyInfo, results.tonalAnswer, defaultNoteLength, input.meter);

  if (shiftedCs?.length) {
    results.sequences.countersubject = testSequentialPotential(shiftedCs, formatter);
    results.doubleCounterpoint = testDoubleCounterpoint(subject, shiftedCs, formatter);
    results.rhythmicComplementarity = testRhythmicComplementarity(subject, shiftedCs, input.meter);
    results.contourIndependence = testContourIndependence(subject, shiftedCs, formatter);
    results.modulatoryRobustness = testModulatoryRobustness(subject, shiftedCs, formatter);
    results.subjectCsSims = findSimultaneities(subject, shiftedCs, input.meter);
  }

  const scoreResult = calculateOverallScore(results, Boolean(shiftedCs?.length));
  return { input, results, scoreResult };
}
