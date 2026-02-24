# Codebase Overview - Fugue Subject Analyzer

**Last validated against codebase:** 2026-02-24 (`src/`, `docs/`)

This document provides technical orientation for developers continuing work on this project.

---

## Project Structure

```
querulous/
├── src/
│   ├── App.jsx                 # Main application
│   ├── main.jsx               # Entry point
│   ├── components/
│   │   ├── scoring/           # Score display components
│   │   ├── ui/                # Reusable UI components
│   │   └── visualizations/    # Core visualizations
│   │       ├── UnifiedCounterpointViz.jsx
│   │       ├── IntervalAnalysisViz.jsx
│   │       ├── CounterpointComparisonViz.jsx
│   │       ├── InvertibilityViz.jsx
│   │       ├── TwoVoiceViz.jsx
│   │       ├── PianoRoll.jsx
│   │       └── IntervalTimeline.jsx
│   ├── utils/
│   │   ├── analysis.js        # Core analysis functions
│   │   ├── dissonanceScoring.js # Dissonance evaluation
│   │   ├── scoring.js         # Category scoring
│   │   ├── harmonicAnalysis.js # Harmonic implication support
│   │   ├── abcParser.js       # ABC notation parser
│   │   ├── formatter.js       # Beat/pitch formatting
│   │   ├── vizConstants.js    # Visualization constants
│   │   ├── defaultAnalysis.js
│   │   └── constants/thresholds.js
│   └── types/
│       └── music.js           # Type definitions
├── docs/
│   ├── DEFINITIONS.md
│   ├── SCORING_SYSTEM.md
│   ├── SCORING_CRITICAL_APPRAISAL.md
│   ├── HARMONIC_IMPLICATION_ALGORITHM.md
│   ├── PROJECT_PLAN.md
│   ├── CODEBASE_OVERVIEW.md
│   └── WORKING_WITH_USER.md
├── PROJECT_INTENT.md
└── PENDING_FEEDBACK.md
```

---

## Data Flow

### 1. Input Processing

```
User ABC input → parseABC() → NoteEvent[] → analysis functions
```

**Key files**: `src/utils/abcParser.js`, `src/types/music.js`

### 2. Analysis Pipeline

**File**: `src/utils/analysis.js`

Main analysis functions (called from `App.jsx:analyze()`):

| Function | Purpose |
|----------|---------|
| `findSimultaneities()` | Find note overlaps |
| `testHarmonicImplication()` | Tonal orientation |
| `testRhythmicVariety()` | Duration diversity/coherence signals |
| `testStrettoViability()` | Self-overlap quality |
| `testTonalAnswer()` | Real vs tonal answer |
| `testDoubleCounterpoint()` | Invertibility |
| `testContourIndependence()` | Motion type ratios |
| `testMelodicContour()` | Shape, climax, leap behavior |
| `testModulatoryRobustness()` | CS vs answer transposition robustness |
| `testSequentialPotential()` / `detectSequences()` | Sequence detection |

### 3. Dissonance Scoring

**File**: `src/utils/dissonanceScoring.js`

Context-sensitive dissonance evaluation pipeline:

```
Entry (how arrived) → Dissonance (type/position) → Exit (resolution)
```

Key functions:
- `scoreDissonance(sim, allSims)`
- `analyzeAllDissonances(sims)`
- `checkPatterns(...)`
- `scoreEntry(...)`
- `scoreExit(...)`

Uses module-level state for meter and P4 treatment:
- `setMeter({ num, denom })`
- `setP4Treatment(bool)`
- `setSequenceRanges(ranges)`

### 4. Scoring Aggregation

**File**: `src/utils/scoring.js`

`calculateOverallScore(results, hasCountersubject, subjectInfo)` aggregates category scores from dedicated calculators such as:
- `calculateMelodicContourScore(result)`
- `calculateRhythmicCharacterScore(result)`
- `calculateStrettoPotentialScore(result, subjectLength)`
- `calculateVoiceIndependenceScore(result)`
- `calculateTranspositionStabilityScore(result)`

---

## Visualization Components

### UnifiedCounterpointViz
High-level combined visualization entry point in the current UI flow.

### IntervalAnalysisViz
Main interval-focused analysis display; handles voice crossing and interval-detail interaction.

### InvertibilityViz
Shows original and inverted configurations side-by-side.

### PianoRoll / TwoVoiceViz / CounterpointComparisonViz / IntervalTimeline
Supporting visual and comparative views for note layout and interval timeline perspectives.

---

## State Management

Primary state is in `src/App.jsx` via React hooks:

- **Input**: subject/countersubject/answer ABC data
- **Settings**: key/mode/note-length/time-signature controls
- **Results**: analysis results, score summary, error state
- **UI state**: active highlights and selection context

Analysis is triggered by the Analyze action in the app workflow.

---

## Sequence Detection (Recently Fixed)

**File**: `src/utils/analysis.js:detectSequences()`

Sequence detection now emphasizes **consecutive** repetition rather than distant motif matches.

---

## Common Tasks

### Adding a new analysis category

1. Add analysis function in `src/utils/analysis.js`
2. Call it from `src/App.jsx`
3. Add scoring function in `src/utils/scoring.js`
4. Add/adjust weighting and display integration in scoring/UI components

### Modifying dissonance scoring

Most work is in `src/utils/dissonanceScoring.js` (`scoreEntry`, `scoreExit`, `checkPatterns`, `scoreDissonance`).

### Changing visualization colors

Use `src/utils/vizConstants.js` and then verify visual consumers in `src/components/visualizations/*.jsx`.

---

## Testing and Technical Debt

- Automated tests exist for selected utilities (`src/utils/*.test.js`, `src/App.test.jsx`) but coverage is not comprehensive.
- Known debt includes module-level dissonance-scoring state and large UI components that are candidates for decomposition.

---

## Planning Artifact Status

- `IMPLEMENTATION_PLAN.md` is **not present** in this repository and should be treated as an archived reference.
- Legacy roadmap mentions of `StrettoViz.jsx` should be treated as archived; current visualization work should target existing files under `src/components/visualizations/`.
