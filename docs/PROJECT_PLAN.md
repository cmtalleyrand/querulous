# Project Plan - Next Steps

This document captures planned improvements based on user feedback and critical analysis. It serves as a handover document for future development sessions.

---

## Priority 1: Scoring System Improvements

Based on `docs/SCORING_CRITICAL_APPRAISAL.md`, these are the most impactful changes:

### 1.1 Add Melodic Contour Evaluation

**Problem**: The system doesn't evaluate overall melodic shape.

**What to implement**:
- Leap recovery detection: After a leap, does the melody step back?
- Focal point analysis: Is there a clear melodic climax?
- Balance metric: What percentage of motion is by leap vs step?

**Suggested scoring**:
```javascript
// In a new function: calculateMelodicContourScore()
// +0.5 if leaps are followed by step in opposite direction
// +1.0 if there's a clear melodic climax
// -penalty if >50% of motion is by leap
```

**Files to modify**: `scoring.js`, `analysis.js`

### 1.2 Recalibrate Voice Independence Thresholds

**Problem**: Current thresholds are too strict. Good Bach counterpoint often has 30-35% contrary motion.

**Current thresholds** (in `scoring.js`):
- ≥50% contrary: Strong (+12)
- ≥35% contrary: Good (+8)

**Proposed thresholds** (calibrated against historical examples):
- ≥40% contrary: Strong
- ≥25% contrary: Good
- ≥15% contrary: Moderate

**Files to modify**: `scoring.js:calculateVoiceIndependenceScore()`

### 1.3 Contextualize Strong-Beat Dissonance Penalty

**Problem**: Every strong-beat dissonance gets -1.0 penalty, even well-prepared suspensions.

**Proposed change**: Reduce or eliminate the -1.0 penalty when a recognized ornamental pattern (suspension, appoggiatura) is detected.

**Files to modify**: `dissonanceScoring.js:scoreDissonance()`

### 1.4 Add Length/Proportion Consideration

**Problem**: A 4-note subject is evaluated identically to a 20-note subject.

**Proposed scoring**:
- 6-12 notes: Ideal range (+5)
- 4-5 notes or 13-16 notes: Acceptable (0)
- <4 notes or >16 notes: Potential issues (-5)

**Files to modify**: `scoring.js`, add new category or factor

---

## Priority 2: Scoring System Safeguards

### 2.1 Implement "Red Flag" Thresholds

**Problem**: Weighted average can mask severe problems in one category.

**Proposed solution**: Add caps that limit overall score when critical issues exist.

```javascript
// Example: If stretto potential < -10, overall score cannot exceed 0
if (categories.strettoPotential.score < -10) {
  overallScore = Math.min(overallScore, 0);
}
```

**Files to modify**: `scoring.js:calculateOverallScore()`

### 2.2 Add "Worst Moment" Factor

**Problem**: Average dissonance score may not reflect the listening experience. One terrible dissonance at a critical moment can be more damaging than several minor issues.

**Proposed**: Track the single worst dissonance score and give it independent influence.

**Files to modify**: `dissonanceScoring.js`, `scoring.js`

---

## Priority 3: Rhythmic Analysis Improvements

### 3.1 Improve Rhythmic Character Evaluation

**Problem**: Currently measures variety but not coherence.

**What to add**:
- Rhythmic cell recurrence (repeated patterns = identity)
- Relationship between rhythm and meter
- Rhythmic arc (build/release of tension)

**Files to modify**: `analysis.js:testRhythmicVariety()`, `scoring.js`

---

## Priority 4: Visualization Improvements


### 4.1 Fix Voice Crossing Visualization

**Current state**: When voices cross, interval connectors create visual chaos.

**Proposed solution**: Replace connector lines with filled regions between voices.

**Files to modify**:
- `IntervalAnalysisViz.jsx`
- `InvertibilityViz.jsx`

### 4.2 Unify Color Semantics

Ensure all visualizations use the same semantic colors:
- Green spectrum: Consonant, good
- Purple spectrum: Dissonant but well-handled
- Yellow/Orange: Warnings, marginal
- Red: Problems, errors

**Files to modify**: `vizConstants.js`, all visualization components

---

## Priority 5: Lower Priority Enhancements

### 5.1 Subject Type Differentiation

Detect whether subject is:
- Lyrical/slow-moving
- Energetic/motoric
- Chromatic/expressive
- Simple/diatonic

Adjust expectations accordingly.

### 5.2 Harmonic Implication Analysis

Analyze which harmonies the subject implies, rate of harmonic change, variety vs stability.

### 5.3 Transposition Flexibility

Test countersubject at multiple transposition levels, not just I and V.

---

## Bug Fixes Completed (This Session)

### Sequence Detection (Jan 2025)

**Issue**: Sequences were being detected across non-consecutive notes.
Example: Notes 1-3 and 13-15 matching was reported as "Notes 1-19 (sequence)"

**Fix**: Changed detection to require consecutive repetitions only.

**File modified**: `analysis.js:detectSequences()`

---

## Technical Debt

From `CODEBASE_OVERVIEW.md`:

1. **Module-level state** in `dissonanceScoring.js` - Consider refactoring to pass state explicitly
2. **Large components** - `App.jsx` (1528 lines) and `IntervalAnalysisViz.jsx` (898 lines) could be split
3. **No TypeScript** - Consider migration for better type safety
4. **No test suite** - Add automated tests for analysis functions

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

- **Definitions**: `docs/DEFINITIONS.md` — all terms, data structures, scoring rules with code cross-references
- **Design principles**: `PROJECT_INTENT.md`
- **Scoring details**: `docs/SCORING_SYSTEM.md`
- **Critical analysis**: `docs/SCORING_CRITICAL_APPRAISAL.md`
- **Harmonic algorithm**: `docs/HARMONIC_IMPLICATION_ALGORITHM.md`
- **Technical overview**: `docs/CODEBASE_OVERVIEW.md`
