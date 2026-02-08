# Fugue Subject Analyzer

A composer's workbench for evaluating fugue subjects and countersubjects for contrapuntal viability. Built with React 18 + Vite.

## Quick Reference

```bash
npm run dev          # Start dev server
npm run build        # Production build (run before declaring work complete)
npm run lint         # ESLint (0 warnings allowed)
npm test             # Vitest test suite
```

## Architecture

```
src/
  App.jsx                    # Main component, all top-level state (hooks)
  components/
    scoring/                 # ScoreDashboard, ScoreGauge, ScoreBar, ScoreSummaryCard
    visualizations/          # PianoRoll, IntervalTimeline, StrettoViz, InvertibilityViz,
                             # UnifiedCounterpointViz, CounterpointComparisonViz
    ui/                      # ABCBox, Section, Observation, Select, DataRow, etc.
  utils/
    abcParser.js             # ABC notation parsing and generation
    analysis.js              # Core contrapuntal analysis (stretto, tonal answer, invertibility, etc.)
    scoring.js               # Weighted scoring system (8 categories, 0-100 scale)
    dissonanceScoring.js     # Entry/dissonance/exit scoring model
    harmonicAnalysis.js      # Chord implication analysis (DP-based)
    formatter.js             # Beat/metric weight calculations, time signature handling
    constants.js             # MIDI mappings, key signatures, option definitions
    vizConstants.js          # Shared visualization colors and utilities
  types/music.js             # Data classes: NoteEvent, Interval, ScaleDegree, Simultaneity, MelodicMotion
```

State management is React hooks in App.jsx with prop drilling. No external state library.

## Key Domain Concepts

The user is an experienced composer. Use proper terminology without explanation:
- **Subject**: Main fugue theme. **Answer**: Subject transposed (usually up P5).
- **Countersubject (CS)**: Secondary melody accompanying the subject.
- **Stretto**: Overlapping subject entries. **Invertibility**: Voice-swappable counterpoint.
- **Tonal answer**: Answer with mutations at head/tail to stay in key.
- Input format is **ABC notation**.

## Project Principles

1. **Correctness first** - Broken data is worse than missing data. Verify measure numbers, intervals, and scores are accurate.
2. **Clarity through good design** - Dense information is fine if well-organized. Don't simplify by hiding information.
3. **Comprehensive display** - Show all relevant information. Visualizations should be interactively linked to data.
4. **Adaptive layout** - Must work for 2-bar to 12+ bar subjects. No hardcoded widths.

## Code Conventions

- Components: PascalCase. Utilities: camelCase. Constants: UPPER_CASE.
- CSS: BEM-style classes with CSS custom properties. Semantic color naming (primary, secondary, success, error, warning, info).
- ESLint enforced with 0 warnings. React hooks rules enabled. No prop-types.
- Comments should explain the "why", not the "what".
- Follow existing patterns rather than introducing new approaches.

## Color Semantics (Consistent Across Visualizations)

- **Green spectrum**: Consonant, no issues
- **Purple spectrum**: Dissonant but well-handled
- **Yellow/Orange spectrum**: Warnings, marginal
- **Red spectrum**: Problems, forbidden parallels

## Working Preferences

- **Complete all assigned tasks in full.** Don't leave work partially done.
- **Don't remove features** without explicit authorization.
- **Don't add features** beyond what was asked. Don't expand scope.
- **Don't over-simplify** - complexity exists for a reason in this domain.
- **Don't assume intent** - ask if uncertain.
- **Read existing documentation** (PROJECT_INTENT.md, docs/) before starting work. Context is already written down.
- **Build must pass** (`npm run build`) before declaring work complete.

## Key Documentation

- `PROJECT_INTENT.md` - Design philosophy, visualization specs, color scheme, interaction model
- `PENDING_FEEDBACK.md` - Changelog, pending issues, scoring implementation details
- `docs/CODEBASE_OVERVIEW.md` - Architecture details
- `docs/SCORING_SYSTEM.md` - Scoring logic
- `docs/HARMONIC_IMPLICATION_ALGORITHM.md` - Harmonic analysis details
- `docs/WORKING_WITH_USER.md` - Communication and collaboration guide
