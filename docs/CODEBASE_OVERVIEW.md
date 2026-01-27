# Codebase Overview - Fugue Subject Analyzer

This document provides technical orientation for developers continuing work on this project.

---

## Project Structure

```
querulous/
├── src/
│   ├── App.jsx                 # Main application (1528 lines)
│   ├── main.jsx               # Entry point
│   ├── components/
│   │   ├── scoring/           # Score display components
│   │   │   ├── ScoreDashboard.jsx   # Main score summary (297 lines)
│   │   │   ├── ScoreBar.jsx         # Category score bars (228 lines)
│   │   │   ├── ScoreGauge.jsx       # Circular gauge (79 lines)
│   │   │   └── ScoreSummaryCard.jsx # Summary card (82 lines)
│   │   ├── ui/                # Reusable UI components
│   │   │   ├── ABCBox.jsx           # ABC notation input
│   │   │   ├── DataRow.jsx          # Key-value display
│   │   │   ├── IssuesSummary.jsx    # Issues list (362 lines)
│   │   │   ├── InfoButton.jsx       # Help tooltips (177 lines)
│   │   │   ├── Observation.jsx      # Analysis observations
│   │   │   ├── Section.jsx          # Collapsible sections
│   │   │   └── Select.jsx           # Styled select
│   │   └── visualizations/    # Core visualizations
│   │       ├── IntervalAnalysisViz.jsx  # Main interval viz (898 lines)
│   │       ├── StrettoViz.jsx           # Stretto analysis (518 lines)
│   │       ├── InvertibilityViz.jsx     # Double counterpoint (478 lines)
│   │       ├── PianoRoll.jsx            # Piano roll renderer (369 lines)
│   │       └── IntervalTimeline.jsx     # Compact timeline (103 lines)
│   ├── utils/
│   │   ├── analysis.js        # Core analysis functions (1412 lines)
│   │   ├── dissonanceScoring.js # Dissonance evaluation (1208 lines)
│   │   ├── scoring.js         # Category scoring (978 lines)
│   │   ├── abcParser.js       # ABC notation parser (526 lines)
│   │   ├── formatter.js       # Beat/pitch formatting (306 lines)
│   │   ├── vizConstants.js    # Visualization constants (236 lines)
│   │   ├── constants.js       # Musical constants (152 lines)
│   │   └── helpContent.js     # Help text (436 lines)
│   └── types/
│       └── music.js           # Type definitions (90 lines)
├── docs/
│   ├── SCORING_SYSTEM.md      # Comprehensive scoring docs
│   └── SCORING_CRITICAL_APPRAISAL.md  # Critical analysis
├── PROJECT_INTENT.md          # Design principles
└── IMPLEMENTATION_PLAN.md     # Task tracking
```

---

## Data Flow

### 1. Input Processing

```
User ABC input → parseABC() → NoteEvent[] → analysis functions
```

**Key files**: `abcParser.js`, `types/music.js`

The parser converts ABC notation to arrays of `NoteEvent` objects:
```javascript
class NoteEvent {
  pitch: number;      // MIDI pitch (60 = C4)
  duration: number;   // In beats (e.g., 0.5 for eighth note in 4/4)
  onset: number;      // Beat position (0-indexed)
  scaleDegree: ScaleDegree;  // ^1, ^2, etc.
  abcNote: string;    // Original ABC notation
}
```

### 2. Analysis Pipeline

**File**: `analysis.js`

Main analysis functions (called from `App.jsx:analyze()`):

| Function | Purpose | Returns |
|----------|---------|---------|
| `findSimultaneities()` | Find note overlaps | `Simultaneity[]` |
| `testHarmonicImplication()` | Tonal orientation | observations |
| `testRhythmicVariety()` | Duration diversity | observations |
| `testStrettoViability()` | Self-overlap quality | detailed results |
| `testTonalAnswer()` | Real vs tonal answer | mutation point |
| `testDoubleCounterpoint()` | Invertibility | both configs |
| `testContourIndependence()` | Motion types | ratios |
| `testModulatoryRobustness()` | CS vs answer | violations |
| `testSequentialPotential()` | Detect sequences | ranges |
| `detectSequences()` | Core sequence detection | matches |

### 3. Dissonance Scoring

**File**: `dissonanceScoring.js`

The most complex analysis module. Evaluates each dissonance in context:

```
Entry (how arrived) → Dissonance (type/position) → Exit (resolution)
```

Key functions:
- `scoreDissonance(sim, allSims)` - Score single dissonance
- `analyzeAllDissonances(sims)` - Score all simultaneities
- `checkPatterns(...)` - Detect suspensions, PT, etc.
- `scoreEntry(...)` - Evaluate approach motion
- `scoreExit(...)` - Evaluate resolution

**Important**: Uses module-level state for meter and P4 treatment:
```javascript
setMeter({ num, denom })      // Call before analysis
setP4Treatment(bool)          // P4 as dissonant or consonant
setSequenceRanges(ranges)     // For leap penalty mitigation
```

### 4. Scoring Aggregation

**File**: `scoring.js`

`calculateOverallScore(results)` aggregates category scores:

```javascript
// Categories and weights
const WEIGHTS = {
  tonalClarity: 0.5,
  rhythmicCharacter: 0.8,
  strettoPotential: 1.0,
  invertibility: 1.0,
  rhythmicInterplay: 0.8,
  voiceIndependence: 0.9,
  transpositionStability: 1.0,
};
```

Each category has a dedicated scoring function:
- `scoreTonalClarity(results)`
- `scoreRhythmicCharacter(results)`
- `scoreStrettoPotential(results)`
- etc.

---

## Key Concepts

### Simultaneity

A moment when two notes overlap:
```javascript
class Simultaneity {
  onset: number;           // Beat position
  voice1Note: NoteEvent;   // Upper voice
  voice2Note: NoteEvent;   // Lower voice
  interval: Interval;      // Musical interval
  metricWeight: number;    // 0-1, higher = stronger beat
}
```

### Interval

```javascript
class Interval {
  semitones: number;  // Absolute distance
  class: number;      // 1-8 (unison through octave)
  quality: string;    // 'perfect', 'major', 'minor', etc.
  isConsonant(): boolean
}
```

### Scale Degree

```javascript
class ScaleDegree {
  degree: number;      // 1-7
  alteration: number;  // -1, 0, +1 (flat, natural, sharp)
  toString(): string   // "^1", "^#4", etc.
}
```

### Metric Weight

Calculated in `formatter.js:metricWeight(beat, meter)`:
- 1.0 = downbeat
- 0.75+ = strong beat
- 0.45-0.74 = weak beat
- <0.45 = off-beat

---

## Visualization Components

### PianoRoll

Renders notes as colored rectangles. Features:
- Click note for details
- Sequence highlighting (golden glow)
- Subject vs CS color coding

**Props**: `notes`, `width`, `height`, `onNoteClick`, `highlightRanges`

### IntervalAnalysisViz

The main analysis view. Shows:
- Two-voice piano roll
- Interval connections between voices
- Click for interval details

**Complex because**: Handles voice crossing, interval display, highlighting

### StrettoViz

Shows subject overlapping with itself (comes) at various distances.

### InvertibilityViz

Shows original and inverted configurations side-by-side.

---

## State Management

All in `App.jsx` via React useState:

- **Input**: `subjectInput`, `csInput`, `answerInput`
- **Settings**: `selKey`, `selMode`, `selNoteLen`, `selTimeSig`, etc.
- **Results**: `results`, `scoreResult`, `error`
- **UI state**: `highlightedItem`, `activeSequenceVoice`, `activeSequenceRange`

Analysis is triggered by clicking "Analyze" button, calling `analyze()`.

---

## Sequence Detection (Recently Fixed)

**File**: `analysis.js:detectSequences()`

A melodic sequence is a pattern that repeats consecutively (not scattered occurrences).

Key fix (Jan 2025): Changed from "find all matching patterns anywhere" to "find consecutive repetitions only". The old code would report "Notes 1-19 (3-note pattern)" when notes 1-3 and 13-15 matched - that's a motif, not a sequence. Now it requires patterns to be adjacent.

Detection uses:
- Interval classes (M3/m3 = same "3rd" class)
- Rhythm matching (within 10% tolerance)
- Inversion equivalence (P4 up ≈ P5 down)

---

## Common Tasks

### Adding a new analysis category

1. Add analysis function in `analysis.js`
2. Call it from `App.jsx:analyze()`
3. Add scoring function in `scoring.js`
4. Add to category weights
5. Display results in appropriate component

### Modifying dissonance scoring

All in `dissonanceScoring.js`. Key locations:
- `scoreEntry()` - lines ~400-470
- `scoreExit()` - lines ~480-560
- `checkPatterns()` - lines ~570-730
- Pattern bonuses are defined in `checkPatterns()`

### Changing visualization colors

**File**: `vizConstants.js`

Semantic colors:
```javascript
VIZ_COLORS = {
  consonant: '#22c55e',
  dissonantGood: '#8b5cf6',
  dissonantMarginal: '#f59e0b',
  dissonantBad: '#ef4444',
}
```

---

## Testing

No comprehensive test suite currently. Testing is manual via UI.

**Recommended test cases** (from IMPLEMENTATION_PLAN.md):
- Various time signatures (4/4, 6/8, 9/8)
- Voice crossing scenarios
- Subjects with rests
- Short (2-bar) and long (8+ bar) subjects

---

## Known Issues / Technical Debt

1. **Module-level state in dissonanceScoring.js** - `setMeter()`, `setP4Treatment()` etc. must be called before analysis. Not ideal for concurrent analysis.

2. **Large components** - `App.jsx` (1528 lines), `IntervalAnalysisViz.jsx` (898 lines) could be split.

3. **No TypeScript** - Using JSDoc comments but no static typing.

4. **Visualization complexity** - Voice crossing handling is complex; consider simplification.

---

## Documentation Locations

- **Design principles**: `PROJECT_INTENT.md`
- **Scoring details**: `docs/SCORING_SYSTEM.md`
- **Critical analysis**: `docs/SCORING_CRITICAL_APPRAISAL.md`
- **Implementation tasks**: `IMPLEMENTATION_PLAN.md`
- **This file**: `docs/CODEBASE_OVERVIEW.md`
- **Next steps**: `docs/PROJECT_PLAN.md`
