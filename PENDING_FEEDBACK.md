# Pending Feedback Log

## CRITICAL - App Issues
- [ ] **App not functioning** - Fixed tonic pitch class conversion, may need more fixes

## PENDING ACTIONS

### Visualization
- [ ] Areas in viz - issue with area calculations
- [ ] Non-stretto viz color scheme - should match stretto viz
- [ ] Unified view refinement - UnifiedCounterpointViz created but may need work

### Scoring
- [ ] Stretto: Use top 3 distances, not percentage of viable
- [ ] Rhythmic variety: Account for rests/syncopation
- [ ] Double-counting in invertibility parallel perfects - remove
- [ ] Sequences: Linked to scoring (75% penalty reduction) but user asked if linked?

### For Later
- [ ] Second countersubject support (CS2)
- [ ] Harmonic scoring integration refinement

---

## CHANGELOG (What Claude Has Done)

### 2026-01-30
- **REMOVED** strong beat collisions from analysis.js, App.jsx, docs/SCORING_SYSTEM.md
- **FIXED** tonic pitch class conversion in testHarmonicImplication (was passing MIDI, needed 0-11)
- **CREATED** UnifiedCounterpointViz with voice selection and transposition options
- **UPDATED** IntervalAnalysisViz to use VIZ_COLORS consistently
- **INTEGRATED** chord analysis into harmonic implication scoring

### 2026-01-29
- Fixed rest handling (fromRest modifier, reentry motion type)
- Fixed P4 resolution (uses standard dissonance scoring)
- Fixed consecutive count reset (only when other voice completes note)
- Added "No sequences found" message

### Earlier
- Implemented 4:1 voice independence ratio
- Consecutive perfects: 2 allowed, penalty from 3rd (line 969)
- Consecutive 3rds/6ths: 3 allowed, penalty from 4th (line 979)
- Harmonic analysis module created (harmonicAnalysis.js)

---
Last updated: 2026-01-30 (by Claude)
