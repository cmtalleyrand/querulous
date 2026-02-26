# Fugue Subject Analyzer

A React-based web application for analyzing fugue subjects and countersubjects for contrapuntal viability. This tool helps composers, music theory teachers, students, and musicologists assess the suitability of musical material for use in fugues.

## Features

### Comprehensive Analysis

- **Harmonic Implication Analysis**: Evaluates opening and closing scale degrees, dominant arrivals, and tonal implications
- **Tonal Answer Generation**: Automatically generates tonal or real answers with mutation point detection
- **Stretto Viability Testing**: Tests subject entries at various time intervals for parallel motion violations
- **Rhythmic Variety Assessment**: Analyzes note value diversity and rhythmic contrast
- **Double Counterpoint Testing**: Checks invertibility of subject-countersubject combinations
- **Contour Independence Measurement**: Evaluates voice leading independence
- **Modulatory Robustness Testing**: Assesses countersubject compatibility with the answer

### Scoring Dashboard

The application features a comprehensive scoring dashboard that provides:

- **Overall Viability Score**: A weighted aggregate score (0-100) with rating
- **Category Breakdowns**: Individual scores for each analysis category
- **Visual Score Bars**: Progress bars with color-coded ratings (Excellent/Good/Fair/Needs Work)
- **Detailed Factors**: Expandable breakdown showing how each score was calculated
- **Strengths & Improvements**: Summary cards highlighting what's working and what needs attention
- **Actionable Suggestions**: Specific recommendations for improving low-scoring areas

### Visualizations

- **Piano Roll Display**: Interactive pitch/time visualization of notes
- **Interval Timeline**: Color-coded consonance/dissonance visualization
- **Two-Voice + Counterpoint Visualizations**: Interval, invertibility, and comparison views for subject/countersubject analysis

### Input Format

The application accepts input in **ABC notation**, a text-based music notation format:

```
D2 A2 F E | D C _B, A, | G, A, _B, C | D4
```

Key features:
- Note names: `C D E F G A B` (upper = middle octave, lower = octave up)
- Octave modifiers: `'` (up) and `,` (down)
- Accidentals: `^` (sharp), `_` (flat), `=` (natural)
- Durations: `2` (double), `/2` (half), etc.
- Bar lines: `|`
- Header fields: `K:` (key), `L:` (note length)

## Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/fugue-analyzer.git
cd fugue-analyzer

# Install dependencies
npm install

# Start development server
npm run dev
```

## Linting Setup Requirements

- This repository is pinned to **ESLint 8.x** (legacy `.eslintrc.cjs` format), so run lint via `npm run lint` to ensure the project-local binary is used.
- Use `npm ci` for consistent installs in CI and local verification; it will honor `package-lock.json` and install the locked ESLint 8.x toolchain instead of any globally installed ESLint 9.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |
| `npm run test:coverage` | Run tests with coverage |

## Project Structure

```
src/
├── components/
│   ├── scoring/           # Scoring dashboard components
│   │   ├── ScoreDashboard.jsx
│   │   ├── ScoreGauge.jsx
│   │   ├── ScoreBar.jsx
│   │   └── ScoreSummaryCard.jsx
│   ├── visualizations/    # Music visualization components
│   │   ├── TwoVoiceViz.jsx
│   │   ├── UnifiedCounterpointViz.jsx
│   │   ├── CounterpointComparisonViz.jsx
│   │   ├── IntervalAnalysisViz.jsx
│   │   ├── InvertibilityViz.jsx
│   │   ├── PianoRoll.jsx
│   │   └── IntervalTimeline.jsx
│   └── ui/                # Reusable UI components
│       ├── Section.jsx
│       ├── Observation.jsx
│       ├── DataRow.jsx
│       ├── Select.jsx
│       └── ABCBox.jsx
├── utils/
│   ├── constants.js       # Musical constants and options
│   ├── formatter.js       # Beat/duration formatting
│   ├── abcParser.js       # ABC notation parsing
│   ├── analysis.js        # Contrapuntal analysis functions
│   └── scoring.js         # Scoring calculation functions
├── types/
│   └── music.js           # Data structures (NoteEvent, Interval, etc.)
├── styles/
│   └── index.css          # Global styles
├── App.jsx                # Main application component
└── main.jsx               # Application entry point
```

## Scoring System

### Score Categories

| Category | Weight | Description |
|----------|--------|-------------|
| Harmonic Implication | 1.0 | Opening/closing degrees, dominant arrivals |
| Rhythmic Variety | 0.8 | Note value diversity |
| Stretto Viability | 1.0 | Clean overlapping entries |
| Tonal Answer | 0.9 | Junction quality |
| Double Counterpoint | 1.0 | Invertibility (with CS) |
| Rhythmic Complementarity | 0.8 | Attack point offset (with CS) |
| Contour Independence | 0.9 | Voice profile independence (with CS) |
| Modulatory Robustness | 1.0 | CS against answer (with CS) |

### Rating Thresholds

| Score | Rating |
|-------|--------|
| 85-100 | Excellent |
| 70-84 | Good |
| 50-69 | Fair |
| 0-49 | Needs Work |

## Technologies

- **React 18** - UI framework
- **Vite** - Build tool
- **Vitest** - Testing framework
- **ESLint** - Code linting

## Music Theory Background

### What Makes a Good Fugue Subject?

1. **Clear tonal identity**: Opens on a tonic chord tone, establishes key
2. **Good harmonic motion**: Ends on a degree that creates smooth junction to the answer
3. **Rhythmic character**: Distinctive rhythm that's recognizable in contrapuntal texture
4. **Stretto potential**: Melodic shape allows overlapping entries without forbidden parallels
5. **Invertible countersubject**: Counterpoint works both above and below the subject

### Tonal vs Real Answer

- **Real Answer**: Exact transposition up a 5th
- **Tonal Answer**: Modified transposition when subject contains ^1-^5 or ^5-^1 motion to maintain tonic-dominant relationship

### Double Counterpoint at the Octave

Good double counterpoint allows the countersubject to be placed above or below the subject. This requires:
- Predominance of 3rds and 6ths (which become 6ths and 3rds when inverted)
- Careful treatment of perfect intervals (5ths become 4ths, which need resolution)
- No parallel perfect intervals in either configuration

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
