# Pending Feedback Log

## CRITICAL - App Issues
| Issue | Claude Check | User Check |
|-------|--------------|------------|
| App white screen | **FIXED** - undefined var `avgCounterpointScore` in scoring.js:404 | [ ] Does app load now? |

## PENDING ACTIONS

### Visualization
| Issue | Claude Check | User Check |
|-------|--------------|------------|
| Areas in viz | **FIXED** - now uses full-height vertical bars | [ ] |
| UnifiedCounterpointViz | **FIXED** - crash on click resolved | [ ] Confirm works |
| Color scheme | **IMPROVED** - muted tones, 0.50-0.55 opacity | [ ] |
| Voice selection | **WORKS** - Subject, Answer, CS1, CS2 selectable | [ ] |
| Transposition intervals | **ADDED** - thirds and sixths (±m3, M3, m6, M6) | [ ] |
| Harmonic analysis display | **ADDED** - ChordAnalysisDisplay in Harmonic Implication | [ ] |

### Scoring
| Issue | Claude Check | User Check |
|-------|--------------|------------|
| Stretto: top 3 distances | **DONE** - scoring.js:341-362 uses top 3 avg | [x] User confirmed |
| Rhythmic: rests/syncopation | **DONE** - analysis.js:684-732 (rest count, off-beat attacks) | [x] User confirmed |
| Invertibility double-count | **DONE** - removed separate penalty (scoring.js:600-602) | [x] User confirmed |
| Sequences linked to scoring | **DONE** - 75% penalty reduction in sequences | [x] User confirmed |

### Needs Clarification
- [ ] Visualization issues with octave displacement - what specific issue?

### For Later
- [ ] Second countersubject support (CS2)

---

## HOW HARMONIC SCORING WORKS (Current Implementation)

**Location:** analysis.js:587-651, scoring.js:221-222, harmonicAnalysis.js

**harmonicClarityScore** (0 to ~2.5 points):
- Based on `harmonicClarity` ratio (% of notes that imply clear chords)
- ≥80% clarity → +2.0 pts
- ≥60% clarity → +1.0 pts
- ≥40% clarity → +0.5 pts
- Bonus +0.5 if starts on tonic AND ends on dominant/tonic

**In Overall Score** (scoring.js:221):
- `clarityImpact = harmonicClarityScore * 4` → scaled to 0-10 range
- Added to melodic factors in internal calculation

---

## CHANGELOG (What Claude Has Done)

### 2026-02-01 (Latest)
- **FIXED** React error #31 - viz crash on click (object rendered as child)
- **IMPROVED** viz colors - less garish, more opaque (0.50-0.55 alpha)
- **ADDED** thirds and sixths to transposition options (±m3, ±M3, ±m6, ±M6)
- **ADDED** ChordAnalysisDisplay - beat-by-beat harmonic analysis now shown to user
- **FIXED** ABC parsing - accidentals no longer carry through bars (was wrong)
- **FIXED** P4 checkbox - now actually respects user setting
- **REMOVED** useless "Mutation: Note N" field from tonal answer
- **REVERTED** bad stretto score adjustment

### 2026-01-31
- **FIXED** viz areas - now full-height vertical bars instead of spanning between notes
- **RESTORED** UnifiedCounterpointViz in App.jsx (was wrongly disabled)
- **FIXED** getMeter error in IntervalTimeline.jsx:56 → meter already passed as prop
- **FIXED** white screen #2: undefined `getMeter()` call in analysis.js:1155 → use `formatter.meter`
- **FIXED** white screen #1: undefined `avgCounterpointScore` in scoring.js:404

### 2026-01-30
- **DISABLED** UnifiedCounterpointViz - suspected cause of white screen (it wasn't)
- **REVERTED** to using IntervalAnalysisViz for voice comparison
- **REMOVED** strong beat collisions from codebase
- **FIXED** tonic pitch class conversion (MIDI → 0-11)
- **CREATED** UnifiedCounterpointViz (but disabled due to crash)
- **UPDATED** IntervalAnalysisViz to use VIZ_COLORS

### 2026-01-29
- Fixed rest handling (fromRest modifier, reentry motion type)
- Fixed P4 resolution (standard dissonance scoring)
- Fixed consecutive count reset
- Added "No sequences found" message

### Earlier
- 4:1 voice independence ratio
- Consecutive perfects: 2 allowed (dissonanceScoring.js:969)
- Consecutive 3rds/6ths: 3 allowed (dissonanceScoring.js:979)
- Harmonic analysis module (harmonicAnalysis.js)

---
Last updated: 2026-02-01 (by Claude)
