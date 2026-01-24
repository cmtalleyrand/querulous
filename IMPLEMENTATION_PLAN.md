# Implementation Plan - Visualization Fixes

## Phase 1: Fix Critical Bugs

### 1.1 Fix Measure Counter
**Problem**: Measure numbers are wrong and truncate at edges

**Root cause investigation needed**:
- Check `getMeter()` function - is it returning correct time signature?
- Check measure calculation: `i % beatsPerMeasure` logic
- Check SVG width vs text positioning

**Fix approach**:
- Ensure meter is correctly passed to all visualization components
- Calculate measure numbers from beat position, not loop index
- Add padding to prevent edge truncation
- Test with 4/4, 3/4, 6/8 time signatures

**Files**: `IntervalAnalysisViz.jsx`, `PianoRoll.jsx`, `IntervalTimeline.jsx`, `StrettoViz.jsx`

### 1.2 Fix Voice Crossing Visualization
**Problem**: When voices cross, connector lines create unreadable chaos

**Current approach** (broken): Draw vertical lines between voice pitches with label bubbles

**New approach**:
- Replace connector lines with **filled regions** between voices
- Region color indicates interval quality
- No overlapping elements in default view
- Details appear on hover/click only

**Implementation**:
1. Calculate vertical span between voices at each time point
2. Draw filled rectangles (not lines) spanning that region
3. Color rectangle by interval quality
4. Remove inline labels - show on hover only
5. When voices are within 2 semitones, use side-by-side layout instead of stacked

**Files**: `IntervalAnalysisViz.jsx` (primary), `StrettoViz.jsx`

---

## Phase 2: Simplify Visual Hierarchy

### 2.1 Remove Default Clutter
**Current state**: Every interval has a visible label, score, connector line

**Target state**:
- Default view shows: notes + colored regions + measure grid
- Hover shows: interval number and quality
- Click shows: full detail panel

**Changes**:
- Remove inline score numbers from default view
- Remove interval number labels from default view
- Keep color-coded regions (these communicate quality visually)
- Add hover tooltip with interval info
- Keep existing click-to-detail functionality

### 2.2 Establish Consistent Color Semantics
**Define and apply consistently**:
```
Consonant (good):     #22c55e (green-500)
Consonant (resolve):  #10b981 (emerald-500)
Dissonant (good):     #8b5cf6 (violet-500)
Dissonant (marginal): #f59e0b (amber-500)
Dissonant (bad):      #ef4444 (red-500)
Forbidden parallel:   #dc2626 (red-600)
```

**Files**: All visualization components, create shared `colors.js` constant

---

## Phase 3: Improve Layout Adaptability

### 3.1 Dynamic Width (Already Partially Done)
**Verify working correctly**:
- Minimum 40px per beat
- Maximum 800px with scroll
- Test with 2-bar, 4-bar, 8-bar, 12-bar subjects

### 3.2 Vertical Spacing for Voice Crossing
**When voices are close or crossing**:
- Increase note height slightly to prevent overlap
- Offset interval regions horizontally if needed
- Never let note rectangles overlap each other

### 3.3 Measure Label Positioning
- Calculate available width before placing labels
- Use abbreviated format if space tight ("1" instead of "m.1")
- Never truncate - omit beat subdivisions before omitting measure numbers

---

## Phase 4: Component Consolidation

### 4.1 Audit Visualization Components
Current components:
- `PianoRoll.jsx` - Basic note display
- `IntervalTimeline.jsx` - Simple interval strip
- `IntervalAnalysisViz.jsx` - Full interval analysis
- `StrettoViz.jsx` - Stretto-specific view
- `InvertibilityViz.jsx` - Double counterpoint view

**Question**: Do we need all 5? Or can some be consolidated?

**Recommendation**:
- Keep `PianoRoll` for simple single-voice display
- Merge `IntervalTimeline` into `IntervalAnalysisViz` as a sub-component
- Keep `StrettoViz` separate (specialized for stretto)
- Keep `InvertibilityViz` separate (specialized for double counterpoint)

### 4.2 Extract Shared Logic
Create shared utilities:
- `vizColors.js` - Color constants and quality-to-color mapping
- `vizLayout.js` - Width calculation, measure positioning
- `vizMeter.js` - Meter-aware grid drawing

---

## Implementation Order

1. **Fix measure counter** (1.1) - Most obviously broken
2. **Fix voice crossing** (1.2) - Biggest visual problem
3. **Apply color semantics** (2.2) - Foundation for hierarchy
4. **Remove default clutter** (2.1) - Depends on color semantics
5. **Vertical spacing** (3.2) - Polish
6. **Component consolidation** (4.x) - Cleanup, can be deferred

---

## Testing Checklist

For each fix, test with:
- [ ] Short subject (2 bars, 4/4)
- [ ] Medium subject (4 bars, 4/4)
- [ ] Long subject (8+ bars, 4/4)
- [ ] Compound meter (6/8)
- [ ] Subject with voice crossing
- [ ] Subject with rapid note values (16ths)
- [ ] Subject with long notes (whole notes)

---

## Files to Modify

**Primary targets**:
1. `src/components/visualizations/IntervalAnalysisViz.jsx` - Main interval view
2. `src/components/visualizations/StrettoViz.jsx` - Stretto view
3. `src/utils/dissonanceScoring.js` - Verify meter handling

**Secondary**:
4. `src/components/visualizations/PianoRoll.jsx` - Measure counter fix
5. `src/components/visualizations/IntervalTimeline.jsx` - Measure counter fix

**New files**:
6. `src/utils/vizConstants.js` - Shared colors and layout constants
