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

### Note Salience Formula

For each note sounding during a beat, calculate its salience:

```
salience = max(
  (duration_in_quarters × metric_weight × approach_modifier) - 0.1,
  0.01
)
```

Where:
- **duration_in_quarters**: Total duration including tied/repeated notes in the same beat
- **metric_weight**: Based on where the note attacks
  - Strong beat (beat 1): 1.0
  - Medium beat (beat 3 in 4/4): 0.75
  - Other main beats: 0.5
  - Off-beat: 0.3
- **approach_modifier**:
  - Step approach (m2/M2): × 0.8 (less structurally important)
  - Perfect interval leap approach (P4/P5/P8): × 1.2 (more structurally important)
  - Other: × 1.0

### Recency Weighting

Notes are weighted by recency - how recently they **stopped** sounding (not onset):

```
recency_weight = 1.0 - (time_since_note_ended × decay_rate)
```

Where decay is **linear** (not exponential). Notes still sounding have recency_weight = 1.0.

### Repetition

If a pitch is repeated within the measure, its total duration is summed. Repetition itself can occur anywhere in the measure.

---

## Stage 2: Chord Vocabulary

### Required Intervals by Chord Type

Every chord **must** have its root present. Additional requirements:

| Chord Type | Required Intervals |
|------------|-------------------|
| Power chord (5) | Root only (fifth optional) |
| Major triad | Root + third |
| Minor triad | Root + third |
| Diminished triad | Root + third + fifth (fifth required for dim) |
| Augmented triad | Root + third + fifth (fifth required for aug) |
| Sus2 | Root + 2nd |
| Sus4 | Root + 4th |
| 6th chords | Root + third + 6th |
| 7th chords | Root + third + 7th |
| 9th/11th/13th | Root + third + defining extension |
| Add chords | Root + added interval |
| Altered chords | Root + third + altered interval |

**Note**: The fifth is never necessary to a chord unless it is Augmented or Diminished.

**Suspensions**: Require the fifth present (the fifth holds while root moves).

### Complete Chord Vocabulary

Chords defined by semitone intervals from root:

#### Triads
| Name | Intervals | Notes (from C) |
|------|-----------|----------------|
| major | [0, 4, 7] | C E G |
| minor | [0, 3, 7] | C Eb G |
| diminished | [0, 3, 6] | C Eb Gb |
| augmented | [0, 4, 8] | C E G# |

#### Suspended
| Name | Intervals | Notes (from C) |
|------|-----------|----------------|
| sus2 | [0, 2, 7] | C D G |
| sus4 | [0, 5, 7] | C F G |

#### Power Chord
| Name | Intervals | Notes (from C) |
|------|-----------|----------------|
| power5 | [0, 7] | C G |

#### Sixth Chords
| Name | Intervals | Notes (from C) |
|------|-----------|----------------|
| major_6 | [0, 4, 7, 9] | C E G A |
| minor_6 | [0, 3, 7, 9] | C Eb G A |
| minor_b6 | [0, 3, 7, 8] | C Eb G Ab |

#### Seventh Chords
| Name | Intervals | Notes (from C) |
|------|-----------|----------------|
| major_7 | [0, 4, 7, 11] | C E G B |
| dominant_7 | [0, 4, 7, 10] | C E G Bb |
| minor_7 | [0, 3, 7, 10] | C Eb G Bb |
| minor_major_7 | [0, 3, 7, 11] | C Eb G B |
| half_diminished_7 | [0, 3, 6, 10] | C Eb Gb Bb |
| diminished_7 | [0, 3, 6, 9] | C Eb Gb Bbb |
| augmented_7 | [0, 4, 8, 10] | C E G# Bb |
| augmented_major_7 | [0, 4, 8, 11] | C E G# B |

#### Extended Chords
| Name | Intervals | Notes (from C) |
|------|-----------|----------------|
| major_9 | [0, 4, 7, 11, 14] | C E G B D |
| dominant_9 | [0, 4, 7, 10, 14] | C E G Bb D |
| minor_9 | [0, 3, 7, 10, 14] | C Eb G Bb D |
| major_11 | [0, 4, 7, 11, 14, 17] | C E G B D F |
| dominant_11 | [0, 4, 7, 10, 14, 17] | C E G Bb D F |
| minor_11 | [0, 3, 7, 10, 14, 17] | C Eb G Bb D F |
| major_13 | [0, 4, 7, 11, 14, 17, 21] | C E G B D F A |
| dominant_13 | [0, 4, 7, 10, 14, 17, 21] | C E G Bb D F A |
| minor_13 | [0, 3, 7, 10, 14, 17, 21] | C Eb G Bb D F A |

#### Add Chords
| Name | Intervals | Notes (from C) |
|------|-----------|----------------|
| add9 | [0, 4, 7, 14] | C E G D |
| minor_add9 | [0, 3, 7, 14] | C Eb G D |
| add_b9 | [0, 4, 7, 13] | C E G Db |
| add_#4 | [0, 4, 6, 7] | C E F# G |
| add11 | [0, 4, 7, 17] | C E G F |
| add13 | [0, 4, 7, 21] | C E G A |

#### Altered Chords
| Name | Intervals | Notes (from C) |
|------|-----------|----------------|
| 7b5 | [0, 4, 6, 10] | C E Gb Bb |
| 7#5 | [0, 4, 8, 10] | C E G# Bb |
| 7b9 | [0, 4, 7, 10, 13] | C E G Bb Db |
| 7#9 | [0, 4, 7, 10, 15] | C E G Bb D# |
| 7b5b9 | [0, 4, 6, 10, 13] | C E Gb Bb Db |
| 7#5#9 | [0, 4, 8, 10, 15] | C E G# Bb D# |

### Inversions

All chords can appear in any inversion. The algorithm tests all 12 possible roots and matches notes against the chord's interval pattern regardless of which note is lowest.

---

## Stage 3: Per-Beat Chord Scoring

For each beat, evaluate every possible chord (all types × 12 roots):

### Step 1: Check Required Intervals

If the root is not present in the beat's notes, **immediately discard** this candidate.

For each chord type, check if required intervals are present:
- Major/minor/aug: third must be present
- Diminished/augmented: fifth must be present
- 6th chords: third and 6th must be present
- 7th chords: third and 7th must be present
- Extensions: defining extension must be present

If required intervals are missing, discard the candidate.

### Step 2: Calculate Fit Score

```
fit_score = Σ (note_salience × match_weight)
```

Where match_weight depends on the interval's role:

| Role | Match Weight |
|------|-------------|
| Root | 1.0 |
| Third | 0.9 |
| Seventh | 0.8 |
| Fifth | 0.7 |
| Sixth | 0.7 |
| Extensions (9, 11, 13) | 0.6 |
| Alterations | 0.5 |
| Unmatched note | 0.0 |

### Step 3: Parsimony

When candidates have similar fit scores, **prefer simpler chords**:

Complexity ranking (lower = simpler, preferred):
1. Power chord (simplest)
2. Major/minor triad
3. Diminished/augmented triad
4. Sus2/sus4
5. 6th chords
6. 7th chords
7. Add chords
8. 9th chords
9. Altered chords
10. 11th/13th chords (most complex)

Parsimony is a **tiebreaker** when evidence is ambiguous, not a penalty on unexplained notes.

---

## Stage 4: Global Refinement (Dynamic Programming)

The goal is to find a **sequential series of chords** (one per beat maximum) that maximizes overall harmonic coherence.

### Arpeggiation Chains

Notes can contribute to harmony in two ways:
1. **Vertically**: Sounding simultaneously with other notes on a beat
2. **Horizontally**: As part of an arpeggio spanning multiple beats

A note can contribute **both horizontally AND vertically**, but maximum one contribution of each type.

**Chain breaking**: A change in chord quality breaks the arpeggiation chain. For example:
- C major → C major: chain continues
- C major → G major: chain breaks (different root)
- C major → C minor: chain breaks (quality change)

### Proximity Preference

Notes prefer to be matched with chords closer in time. A note on beat 1 matching a chord on beat 1 is better than matching a chord on beat 3.

### Dynamic Programming Formulation

Define:
- `beats[i]` = set of notes sounding during beat i
- `candidates[i]` = viable chord candidates for beat i (after filtering)
- `H[i][c]` = maximum harmonic fit score ending at beat i with chord c

Recurrence:
```
H[i][c] = local_fit(i, c) + max(
  H[i-1][c'] + arpeggiation_bonus(c', c)  // for all c' where chain continues
  H[i-1][c']                                // for all c' where chain breaks
)
```

Where:
- `local_fit(i, c)` = fit score of chord c for beat i's notes
- `arpeggiation_bonus(c', c)` = bonus if c' and c are the same chord (chain continues)

### Output

The algorithm outputs:
1. A sequence of chords, one per beat (or null for beats with no clear harmony)
2. Confidence scores for each chord assignment
3. Notes that remain unexplained by the harmonic analysis

---

## Scoring Impact

The harmonic implication analysis is computed as supporting data for other scoring components (e.g., stretto potential and transposition stability). Results such as `dominantArrival` and `harmonicClarityScore` are passed through to the overall score calculation.

| Condition | Significance |
|-----------|--------|
| Clear harmonic progression detected | Strong clarity |
| Implies tonic at phrase boundaries | Good tonal grounding |
| Implies dominant before cadences | Good cadential preparation |
| Ambiguous or unclear harmony | Weak tonal profile |
| Contradictory implications | Problematic for fugal use |

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

Beats containing only rests have no chord candidate. The algorithm may extend the previous chord or leave the beat unassigned.

---

## Example

Given a subject in C major: C4 (beat 1, quarter) - E4 (beat 2, quarter) - G4 (beat 3, quarter) - C5 (beat 4, quarter)

**Beat 1**: C4 sounds
- Salience: 1.0 (quarter) × 1.0 (strong beat) × 1.0 = 1.0
- Candidates: C power, C major (need third), C minor (need third), etc.
- Best fit: C power chord (only root required)

**Beat 2**: E4 sounds, C4 may still decay
- E salience: 1.0 × 0.5 = 0.5
- C4 recency: decaying
- Candidates: C major (has root C, third E)
- Best fit: C major (arpeggiation from beat 1)

**Beat 3**: G4 sounds
- G salience: 1.0 × 0.75 = 0.75
- Best fit: C major continues (now complete triad across beats)

**Beat 4**: C5 sounds
- Strong beat, octave reinforcement
- Best fit: C major confirmed

**Result**: Entire subject implies C major throughout (arpeggiated).

---

## Future Extensions

- Voice-leading analysis between successive chords
- Secondary dominant detection
- Modal mixture recognition
- Sequence pattern detection in harmonic progressions
