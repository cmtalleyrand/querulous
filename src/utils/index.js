// Constants
export * from './constants';

// Formatting utilities
export { BeatFormatter, pitchName, metricWeight, metricPosition, metricSeverity, isDuringRest } from './formatter';

// ABC parsing and generation
export {
  extractABCHeaders,
  computeScaleDegree,
  parseABC,
  midiToABC,
  generateAnswerABC,
  formatSubjectABC,
  validateABCTiming,
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
  detectSequences,
  testSequentialPotential,
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
  setSequenceRanges,
  getSequenceRanges,
  setSequenceBeatRanges,
  isOnsetInSequence,
  isNoteInSequence,
} from './dissonanceScoring';
