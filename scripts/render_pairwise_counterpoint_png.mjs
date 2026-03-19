import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { BeatFormatter } from '../src/utils/formatter.js';
import { parseABC } from '../src/utils/abcParser.js';
import { NOTE_TO_MIDI, KEY_SIGNATURES } from '../src/utils/constants/musicTheory.js';
import {
  testDoubleCounterpoint,
  testRhythmicVariety,
  testStrettoViability,
  testTonalAnswer,
  testMelodicContour,
  testHarmonicImplication,
  testRhythmicComplementarity,
  testContourIndependence,
  testModulatoryRobustness,
  testSequentialPotential,
} from '../src/utils/analysis.js';
import { calculateOverallScore } from '../src/utils/scoring.js';
import { setMeter, setP4Treatment } from '../src/utils/dissonanceScoring.js';
import { buildAvailablePairSummaries, extractParallelPerfectIssues } from '../src/utils/pairSummary.js';

const FONT = {
  ' ': ['00000','00000','00000','00000','00000','00000','00000'],
  '.': ['00000','00000','00000','00000','00000','01100','01100'],
  ':': ['00000','01100','01100','00000','01100','01100','00000'],
  '-': ['00000','00000','00000','11111','00000','00000','00000'],
  '+': ['00000','00100','00100','11111','00100','00100','00000'],
  '/': ['00001','00010','00100','01000','10000','00000','00000'],
  '0': ['01110','10001','10011','10101','11001','10001','01110'],
  '1': ['00100','01100','00100','00100','00100','00100','01110'],
  '2': ['01110','10001','00001','00010','00100','01000','11111'],
  '3': ['11110','00001','00001','01110','00001','00001','11110'],
  '4': ['00010','00110','01010','10010','11111','00010','00010'],
  '5': ['11111','10000','11110','00001','00001','10001','01110'],
  '6': ['00110','01000','10000','11110','10001','10001','01110'],
  '7': ['11111','00001','00010','00100','01000','01000','01000'],
  '8': ['01110','10001','10001','01110','10001','10001','01110'],
  '9': ['01110','10001','10001','01111','00001','00010','11100'],
  'A': ['01110','10001','10001','11111','10001','10001','10001'],
  'B': ['11110','10001','10001','11110','10001','10001','11110'],
  'C': ['01110','10001','10000','10000','10000','10001','01110'],
  'D': ['11100','10010','10001','10001','10001','10010','11100'],
  'E': ['11111','10000','10000','11110','10000','10000','11111'],
  'F': ['11111','10000','10000','11110','10000','10000','10000'],
  'G': ['01110','10001','10000','10111','10001','10001','01110'],
  'H': ['10001','10001','10001','11111','10001','10001','10001'],
  'I': ['01110','00100','00100','00100','00100','00100','01110'],
  'J': ['00001','00001','00001','00001','10001','10001','01110'],
  'K': ['10001','10010','10100','11000','10100','10010','10001'],
  'L': ['10000','10000','10000','10000','10000','10000','11111'],
  'M': ['10001','11011','10101','10101','10001','10001','10001'],
  'N': ['10001','11001','10101','10011','10001','10001','10001'],
  'O': ['01110','10001','10001','10001','10001','10001','01110'],
  'P': ['11110','10001','10001','11110','10000','10000','10000'],
  'Q': ['01110','10001','10001','10001','10101','10010','01101'],
  'R': ['11110','10001','10001','11110','10100','10010','10001'],
  'S': ['01111','10000','10000','01110','00001','00001','11110'],
  'T': ['11111','00100','00100','00100','00100','00100','00100'],
  'U': ['10001','10001','10001','10001','10001','10001','01110'],
  'V': ['10001','10001','10001','10001','10001','01010','00100'],
  'W': ['10001','10001','10001','10101','10101','10101','01010'],
  'X': ['10001','10001','01010','00100','01010','10001','10001'],
  'Y': ['10001','10001','01010','00100','00100','00100','00100'],
  'Z': ['11111','00001','00010','00100','01000','10000','11111'],
};

const COLORS = {
  page: [245, 243, 238],
  panel: [255, 255, 255],
  border: [224, 224, 224],
  title: [55, 71, 79],
  subtitle: [120, 144, 156],
  greenBorder: [220, 231, 117],
  greenFill: [249, 251, 231],
  greenStrong: [27, 94, 32],
  label: [69, 90, 100],
  value: [38, 50, 56],
  topBarA: [44, 62, 80],
  topBarB: [52, 73, 94],
  white: [255, 255, 255],
};

const SCALE = 2;
const CHAR_W = 5 * SCALE;
const CHAR_H = 7 * SCALE;
const CHAR_GAP = SCALE;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writePng(width, height, rgba) {
  const signature = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function createCanvas(width, height, color) {
  const buffer = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    buffer[i * 4] = color[0];
    buffer[i * 4 + 1] = color[1];
    buffer[i * 4 + 2] = color[2];
    buffer[i * 4 + 3] = 255;
  }
  return buffer;
}

function fillRect(buffer, width, x, y, w, h, color) {
  for (let yy = Math.max(0, y); yy < Math.max(0, y + h); yy += 1) {
    for (let xx = Math.max(0, x); xx < Math.max(0, x + w); xx += 1) {
      const idx = (yy * width + xx) * 4;
      buffer[idx] = color[0];
      buffer[idx + 1] = color[1];
      buffer[idx + 2] = color[2];
      buffer[idx + 3] = 255;
    }
  }
}

function drawText(buffer, width, x, y, text, color) {
  let cursor = x;
  const normalized = text.toUpperCase();
  for (const char of normalized) {
    const glyph = FONT[char] || FONT[' '];
    for (let row = 0; row < glyph.length; row += 1) {
      for (let col = 0; col < glyph[row].length; col += 1) {
        if (glyph[row][col] === '1') {
          fillRect(buffer, width, cursor + col * SCALE, y + row * SCALE, SCALE, SCALE, color);
        }
      }
    }
    cursor += CHAR_W + CHAR_GAP;
  }
}

function textWidth(text) {
  return text.toUpperCase().length * (CHAR_W + CHAR_GAP) - CHAR_GAP;
}

function drawRightText(buffer, width, rightX, y, text, color) {
  drawText(buffer, width, rightX - textWidth(text), y, text, color);
}

function metricString(value) {
  return Number(value).toFixed(1);
}

function computePairSummaries() {
  const input = {
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
    secondSubject: 'A8 | G4 c4 | B8 |',
  };

  const defaultNoteLength = parseFloat(input.noteLength.split('/')[0]) / parseFloat(input.noteLength.split('/')[1]);
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
  const secondSubject = parseABC(input.secondSubject, tonic, input.mode, defaultNoteLength, keySignature).notes;
  const cs1 = parseABC(input.countersubject, tonic, input.mode, defaultNoteLength, keySignature).notes;
  const cs2 = parseABC(input.countersubject2, tonic, input.mode, defaultNoteLength, keySignature).notes;
  const answer = parseABC(input.answer, tonic, input.mode, defaultNoteLength, keySignature).notes;
  const csShift = (input.csPos === 'below' ? -12 : 0) + parseInt(input.csShift, 10);
  const shiftedCs1 = cs1.map((note) => ({ ...note, pitch: note.pitch + csShift }));
  const shiftedCs2 = cs2.map((note) => ({ ...note, pitch: note.pitch + csShift }));
  const keyInfo = { key: input.key, tonic, mode: input.mode, keySignature };

  const results = {
    keyInfo,
    formatter,
    meter: input.meter,
    defaultNoteLength,
    subject,
    secondSubject,
    countersubject: shiftedCs1,
    countersubject2: shiftedCs2,
    melodicContour: testMelodicContour(subject, formatter),
    harmonicImplication: testHarmonicImplication(subject, tonic, input.mode, formatter),
    rhythmicVariety: testRhythmicVariety(subject, formatter),
    secondSubjectRhythmicVariety: testRhythmicVariety(secondSubject, formatter),
    sequences: {
      subject: testSequentialPotential(subject, formatter),
      secondSubject: testSequentialPotential(secondSubject, formatter),
      countersubject: testSequentialPotential(shiftedCs1, formatter),
      countersubject2: testSequentialPotential(shiftedCs2, formatter),
      answer: testSequentialPotential(answer, formatter),
    },
    stretto: testStrettoViability(subject, formatter, 0.5, 1, 12),
    secondSubjectStretto: testStrettoViability(secondSubject, formatter, 0.5, 1, 12),
    tonalAnswer: testTonalAnswer(subject, input.mode, keyInfo, formatter),
    doubleCounterpoint: testDoubleCounterpoint(subject, shiftedCs1, formatter),
    cs2DoubleCounterpoint: testDoubleCounterpoint(subject, shiftedCs2, formatter),
    answerCs1DoubleCounterpoint: testDoubleCounterpoint(answer, shiftedCs1, formatter),
    answerCs2DoubleCounterpoint: testDoubleCounterpoint(answer, shiftedCs2, formatter),
    subject2Cs1DoubleCounterpoint: testDoubleCounterpoint(secondSubject, shiftedCs1, formatter),
    subject2Cs2DoubleCounterpoint: testDoubleCounterpoint(secondSubject, shiftedCs2, formatter),
    rhythmicComplementarity: testRhythmicComplementarity(subject, shiftedCs1, input.meter),
    cs2RhythmicComplementarity: testRhythmicComplementarity(subject, shiftedCs2, input.meter),
    contourIndependence: testContourIndependence(subject, shiftedCs1, formatter),
    cs2ContourIndependence: testContourIndependence(subject, shiftedCs2, formatter),
    modulatoryRobustness: testModulatoryRobustness(subject, shiftedCs1, formatter),
    cs2AnswerDoubleCounterpoint: testDoubleCounterpoint(answer, shiftedCs2, formatter),
  };

  const pairAccessors = {
    summaryAccessor: (pairResult) => pairResult.original?.detailedScoring?.summary,
    violationAccessor: (pairResult) => extractParallelPerfectIssues(pairResult.original?.issues),
    allAccessor: (pairResult) => pairResult.original?.detailedScoring?.all,
  };

  const pairSummaries = buildAvailablePairSummaries([
    { label: 'Subject 1 vs CS1', analysisResult: results.doubleCounterpoint, ...pairAccessors },
    { label: 'Answer vs CS1', analysisResult: results.answerCs1DoubleCounterpoint, ...pairAccessors },
    { label: 'Subject 1 vs CS2', analysisResult: results.cs2DoubleCounterpoint, ...pairAccessors },
    { label: 'Answer vs CS2', analysisResult: results.answerCs2DoubleCounterpoint, ...pairAccessors },
    { label: 'Subject 2 vs CS1', analysisResult: results.subject2Cs1DoubleCounterpoint, ...pairAccessors },
    { label: 'Subject 2 vs CS2', analysisResult: results.subject2Cs2DoubleCounterpoint, ...pairAccessors },
  ], input.meter);

  return {
    pairSummaries,
    scoreResult: calculateOverallScore(results, true),
  };
}

function renderScreenshot(outputPath) {
  const { pairSummaries, scoreResult } = computePairSummaries();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const width = 1500;
  const cardHeight = 180;
  const height = 300 + pairSummaries.length * (cardHeight + 22);
  const canvas = createCanvas(width, height, COLORS.page);

  fillRect(canvas, width, 80, 40, 1340, height - 80, COLORS.panel);
  fillRect(canvas, width, 80, 40, 1340, 92, COLORS.topBarA);
  fillRect(canvas, width, 80, 132, 1340, 72, COLORS.panel);
  fillRect(canvas, width, 80, 132, 1340, 2, COLORS.border);

  drawText(canvas, width, 120, 72, 'VIABILITY SCORE', COLORS.white);
  drawText(canvas, width, 120, 108, `OVERALL ${metricString(scoreResult.overall)}`, COLORS.white);
  drawText(canvas, width, 120, 156, 'PAIRWISE COUNTERPOINT', COLORS.title);
  drawText(canvas, width, 120, 186, 'DIRECT PER-PAIR COUNTERPOINT METRICS', COLORS.subtitle);

  let y = 230;
  for (const summary of pairSummaries) {
    fillRect(canvas, width, 110, y, 1280, cardHeight, COLORS.greenFill);
    fillRect(canvas, width, 110, y, 1280, 2, COLORS.greenBorder);
    fillRect(canvas, width, 110, y + cardHeight - 2, 1280, 2, COLORS.greenBorder);
    fillRect(canvas, width, 110, y, 2, cardHeight, COLORS.greenBorder);
    fillRect(canvas, width, 1388, y, 2, cardHeight, COLORS.greenBorder);

    drawText(canvas, width, 138, y + 18, summary.label, COLORS.title);
    drawRightText(canvas, width, 1360, y + 18, `FINAL PAIR SCORE ${metricString(summary.finalPairScore)}`, COLORS.greenStrong);

    const rows = [
      ['ALL-INTERVAL DURATION-WEIGHTED MEAN', summary.components.allIntervalDurationWeightedMean],
      ['SALIENCE-WEIGHTED DISSONANCE HANDLING', summary.components.salienceWeightedDissonanceHandling],
      ['AVERAGE DISSONANCE HANDLING', summary.components.averageDissonanceHandling],
      ['PARALLEL-PERFECT PENALTY', -summary.parallelPerfectPenalty],
    ];

    let rowY = y + 58;
    for (const [label, value] of rows) {
      fillRect(canvas, width, 138, rowY - 6, 1222, 1, COLORS.greenBorder);
      drawText(canvas, width, 138, rowY + 8, label, COLORS.label);
      drawRightText(canvas, width, 1360, rowY + 8, metricString(value), COLORS.value);
      rowY += 32;
    }

    y += cardHeight + 22;
  }

  fs.writeFileSync(outputPath, writePng(width, height, canvas));
  fs.writeFileSync(outputPath.replace(/\.png$/, '.json'), JSON.stringify({ pairSummaries, overall: scoreResult.overall }, null, 2));
}

renderScreenshot(new URL('../artifacts/pairwise-counterpoint-screenshot.png', import.meta.url).pathname);
