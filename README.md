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

- **Overall Viability Score**: A weighted aggregate on the base-zero scale, displayed with signed values (`+`/`-`) and a rating (`Strong/Good/Fair/Weak`)
- **Grouped Category Breakdowns**: Detailed category panels organized as Counterpoint Quality, Rhythmic Independence, and Stretto
- **Visual Score Gauges/Bars**: Category cards and gauge visuals that map negative values below baseline and positive values above baseline
- **Detailed Factors**: Expandable per-category factor lists split into strengths, issues, and neutral factors
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

All scoring uses a **base-zero internal scale**. A value of `0` is the neutral baseline; positive values indicate improving contrapuntal viability, and negative values indicate degradation. The displayed category and overall values are these base-zero scores (not remapped to a 0–100 scale).

### Score Categories

| Category | Weight | Description |
|----------|--------|-------------|
| Subject Rhythmic Character | 0.8 | Distinctiveness and variety of rhythmic profile |
| Stretto Potential | 1.0 | Counterpoint quality under overlapping entries |
| Invertible Counterpoint *(with countersubject)* | 1.0 | Subject/CS quality under inversion |
| Rhythmic Independence *(with countersubject)* | 0.9 | Combined contour independence + rhythmic interplay |
| CS vs Answer Quality *(with countersubject)* | 1.0 | Counterpoint quality when the CS is paired with the tonal answer |

### Rating Thresholds

| Score | Rating |
|-------|--------|
| `>= 15` | Strong |
| `>= 5` and `< 15` | Good |
| `>= 0` and `< 5` | Fair |
| `< 0` | Weak |

### Weighted Aggregation Note

The overall viability score is computed as a **weighted arithmetic mean of internal base-zero category scores** (using category weights), then rounded for display. This preserves direct comparability between category-level and overall values.

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
