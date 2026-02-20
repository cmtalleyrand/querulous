# Fugue Subject Analyzer: Scoring System Documentation

// out of date needs updating

This document provides a comprehensive summary of all scoring mechanisms used in the Fugue Subject Analyzer.

---

## Overview

The scoring system uses a **base-zero scale**:
- **0** = Acceptable baseline (neutral, unremarkable)
- **Positive scores** = Strengths (the higher, the better)
- **Negative scores** = Weaknesses (the lower, the more problematic)

All category scores are aggregated into an overall weighted average.

---

## Score Categories

### 1. Tonal Clarity (Weight: 0.5) // remove
**Group:** Melodic
**Purpose:** Assesses basic tonal orientation of the subject

**Factors:**
| Factor | Impact | Condition |
|--------|--------|-----------|
| Opens on tonic chord tone | +3 | Opening note is ^1, ^3, or ^5 |
| Terminal quality: strong/good | +3 | Ends on ^1, ^7 (strong) or ^2, ^3 (good) |
| Terminal quality: ambiguous/unusual | -3 | Ends on ^5 (stasis) or chromatic degree |
| Answer junction: strong/good | +3 | Clear I→V or ii→V motion |
| Answer junction: static/unusual | -3 | V→V stasis or problematic junction |

**Answer Junction Explained:** // out of date - remove
The "junction" is the harmonic progression implied when the subject's terminal note connects to the answer's entry on the dominant. A **problematic junction** occurs when:
- **Static**: Subject ends on ^5, creating V→V (dominant to dominant, no harmonic motion)
- **Unusual**: Subject ends on chromatic degrees or ^6, creating unclear harmonic connection

| Terminal Degree | Junction | Quality |
|-----------------|----------|---------|
| ^1 | I→V | Strong |
| ^7 | vii°→V | Strong |
| ^4 | IV→V | Strong |
| ^2 | ii→V | Good |
| ^3 | I→V | Good |
| ^5 | V→V | Static (problematic) |
| Other | ?→V | Unusual (problematic) |

---

### 2. Rhythmic Character (Weight: 0.8)
**Group:** Melodic
**Purpose:** Measures rhythmic distinctiveness and variety

**Factors:**
| Factor | Impact | Condition |
|--------|--------|-----------|
| 5+ unique note values | +15 | Strong variety |
| 4 unique note values | +10 | Good variety |
| 3 unique note values | +5 | Moderate variety |
| 2 unique note values | 0 | Minimal (baseline) |
| 1 note value (uniform) | -15 | Monotonous rhythm |
| Good rhythmic contrast | +10 | Long-short and short-long patterns present | // implementation pending 
| Recognizable pattern | +5 | Clear rhythmic motive detected | // implementation pending

---

### 3. Stretto Potential (Weight: 1.0)
**Group:** Fugal
**Purpose:** Evaluates counterpoint quality when subject overlaps with itself at various distances

**Primary Calculation:**
The score is based on the **average dissonance score** across all tested stretto distances. // out of date

| Factor | Impact | Condition |
|--------|--------|-----------|
| Average counterpoint score | ×5 | Maps -3 to +3 range → -15 to +15 |
| 70%+ distances workable | +8 | Most distances have avgScore ≥ 0 |
| 50-70% distances workable | +4 | Half the distances work |
| <30% distances workable | -5 | Few viable entry points |
| Close stretto possible (≥60% overlap, good score) | +5 | Tight stretto opportunity |
| Parallel perfects present | -2 per distance (max -10) | Critical voice-leading error |

---

### 4. Invertibility (Weight: 1.0)
**Group:** Combination (requires countersubject)
**Purpose:** Evaluates double counterpoint at the octave

**Primary Calculation:**
Score is based on **inverted position dissonance quality**.

| Factor | Impact | Condition |
|--------|--------|-----------|
| Inverted position quality | ×5 | Average dissonance score in inverted position |
| Inverted much worse than original | -3 to -8 | Quality difference > 1.0 |
| Inverted better than original | +3 | Rare but valuable |
| Parallel perfects (inverted) | -2 per issue (max -6) | Voice-leading error (reduced from -5 to avoid overlap with quality score which already penalizes consecutive perfects) | // just denoce actually
// removed unused indicators 

---

### 5. Rhythmic Interplay (Weight: 0.8)
**Group:** Combination
**Purpose:** Measures rhythmic independence between subject and countersubject

**Scale based on attack overlap:**
| Overlap Range | Score | Description |
|--------------|-------|-------------|
| 0-30% | +15 | Strong complementarity |
| 30-50% | +8 to 0 | Good independence (linear interpolation) |
| 50-70% | 0 to -8 | Moderate overlap |
| 70-100% | -8 to -15 | Homorhythmic (voices too similar) |

---

### 6. Voice Independence (Weight: 0.9)
**Group:** Combination
**Purpose:** Evaluates melodic contour differentiation

**Motion Ratio Analysis (Target: 4:1 independent:dependent):** // shoukd use sigmoids for these

| Main Ratio (ind:dep) | Score | Description |
|---------------------|-------|-------------|
| 3.5-6:1 | +10 | Ideal (around 4:1) | // adjusted
| 2.5-3.5:1 | +5 | Acceptable (3:1 range) |
| 1.5-2.5:1 | -5 | Too low (2:1 range) |
| <1.5:1 | -12 | Very poor |
| >6:1 | +5 | Slightly excessive |
| 5-6:1 | +8 | Strong |

**Contrary:Oblique Balance (Target: around 5:2 = 2.5:1):**
| Ratio | Score | Description |
|-------|-------|-------------|
| 1.5-2.5:1 | +5 | Good balance (healthy oblique) |
| 2.5-3:1 | +2 | Acceptable |
| >3:1 | -1 to -5 | Lacking oblique (penalty scales with skew) |
| <1:3 | -1 to -5 | Excessive oblique (penalty scales with skew) |

**Similar:Parallel Balance (Target: at least 2:1):** // these shiukd take into account number of notes
| Ratio | Score | Description |
|-------|-------|-------------|
| <1.5:1 | -5 | Too much parallel vs similar |
| 1.5-2:1 | -2 | High parallel ratio |
| >2:1 | 0 | Acceptable |

**Size of Motion:**
| Condition | Penalty |
|-----------|---------|
| >2 large parallel leaps (>4 semitones) | -1 to -5 |
| >3 large similar motion leaps | -1 to -3 |

---

### 7. Transposition Stability (Weight: 1.0)
**Group:** Combination
**Purpose:** How well countersubject works against the dominant-level answer

| Factor | Impact | Condition |
|--------|--------|-----------|
| CS vs answer overall quality | ×5 | `overallAvgScore` (duration-weighted, all intervals) |
| No dissonances | +10 | Perfect consonance throughout | // everything after this shouldnbe reflected in adore and is redundant 
| ≥85% consonant on strong beats | +8 | Strong stability |
| ≥70% consonant on strong beats | +3 | Good stability |
| <50% consonant on strong beats | -8 | Problematic |
| No parallel perfect violations | +3 | Clean voice-leading |
| Parallel perfect violations | -5 per violation (max -15) | Critical issues | 

**Note on quality score**: The ×5 multiplier uses `overallAvgScore` — a duration-weighted average across **all** intervals (consonances contribute 0.2–0.5 by type; dissonances contribute their actual score). This is the same formula used by the "Score" badge in the visualization. Consonances improve this score, so a CS with many good consonances against the answer will score better than one measured by dissonances alone.

---

## Dissonance Scoring System

The dissonance scoring system evaluates each interval in context, following species counterpoint principles.

### Score Range
- **+2.0 to +3.0**: Strong (strong suspension, appoggiatura)
- **+1.0 to +2.0**: Good (proper passing tone, neighbor)
- **0.0**: Acceptable
- **-1.0 to 0.0**: Mediocre
- **Below -1.0**: Poor

### Entry Scoring (C → D)
Motion type into the dissonance:

// User: tweaked these 
| Motion Type | Impact |
|-------------|--------|
| Oblique | +0.5 |
| Contrary | +0.5 |
| Similar (at least one step) | -0.25 |
| Similar (different intervals, no step) |  -0.5 |
| Similar (same interval type) | -0.75 |
// deleted parallel - not possible to enter into a dissonance by parallel motion - was disonnant already 

// add motion interval (by voice): the logic is that larger moves and changes in direction draw attention to the dissonance 
- Step or static: 0
- Skip (same direction as previous move or recovering leap): -0.25
- Skip (opposite direction of previous move & not recovering): -0.5
- perfect leap (P4,P5,P8): -0.75
- other leap: -1

**Metric Position:**
- Strong beat entry: **-0.5** (accented passing tones and neighbor tones are acceptable)

### Exit Scoring (D → ?)
Resolution quality:

| Resolution | Impact |
|------------|--------|
| To imperfect consonance (3rd, 6th) | +0.75 | // lowered - please action
| To perfect consonance (unison, 5th, 8ve) | +0.5 |
| To another dissonance | **-0.75** |
| Resolved by abandonment | -0.5 |
| Delayed resolution (long rest) | -0.3 |

### Motion Type

Score once for both voices

| Motion Type | Impact |
|-------------|--------|
| Oblique | +0.25 |
| Contrary | +0.5 |
| Similar (at least one step) | -0.25 |
| Similar (no step) |  -0.5 |

### Resolution Penalties (Leap-based)
When entering by leap, the exit must compensate: // lowered these throughout 

**Skip entry (m3/M3, 3-4 semitones):**
| Exit Type | Penalty |
|-----------|---------|
| Step |  0 |
| Skip opposite direction to previous move | -0.25 |
| Skip same direction | -0.5 |
| P4/P5 | -0.75 |
| Large leap | -1.0 |

**Leap entry:** // more of this is now in entry
| Exit Type | Penalty |
|-----------|---------|
| Step or static | 0 |
| Opposite skip | -0.25 |
| Opposite P4/P5 or same-dir skip | -0.75 |
| Other | -1.0 |

### Sequence Mitigation
Leaps within detected melodic sequences receive **75% penalty reduction**, since sequences justify unusual intervals through structural repetition.

### Pattern Recognition Bonuses // needs to be revised down goven changes on main scoring 

| Pattern | Bonus | Detection Criteria |
|---------|-------|-------------------|
| Suspension | +1.5 | Oblique entry on strong beat, step-down resolution |
| Appoggiatura | +2.0 | Leap/skip entry on strong beat, step resolution opposite |
| Cambiata (traditional) | +1.5 | Step down entry, skip-down 3rd exit, weak beat |
| Cambiata (inverted) | +1.0 | Step up entry, skip-up 3rd exit, weak beat |
| Cambiata (strong beat) | +0.5 | Cambiata figure on strong beat (non-traditional) |
| Escape tone | +0.5 | Step entry, skip/leap exit opposite |
| Passing tone | 0 | Step through in same direction, weak beat |
| Neighbor tone | 0 | Step out and back, weak beat |
| Anticipation | 0 | Oblique entry and exit on weak beat |

### Metric Weight Hierarchy

The scoring system uses a hierarchical metric weight system: // for what?

**Strong Beats (weight 0.75-1.0):**
1. Beat 1 in all time signatures (weight: 1.0)
2. Beat 3 in four-beat signatures (weight: 0.75) - slightly smaller penalties/rewards

**Weak Beats (weight 0.1-0.5):**
1. On the beat of any other beat (weight: 0.5)
2. Off-beat primary subdivision (eighths usually) (weight: 0.25)
3. Off-beat other subdivisions (weight: 0.1)

**Compound Meters (6/8, 9/8, 12/8):**
- Main beats are dotted quarters (beats 1 and 2 in 6/8, etc.)
- Beat 1 = strong (1.0), other main beats = medium (0.5-0.75) / which of the two
- Eighth-note subdivisions within beats = weak (0.25)

---

## Passing Character System

After each dissonance is individually scored by `_scoreDissonance`, a two-pass post-processing step adjusts scores based on how ornamental ("passing") each dissonant note is.

### Passingness Score

Computed independently for each voice by `scorePassingMotion()`. Only notes with duration ≤ 0.5 (eighth note or shorter) receive non-zero passingness. // revised factors accoridg to previous instructions - a version of salience

| Factor | Points |
|--------|--------|
| Eighth note | -0.5 |
| Shorter than 16th note | +0.5 |
| Off-beat position (metricWeight < 0.5) | +0.5 |
| Off primary subdivision of the beat | +0.25 |
| On strong beat | -0.5 |
| Same direction as previous move | + 0.25 |
| Different direction to previous move & not recovery | -0.25 |
| Moving by step (1-2 semitones) | +0.75 |
| Moving by skip | 0 |
| Moving by leap | -0.5 |
| Oblique entry | +0.5 | 
| Sequence membership | +1.0 |


```
isPassing = (passingness >= 1.0)
mitigation = passingness / 2
```

The voice with higher passingness is `bestPassing`; per-voice values (`v1Passing`, `v2Passing`) apply to single-voice exit resolution penalties.

### What Passingness Affects

Passingness applies to **all dissonances** — both standalone and consecutive:

| Component | Mitigation Applied | Notes |
|-----------|-------------------|-------|
| Entry motion penalty (similar/parallel) | `bestPassing.mitigation` | Capped at 0 — cannot flip to reward |
| Entry motion reward (oblique/contrary) | Reduced by `min(0.8, mitigation/2.5)` | Floored at 0 — cannot flip to penalty |
| V1 exit resolution penalty | `v1Passing.mitigation` | Per-voice, capped at 0 |
| V2 exit resolution penalty | `v2Passing.mitigation` | Per-voice, capped at 0 |
| D→D base exit penalty (-0.75) | `bestPassing.mitigation` | Consecutive members only, capped at 0 |

**Not affected by passingness**: strong-beat metric penalty, consonance resolution reward, abandonment/rest penalties, pattern bonuses (suspension, appoggiatura, etc.).

### Pass Architecture

**Pass 1** (`analyzeAllDissonances` ~line 1766): Iterate all dissonances; compute and store `v1PassingMotion`, `v2PassingMotion`, `passingMotion` on each result.

**Pass 2** (`analyzeAllDissonances` ~line 1826): Apply per-component mitigations. If any adjustment occurs, append "Passing character (label): +X.XX [details]" to the result's detail strings. This line appears in the "Passing Character Adjustment" panel in the UI.

### Displayed in UI

When passingness produces a non-zero adjustment, a yellow "Passing Character Adjustment" box appears in the detail panel. Each line shows the component adjusted, the mitigation factor, and the adjustment amount.

---

## Consonance Context Scoring

Consonances are also evaluated in context:

### Repetition Penalties
| Condition | Penalty |
|-----------|---------|
| 3+ consecutive perfect intervals (unison, 5th, 8ve) | -0.5 per extra (2 allowed) |
| 4+ consecutive 3rds | -0.25 per extra (3 allowed) |
| 4+ consecutive 6ths | -0.25 per extra (3 allowed) |

### Resolution Quality
Resolution quality is tracked for visualization but **no longer scored** to avoid double-counting with dissonance exit scoring.

---

## Overall Score Calculation

The overall score is a **weighted average** of active category scores:

```
Overall = Σ(category_score × weight) / Σ(weights)
```

### Without Countersubject:
- Tonal Clarity (0.5)
- Rhythmic Character (0.8)
- Stretto Potential (1.0)

### With Countersubject:
- All above, plus:
- Invertibility (1.0)
- Rhythmic Interplay (0.8)
- Voice Independence (0.9)
- Transposition Stability (1.0)

---

## Score Interpretation

| Score Range | Rating | Color | Meaning |
|-------------|--------|-------|---------|
| ≥ 15 | Strong | Dark Green | Notably strong fugue material |
| 5 to 14 | Good | Light Green | Good fugue material |
| 0 to 4 | Fair | Gray | Acceptable, unremarkable |
| < 0 | Weak | Red | Below acceptable baseline |

---

## Visualization Color Semantics

### Consonances
| Category | Color | Meaning |
|----------|-------|---------|
| Normal | Pale green | Standard consonance |
| Preparation | Cyan/teal | Prepares upcoming dissonance |
| Good resolution | Bright green | Resolves previous dissonance well |
| Bad resolution | Orange | Resolves by leap |
| Repetitive | Yellow | Same interval repeated |

### Dissonances
| Category | Color | Meaning |
|----------|-------|---------|
| Good (score ≥ 1) | Bright purple | Well-handled |
| Marginal (score -0.5 to 1) | Purple-pink | Acceptable but not ideal |
| Bad (score < -0.5) | Red | Problematic handling |
