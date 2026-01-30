# Pending Feedback Log

## CRITICAL - App Issues
| Issue | Claude Check | User Check |
|-------|--------------|------------|
| App white screen | DISABLED UnifiedCounterpointViz (reverted to IntervalAnalysisViz) | [ ] Does app load now? |

## PENDING ACTIONS

### Visualization
| Issue | Claude Check | User Check |
|-------|--------------|------------|
| Areas in viz | [ ] Not yet investigated | [ ] |
| UnifiedCounterpointViz | DISABLED - was causing white screen? | [ ] Confirm fix works |
| Color scheme consistency | Used VIZ_COLORS in IntervalAnalysisViz | [ ] |

### Scoring
| Issue | Claude Check | User Check |
|-------|--------------|------------|
| Stretto: top 3 distances | [ ] Not implemented | [ ] |
| Rhythmic: rests/syncopation | [ ] Not implemented | [ ] |
| Invertibility double-count | [ ] Not implemented | [ ] |
| Sequences linked to scoring | YES - 75% penalty reduction in sequences | [ ] |

### For Later
- [ ] Second countersubject support (CS2)
- [ ] Harmonic scoring refinement
- [ ] Fix and re-enable UnifiedCounterpointViz

---

## CHANGELOG (What Claude Has Done)

### 2026-01-30 (Latest)
- **DISABLED** UnifiedCounterpointViz - suspected cause of white screen
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
Last updated: 2026-01-30 (by Claude)
