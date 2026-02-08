# Harmonic Implication Algorithm Specification

This document specifies the algorithm for analyzing harmonic implications in fugue subjects and countersubjects.

---

## Overview

The algorithm determines what harmonies a melodic line implies through a three-stage process:

1. **Per-beat note collection**: Gather notes sounding on each beat with salience weights
2. **Chord candidate scoring**: Evaluate how well each chord type fits the weighted notes
3. **Global refinement**: Dynamic programming to find optimal harmonic sequence

---

## Stage 1: Per-Beat Note Collection

### Beat Definition
- Beats are defined by the meter (e.g., 4 beats per measure in 4/4)
- In compound meters (6/8, 9/8, 12/8), main beats are dotted quarters
- Chords cannot change within a beat (one chord maximum per beat)

### Preprocessing

Long notes are split at beat boundaries into segments. A whole note spanning 4 beats creates 4 segments, each contributing to its respective beat's chord analysis. Truly repeated attacks on the same pitch (not sustained segments) are merged.

### Note Salience Formula

For each note sounding during a beat, calculate its salience:

```
salience = max(
  (duration - 0.125) × metric_multiplier × approach_modifier,
  0.025
) × decay
```

Where:
- **duration**: Note duration in beat units within this beat segment
- **0.125**: Passing note threshold — very short notes get minimal salience
- **0.025**: Minimum salience floor — every note contributes at least this much
- **metric_multiplier**: Based on where the note attacks
  - Downbeat (weight ≥ 1.0): 1.2
  - Strong beat (weight ≥ 0.75): 1.0
  - Other main beat (weight ≥ 0.5): 0.75
  - Off-beat: 0.5
- **approach_modifier**:
  - Step approach (1-2 semitones): × 0.8 (passing/neighbor, less structural)
  - Perfect interval leap (P4/P5/P8): × 1.2 (structurally important)
  - Other: × 1.0

### Lookback Decay (Linear)

Notes from previous beats contribute to the current beat's chord analysis with **linear** decay:

```
decay = max(1.0 - beatDistance × SALIENCE_DECAY_RATE, 0)
```

Where `SALIENCE_DECAY_RATE = 0.4`. This means:
- Current beat (distance 0): decay = 1.0
- Previous beat (distance 1): decay = 0.6
- 2 beats ago (distance 2): decay = 0.2

Maximum lookback is 2 beats. Linear decay (rather than exponential) reaches zero, fully eliminating distant notes, and is less aggressive at close distances, which better supports genuine arpeggiation.

### Two-Pass Chord Boundary Constraint

The algorithm uses a two-pass approach to prevent notes from "skipping over" an intervening chord change:

1. **Pass 1 (unconstrained)**: Collect notes with full 2-beat lookback and run DP to get initial chord assignments.
2. **Pass 2 (constrained)**: Re-collect notes, but now a note from beat N can only contribute to beat M if all intervening beats (N+1 ... M-1) have the same chord assignment as beat M, or are null. Then re-run the DP on the constrained note sets.

This means a C major arpeggio across 4 beats works correctly (all beats share the same chord, so lookback is unrestricted), but a note from beat 4 cannot contribute to beat 6 if beat 5 was assigned a different chord.

### Repetition

If a pitch is repeated within the measure via separate attacks, the repeated notes are merged (durations summed). Sustained note segments are not merged — they contribute independently to each beat.

---

## Stage 2: Chord Vocabulary

### Implemented Chord Types

The vocabulary is deliberately limited to triads, sixth chords, and seventh chords. Extended chords (9ths, 11ths, 13ths), sus chords, power chords, add chords, and altered chords are excluded. The rationale: with only 2-4 pitch classes per beat, an extended vocabulary causes almost every combination to match some exotic chord, producing meaningless results (e.g., every note group becomes a "ninth" of something).

Suspensions are non-chord tones handled by the dissonance scoring system, not by harmonic analysis.

Every chord **must** have its root present in the beat's notes.

#### Triads (complexity: 1)
| Name | Intervals | Required | Notes (from C) |
|------|-----------|----------|----------------|
| major | [0, 4, 7] | root + 3rd | C E G |
| minor | [0, 3, 7] | root + 3rd | C Eb G |

#### Triads (complexity: 2)
| Name | Intervals | Required | Notes (from C) |
|------|-----------|----------|----------------|
| diminished | [0, 3, 6] | root + 3rd + 5th | C Eb Gb |
| augmented | [0, 4, 8] | root + 3rd + 5th | C E G# |

#### Sixth Chords (complexity: 3)
| Name | Intervals | Required | Notes (from C) |
|------|-----------|----------|----------------|
| major_6 | [0, 4, 7, 9] | root + 3rd + 6th | C E G A |
| minor_6 | [0, 3, 7, 9] | root + 3rd + 6th | C Eb G A |

#### Seventh Chords (complexity: 3)
| Name | Intervals | Required | Notes (from C) |
|------|-----------|----------|----------------|
| dominant_7 | [0, 4, 7, 10] | root + 3rd + 7th | C E G Bb |
| major_7 | [0, 4, 7, 11] | root + 3rd + 7th | C E G B |
| minor_7 | [0, 3, 7, 10] | root + 3rd + 7th | C Eb G Bb |

#### Seventh Chords (complexity: 4)
| Name | Intervals | Required | Notes (from C) |
|------|-----------|----------|----------------|
| half_diminished_7 | [0, 3, 6, 10] | all four | C Eb Gb Bb |
| diminished_7 | [0, 3, 6, 9] | all four | C Eb Gb Bbb |
| minor_major_7 | [0, 3, 7, 11] | root + 3rd + 7th | C Eb G B |

### Inversions

All chords can appear in any inversion. The algorithm tests all 12 possible roots and matches notes against the chord's interval pattern regardless of which note is lowest.

---

## Stage 3: Per-Beat Chord Scoring

For each beat, evaluate every possible chord (all types × 12 roots where root is present):

### Step 1: Check Required Intervals

If the root is not present in the beat's notes, **immediately discard**.

For each chord type, check if all required intervals are present. If any are missing, discard.

### Step 2: Calculate Fit Score

```
matched_salience = Σ (note_salience × chord_member_weight)  for matching notes
non_chord_penalty = Σ max(note_salience - 0.05, 0)          for non-matching notes
pre_bass_score = matched_salience - non_chord_penalty
```

Chord member weights by interval role:

| Role | Weight | Constant |
|------|--------|----------|
| Root (0) | 1.1 | ROOT_WEIGHT |
| Third (3, 4) | 1.0 | THIRD_WEIGHT |
| Fifth (7), Seventh (10, 11) | 0.8 | FIFTH_SEVENTH_WEIGHT |
| Tritone (6), Aug5 (8), Sixth (9) | 0.6 | SIXTH_AUGFIFTH_WEIGHT |
| Other | 0.5 | — |

Non-chord tone penalty has a floor of 0.05 — notes with salience below this threshold incur no penalty (they're too insignificant to count against the chord).

### Step 3: Bass Position

```
score = pre_bass_score × bass_multiplier
```

| Bass note is... | Multiplier |
|-----------------|-----------|
| Root | × 1.1 (bonus) |
| Fifth | × 0.9 (mild penalty) |
| Seventh | × 0.8 (penalty) |
| Other | × 1.0 |

### Step 4: Complexity Penalty

Applied in the DP stage: `COMPLEXITY_PENALTY = 0.05` per complexity level.

Simpler chords are preferred when evidence is ambiguous. Major/minor triads (complexity 1) have the smallest penalty; diminished_7 and half_diminished_7 (complexity 4) have the largest.

---

## Stage 4: Global Refinement (Dynamic Programming)

The goal is to find a **sequential series of chords** (one per beat maximum) that maximises overall harmonic coherence.

### DP Formulation

State: `dp[beat][chordKey]` where chordKey = `"root-type"` or `"null"`

```
dp[i][c] = max over all prev states dp[i-1][c'] of:
  dp[i-1][c'].score + chord_score(i, c) - complexity_penalty(c)
```

Each beat also has a "null" option (no chord assigned) that inherits the best previous score without adding anything.

### Arpeggiation Chains

When the same chord (root + type) appears on consecutive beats, it forms an arpeggiation chain. Chain length is tracked but does not add bonus score — the chain is informational.

**Chain breaking**: A salient non-chord tone (salience ≥ 0.125) on the current beat breaks the chain even if the chord type matches.

### Backtracking

After filling the DP table, backtrack from the best final state to reconstruct the optimal chord sequence.

### Output

The algorithm outputs:
1. A sequence of chords, one per beat (or null for beats with insufficient evidence)
2. Per-beat audit trail showing every calculation step
3. Top 5 alternative candidates per beat for comparison

---

## Summary Metrics

| Metric | Definition | Purpose |
|--------|-----------|---------|
| **coverage** | analyzedBeats / totalBeats | Primary clarity measure: what proportion of beats have chord assignments |
| **avgFitScore** | Mean chord score across assigned beats | Quality measure: how well the assigned chords fit their notes |
| **avgConfidence** | Mean (matchCount / noteCount) per beat | Match ratio: what fraction of notes belong to the chord |
| **harmonicRhythm** | uniqueChords / totalBeats | Rate of harmonic change |
| **impliesDominant** | Whether any chord has root = dominant of key | V or V7 present in sequence |
| **firstChord / lastChord** | Opening and closing chord names | Informational, not scored |

---

## Scoring Impact

The `coverage` metric feeds into the **Tonal Definition** score:

| Coverage | harmonicClarityScore |
|----------|---------------------|
| ≥ 80% | 2.0 |
| ≥ 60% | 1.0 |
| ≥ 40% | 0.5 |
| < 40% | 0 |

This is then scaled by × 4 and added to the internal tonal definition score (0-8 range contribution).

Dominant implication adds +3 (Tonal Definition) or +2 (Tonal Clarity) to internal score.

---

## Implementation Notes

### Pitch Class Conversion

Convert MIDI notes to pitch classes (0-11) for chord matching:
```javascript
pitchClass = midiNote % 12
```

### Interval Calculation

Intervals are always calculated as semitones above the root (mod 12):
```javascript
interval = (notePitchClass - rootPitchClass + 12) % 12
```

### Handling Rests

Beats containing only rests have no chord candidate. The DP may select the "null" option for those beats, and they count against coverage.

### Audit Trail

Every chord assignment includes a detailed audit showing:
- Per-note salience breakdown (duration, metric weight, approach, decay)
- Per-note contribution to matched salience (salience × weight)
- Non-chord tone penalties with individual values
- Pre-bass score, bass position multiplier and reason
- Complexity level and penalty
- Inherited score from previous beat
- Chain continuation status
- Final DP score

---

## Example

Given a subject in C major: C4 (beat 1, quarter) - E4 (beat 2, quarter) - G4 (beat 3, quarter) - C5 (beat 4, quarter)

**Beat 1**: C4 sounds alone → no chord (need ≥ 2 pitch classes)

**Beat 2**: E4 sounds, C4 contributes with decay 0.6
- C4: salience = base × 0.6 (decayed from previous beat)
- E4: salience = base × 1.0 (current beat)
- Candidates: C major (root C present, third E present)
- Best fit: C major

**Beat 3**: G4 sounds, E4 contributes with decay 0.6
- E4: decayed
- G4: current beat
- Candidates: C major (if root still in range), Em, etc.
- DP chooses based on global optimisation

**Beat 4**: C5 sounds
- Similar lookback logic

**Result**: Subject implies C major arpeggiation across most beats.
