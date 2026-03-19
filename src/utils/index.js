// Formatting utilities
export { BeatFormatter, pitchName, metricWeight, metricPosition, metricSeverity, isDuringRest } from './formatter.js';

// ABC parsing and generation
export {
  extractABCHeaders,
  computeScaleDegree,
  parseABC,
  midiToABC,
  generateAnswerABC,
  generateAnswerABCSameKey,
  formatSubjectABC,
  validateABCTiming,
} from './abcParser.js';

// Analysis functions
export {
  findSimultaneities,
  checkParallelPerfects,
  classifyDissonance,
  analyzeDissonances,
  testContourIndependence,
  testMelodicContour,
  testHarmonicImplication,
  testRhythmicVariety,
  testRhythmicComplementarity,
  testStrettoViability,
  testTonalAnswer,
  testDoubleCounterpoint,
  testModulatoryRobustness,
  detectSequences,
  testSequentialPotential,
} from './analysis.js';

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
} from './scoring.js';

// Help content
export { HELP_CONTENT, getHelpContent, getHelpTopics } from './helpContent.js';

// Dissonance scoring system
export {
  createAnalysisContext,
  scoreDissonance,
  analyzeAllDissonances,
  // Global state setters (backward compatibility)
  setMeter,
  getMeter,
  setP4Treatment,
  getP4Treatment,
  setSequenceRanges,
  getSequenceRanges,
  setSequenceBeatRanges,
  getSequenceBeatRanges,
} from './dissonanceScoring.js';

// Harmonic analysis
export { analyzeHarmonicImplication } from './harmonicAnalysis.js';

// Mode definitions/options
export {
  MODE_DEFINITIONS,
  MODE_INTERVALS,
  MODE_HEADER_SUFFIX,
  AVAILABLE_MODES,
  MODE_OPTIONS_BY_VALUE,
  MODE_PARSER_TOKEN_TO_MODE,
  MODE_TOKEN_REGEX_FRAGMENT,
  validateModeCoverage,
} from './modes.js';

// Key-signature helpers/options
export {
  ACCIDENTAL_OPTIONS,
  NOTE_LETTER_OPTIONS,
  modeToKeySignatureToken,
  parseKeySignatureArrayToMap,
  applyKeySignatureModifiers,
  keySignatureMapToLegacyArray,
  getKeySignatureMap,
  parseKeyHeaderAccidentalModifier,
  serializeKeySignatureModifiers,
} from './keySignature.js';

export { buildPairSummary, buildAvailablePairSummaries, extractParallelPerfectIssues } from './pairSummary.js';
