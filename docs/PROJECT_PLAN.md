# Project Plan - Next Steps

**Last validated against codebase:** 2026-02-24 (validated against `src/utils/*.js` and `src/components/visualizations/*.jsx`)

This document captures planned improvements based on user feedback and critical analysis. It serves as a handover document for future development sessions.

> Validation note: the roadmap below is the original plan, now annotated with concrete code mappings or archived tags where artifacts no longer exist.

---

## Priority 1: Scoring System Improvements

Based on `docs/SCORING_CRITICAL_APPRAISAL.md`, these are the most impactful changes:

### 1.1 Add Melodic Contour Evaluation

**Problem**: The system doesn't evaluate overall melodic shape.

**Current code mapping**:
- `src/utils/analysis.js:testMelodicContour()`
- `src/utils/scoring.js:calculateMelodicContourScore()`

**Implementation status**: **Mapped (partially implemented; tuning opportunity remains)**

### 1.2 Recalibrate Voice Independence Thresholds

**Problem**: Current thresholds may be too strict for stylistic norms.

**Current code mapping**:
- `src/utils/scoring.js:calculateVoiceIndependenceScore()`
- `src/utils/analysis.js:testContourIndependence()`

**Implementation status**: **Mapped**

### 1.3 Contextualize Strong-Beat Dissonance Penalty

**Problem**: Strong-beat dissonance can be over-penalized if context is ornamental/prepared.

**Current code mapping**:
- `src/utils/dissonanceScoring.js:scoreDissonance()` / `_scoreDissonance()`
- `src/utils/dissonanceScoring.js:analyzeAllDissonances()`

**Implementation status**: **Mapped (partially implemented; policy tuning remains)**

### 1.4 Add Length/Proportion Consideration

**Problem**: Very short and very long subjects can be scored without enough proportional context.

**Current code mapping**:
- `src/utils/scoring.js:calculateOverallScore(results, hasCountersubject, subjectInfo)`
- `src/utils/scoring.js:calculateStrettoPotentialScore(result, subjectLength)`

**Implementation status**: **Mapped**

---

## Priority 2: Scoring System Safeguards

### 2.1 Implement "Red Flag" Thresholds

**Problem**: Weighted average can mask severe problems in one category.

**Current code mapping**:
- `src/utils/scoring.js:calculateOverallScore()`

**Implementation status**: **Mapped (not explicit as standalone red-flag caps yet)**

### 2.2 Add "Worst Moment" Factor

**Problem**: Average dissonance score may not reflect one severe outlier.

**Current code mapping**:
- `src/utils/dissonanceScoring.js:analyzeAllDissonances()`
- `src/utils/scoring.js` overall/category aggregation functions

**Implementation status**: **Mapped**

---

## Priority 3: Rhythmic Analysis Improvements

### 3.1 Improve Rhythmic Character Evaluation

**Problem**: Current analysis captures variety better than coherence.

**Current code mapping**:
- `src/utils/analysis.js:testRhythmicVariety()`
- `src/utils/scoring.js:calculateRhythmicCharacterScore()`

**Implementation status**: **Mapped**

---

## Priority 4: Visualization Improvements

### 4.1 Fix Voice Crossing Visualization

**Current state**: When voices cross, interval connectors can become visually dense.

**Current code mapping**:
- `src/components/visualizations/IntervalAnalysisViz.jsx`
- `src/components/visualizations/InvertibilityViz.jsx`
- `src/components/visualizations/UnifiedCounterpointViz.jsx`

**Archived reference**:
- `StrettoViz.jsx` (archived target; file not present in current repo)

### 4.2 Unify Color Semantics

Ensure all visualizations use the same semantic colors.

**Current code mapping**:
- `src/utils/vizConstants.js`
- `src/components/visualizations/*.jsx`

**Implementation status**: **Mapped**

---

## Priority 5: Lower Priority Enhancements

### 5.1 Subject Type Differentiation

Detect whether subject is lyrical, energetic, chromatic, or simple.

**Current code mapping**:
- `src/utils/analysis.js` (contour/rhythm/harmonic features)
- `src/utils/scoring.js` (category weighting/interpretation)

**Implementation status**: **Mapped**

### 5.2 Harmonic Implication Analysis

Analyze implied harmonies, harmonic rhythm, and stability/variety.

**Current code mapping**:
- `src/utils/analysis.js:testHarmonicImplication()`
- `src/utils/harmonicAnalysis.js`

**Implementation status**: **Mapped (already present; extendable)**

### 5.3 Transposition Flexibility

Test countersubject behavior at multiple transpositions.

**Current code mapping**:
- `src/utils/analysis.js:testModulatoryRobustness()`
- `src/utils/scoring.js:calculateTranspositionStabilityScore()`

**Implementation status**: **Mapped (already present; extendable)**

---

## Bug Fixes Completed

### Sequence Detection (Jan 2025)

**Issue**: Sequences were being detected across non-consecutive notes.

**Fix**: Changed detection to require consecutive repetitions only.

**File modified**: `src/utils/analysis.js:detectSequences()`

---

## Technical Debt

1. **Module-level state** in `src/utils/dissonanceScoring.js` - Consider refactoring to pass state explicitly.
2. **Large components** - `src/App.jsx` and `src/components/visualizations/IntervalAnalysisViz.jsx` could be split.
3. **No TypeScript** - Consider migration for better type safety.
4. **Test coverage still limited** - Continue expanding automated tests for analysis functions.

---

## Testing Checklist

Before any release, verify:

- [ ] Various time signatures (4/4, 3/4, 6/8, 9/8, 12/8)
- [ ] Voice crossing scenarios
- [ ] Subjects with rests
- [ ] Short subjects (2-bar)
- [ ] Long subjects (8+ bar)
- [ ] Measure numbers correct throughout
- [ ] Sequence detection working correctly
- [ ] All visualization colors consistent

---

## Reference Documents

- **Definitions**: `docs/DEFINITIONS.md`
- **Design principles**: `PROJECT_INTENT.md`
- **Scoring details**: `docs/SCORING_SYSTEM.md`
- **Critical analysis**: `docs/SCORING_CRITICAL_APPRAISAL.md`
- **Harmonic algorithm**: `docs/HARMONIC_IMPLICATION_ALGORITHM.md`
- **Technical overview**: `docs/CODEBASE_OVERVIEW.md`
- **Previous tasks**: `IMPLEMENTATION_PLAN.md` (**archived reference; file currently absent**)
