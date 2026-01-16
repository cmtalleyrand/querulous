// Constants
export * from './constants';

// Formatting utilities
export { BeatFormatter, pitchName, metricWeight } from './formatter';

// ABC parsing and generation
export {
  extractABCHeaders,
  computeScaleDegree,
  parseABC,
  midiToABC,
  generateAnswerABC,
  formatSubjectABC,
} from './abcParser';

// Analysis functions
export {
  findSimultaneities,
  checkParallelPerfects,
  testContourIndependence,
  testHarmonicImplication,
  testRhythmicVariety,
  testRhythmicComplementarity,
  testStrettoViability,
  testTonalAnswer,
  testDoubleCounterpoint,
  testModulatoryRobustness,
} from './analysis';

// Scoring functions
export {
  SCORE_CATEGORIES,
  SCORE_THRESHOLDS,
  getScoreRating,
  getScoreColor,
  getScoreBgColor,
  calculateHarmonicImplicationScore,
  calculateRhythmicVarietyScore,
  calculateStrettoViabilityScore,
  calculateTonalAnswerScore,
  calculateDoubleCounterpointScore,
  calculateRhythmicComplementarityScore,
  calculateContourIndependenceScore,
  calculateModulatoryRobustnessScore,
  calculateOverallScore,
  getScoreSummary,
} from './scoring';
