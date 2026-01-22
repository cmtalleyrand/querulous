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
  classifyDissonance,
  analyzeDissonances,
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

// Help content
export { HELP_CONTENT, getHelpContent, getHelpTopics } from './helpContent';

// Dissonance scoring system
export {
  scoreDissonance,
  analyzeAllDissonances,
  setP4Treatment,
  getP4Treatment,
  setMeter,
  getMeter,
} from './dissonanceScoring';
