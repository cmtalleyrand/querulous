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
    title: 'Tonal Definition',
    brief: 'How clearly the subject establishes tonal center and direction.',
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
    title: 'Rhythmic Character',
    brief: 'Distinctiveness of the subject\'s rhythmic profile.',
    detailed: `This counts distinct note durations and checks for rhythmic contrast.

Why it matters: In multi-voice texture, the subject must be identifiable. Uniform rhythm (all quarter notes, for example) makes entries harder to perceive. Varied rhythm creates a distinctive profile.

The analysis checks:
• Number of unique note values used
• Presence of long-short and short-long contrasts
• Whether the rhythm has a recognizable character

A subject with one note value scores poorly. Three or more values with contrast scores well.`,
  },

  strettoViability: {
    title: 'Stretto Potential',
    brief: 'Counterpoint quality when overlapping at various entry distances.',
    detailed: `Stretto occurs when a new entry begins before the previous one finishes. This analysis tests each possible entry distance as FULL COUNTERPOINT.

For each distance, the algorithm:
1. Creates a second voice with the subject offset by that distance (octave displaced)
2. Runs the complete dissonance scoring analysis on this two-voice texture
3. Evaluates every interval: entry/exit motion, pattern recognition, metric placement
4. Produces an average counterpoint quality score for that distance

SCORING (base-zero):
The stretto score is based on the AVERAGE counterpoint quality across all distances—not just counting "viable" vs "not viable". This gives a much more nuanced picture:

• Distances with well-handled dissonances contribute positively
• Distances with poorly resolved dissonances contribute negatively
• The overall score reflects typical counterpoint quality in stretto

Bonuses:
• Multiple distances with good counterpoint (avgScore ≥ 0)
• Close stretto with good counterpoint (high overlap + good score)

Penalties:
• Parallel perfects (critical voice-leading errors)
• Consistently poor dissonance handling

Green = good counterpoint (average score ≥ 0)
Orange = marginal or problematic counterpoint

More "good" distances = more compositional flexibility. Close strettos with clean counterpoint are particularly valuable.`,
  },

  tonalAnswer: {
    title: 'Answer Compatibility',
    brief: 'Quality of the tonic-dominant junction.',
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
    title: 'Invertibility',
    brief: 'Quality of double counterpoint at the octave.',
    detailed: `Double counterpoint at the octave means the two voices can exchange positions—the upper voice becomes the lower and vice versa.

SCORING (base-zero, comparison-based):
The key question is: "Does the inverted position work as well as the original?"

The score is based primarily on the INVERTED POSITION QUALITY—this is what matters for practical use. Both positions receive full dissonance analysis:

• Inverted quality score × 5 = primary factor
• If inverted is significantly WORSE than original: additional penalty
• If inverted is BETTER than original: small bonus (rare but valuable)
• Parallel perfects in inverted position: substantial penalty

This approach recognizes that you can always use the original—the question is whether inversion is viable.

The analysis tests both configurations:
• Original: countersubject above the subject
• Inverted: countersubject below the subject (transposed down an octave)

Dissonance classification (per species counterpoint practice):
• sus: Suspension—prepared consonance held over to become dissonant, resolves down by step
• PT: Passing tone—stepwise motion through a dissonance on a weak beat
• N: Neighbor tone—step away and back to the same note
• Ant: Anticipation—arrives early, same pitch as next consonance
• App: Appoggiatura—leap to strong-beat dissonance, resolves by step
• unprepared: Dissonance not conforming to standard practice

Issues detected:
• Parallel 5ths/8ves in either position
• 4ths against the bass (dissonant in tonal counterpoint)
• Unprepared strong-beat dissonances

Good invertible counterpoint uses predominantly imperfect consonances (3rds and 6ths). Heavy use of perfect 5ths creates problems because they become 4ths when inverted.`,
  },

  dissonanceTreatment: {
    title: 'Dissonance Treatment',
    brief: 'Classification of dissonances according to species counterpoint.',
    detailed: `In strict counterpoint, dissonances must be handled according to established patterns:

SUSPENSIONS (sus)
• Preparation: The dissonant note sounds as a consonance on the previous beat
• Dissonance: Note is held while the other voice moves, creating the dissonance
• Resolution: The suspended note moves DOWN by step to a consonance
• Common suspensions: 7-6, 4-3, 9-8 (above bass); 2-3 (below bass)

PASSING TONES (PT)
• Common on weak beats; accented cases may occur
• Approached by step from one direction
• Left by step in the same direction
• Connect two consonances

NEIGHBOR TONES (N)
• Also called auxiliary notes
• Step away from a consonance and return to the same note
• Usually on weak beats, but accented neighbors can occur

CAMBIATA (Cam) — Nota Cambiata
The cambiata is a 5-note melodic figure with a characteristic "skip past" the resolution:
1. Consonance (preparation)
2. Step down to dissonance (the nota cambiata itself)
3. Skip down a third (skipping past the expected resolution)
4. Step up (filling in the skip)
5. Resolution
The dissonance (note 2) typically falls on a weak beat. The "signature" is the downward step followed by a downward third—the line seems to overshoot, then recovers.

Variants detected:
• Cam: Traditional descending cambiata on weak beat
• Cam↑: Inverted (ascending) cambiata
• Cam?: Cambiata figure on strong beat (non-traditional)

ESCAPE TONE (Esc)
• Also called échappée
• Approached by step, left by leap in opposite direction
• Creates a "leaving" gesture—steps toward a note but leaps away

ANTICIPATIONS (Ant)
• Arrive early—the note of the next consonance sounds before its time
• Usually short and on weak beats

APPOGGIATURAS (App)
• Approach by leap to an accented dissonance
• Resolve by step (same or opposite direction; usually down)
• Creates expressive emphasis

UNPREPARED DISSONANCES
• Strong-beat dissonances not fitting the above categories
• Generally avoided in strict style; may be acceptable in freer styles

CONSECUTIVE DISSONANCES (D → D → D)
When a dissonance resolves to another dissonance instead of a consonance:
• Each D → D transition receives a -1.5 penalty (instead of the +0.5 to +1.0 resolution bonus)
• Multiple consecutive dissonances compound penalties
• Example: D → D → D = two -1.5 penalties applied
• The pattern summary tracks these groups for review
• Generally avoided in strict counterpoint; acceptable in certain sequential contexts`,
  },

  rhythmicComplementarity: {
    title: 'Rhythmic Interplay',
    brief: 'Degree of rhythmic independence between voices.',
    detailed: `This measures rhythmic independence between the voices.

Attack overlap: Percentage of note onsets that coincide between subject and countersubject.
• Under 30%: High complementarity—voices take turns
• 30-60%: Moderate overlap
• Over 60%: Homorhythmic—voices move together

Strong-beat collisions: Simultaneous attacks on beats 1 or 3 (in 4/4). Some are normal; too many loses contrapuntal independence.

Low overlap is generally better—it creates continuous motion where one voice fills the gaps of the other.`,
  },

  contourIndependence: {
    title: 'Voice Independence',
    brief: 'Differentiation of melodic contours between voices.',
    detailed: `This analyzes the directional relationship when both voices move simultaneously:

Contrary motion: One voice ascends, the other descends. Most independent.
Oblique motion: One voice moves, the other holds. Good independence.
Similar motion: Both move the same direction, different intervals.
Parallel motion: Both move the same direction and interval. Least independent.

The percentages show how often each motion type occurs.

High contrary motion (over 35%) indicates good voice independence. High parallel motion (over 30%) suggests the voices are not sufficiently differentiated.`,
  },

  modulatoryRobustness: {
    title: 'Answer vs Countersubject',
    brief: 'Testing how well the countersubject combines with the answer.',
    detailed: `The countersubject first appears against the subject in the tonic. But in a fugue, it also accompanies the answer, which is in the dominant.

This analysis creates the answer (subject transposed up a 5th) and tests the countersubject against it:

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

  spellingKey: {
    title: 'Spelling Key',
    brief: 'Separate key signature for ABC parsing from analysis key.',
    detailed: `The spelling key determines which accidentals are applied when parsing ABC notation, while the analysis key determines scale degree interpretation.

Use case: You want to write ABC in C major (no sharps or flats in key signature, so you write all accidentals explicitly) but analyze the subject as if it were in D minor.

Example:
• Spelling key: C major — the note "F" is F natural, "^F" is F#
• Analysis key: D minor — F# is interpreted as scale degree 3

This separation is useful when:
• You prefer writing ABC with explicit accidentals (C major spelling)
• You're transposing a subject and want to see how it functions in a new key
• You're experimenting with modal reinterpretation

Note: K: headers in the ABC notation override both settings.`,
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
    detailed: `BASE-ZERO SCORING SYSTEM

Each category starts at 0 (neutral baseline). Positive points for strengths, negative for weaknesses. The display maps these to 0-100 (where 0 = 50).

CATEGORY GROUPS:

MELODIC QUALITY (subject line properties):
• Tonal Definition (1.0) - how clearly the subject establishes tonal center
  Baseline: ambiguous tonal center. +10 tonic opening, +15 strong terminal, -10 weak terminal.

• Rhythmic Character (0.8) - distinctiveness of rhythmic profile
  Baseline: 2 note values (minimal). +5 per additional value, +10 contrast, -15 uniform.

FUGAL POTENTIAL (contrapuntal material):
• Stretto Potential (1.0) - counterpoint quality at canonic overlaps
  Baseline: average dissonance handling. Each distance scored as full counterpoint.
  The score reflects average quality across ALL tested distances, not just viable count.

• Answer Compatibility (0.9) - tonic-dominant junction quality
  Baseline: acceptable junction. +15 strong, +5 good, -10 static, -12 unusual.

VOICE COMBINATION (with countersubject):
• Invertibility (1.0) - double counterpoint quality
  Baseline: inverted = original quality. Score based on inverted position quality,
  penalty if significantly worse than original. Not just counting issues.

• Rhythmic Interplay (0.8) - rhythmic independence
  Baseline: 50% attack overlap. +15 complementary, -15 homorhythmic.

• Voice Independence (0.9) - contour differentiation
  Baseline: average motion variety. +12 high contrary, -12 high parallel.

• Answer vs Countersubject (1.0) - CS against dominant-level answer
  Baseline: acceptable counterpoint. Based on dissonance analysis vs the answer.

SCORE INTERPRETATION (base-zero):
• +15 or higher: Strong
• +5 to +15: Good
• 0 to +5: Fair (baseline - acceptable)
• Below 0: Weak

Scores are displayed directly as base-zero values. Zero is the neutral baseline - anything above zero is fair/acceptable.`,
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
