# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Querulous is a fugue subject analyzer — a React/Vite web app that takes ABC notation music input and analyzes it for counterpoint quality, harmonic implication, stretto potential, and invertible counterpoint. It produces scored, visualized analysis results.

## Commands

```bash
npm run dev          # Start dev server at http://localhost:5173/querulous/
npm run build        # Production build to ./dist/
npm run lint         # ESLint (must use project-local ESLint 8.x)
npm test             # Vitest unit tests (interactive)
npm run test:coverage  # Vitest with custom coverage reporter
npx playwright test  # E2E tests (requires dev server running first)
```

To run a single test file:
```bash
npx vitest run src/utils/analysis.test.js
```

## Architecture

### Data Flow

```
ABC notation string
  → parseABC() [abcParser.js] → NoteEvent[]
  → App.jsx: set context (setMeter, setP4Treatment, setSequenceRanges)
  → 9 analysis functions run (analysis.js, harmonicAnalysis.js, dissonanceScoring.js)
  → calculateOverallScore() [scoring.js] → weighted category scores
  → ScoreDashboard + Visualization components rendered
```

### Key Files

- **`src/App.jsx`** (83KB) — Main orchestrator. All state, settings, analysis invocation, and tab rendering live here. This is the integration point for all modules.
- **`src/utils/analysis.js`** (67KB) — Primary analysis functions: `testHarmonicImplication`, `testRhythmicVariety`, `testMelodicContour`, `testStrettoViability`, `testTonalAnswer`, `testDoubleCounterpoint`, `testContourIndependence`, `testSequentialPotential`, `findSimultaneities`.
- **`src/utils/dissonanceScoring.js`** (80KB) — Context-sensitive dissonance evaluation. Contains **module-level state** (`setMeter`, `setP4Treatment`, `setSequenceRanges`) that must be called before analysis. This is known technical debt — treat it as a side-effectful initialization step.
- **`src/utils/scoring.js`** (40KB) — `calculateOverallScore()` and per-category score calculators. Uses a base-zero scale (0 = neutral, positive = strength, negative = weakness). Score thresholds: `≥15` Strong, `≥5` Good, `≥0` Fair, `<0` Weak.
- **`src/utils/abcParser.js`** (24KB) — Parses ABC notation into `NoteEvent[]`. Also generates tonal/real answers via `generateAnswerABC()`.
- **`src/types/music.js`** — Core data classes: `NoteEvent` (pitch, duration, onset, scaleDegree), `Interval` (semitones, consonance helpers), `ScaleDegree`.
- **`src/utils/vizConstants.js`** (20KB) — Shared color palette and visual constants used across all visualization components.

### Component Structure

- **`src/components/scoring/`** — ScoreDashboard, ScoreGauge, ScoreBar, ScoreSummaryCard
- **`src/components/visualizations/`** — TwoVoiceViz (71KB), IntervalAnalysisViz (38KB), UnifiedCounterpointViz, InvertibilityViz, PianoRoll, IntervalTimeline
- **`src/components/ui/`** — Reusable layout primitives (ABCBox, Section, DataRow, Observation, Select, InfoButton, etc.)

### Utility Exports

`src/utils/index.js` is the barrel export for all utilities. Import from here rather than individual files when possible.

## Technical Constraints

- **ESLint 8.x pinned** — Use `.eslintrc.cjs` (legacy CommonJS format). Do not upgrade to ESLint 9+ flat config.
- **Vite base path** — `/querulous/` is set in `vite.config.js`; all asset/routing references must account for this.
- **No TypeScript** — JSDoc types are used in some places but not enforced.
- **No prop-types** — ESLint rule is disabled.

## Documentation

The `docs/` directory has important domain-specific documentation:
- `docs/CODEBASE_OVERVIEW.md` — Technical orientation (last validated 2026-03-08)
- `docs/SCORING_SYSTEM.md` — Scoring mechanics (note: marked "out of date")
- `docs/HARMONIC_IMPLICATION_ALGORITHM.md` — Algorithm details
- `docs/DEFINITIONS.md` — Music theory terminology
- `PROJECT_INTENT.md` — Design principles; read before making UI/visualization changes
