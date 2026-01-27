# Fugue Subject Analyzer: Scoring System Documentation

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

### 1. Tonal Clarity (Weight: 0.5)
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
| Good rhythmic contrast | +10 | Long-short and short-long patterns present |
| Recognizable pattern | +5 | Clear rhythmic motive detected |

---

### 3. Stretto Potential (Weight: 1.0)
**Group:** Fugal
**Purpose:** Evaluates counterpoint quality when subject overlaps with itself at various distances

**Primary Calculation:**
The score is based on the **average dissonance score** across all tested stretto distances.

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
| Parallel perfects (inverted) | -5 per issue (max -12) | Critical issue |
| High imperfect consonance ratio (≥60%) | +5 | 3rds/6ths are safe for inversion |
| Low imperfect consonance ratio (<30%) | -3 | Too many perfect intervals |

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

**Additional Factors:**
| Factor | Impact | Condition |
|--------|--------|-----------|
| >4 strong beat collisions | -5 | Excessive simultaneous attacks |
| 3-4 strong beat collisions | -2 | Some collision issues |

---

### 6. Voice Independence (Weight: 0.9)
**Group:** Combination
**Purpose:** Evaluates melodic contour differentiation

**Motion Type Analysis:**
| Motion Type | Impact | Threshold |
|-------------|--------|-----------|
| Contrary ≥50% | +12 | Strong independence |
| Contrary ≥35% | +8 | Good independence |
| Contrary ≥20% | +3 | Moderate |
| Contrary <20% | -5 | Voices move together too often |
| Parallel >40% | -12 | Excessive parallel motion |
| Parallel 25-40% | -5 | High parallel motion |
| Parallel ≤10% | +5 | Good variety |
| Oblique ≥20% | +5 | Good oblique motion |
| Oblique 10-20% | +2 | Some oblique motion |

---

### 7. Transposition Stability (Weight: 1.0)
**Group:** Combination
**Purpose:** How well countersubject works against the dominant-level answer

| Factor | Impact | Condition |
|--------|--------|-----------|
| Counterpoint quality vs answer | ×5 | Average dissonance score |
| No dissonances | +10 | Perfect consonance throughout |
| ≥85% consonant on strong beats | +8 | Strong stability |
| ≥70% consonant on strong beats | +3 | Good stability |
| <50% consonant on strong beats | -8 | Problematic |
| No parallel perfect violations | +3 | Clean voice-leading |
| Parallel perfect violations | -5 per violation (max -15) | Critical issues |

---

## Dissonance Scoring System

The dissonance scoring system evaluates each interval in context, following species counterpoint principles.

### Score Range
- **+2.0 to +3.0**: Exceptionally well-handled (strong suspension, appoggiatura)
- **+1.0 to +2.0**: Good handling (proper passing tone, neighbor)
- **0.0**: Acceptable/neutral
- **-1.0 to 0.0**: Marginal
- **Below -1.0**: Problematic

### Entry Scoring (C → D)
Motion type into the dissonance:

| Motion Type | Impact |
|-------------|--------|
| Oblique | +0.5 |
| Contrary | +0.5 |
| Similar (step involved) | -0.5 |
| Similar (same interval type) | -1.0 |
| Parallel | -1.5 |

**Metric Position:**
- Strong beat entry: **-1.0**

### Exit Scoring (D → ?)
Resolution quality:

| Resolution | Impact |
|------------|--------|
| To imperfect consonance (3rd, 6th) | +1.0 |
| To perfect consonance (unison, 5th, 8ve) | +0.5 |
| To another dissonance | -1.5 |
| Resolved by abandonment | -0.5 |
| Delayed resolution (long rest) | -0.3 |

### Resolution Penalties (Leap-based)
When entering by leap, the exit must compensate:

**Skip entry (m3/M3, 3-4 semitones):**
| Exit Type | Penalty |
|-----------|---------|
| Skip | -0.5 |
| P4/P5 | -1.0 |
| Large leap | -2.0 |

**P4/P5 entry:**
| Exit Type | Penalty |
|-----------|---------|
| Opposite skip | -1.0 |
| Opposite P4/P5 or same-dir skip | -1.5 |
| Other | -2.0 |

**Large leap entry (6th+):**
| Exit Type | Penalty |
|-----------|---------|
| Step | 0 |
| Opposite skip | -1.5 |
| Other | -2.5 |

### Sequence Mitigation
Leaps within detected melodic sequences receive **75% penalty reduction**, since sequences justify unusual intervals through structural repetition.

### Pattern Recognition Bonuses

| Pattern | Bonus | Detection Criteria |
|---------|-------|-------------------|
| Suspension | +1.5 | Oblique entry on strong beat, step-down resolution |
| Appoggiatura | +2.5 | Leap/skip entry on strong beat, step resolution opposite |
| Cambiata (traditional) | +1.5 | Step down entry, skip-down 3rd exit, weak beat |
| Cambiata (inverted) | +1.0 | Step up entry, skip-up 3rd exit, weak beat |
| Cambiata (strong beat) | +0.5 | Cambiata figure on strong beat (non-traditional) |
| Escape tone | +0.5 | Step entry, skip/leap exit opposite |
| Passing tone | 0 | Step through in same direction, weak beat |
| Neighbor tone | 0 | Step out and back, weak beat |
| Anticipation | 0 | Oblique entry and exit on weak beat |

---

## Consonance Context Scoring

Consonances are also evaluated in context:

### Repetition Penalties
| Condition | Penalty |
|-----------|---------|
| 2+ consecutive perfect intervals (unison, 5th, 8ve) | -0.5 |
| 3+ consecutive 3rds | -0.3 |
| 3+ consecutive 6ths | -0.3 |

### Resolution Quality
| Condition | Impact |
|-----------|--------|
| Good resolution of preceding dissonance (stepwise) | +0.5 |
| Weak resolution (by leap) | -0.3 |

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
