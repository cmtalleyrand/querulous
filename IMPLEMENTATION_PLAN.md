# Implementation Plan - Revised

## What Needs Fixing

### 1. Broken Information (All Visualizations)
- Measure counter shows wrong numbers and truncates
- Must work correctly in 4/4, 3/4, 6/8, 9/8, 12/8

### 2. Voice Crossing Chaos (IntervalAnalysisViz, StrettoViz, InvertibilityViz)
- When voices cross, connector lines create unreadable mess
- Replace lines with filled regions between voices
- Show details on hover/click only, not cluttering default view

### 3. Incoherent Scoring
- Current scoring feels arbitrary and "silly"
- Need clear, defensible scoring with transparent calculation
- Final score must be meaningful and well-explained

### 4. Inconsistent Color Semantics (All Visualizations)
- Colors don't communicate consistently across components
- Define once, apply everywhere

---

## Rest Handling (Documenting Current Behavior)

**Parsing**: ABC rests (`z`, `x`) advance time but create no NoteEvent objects.

**Interval Analysis**: When voice A rests while voice B sounds:
- No Simultaneity is created (you can't have an interval against silence)
- No dissonance scoring occurs
- This is correct behavior

**Rhythmic Complementarity**: Rests DO matter here:
- Attack point analysis considers when notes start
- Gaps (rests) contribute to rhythmic independence
- More rests = lower attack overlap = higher complementarity score

**Visualization**: Rests appear as gaps in the piano roll (no note rectangle drawn).

---

## Scoring System (Documenting Current + Needed Changes)

### Current Categories (8 total)
| Category | Weight | What It Measures |
|----------|--------|------------------|
| Harmonic Implication | 1.0 | Opening/closing scale degrees, dominant arrival |
| Rhythmic Variety | 0.8 | Diversity of note values |
| Stretto Viability | 1.0 | How many overlap distances work |
| Tonal Answer | 0.9 | Junction quality at mutation point |
| Double Counterpoint | 1.0 | Invertibility of subject+CS |
| Rhythmic Complementarity | 0.8 | Attack point independence |
| Contour Independence | 0.9 | Contrary vs parallel motion |
| Modulatory Robustness | 1.0 | CS works against answer |

### Score Calculation
- Each category: base score ± bonuses/penalties → clamped to 0-100
- Overall: weighted average of applicable categories
- Without CS: only first 4 categories apply
- With CS: all 8 categories apply

### What's Wrong With Current Scoring
*[Need your input here - what specifically feels "silly"?]*

---

## Implementation Tasks (Single Pass)

### Task 1: Fix Measure Counter
**Files**: All 5 visualization components
**Problem**: `i % beatsPerMeasure` uses loop index, not actual beat position
**Fix**: Calculate measure from beat: `Math.floor(beat / beatsPerMeasure) + 1`

### Task 2: Create Shared Visualization Utilities
**New file**: `src/utils/vizConstants.js`
```javascript
// Colors (semantic)
export const VIZ_COLORS = {
  consonant: '#22c55e',
  consonantResolution: '#10b981',
  dissonantGood: '#8b5cf6',
  dissonantMarginal: '#f59e0b',
  dissonantBad: '#ef4444',
  forbidden: '#dc2626',
};

// Measure calculation
export function getMeasureNumber(beat, beatsPerMeasure) {
  return Math.floor(beat / beatsPerMeasure) + 1;
}

// Beat-within-measure
export function getBeatInMeasure(beat, beatsPerMeasure) {
  return (beat % beatsPerMeasure) + 1;
}
```

### Task 3: Fix Voice Crossing Visualization
**Files**: `IntervalAnalysisViz.jsx`, `StrettoViz.jsx`, `InvertibilityViz.jsx`
**Approach**:
- Replace connector LINES with filled REGIONS between voices
- Region color = interval quality
- Remove inline labels from default view
- Add hover tooltip for interval details
- Click for full detail panel (already exists)

### Task 4: Unify All Visualizations
**Files**: All 5 visualization components
**Apply consistently**:
- Same color semantics
- Same measure calculation
- Same hover/click behavior
- Same layout principles

### Task 5: Review and Fix Scoring
**Files**: `scoring.js`, `analysis.js`
**Actions**:
- Document each score calculation clearly
- Ensure penalties/bonuses are proportionate
- Make final score meaningful (not just "weighted average")
- Add summary that explains what the score means

---

## Testing Checklist (Apply to ALL visualizations)

- [ ] 2-bar subject, 4/4
- [ ] 4-bar subject, 4/4
- [ ] 8-bar subject, 4/4
- [ ] Subject in 6/8
- [ ] Subject in 9/8
- [ ] Subject with voice crossing
- [ ] Subject with rests
- [ ] Long notes (whole notes)
- [ ] Short notes (16ths)
- [ ] Measure numbers correct at start, middle, end
- [ ] No truncated labels

---

## Questions for You

1. What specifically about the current scoring feels "silly" or wrong?
2. For voice crossing: should the filled regions be solid or semi-transparent?
3. Are there specific fugue examples I should test against?
