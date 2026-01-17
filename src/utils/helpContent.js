/**
 * Help content and explanations for the Fugue Analyzer
 *
 * Each section has a brief summary and detailed explanation
 * written for musicians who may not be counterpoint experts.
 */

export const HELP_CONTENT = {
  // Main concepts
  fugue: {
    title: 'What is a Fugue?',
    brief: 'A contrapuntal composition where voices enter one by one with the same melody.',
    detailed: `A fugue is a type of composition where a melody (the "subject") is introduced by one voice,
then imitated by other voices entering one after another. Think of it like a musical conversation
where everyone eventually says the same thing, but at different times and often at different pitch levels.

The magic of a fugue lies in how these overlapping melodies fit together harmonically -
the subject must be designed so that it sounds good when played against itself.`,
  },

  subject: {
    title: 'Subject',
    brief: 'The main melody that defines the fugue.',
    detailed: `The subject is the primary melodic idea of a fugue. It's typically 2-8 measures long
and should have:

• A clear beginning and end
• Distinctive rhythm that's recognizable
• Strong tonal identity (establishes the key)
• Good "bones" for counterpoint (works well against itself)

A great subject is memorable on its own AND works beautifully in combination with other voices.`,
  },

  countersubject: {
    title: 'Countersubject',
    brief: 'A recurring counter-melody that accompanies the subject.',
    detailed: `The countersubject is a secondary melody that plays against the subject whenever it appears.
Unlike free counterpoint (which changes each time), a true countersubject returns consistently.

A good countersubject should:
• Complement the subject rhythmically (move when it rests, rest when it moves)
• Work both above AND below the subject (invertible counterpoint)
• Have its own character while supporting the subject
• Sound good against both the subject AND the answer`,
  },

  answer: {
    title: 'Answer',
    brief: 'The subject transposed to the dominant key.',
    detailed: `When the second voice enters in a fugue, it presents the subject transposed up a fifth
(or down a fourth) into the dominant key. This is called the "answer."

There are two types:
• Real Answer: Exact transposition (every interval preserved)
• Tonal Answer: Modified transposition to maintain tonic-dominant relationship

A tonal answer is needed when the subject prominently features ^1-^5 or ^5-^1 motion,
which would distort the harmony if transposed exactly.`,
  },

  // Analysis sections
  harmonicImplication: {
    title: 'Harmonic Implication',
    brief: 'How well the subject establishes tonality and harmonic direction.',
    detailed: `This analyzes how the subject sets up the key and creates harmonic momentum.

What we look for:
• Opening note: Starting on ^1, ^3, or ^5 (tonic chord tones) establishes the key clearly
• Ending note: Determines how smoothly we transition to the answer
  - Ending on ^1 or ^2: Clean transition to dominant
  - Ending on ^5: Creates harmonic stasis (V→V)
  - Ending on ^7: Strong leading tone pull
• Dominant arrival: When and where ^5 or ^7 appears affects pacing

A subject with clear harmonic implications gives the fugue strong tonal architecture.`,
  },

  rhythmicVariety: {
    title: 'Rhythmic Variety',
    brief: 'Diversity and contrast in note durations.',
    detailed: `This measures how interesting and distinctive the subject's rhythm is.

Good rhythmic variety means:
• Multiple note values (not all quarter notes, for example)
• Contrast between long and short notes
• A recognizable rhythmic profile

Why it matters: In a fugue with 3-4 voices, you need to hear the subject clearly.
A distinctive rhythm helps it stand out from the texture. Uniform rhythm
(all notes the same length) makes the subject harder to follow.`,
  },

  strettoViability: {
    title: 'Stretto Viability',
    brief: 'Can the subject overlap with itself without clashing?',
    detailed: `Stretto is when a new voice enters with the subject before the previous voice finishes.
It's a powerful climactic device in fugues.

This analysis tests what happens when you overlap the subject with itself at various time intervals:

• Green (viable): No voice-leading problems - can use this stretto distance
• Orange (issues): Problems detected:
  - Parallel 5ths/8ves: Forbidden in counterpoint
  - Strong-beat dissonances: Clashes on emphasized beats

More viable strettos = more options for building excitement in your fugue.

The intervals shown indicate what harmony results at each moment of overlap.`,
  },

  tonalAnswer: {
    title: 'Tonal Answer',
    brief: 'Whether the answer needs modification and how the subject-answer junction works.',
    detailed: `This determines if your subject needs a "tonal" or "real" answer.

Tonal vs Real:
• If subject starts ^1→^5 or ^5→^1: Tonal answer needed (modify the interval)
• Otherwise: Real answer (exact transposition up a 5th)

Why? If subject goes C→G (^1→^5) and we transpose exactly, answer would go G→D.
But D is ^2, not ^1 of the dominant key! A tonal answer adjusts this to G→C to maintain proper harmonic function.

Junction quality indicates how smoothly the subject connects to the answer:
• I→V (strong): Subject ends on tonic function, answer on dominant - perfect!
• V→V (static): Both on dominant - less harmonic motion
• ii→V (good): Pre-dominant to dominant works well`,
  },

  doubleCounterpoint: {
    title: 'Double Counterpoint',
    brief: 'Can the countersubject work both above AND below the subject?',
    detailed: `Double (or invertible) counterpoint means the two melodies can swap positions -
what was on top can go on bottom, and vice versa.

Why it matters: In a 3-voice fugue, sometimes the subject is in the soprano, sometimes in the bass.
The countersubject needs to work in either position.

What makes good invertible counterpoint:
• Lots of 3rds and 6ths (they become 6ths and 3rds when inverted - both consonant!)
• Careful use of 5ths (become 4ths, which need special treatment)
• Avoid many perfect intervals (parallel 5ths in original = parallel 4ths inverted)

"CS above" = countersubject higher than subject (original position)
"CS below" = countersubject lower than subject (inverted position)`,
  },

  rhythmicComplementarity: {
    title: 'Rhythmic Complementarity',
    brief: 'Do subject and countersubject fill in each other\'s gaps?',
    detailed: `Good counterpoint often features rhythmic interplay - when one voice moves, the other rests,
and vice versa.

Overlap percentage:
• Low (under 30%): Excellent! Voices take turns, creating continuous motion
• Medium (30-60%): Acceptable, some independence
• High (over 60%): Homorhythmic - voices move together too much

Strong-beat collisions: Both voices attacking together on beat 1 or 3.
Some are fine (for emphasis), but too many loses the conversational quality.`,
  },

  contourIndependence: {
    title: 'Contour Independence',
    brief: 'Do the melodic shapes move independently?',
    detailed: `This measures whether your voices have their own melodic profiles or just move in tandem.

Types of motion:
• Contrary: One voice up, one down (most independent - ideal!)
• Oblique: One voice moves, one stays (good independence)
• Similar: Both move same direction, different intervals (moderate)
• Parallel: Both move same direction, same interval (least independent)

A balance is best, but favoring contrary motion creates the most interesting texture.
High parallel motion (over 30%) makes voices sound like they're "stuck together."`,
  },

  modulatoryRobustness: {
    title: 'Modulatory Robustness',
    brief: 'Does the countersubject work against the answer (in the dominant key)?',
    detailed: `The countersubject first appears against the subject (in the tonic key),
but it also needs to work against the answer (in the dominant key).

This tests: What happens when we play the countersubject against the transposed subject?

What we check:
• Consonance on strong beats: Should remain mostly consonant
• Parallel 5ths/8ves: Should not appear
• Voice-leading quality: Should remain smooth

A countersubject that only works in one key will cause problems as the fugue modulates.`,
  },

  // UI elements
  pianoRoll: {
    title: 'Piano Roll',
    brief: 'Visual representation of pitches over time.',
    detailed: `The piano roll shows notes as colored rectangles:
• Horizontal position = time (left to right)
• Vertical position = pitch (higher = higher pitch)
• Rectangle length = note duration
• Color = which voice (subject, answer, countersubject)

Click on any note to see its details: pitch, duration, scale degree, and role in the counterpoint.`,
  },

  intervalTimeline: {
    title: 'Interval Timeline',
    brief: 'Shows consonance and dissonance over time.',
    detailed: `This colored bar shows the harmonic intervals between voices:

• Green = Consonant (sounds stable): unisons, 3rds, 5ths, 6ths, octaves
• Red = Dissonant (sounds tense): 2nds, 4ths*, 7ths, tritones

*4ths are consonant in some contexts but dissonant against the bass

Darker colors = stronger beats (more important)
Lighter colors = weaker beats (passing moments)

Numbers show the interval class (3 = third, 6 = sixth, etc.)`,
  },

  abcNotation: {
    title: 'ABC Notation',
    brief: 'A simple text format for writing music.',
    detailed: `ABC notation lets you type music as text:

Notes: C D E F G A B (middle octave), c d e f g a b (octave higher)
Octaves: ' = up one octave, , = down one octave
Sharps/flats: ^ = sharp, _ = flat, = = natural
Duration: 2 = double length, /2 = half length, 3 = triple, etc.
Bar lines: | separates measures

Examples:
• C2 = C half note (if L:1/4)
• ^F = F sharp
• G, = G below middle C
• c' = C two octaves above middle

Headers:
• K:Dm = Key of D minor
• L:1/8 = Default note length is eighth note
• M:3/4 = Time signature 3/4`,
  },

  // Scoring
  scoring: {
    title: 'Viability Score',
    brief: 'Overall assessment of fugal potential.',
    detailed: `The viability score (0-100) combines all analysis categories into a single rating.

How it's calculated:
• Each category gets a score based on specific criteria
• Categories are weighted by importance
• The weighted average becomes your overall score

Score ratings:
• 85-100 (Excellent): Strong fugal material, few if any concerns
• 70-84 (Good): Solid foundation, minor issues to consider
• 50-69 (Fair): Workable but needs attention in some areas
• Below 50 (Needs Work): Significant issues to address

The score is a guide, not a verdict! Some great fugue subjects might score lower
because they're unconventional. Use the detailed feedback to understand the trade-offs.`,
  },
};

/**
 * Get help content by key
 */
export function getHelpContent(key) {
  return HELP_CONTENT[key] || null;
}

/**
 * Get all help topics for a category
 */
export function getHelpTopics() {
  return Object.keys(HELP_CONTENT).map(key => ({
    key,
    title: HELP_CONTENT[key].title,
    brief: HELP_CONTENT[key].brief,
  }));
}
