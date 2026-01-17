/**
 * Help content for the Fugue Analyzer
 * Technical explanations of what each analysis does and why it matters.
 */

export const HELP_CONTENT = {
  // Core concepts
  fugue: {
    title: 'Fugue',
    brief: 'A contrapuntal form based on imitative entries of a subject.',
    detailed: `A fugue presents a subject (main theme) that is imitated by successive voices at the interval of a fifth (or fourth). The analysis here assesses whether your subject has the properties needed for this imitative treatment:

• Can it combine with itself at different time offsets (stretto)?
• Does it establish clear tonic-dominant polarity for the answer?
• If you have a countersubject, does it invert cleanly?

These are practical concerns that affect what you can do with the material in a fugue.`,
  },

  subject: {
    title: 'Subject',
    brief: 'The primary theme that defines the fugue.',
    detailed: `The subject is the melodic material that each voice presents in turn. This visualization shows:

• Pitch on the vertical axis (higher = higher pitch)
• Time on the horizontal axis (left to right)
• Note duration shown by rectangle length

The subject's melodic and rhythmic profile determines what contrapuntal possibilities are available.`,
  },

  countersubject: {
    title: 'Countersubject',
    brief: 'A secondary theme that accompanies subject entries.',
    detailed: `A countersubject is counterpoint that consistently accompanies the subject. For it to function properly:

• It must work against both the subject (tonic) and answer (dominant)
• It should be invertible—functioning both above and below the subject
• Its rhythm should complement rather than duplicate the subject's rhythm

The analysis tests these properties directly.`,
  },

  answer: {
    title: 'Answer',
    brief: 'The subject transposed to the dominant.',
    detailed: `The answer is the subject transposed up a perfect fifth (or down a fourth). Two types exist:

Real answer: Exact interval-for-interval transposition.

Tonal answer: Modified transposition used when the subject emphasizes ^1-^5 or ^5-^1. In these cases:
• ^1 in the subject becomes ^5 in the answer (not ^5→^2)
• ^5 in the subject becomes ^1 in the answer (not ^5→^2)

This preserves the tonic-dominant relationship. The "mutation point" is where real transposition resumes after the tonal adjustment.`,
  },

  // Analysis sections
  harmonicImplication: {
    title: 'Harmonic Implication',
    brief: 'How the subject establishes and implies tonal function.',
    detailed: `This analysis examines the subject's scale degrees:

Opening degree: Starting on ^1, ^3, or ^5 (tonic triad) clearly establishes the key. Other degrees create ambiguity.

Terminal degree: Determines the harmonic junction with the answer:
• ^1: Clean I→V progression
• ^2: Pre-dominant function (ii→V possible)
• ^5: Creates V→V stasis (less momentum)
• ^7: Strong dominant pull (vii°→V)

Dominant arrival: When ^5 or ^7 appears on a strong beat. Early arrival (first third) front-loads tension. Late arrival (final third) creates directed motion toward the cadence.

The score reflects how clearly the subject defines tonal function.`,
  },

  rhythmicVariety: {
    title: 'Rhythmic Variety',
    brief: 'Diversity of note values in the subject.',
    detailed: `This counts distinct note durations and checks for rhythmic contrast.

Why it matters: In multi-voice texture, the subject must be identifiable. Uniform rhythm (all quarter notes, for example) makes entries harder to perceive. Varied rhythm creates a distinctive profile.

The analysis checks:
• Number of unique note values used
• Presence of long-short and short-long contrasts
• Whether the rhythm has a recognizable character

A subject with one note value scores poorly. Three or more values with contrast scores well.`,
  },

  strettoViability: {
    title: 'Stretto Viability',
    brief: 'Whether the subject can overlap with itself.',
    detailed: `Stretto occurs when a new entry begins before the previous one finishes. This analysis tests each possible entry distance:

For each distance, the algorithm:
1. Creates a second voice with the subject offset by that distance (and optionally displaced by octave)
2. Finds all vertical simultaneities between the voices
3. Checks for forbidden parallels (5ths and 8ves moving in the same direction)
4. Checks for dissonances on strong beats (beats 1 and 3 in 4/4)

Green = no violations detected
Orange = issues found (hover or click for details)

Violations listed:
• "Parallel 5ths/8ves" - consecutive perfect intervals in parallel motion
• Interval + beat position - dissonance occurring on a strong beat

More viable distances = more compositional flexibility. Close strettos (high overlap percentage) are particularly valuable for climactic passages.`,
  },

  tonalAnswer: {
    title: 'Tonal Answer',
    brief: 'Whether the answer requires tonal modification.',
    detailed: `This determines if your subject needs a tonal (modified) or real (exact) answer.

Detection logic:
• Scans for ^1→^5 motion: triggers tonal mutation (^1→^5 becomes ^5→^1)
• Scans for ^5→^1 motion: triggers tonal mutation (^5→^1 becomes ^1→^5)
• Checks if subject begins on ^5: answer begins on ^1

The mutation point indicates where real transposition resumes after the tonal adjustment.

Junction quality describes the harmonic connection at the subject's end:
• "strong" - creates clear functional progression
• "static" - V→V, less harmonic motion
• "unusual" - non-standard ending degree

The generated answer ABC shows the computed transposition with any tonal modifications applied.`,
  },

  doubleCounterpoint: {
    title: 'Double Counterpoint',
    brief: 'Invertibility of the subject-countersubject combination.',
    detailed: `Double counterpoint at the octave means the two voices can exchange positions—the upper voice becomes the lower and vice versa.

The analysis tests both configurations:
• Original: countersubject above the subject
• Inverted: countersubject below the subject (transposed down an octave)

For each configuration, it counts:
• 3rds and 6ths (ideal—they invert to each other)
• Perfect consonances (5ths become 4ths when inverted)
• Dissonances on strong beats

Issues detected:
• Parallel 5ths/8ves in either position
• 4ths against the bass (dissonant in tonal counterpoint)
• Strong-beat dissonances

Good invertible counterpoint uses predominantly imperfect consonances (3rds and 6ths). Heavy use of perfect 5ths creates problems because they become 4ths when inverted.`,
  },

  rhythmicComplementarity: {
    title: 'Rhythmic Complementarity',
    brief: 'How attack points relate between subject and countersubject.',
    detailed: `This measures rhythmic independence between the voices.

Attack overlap: Percentage of note onsets that coincide between subject and countersubject.
• Under 30%: High complementarity—voices take turns
• 30-60%: Moderate overlap
• Over 60%: Homorhythmic—voices move together

Strong-beat collisions: Simultaneous attacks on beats 1 or 3 (in 4/4). Some are normal; too many loses contrapuntal independence.

Low overlap is generally better—it creates continuous motion where one voice fills the gaps of the other.`,
  },

  contourIndependence: {
    title: 'Contour Independence',
    brief: 'How melodic motion relates between voices.',
    detailed: `This analyzes the directional relationship when both voices move simultaneously:

Contrary motion: One voice ascends, the other descends. Most independent.
Oblique motion: One voice moves, the other holds. Good independence.
Similar motion: Both move the same direction, different intervals.
Parallel motion: Both move the same direction and interval. Least independent.

The percentages show how often each motion type occurs.

High contrary motion (over 35%) indicates good voice independence. High parallel motion (over 30%) suggests the voices are not sufficiently differentiated.`,
  },

  modulatoryRobustness: {
    title: 'Modulatory Robustness',
    brief: 'How the countersubject works against the answer.',
    detailed: `The countersubject first appears against the subject in the tonic. But it also accompanies the answer, which is in the dominant.

This analysis transposes the subject up a fifth (simulating the answer) and tests the countersubject against it:

• Consonance percentage on strong beats
• Parallel perfect interval violations
• Strong-beat dissonances

A countersubject that works in the tonic but fails against the answer will cause problems whenever the answer appears with accompanying counterpoint.

High consonance (80%+) and no parallel violations indicates the countersubject will function reliably throughout the fugue.`,
  },

  // UI elements
  pianoRoll: {
    title: 'Piano Roll',
    brief: 'Time vs. pitch visualization.',
    detailed: `Standard piano roll display:
• X-axis: time (beats), with vertical lines marking beats
• Y-axis: pitch (MIDI note number), with horizontal lines marking reference pitches
• Rectangle: note duration
• Color: voice identity

Vertical grid lines: Solid lines mark downbeats (every 4 beats in 4/4). Lighter lines mark other beats.`,
  },

  intervalTimeline: {
    title: 'Interval Timeline',
    brief: 'Consonance/dissonance over time.',
    detailed: `Shows vertical intervals between two voices:

Green: Consonant intervals (unison, 3rd, 5th, 6th, octave)
Red: Dissonant intervals (2nd, 4th*, 7th, tritone)

*4ths are consonant between upper voices but dissonant against the bass.

Darker shading: Strong beats (1, 3 in 4/4)
Lighter shading: Weak beats

Numbers indicate interval class (3 = third, 6 = sixth, etc.)`,
  },

  abcNotation: {
    title: 'ABC Notation',
    brief: 'Text-based music notation format.',
    detailed: `ABC notation represents music as text:

Pitch:
• C D E F G A B = notes in the octave below middle C to B above
• c d e f g a b = notes from middle C to B above
• Apostrophe (') = up one octave: c' = C5
• Comma (,) = down one octave: C, = C3

Accidentals (applied to the following note):
• ^ = sharp (^F = F#)
• _ = flat (_B = Bb)
• = = natural (cancels key signature)

Note: ^C means "sharp the note C", so in C major it's C#. In a key that already has C# (like A major), ^C would mean C## (double sharp, enharmonically D).

Duration (multiplies default note length):
• No modifier = default length (set by L: header)
• 2 = double length
• 3 = triple length
• /2 = half length
• 3/2 = 1.5x length

Headers:
• K:D = D major
• K:Dm or K:D minor = D minor
• L:1/8 = default note length is eighth note
• M:3/4 = time signature 3/4

Bar lines: | separates measures, |] ends the piece`,
  },

  scoring: {
    title: 'Viability Score',
    brief: 'Aggregate assessment of fugal potential.',
    detailed: `The overall score (0-100) combines individual category scores with these weights:

Subject-only categories:
• Harmonic Implication (1.0) - tonal clarity
• Rhythmic Variety (0.8) - distinctive rhythm
• Stretto Viability (1.0) - overlapping potential
• Tonal Answer (0.9) - junction quality

With countersubject:
• Double Counterpoint (1.0) - invertibility
• Rhythmic Complementarity (0.8) - attack point offset
• Contour Independence (0.9) - voice differentiation
• Modulatory Robustness (1.0) - works against answer

Score = weighted average of applicable categories.

Thresholds:
• 85-100: Excellent - strong fugal material
• 70-84: Good - solid with minor issues
• 50-69: Fair - workable but has weaknesses
• Below 50: Needs Work - significant issues

The score indicates potential, not quality. Unconventional subjects may score lower but still make effective fugues.`,
  },
};

/**
 * Get help content by key
 */
export function getHelpContent(key) {
  return HELP_CONTENT[key] || null;
}

/**
 * Get all help topics
 */
export function getHelpTopics() {
  return Object.keys(HELP_CONTENT).map(key => ({
    key,
    title: HELP_CONTENT[key].title,
    brief: HELP_CONTENT[key].brief,
  }));
}
