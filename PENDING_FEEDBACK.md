# Pending Feedback Log

## CRITICAL - App Issues
| Issue | Claude Check | User Check |
|-------|--------------|------------|
| App white screen | **FIXED** - undefined var `avgCounterpointScore` in scoring.js:404 | [ ] Does app load now? |

## PENDING ACTIONS

### Visualization
| Issue | Claude Check | User Check |
|-------|--------------|------------|
| Areas in viz | [ ] Not yet investigated | [ ] |
| UnifiedCounterpointViz | **RESTORED** - re-enabled in App.jsx | [ ] Confirm works |
| Color scheme consistency | Used VIZ_COLORS in IntervalAnalysisViz | [ ] |

### Scoring
| Issue | Claude Check | User Check |
|-------|--------------|------------|
| Stretto: top 3 distances | **DONE** - scoring.js:341-362 uses top 3 avg | [ ] |
| Rhythmic: rests/syncopation | **DONE** - analysis.js:684-732 (rest count, off-beat attacks) | [ ] |
| Invertibility double-count | **DONE** - removed separate penalty (scoring.js:600-602) | [ ] |
| Sequences linked to scoring | YES - 75% penalty reduction in sequences | [ ] |
- [ ] Stretto: Use top 3 distances, not percentage of viable // i think it does this
- [ ] Rhythmic variety: Account for rests/syncopation // zi think youve done this
- [ ] Double-counting in invertibility parallel perfects - remove. // youve already done this, I asked you to check and you did not
- [ ] Sequences: Linked to scoring (75% penalty reduction) but user asked if linked? // you've already acted on this

### For Later // for right after you get the app working again
- [ ] Second countersubject support (CS2)
- [ ] Harmonic scoring refinement
- [ ] Harmonic scoring integration refinement // not a clue how it is scored now

---

## CHANGELOG (What Claude Has Done)

### 2026-01-31 (Latest)
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
Last updated: 2026-01-31 (by Claude)
