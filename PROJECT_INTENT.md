# Fugue Analyzer - Project Intent Document

## Purpose

A **composer's workbench** for evaluating fugue subjects and countersubjects. The tool helps advanced musicians identify problems in their counterpoint before committing to a complete fugue.

**Target user**: Experienced composer who understands counterpoint principles but may not know the specific interpretations/rules this tool applies.

**Core deliverable**: Clear visual identification of problem areas across the full range of fugue issues.

---

## Design Principles

### 1. Clarity Through Good Design, Not Simplification

- Density of information is acceptable and often helpful
- The problem is *bad* density (visual noise, overlap, clutter), not density itself
- Every visual element should have clear purpose and hierarchy
- When voices cross or overlap, the visualization must remain legible

### 2. Comprehensive Information Display

Interval analysis should show ALL of:
- Interval quality (consonant/dissonant)
- Color coding by quality/severity
- The actual notes involved
- Associated scoring/rating
- Position in measure

These are not mutually exclusive - display them together clearly.

### 3. Correctness First

Broken information (wrong measure numbers, incorrect labels, bad data) is worse than missing information. The tool must be accurate before it is comprehensive.

### 4. Adaptive Layout

- Input length varies from 2-bar inventions to 8+ bar subjects
- Visualizations must adapt gracefully to all lengths
- No hardcoded widths that break at certain lengths

---

## Current Problems (To Fix)

### Critical Bugs
1. **Measure counter is wrong** - Shows incorrect measure numbers, truncates at edges
2. **Voice crossing creates visual chaos** - When CS drops below Subject/Answer, interval connectors become an unreadable jumble
3. **Information hierarchy unclear** - Can't tell what's important vs secondary info

### Design Issues
4. **Interval labels overlap** when notes are close together
5. **Color scheme lacks clear semantic meaning** - Colors don't consistently communicate severity
6. **Layout doesn't adapt** - Fixed assumptions break with longer/shorter subjects

---

## Target End State

### Interval Analysis Visualization

```
┌─────────────────────────────────────────────────────────────┐
│  Answer + Countersubject                          Legend    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Piano roll with notes as colored rectangles]              │
│  - Each voice has consistent color (Answer=orange, CS=green)│
│  - Notes are clickable for details                          │
│  - Vertical position = pitch                                │
│  - Horizontal position = time                               │
│                                                             │
│  [Color-coded regions between voices showing interval quality]
│  - Green regions = consonant                                │
│  - Red/orange regions = problematic dissonance              │
│  - Purple regions = well-handled dissonance                 │
│  - Click region for interval details                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  m.1        │    m.2        │    m.3        │    m.4        │
│  ─────────────────────────────────────────────────────────  │
│  [Interval timeline: compact strip showing quality over time]│
└─────────────────────────────────────────────────────────────┘
```

**Key behaviors:**
- When voices cross, use color-coded REGIONS between them, not tangled connector lines
- Interval labels appear on hover or click, not cluttering the default view
- Measure numbers are correct and complete
- Timeline below provides overview; piano roll above provides detail

### Stretto Visualization

- Clear dux (leader) and comes (follower) distinction
- Overlap region highlighted
- Issues marked with clear icons, not overlapping text
- Clickable to see interval detail at any point

### Information Hierarchy

1. **Primary** (always visible): Notes, measure grid, overall quality indication
2. **Secondary** (visible on hover/region): Interval numbers, specific issues
3. **Tertiary** (visible on click): Full scoring breakdown, voice leading details

---

## Technical Requirements

### Measure Counting
- Must correctly count measures based on time signature
- Must handle compound meters (6/8, 9/8, 12/8)
- Must display complete measure numbers (no truncation)
- Downbeats clearly distinguished from other beats

### Voice Crossing Handling
- Never draw connector lines that cross each other chaotically
- Use filled regions between voices instead of lines when appropriate
- Maintain voice color identity regardless of vertical position
- Consider horizontal offset for overlapping elements

### Width/Scaling
- Minimum pixels per beat to ensure readability
- Maximum width with horizontal scroll for long subjects
- No elements pushed off-screen or truncated

### Color Semantics (Consistent Across All Visualizations)
- **Green spectrum**: Consonant, good, no issues
- **Purple spectrum**: Dissonant but well-handled
- **Yellow/Orange spectrum**: Warnings, marginal handling
- **Red spectrum**: Problems, errors, forbidden parallels

---

---

## Visualization Interaction Specification (Clarified)

### Default Visibility (No Interaction Required)

1. **Always visible**: Notes as colored rectangles + colored vertical regions for EVERY interval
2. **Subtle by default**: Interval regions are semi-transparent, not overwhelming
3. **Prominent for problems**: Parallel 5ths/8ves, unresolved dissonances, badly resolved dissonances get brighter/more saturated indicators
4. **Sequences**: Show detected sequences with a distinct border around the notes

### Click/Tap Behavior

- **Click interval region OR note**: Opens detail panel below visualization
- **Click issue in list**: Scrolls to interval, highlights it, AND auto-opens detail panel
- **Hover**: Shows interval label (number) on the region

### Detail Panel Requirements

The detail panel must show comprehensive information for each interval, laid out attractively:

1. **Notes involved**: Both pitches displayed clearly with voice labels
2. **Previous interval**: The interval that preceded this one
3. **Voice motion**: How much each voice moved (e.g., "↑m3", "↓P5") from previous to current
4. **Current interval**: The current interval with quality assessment
5. **Score breakdown**: For dissonances, show each scoring factor (entry, beat strength, exit, etc.) with its contribution to the total score
6. **Problem indicators**: Clear badges for parallel motion, unresolved dissonances, etc.

Layout should be compact but readable, with the motion from previous → current shown visually.

### Color Scheme (Semantic)

#### Consonances
- **Perfect consonances** (P1, P5, P8): Blue-green (`#2dd4bf` teal family)
- **Imperfect consonances** (3rds, 6ths): Yellow-green (`#84cc16` lime family)
- **Repeated intervals** (same pitch class): Greyer version of imperfect (`#a3a3a3` neutral)

#### Dissonances
- **Color gradient by score**: Well-handled (violet `#a78bfa`) → Problematic (red `#f87171`)
- **Resolution status indicated by**:
  - Solid border = properly resolved to consonance
  - Dashed border = unresolved or poorly resolved
  - Saturation: Resolved dissonances appear more saturated/vibrant

#### Problem Indicators
- **Parallel 5ths/8ves**: Bright red with thick border
- **Unresolved dissonances**: Dashed border, lower saturation
- **Badly resolved**: Warning orange with dashed border

### Combined Counterpoint Visualization

#### Structure
- **Single panel with tabs**: Subject+CS, Answer+CS, Answer+Subject
- **Or overlay mode**: All voices shown simultaneously with distinct colors

#### Displacement Controls
- **+/- buttons**: Adjust by semitone (small) and octave (large)
- **Named interval display**: Shows current transposition as interval name (e.g., "P5 up", "m3 down")
- **Real-time rescoring**: Issues recalculate on every change

#### Issues List Behavior
- **Full recalculation** on transposition change
- **Comparison display**: "Was X issues → Now Y issues" with +/- indicator
- **Animated transition** optional for showing which issues appeared/disappeared

---

## Out of Scope (Not Goals)

- Traditional music notation rendering (we use piano roll)
- MIDI playback
- Real-time analysis while typing
- Multiple simultaneous fugue comparisons
- Historical style-specific rule sets (we use one consistent interpretation)

---

## Success Criteria

1. A composer can paste a subject + countersubject and immediately see where problems are
2. The visualization remains legible regardless of:
   - Subject length (2-12+ bars)
   - Voice crossing frequency
   - Note density
3. All displayed information is correct (measure numbers, intervals, scores)
4. Clicking any element provides useful detail without leaving the visualization
5. The tool explains its interpretation when flagging issues (why is this a problem?)

---

## Resolution Types and Scoring Reference

### Core Concept: Entry → Dissonance → Exit

Every dissonance is evaluated in three phases:
1. **Entry** - How did we arrive at this dissonance?
2. **Dissonance** - What type of dissonance is this?
3. **Exit** - How do we leave/resolve this dissonance?

### Exit Resolution Types

From `src/utils/dissonanceScoring.js:scoreExit()`:

```javascript
// First check: Does it actually resolve?
const isProperResolution = nextSim.interval.isConsonant();

let score = isProperResolution ? 1.0 : -0.5;
const details = isProperResolution
  ? ['Resolves to consonance: +1.0']
  : ['Leads to another dissonance (no resolution): -0.5'];
```

**Resolution types by movement size** (lines 484-553):

| Movement Type | Size (semitones) | Penalty | Description |
|---------------|------------------|---------|-------------|
| Step          | 1-2              | 0       | Ideal resolution |
| Skip          | 3                | -0.5    | Acceptable but not ideal |
| P4/P5 leap    | 5-7              | -0.5    | Perfect leap |
| Large leap    | 8+               | -1.5    | Problematic |

### Rest Handling

From `src/utils/dissonanceScoring.js:analyzeRestContext()`:

**Phantom notes**: Notes extend conceptually for `duration/2` beats into following rests.

```javascript
// If rest exceeds phantom note duration, resolution is "distant"
if (v1RestDur > v1PhantomLimit || v2RestDur > v2PhantomLimit) {
  score -= 0.3;
  details.push('Delayed resolution (rest exceeds phantom duration): -0.3');
}
```

**Resolution by abandonment**: When one voice drops out leaving the dissonance unresolved:
```javascript
if (restContext && restContext.resolvedByAbandonment) {
  score -= 0.5;
  details.push('Resolved by abandonment (voice dropped out): -0.5');
}
```

### Dissonance Pattern Types

From `src/utils/dissonanceScoring.js:checkPatterns()` (lines 571-730):

| Type | Abbreviation | Criteria | Bonus |
|------|--------------|----------|-------|
| Suspension | Sus | Prepared by consonance, held into dissonance, resolves DOWN by step | +0.5 |
| Passing Tone | PT | Weak beat, step entry AND step exit in SAME direction | 0 |
| Neighbor Tone | N | Weak beat, step entry, step exit in OPPOSITE direction | 0 |
| Anticipation | Ant | Oblique entry AND exit on weak beat | 0 |
| Appoggiatura | App | Approached by leap on strong beat, resolves by step | +0.3 |
| Cambiata | Cam | Step down, skip down a 3rd, step up | +0.2 |

### Metric Position Impact

From `src/utils/dissonanceScoring.js:isStrongBeat()`:

```javascript
function isStrongBeat(onset) {
  return metricWeight(onset, currentMeter) >= 0.75;
}
```

Dissonances on strong beats are evaluated more strictly:
```javascript
if (isStrongBeat(currSim.onset)) {
  score -= 1.0;
  details.push('Strong beat: -1.0');
}
```

Metric positions from `src/utils/formatter.js:metricPosition()`:
- **Downbeat**: weight ≥ 0.99 (beat 1)
- **Strong beat**: weight ≥ 0.75 (main beats)
- **Weak beat**: weight ≥ 0.45 (secondary beats)
- **Off-beat**: weight < 0.45 (subdivisions)

### Sequence Mitigation

When a dissonance occurs within a detected melodic sequence, penalties are reduced:

```javascript
if (v1InSequence) {
  penalty *= 0.25;  // 75% reduction
  reason += ' (mitigated: in sequence)';
}
```

### Final Score Interpretation

| Score Range | Rating | Meaning |
|-------------|--------|---------|
| ≥ 2.0 | Excellent | Textbook dissonance treatment |
| ≥ 1.0 | Good | Well-handled |
| ≥ 0 | Acceptable | Passes, minor issues |
| ≥ -1.0 | Marginal | Questionable handling |
| ≥ -2.0 | Weak | Poor treatment |
| < -2.0 | Problematic | Serious issues |
