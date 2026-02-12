import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { pitchName, metricWeight } from '../../utils/formatter';
import { Simultaneity } from '../../types';
import { scoreDissonance, analyzeAllDissonances } from '../../utils/dissonanceScoring';
import {
  generateGridLines,
  VIZ_COLORS,
  getIntervalStyle,
  getIntervalName,
  isParallelFifthOrOctave,
} from '../../utils/vizConstants';

// Tab definitions for comparison modes
const COMPARISON_TABS = [
  { key: 'subject_cs', label: 'Subject + CS', v1: 'subject', v2: 'cs1' },
  { key: 'answer_cs', label: 'Answer + CS', v1: 'answer', v2: 'cs1' },
  { key: 'answer_subject', label: 'Answer + Subject', v1: 'answer', v2: 'subject' },
];

/**
 * Counterpoint Comparison Visualization
 * Features:
 * - Tabbed view for S+CS, A+CS, A+S comparisons
 * - Semitone/octave displacement controls with named intervals
 * - Always-visible interval regions (subtle) with prominent problem indicators
 * - Click on note or interval to show detail panel
 * - Resolution status via border style and saturation
 * - Sequence highlighting with borders
 * - Issue count comparison on transposition change
 */
export function CounterpointComparisonViz({
  voices,
  formatter,
  meter = [4, 4],
  sequences = {},
}) {
  const [activeTab, setActiveTab] = useState('subject_cs');
  const [transposition, setTransposition] = useState(0);
  const [previousIssueCount, setPreviousIssueCount] = useState(null);
  const [selectedInterval, setSelectedInterval] = useState(null);
  const [highlightedOnset, setHighlightedOnset] = useState(null);
  const containerRef = useRef(null);

  // Get current tab config
  const tabConfig = COMPARISON_TABS.find(t => t.key === activeTab) || COMPARISON_TABS[0];

  // Available tabs based on available voices
  const availableTabs = useMemo(() => {
    return COMPARISON_TABS.filter(tab => {
      const v1 = voices[tab.v1];
      const v2 = voices[tab.v2];
      return v1?.length > 0 && v2?.length > 0;
    });
  }, [voices]);

  // Reset to first available tab if current is invalid
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find(t => t.key === activeTab)) {
      setActiveTab(availableTabs[0].key);
    }
  }, [availableTabs, activeTab]);

  // Reset selection when tab or transposition changes
  useEffect(() => {
    setSelectedInterval(null);
    setHighlightedOnset(null);
  }, [activeTab, transposition]);

  // Voice data
  const voice1 = voices[tabConfig.v1];
  const voice2 = voices[tabConfig.v2];

  // Get voice colors
  const getVoiceColor = (key) => {
    switch (key) {
      case 'subject': return VIZ_COLORS.voiceSubject;
      case 'answer': return VIZ_COLORS.voiceAnswer;
      case 'cs1': return VIZ_COLORS.voiceCS;
      default: return '#6b7280';
    }
  };

  const getVoiceLabel = (key) => {
    switch (key) {
      case 'subject': return 'Subject';
      case 'answer': return 'Answer';
      case 'cs1': return 'Countersubject';
      default: return key;
    }
  };

  // Analysis with transposition
  const analysis = useMemo(() => {
    if (!voice1?.length || !voice2?.length) return null;

    const transposedVoice2 = voice2.map(n => ({
      ...n,
      pitch: n.pitch + transposition,
    }));

    const findSims = (v1, v2) => {
      const sims = [];
      for (const n1 of v1) {
        const s1 = n1.onset;
        const e1 = n1.onset + n1.duration;
        for (const n2 of v2) {
          const s2 = n2.onset;
          const e2 = n2.onset + n2.duration;
          if (s1 < e2 && s2 < e1) {
            const start = Math.max(s1, s2);
            sims.push(new Simultaneity(start, n1, n2, metricWeight(start, meter)));
          }
        }
      }
      return sims.sort((a, b) => a.onset - b.onset);
    };

    const sims = findSims(voice1, transposedVoice2);

    // Calculate short note threshold (triplet of subdivision)
    // For 4/4: subdivision = 0.5, threshold = 0.167
    // For 6/8: subdivision = 0.33, threshold = 0.111
    const [numerator, denominator] = meter;
    const isCompound = (numerator % 3 === 0 && numerator > 3 && denominator === 8);
    const subdivision = isCompound ? (1 / 3) : 0.5;
    const shortNoteThreshold = subdivision / 3;

    // Map voice keys to sequence keys (voices use 'cs1', sequences use 'countersubject')
    const voiceToSequenceKey = (voiceKey) => {
      if (voiceKey === 'cs1') return 'countersubject';
      return voiceKey;
    };

    // Collect sequence data from both voices for scoring
    // This enables sequence-based penalty reduction for parallels
    const v1SeqKey = voiceToSequenceKey(tabConfig.v1);
    const v2SeqKey = voiceToSequenceKey(tabConfig.v2);
    const v1Sequences = sequences[v1SeqKey];
    const v2Sequences = sequences[v2SeqKey];
    const allSequenceNoteRanges = [
      ...(v1Sequences?.noteRanges || []),
      ...(v2Sequences?.noteRanges || []),
    ];
    const allSequenceBeatRanges = [
      ...(v1Sequences?.sequences?.map(s => ({ startBeat: s.startBeat, endBeat: s.endBeat })) || []),
      ...(v2Sequences?.sequences?.map(s => ({ startBeat: s.startBeat, endBeat: s.endBeat })) || []),
    ];
    const scoringOptions = {
      meter,
      sequenceNoteRanges: allSequenceNoteRanges,
      sequenceBeatRanges: allSequenceBeatRanges,
    };

    const intervalHistory = [];
    const intervalPoints = [];
    const beatMap = new Map();

    // Track consecutive intervals for "repeated" detection
    // Perfect consonances (P1, P5, P8): repeated after 2nd consecutive
    // Imperfect consonances: repeated after 3rd consecutive of SAME TYPE (3rds vs 6ths)
    let consecutivePerfect = 0;
    let consecutiveThirds = 0;
    let consecutiveSixths = 0;
    let lastIntervalType = null; // 'perfect', 'third', 'sixth', 'dissonant'

    let prevPoint = null;
    let prevSim = null;
    for (let i = 0; i < sims.length; i++) {
      const sim = sims[i];
      const snapBeat = Math.round(sim.onset * 4) / 4;

      if (!beatMap.has(snapBeat)) {
        const scoring = scoreDissonance(sim, sims, i, intervalHistory, scoringOptions);

        // Check for rest between previous and current simultaneity
        // Categories:
        // 1. none: no rest (<0.05 beats) - normal motion
        // 2. asynchronous: short rest, other voice still sustaining - halved penalties/bonuses
        // 3. reentry_short: short rest, other voice played full note - weak resolution check
        // 4. reentry_medium: medium rest (one but not both long criteria) - weak resolution check
        // 5. reentry_long: long rest (>1 beat AND >2× note) - no melodic interval (forgotten)
        let restCategory = 'none';
        let restInfo = null;
        let showMelodicInterval = true;
        let motionScoreMultiplier = 1.0;
        let checkWeakResolution = false;
        let ghostNoteDuration = 0;

        if (prevSim) {
          const prevV1End = prevSim.voice1Note.onset + prevSim.voice1Note.duration;
          const prevV2End = prevSim.voice2Note.onset + prevSim.voice2Note.duration;
          const v1RestDur = sim.onset - prevV1End;
          const v2RestDur = sim.onset - prevV2End;

          const v1Rested = v1RestDur > 0.05;
          const v2Rested = v2RestDur > 0.05;

          if (v1Rested || v2Rested) {
            // At least one voice had a rest
            // Determine which voice rested (or both)
            const restingVoice = v1Rested && (!v2Rested || v1RestDur >= v2RestDur) ? 1 : 2;
            const restDur = restingVoice === 1 ? v1RestDur : v2RestDur;
            const otherVoiceRestDur = restingVoice === 1 ? v2RestDur : v1RestDur;
            const prevNoteDur = restingVoice === 1 ? prevSim.voice1Note.duration : prevSim.voice2Note.duration;

            // Did the other voice play a full note during the rest?
            // If other voice also has a gap (otherVoiceRestDur > 0), it finished a note
            const otherVoicePlayedFullNote = otherVoiceRestDur > 0;

            // Long rest criteria: >1 beat AND >2× previous note duration
            const meetsLongDuration = restDur > 1.0;
            const meetsLongRatio = restDur > 2 * prevNoteDur;
            const isLongRest = meetsLongDuration && meetsLongRatio;

            // Medium rest: meets ONE criterion but not both
            const isMediumRest = (meetsLongDuration || meetsLongRatio) && !isLongRest;

            if (isLongRest) {
              // Long rest: forgotten - no melodic interval, unresolved
              restCategory = 'reentry_long';
              showMelodicInterval = false;
              restInfo = `Re-entry after ${restDur.toFixed(1)} beat rest (forgotten)`;
            } else if (isMediumRest) {
              // Medium rest: re-entry but still remember pitch
              restCategory = 'reentry_medium';
              checkWeakResolution = true;
              ghostNoteDuration = prevNoteDur * 1.5;
              restInfo = `Re-entry after ${restDur.toFixed(2)} beat rest`;
            } else if (otherVoicePlayedFullNote) {
              // Short rest + other voice completed a note: re-entry
              restCategory = 'reentry_short';
              checkWeakResolution = true;
              ghostNoteDuration = prevNoteDur * 1.5;
              restInfo = `Re-entry (other voice played during rest)`;
            } else {
              // Short rest + other voice still sustaining: asynchronous
              restCategory = 'asynchronous';
              motionScoreMultiplier = 0.5;
              restInfo = `Asynchronous (${restDur.toFixed(2)} beat offset)`;
            }
          }
        }

        // Calculate motion from previous interval
        // For long re-entry: no melodic interval (forgotten)
        // For all others: show melodic interval
        const v1Motion = (prevPoint && showMelodicInterval) ? sim.voice1Note.pitch - prevPoint.v1Pitch : 0;
        const v2Motion = (prevPoint && showMelodicInterval) ? sim.voice2Note.pitch - prevPoint.v2Pitch : 0;

        // Determine interval type for repeated tracking
        // P4 (class 4) counts as perfect when treated as consonant, but NOT A4 (augmented 4th/tritone)
        const isPerfectInterval = [1, 5].includes(sim.interval.class) ||
          (sim.interval.class === 4 && sim.interval.quality === 'perfect'); // P1/P8, P5, P4 (but not A4)
        const isThird = sim.interval.class === 3; // m3/M3
        const isSixth = sim.interval.class === 6; // m6/M6
        const isConsonantInterval = scoring.isConsonant;

        // Update consecutive counters
        let isRepeated = false;
        let repeatInfo = null;

        // Any re-entry (short, medium, or long) resets consecutive counting
        // Asynchronous does NOT reset (it's still connected, just offset)
        const isAnyReentry = restCategory.startsWith('reentry');
        if (isAnyReentry) {
          consecutivePerfect = 0;
          consecutiveThirds = 0;
          consecutiveSixths = 0;
          lastIntervalType = null;
        }

        if (isConsonantInterval) {
          if (isPerfectInterval) {
            if (lastIntervalType === 'perfect') {
              consecutivePerfect++;
            } else {
              consecutivePerfect = 1;
              consecutiveThirds = 0;
              consecutiveSixths = 0;
            }
            lastIntervalType = 'perfect';
            // Repeated after 2nd consecutive perfect
            if (consecutivePerfect > 2) {
              isRepeated = true;
              repeatInfo = `${consecutivePerfect}th consecutive perfect consonance (threshold: 2)`;
            }
          } else if (isThird) {
            if (lastIntervalType === 'third') {
              consecutiveThirds++;
            } else {
              consecutiveThirds = 1;
              consecutivePerfect = 0;
              consecutiveSixths = 0;
            }
            lastIntervalType = 'third';
            // Repeated after 3rd consecutive third
            if (consecutiveThirds > 3) {
              isRepeated = true;
              repeatInfo = `${consecutiveThirds}th consecutive 3rd (threshold: 3)`;
            }
          } else if (isSixth) {
            if (lastIntervalType === 'sixth') {
              consecutiveSixths++;
            } else {
              consecutiveSixths = 1;
              consecutivePerfect = 0;
              consecutiveThirds = 0;
            }
            lastIntervalType = 'sixth';
            // Repeated after 3rd consecutive sixth
            if (consecutiveSixths > 3) {
              isRepeated = true;
              repeatInfo = `${consecutiveSixths}th consecutive 6th (threshold: 3)`;
            }
          } else {
            // Other consonance (P4 in some contexts)
            consecutivePerfect = 0;
            consecutiveThirds = 0;
            consecutiveSixths = 0;
            lastIntervalType = 'other';
          }
        } else {
          // Dissonance breaks the chain
          consecutivePerfect = 0;
          consecutiveThirds = 0;
          consecutiveSixths = 0;
          lastIntervalType = 'dissonant';
        }

        // Build detailed info for display
        const displayDetails = [...(scoring.details || [])];

        // Add consonance info for consonant intervals
        if (isConsonantInterval) {
          if (isPerfectInterval) {
            displayDetails.push(`Perfect consonance (${sim.interval.toString()})`);
            displayDetails.push(`Consecutive perfect: ${consecutivePerfect}`);
          } else if (isThird) {
            displayDetails.push(`Imperfect consonance (3rd)`);
            displayDetails.push(`Consecutive 3rds: ${consecutiveThirds}`);
          } else if (isSixth) {
            displayDetails.push(`Imperfect consonance (6th)`);
            displayDetails.push(`Consecutive 6ths: ${consecutiveSixths}`);
          }
          if (isRepeated) {
            displayDetails.push(`⚠️ REPEATED: ${repeatInfo}`);
          }
        }

        // Calculate duration of this simultaneity (overlap of both notes)
        const v1End = sim.voice1Note.onset + sim.voice1Note.duration;
        const v2End = sim.voice2Note.onset + sim.voice2Note.duration;
        const simDuration = Math.min(v1End, v2End) - sim.onset;

        // Check if this is a short note (below sub-subdivision threshold)
        const minNoteDuration = Math.min(sim.voice1Note.duration, sim.voice2Note.duration);
        const isShortNote = minNoteDuration <= shortNoteThreshold;
        const isOffBeat = sim.metricWeight < 0.75;

        // Determine motion type based on rest category
        let motionType = 'normal'; // normal, asynchronous, reentry
        if (restCategory === 'asynchronous') {
          motionType = 'asynchronous';
        } else if (isAnyReentry) {
          motionType = 'reentry';
        }

        // Check for parallel 5ths/8ves
        const point = {
          onset: sim.onset,
          duration: simDuration, // Duration of this simultaneity for weighted scoring
          v1Pitch: sim.voice1Note.pitch,
          v2Pitch: sim.voice2Note.pitch,
          intervalClass: sim.interval.class,
          intervalName: sim.interval.toString(),
          isConsonant: isConsonantInterval,
          isStrong: sim.metricWeight >= 0.75,
          metricWeight: sim.metricWeight,
          category: scoring.category || 'consonant_normal',
          score: scoring.score,
          scoreDetails: displayDetails,
          type: scoring.type,
          isResolved: scoring.isResolved !== false,
          isParallel: false,
          isRepeated,
          repeatInfo,
          // Short note detection for penalty reduction
          isShortNote,
          isOffBeat,
          // Rest category and motion info
          restCategory,
          restInfo,
          motionType,
          motionScoreMultiplier,
          showMelodicInterval,
          checkWeakResolution,
          ghostNoteDuration,
          // Previous interval info for detail panel (null if long re-entry = forgotten)
          prevInterval: (prevPoint && showMelodicInterval) ? {
            intervalName: prevPoint.intervalName,
            intervalClass: prevPoint.intervalClass,
            v1Pitch: prevPoint.v1Pitch,
            v2Pitch: prevPoint.v2Pitch,
          } : null,
          v1Motion,
          v2Motion,
        };

        // Add rest info to details
        if (restInfo) {
          point.scoreDetails.unshift(restInfo);
        }

        // Check for parallel motion with previous interval
        // Re-entry breaks the parallel chain entirely
        // Asynchronous still checks parallels (but penalty halved in scoring)
        // Normal motion checks parallels normally
        if (prevPoint && !isAnyReentry) {
          point.isParallel = isParallelFifthOrOctave(prevPoint, point);
          if (point.isParallel) {
            // Check if this parallel is within a sequence (reduced penalty)
            const parallelInSequence = allSequenceBeatRanges.some(range =>
              point.onset >= range.startBeat && point.onset <= range.endBeat
            );
            point.parallelInSequence = parallelInSequence;

            // Track if this is a repeated parallel (two parallels in a row)
            point.isRepeatedParallel = prevPoint.isParallel === true;

            let parallelMsg = `⚠️ PARALLEL ${isPerfectInterval ? '5ths/8ves' : 'motion'}`;
            if (parallelInSequence) {
              parallelMsg += ' (in sequence - penalty reduced 75%)';
            } else if (isShortNote && !point.isRepeatedParallel) {
              parallelMsg += ' (short note, not repeated - halved penalty)';
            } else if (motionType === 'asynchronous') {
              parallelMsg += ' (asynchronous - halved penalty)';
            } else if (point.isRepeatedParallel) {
              parallelMsg += ' (repeated - full penalty)';
            } else {
              parallelMsg += ' detected';
            }
            point.scoreDetails.push(parallelMsg);
          }
        }

        // Weak resolution check for re-entry situations
        // If we're at a re-entry point after a dissonance, and current interval is consonant,
        // the previous dissonance gets "weak resolution" credit (not good, but not unresolved)
        if (checkWeakResolution && prevPoint && !prevPoint.isConsonant && isConsonantInterval) {
          // Mark previous dissonance as weakly resolved via ghost note
          prevPoint.isResolved = true;
          prevPoint.weakResolution = true;
          prevPoint.scoreDetails.push(`Weak resolution via ghost note (${ghostNoteDuration.toFixed(2)} beats extended)`);
          // Adjust score slightly - not as good as proper resolution, but not penalized as unresolved
          // No score change, just removes "unresolved" penalty
        }

        beatMap.set(snapBeat, point);
        intervalPoints.push(point);
        intervalHistory.push(sim.interval.class);
        prevPoint = point;
        prevSim = sim;
      }
    }

    const allPitches = [
      ...voice1.map(n => n.pitch),
      ...transposedVoice2.map(n => n.pitch),
    ];
    const maxTime = Math.max(
      ...voice1.map(n => n.onset + n.duration),
      ...transposedVoice2.map(n => n.onset + n.duration)
    );

    // Issues: strong-beat dissonances with bad scores, unresolved dissonances, parallel 5ths/8ves
    const issues = intervalPoints.filter(p =>
      p.isParallel ||
      (!p.isConsonant && p.score < 0 && p.isStrong) ||
      (!p.isConsonant && !p.isResolved)
    );
    const warnings = intervalPoints.filter(p =>
      !p.isConsonant && p.score < 0 && !p.isStrong && p.isResolved && !issues.includes(p)
    );

    const dissonances = intervalPoints.filter(p => !p.isConsonant);
    const consonances = intervalPoints.filter(p => p.isConsonant);

    // Calculate comprehensive aggregate score
    // Factors: consonance quality, motion quality, resolution quality, penalties
    // All weighted by duration
    let totalWeightedScore = 0;
    let totalDuration = 0;

    // Score breakdown components for transparency
    let consonanceContribution = 0;
    let dissonanceContribution = 0;
    let resolutionBonus = 0;
    let resolutionPenalty = 0;
    let parallelPenalty = 0;
    let repetitionPenalty = 0;
    let motionBonus = 0;

    for (const pt of intervalPoints) {
      // Use note duration as weight (quarter note = 1.0)
      const dur = Math.max(0.25, pt.duration || 0.25); // Default to quarter beat minimum
      totalDuration += dur;

      if (pt.isConsonant) {
        // Consonances: imperfect better than perfect
        const isImperfect = [3, 6].includes(pt.intervalClass); // 3rds, 6ths
        const isPerfect = [1, 5].includes(pt.intervalClass); // unison/octave, 5ths
        const isP4 = pt.intervalClass === 4;

        // Base consonance score
        let baseScore;
        if (isImperfect) {
          baseScore = 0.5; // Imperfect consonances - best variety
        } else if (pt.intervalClass === 5) {
          baseScore = 0.3; // P5 - good but less variety
        } else if (isP4) {
          baseScore = 0.25; // P4 - contextually consonant
        } else {
          baseScore = 0.2; // Unison/octave - functional but less interesting
        }

        // Good resolution bonus
        if (pt.category === 'consonant_good_resolution') {
          resolutionBonus += 0.5 * dur;
          baseScore += 0.3;
        }

        // Bad resolution penalty
        if (pt.category === 'consonant_bad_resolution') {
          resolutionPenalty += 0.3 * dur;
          baseScore -= 0.2;
        }

        // Repetition penalty (halved for short notes)
        if (pt.isRepeated) {
          const repMult = pt.isShortNote ? 0.5 : 1.0;
          repetitionPenalty += 0.25 * dur * repMult;
          baseScore -= 0.15 * repMult;
        }

        consonanceContribution += baseScore * dur;
        totalWeightedScore += baseScore * dur;
      } else {
        // Dissonances: use the detailed scoring from scoreDissonance()
        const dissScore = pt.score || 0;
        dissonanceContribution += dissScore * dur;
        totalWeightedScore += dissScore * dur;
      }

      // Parallel 5ths/8ves - significant penalty
      // Penalty reduction rules:
      // - Sequences: 75% reduction (parallels in sequences are intentional)
      // - Short note + not repeated: 50% reduction (quick parallel followed by different motion)
      // - Two fast parallels in a row: full penalty
      // - Asynchronous motion: 50% reduction
      if (pt.isParallel) {
        let parallelMult = pt.motionScoreMultiplier || 1.0;

        if (pt.parallelInSequence) {
          parallelMult *= 0.25; // Reduce penalty by 75% in sequences
        } else if (pt.isShortNote && !pt.isRepeatedParallel) {
          parallelMult *= 0.5; // Short note, not repeated - halve penalty
        }
        // Note: isRepeatedParallel with short note = full penalty (no reduction)

        parallelPenalty += 1.0 * dur * parallelMult;
        totalWeightedScore -= 1.0 * dur * parallelMult;
      }

      // Motion bonus: stepwise motion is good, leaps are riskier
      // Small bonus for stepwise motion (2 semitones or less)
      if (pt.v1Motion !== undefined && pt.v2Motion !== undefined) {
        const v1Step = Math.abs(pt.v1Motion) <= 2 && pt.v1Motion !== 0;
        const v2Step = Math.abs(pt.v2Motion) <= 2 && pt.v2Motion !== 0;
        if (v1Step && v2Step) {
          motionBonus += 0.1 * dur;
          totalWeightedScore += 0.1 * dur;
        }
      }
    }

    // Normalize to per-quarter-note average
    const avgScore = totalDuration > 0 ? totalWeightedScore / totalDuration : 0;

    // Build aggregate score breakdown for transparency
    const scoreBreakdown = {
      totalIntervals: intervalPoints.length,
      consonances: consonances.length,
      dissonances: dissonances.length,
      repeatedIntervals: intervalPoints.filter(p => p.isRepeated).length,
      parallelIssues: intervalPoints.filter(p => p.isParallel).length,
      unresolvedDissonances: dissonances.filter(p => !p.isResolved).length,
      strongBeatDissonances: dissonances.filter(p => p.isStrong).length,
      // Comprehensive breakdown
      totalDuration: totalDuration.toFixed(2),
      totalWeightedScore: totalWeightedScore.toFixed(2),
      factors: {
        consonanceContribution: consonanceContribution.toFixed(2),
        dissonanceContribution: dissonanceContribution.toFixed(2),
        resolutionBonus: resolutionBonus.toFixed(2),
        resolutionPenalty: (-resolutionPenalty).toFixed(2),
        parallelPenalty: (-parallelPenalty).toFixed(2),
        repetitionPenalty: (-repetitionPenalty).toFixed(2),
        motionBonus: motionBonus.toFixed(2),
      },
      avgScore: avgScore.toFixed(2),
      // Individual dissonance scores for detailed view
      dissonanceScores: dissonances.map(d => ({
        onset: d.onset,
        interval: d.intervalName,
        score: d.score,
        isStrong: d.isStrong,
        isResolved: d.isResolved,
      })),
    };

    return {
      voice1,
      transposedVoice2,
      intervalPoints,
      beatMap,
      issues,
      warnings,
      dissonances, // All dissonances for clickable list
      avgScore,
      scoreBreakdown,
      minPitch: Math.min(...allPitches) - 2,
      maxPitch: Math.max(...allPitches) + 2,
      maxTime,
    };
  }, [voice1, voice2, transposition, meter, sequences, tabConfig]);

  // Track issue count changes
  useEffect(() => {
    if (analysis) {
      setPreviousIssueCount(prev => {
        if (prev === null) return analysis.issues.length;
        return prev;
      });
    }
  }, [analysis]);

  // Update previous issue count after a delay
  useEffect(() => {
    if (analysis && previousIssueCount !== null && previousIssueCount !== analysis.issues.length) {
      const timer = setTimeout(() => {
        setPreviousIssueCount(analysis.issues.length);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [analysis, previousIssueCount]);

  // Reset previous issue count when tab changes
  useEffect(() => {
    setPreviousIssueCount(null);
  }, [activeTab]);

  // Displacement handlers
  const adjustTransposition = useCallback((delta) => {
    setTransposition(prev => {
      // Store previous issue count before change
      if (analysis) {
        setPreviousIssueCount(analysis.issues.length);
      }
      return prev + delta;
    });
  }, [analysis]);

  // Interaction handlers
  const getOnsetKey = (onset) => Math.round(onset * 4) / 4;

  const handleIntervalClick = useCallback((pt, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    // Always select the clicked interval (no toggle - stays open until new tap)
    setSelectedInterval(pt);
    setHighlightedOnset(getOnsetKey(pt.onset));
  }, []);

  const handleNoteClick = useCallback((note, voiceKey, event) => {
    if (event) event.preventDefault();
    if (!analysis) return;

    // Find interval that overlaps with this note
    const overlappingInterval = analysis.intervalPoints.find(pt => {
      const noteEnd = note.onset + note.duration;
      return pt.onset >= note.onset && pt.onset < noteEnd;
    });

    if (overlappingInterval) {
      setSelectedInterval(overlappingInterval);
      setHighlightedOnset(getOnsetKey(overlappingInterval.onset));
    }
  }, [analysis]);

  const handleIssueClick = useCallback((issue, event) => {
    if (event) event.preventDefault();
    setSelectedInterval(issue);
    setHighlightedOnset(getOnsetKey(issue.onset));
    // Scroll to the interval in the visualization
    if (containerRef.current) {
      const scrollContainer = containerRef.current.querySelector('[data-scroll-container]');
      if (scrollContainer) {
        const targetX = 60 + issue.onset * 70 - scrollContainer.clientWidth / 2;
        scrollContainer.scrollTo({ left: Math.max(0, targetX), behavior: 'smooth' });
      }
    }
  }, []);

  // Map voice keys to sequence keys (voices use 'cs1', sequences use 'countersubject')
  const voiceToSequenceKey = useCallback((voiceKey) => {
    if (voiceKey === 'cs1') return 'countersubject';
    return voiceKey;
  }, []);

  // Check if note is in a sequence (using note index, not onset time)
  // noteRanges from detectSequences contains { start: noteIndex, end: noteIndex }
  const isNoteInSequence = useCallback((noteIndex, voiceKey) => {
    const seqKey = voiceToSequenceKey(voiceKey);
    const voiceSequences = sequences[seqKey];
    if (!voiceSequences?.noteRanges) return false;
    return voiceSequences.noteRanges.some(range =>
      noteIndex >= range.start && noteIndex <= range.end
    );
  }, [sequences, voiceToSequenceKey]);

  if (!analysis) {
    return (
      <div style={{ padding: '16px', color: '#6b7280', fontStyle: 'italic' }}>
        Insufficient voice data for comparison
      </div>
    );
  }

  const { minPitch, maxPitch, maxTime, intervalPoints, issues, warnings, avgScore } = analysis;
  const pRange = maxPitch - minPitch;
  const noteHeight = 18;
  const headerHeight = 32;
  const h = pRange * noteHeight + headerHeight + 20;
  const pixelsPerBeat = 70;
  const w = Math.max(500, maxTime * pixelsPerBeat + 100);

  const tScale = (w - 80) / maxTime;
  const pToY = (p) => h - 20 - (p - minPitch) * noteHeight;
  const tToX = (t) => 60 + t * tScale;

  const hasIssues = issues.length > 0;
  const hasWarnings = warnings.length > 0;
  const voice1Color = getVoiceColor(tabConfig.v1);
  const voice2Color = getVoiceColor(tabConfig.v2);
  const voice1Label = getVoiceLabel(tabConfig.v1);
  const voice2Label = getVoiceLabel(tabConfig.v2);

  const colors = {
    bg: hasIssues ? VIZ_COLORS.issueBackground : hasWarnings ? VIZ_COLORS.warningBackground : VIZ_COLORS.cleanBackground,
    border: hasIssues ? VIZ_COLORS.issueBorder : hasWarnings ? VIZ_COLORS.warningBorder : VIZ_COLORS.cleanBorder,
    highlight: VIZ_COLORS.highlight,
  };

  // Issue count change indicator
  const issueCountDelta = previousIssueCount !== null ? analysis.issues.length - previousIssueCount : 0;

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '4px',
        backgroundColor: '#f1f5f9',
        borderRadius: '8px',
        width: 'fit-content',
      }}>
        {availableTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === tab.key ? '600' : '400',
              backgroundColor: activeTab === tab.key ? '#fff' : 'transparent',
              color: activeTab === tab.key ? '#1f2937' : '#64748b',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Controls row */}
      <div style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
        padding: '12px 16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
      }}>
        {/* Displacement controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Displace {voice2Label}:</span>

          {/* Octave down */}
          <button
            onClick={() => adjustTransposition(-12)}
            style={{
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: '#fff',
              cursor: 'pointer',
              fontSize: '11px',
              color: '#374151',
            }}
            title="Down octave"
          >
            -8ve
          </button>

          {/* Semitone down */}
          <button
            onClick={() => adjustTransposition(-1)}
            style={{
              padding: '4px 10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              color: '#374151',
            }}
            title="Down semitone"
          >
            -
          </button>

          {/* Current transposition display */}
          <div style={{
            padding: '6px 12px',
            backgroundColor: transposition === 0 ? '#f1f5f9' : '#e0e7ff',
            borderRadius: '6px',
            minWidth: '80px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>
              {getIntervalName(transposition)}
            </div>
            {transposition !== 0 && (
              <div style={{ fontSize: '10px', color: '#64748b' }}>
                {transposition > 0 ? '+' : ''}{transposition} semitones
              </div>
            )}
          </div>

          {/* Semitone up */}
          <button
            onClick={() => adjustTransposition(1)}
            style={{
              padding: '4px 10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              color: '#374151',
            }}
            title="Up semitone"
          >
            +
          </button>

          {/* Octave up */}
          <button
            onClick={() => adjustTransposition(12)}
            style={{
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: '#fff',
              cursor: 'pointer',
              fontSize: '11px',
              color: '#374151',
            }}
            title="Up octave"
          >
            +8ve
          </button>

          {/* Reset button */}
          {transposition !== 0 && (
            <button
              onClick={() => {
                setPreviousIssueCount(analysis.issues.length);
                setTransposition(0);
              }}
              style={{
                padding: '4px 8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                fontSize: '11px',
                color: '#6b7280',
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Score and issue count - compact */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Issue count with delta indicator */}
          <div style={{
            padding: '4px 10px',
            borderRadius: '4px',
            backgroundColor: hasIssues ? '#fef2f2' : hasWarnings ? '#fefce8' : '#f0fdf4',
            border: `1px solid ${hasIssues ? '#fecaca' : hasWarnings ? '#fde047' : '#bbf7d0'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Issues:</span>
            <span style={{
              fontSize: '12px',
              fontWeight: '600',
              color: hasIssues ? '#dc2626' : hasWarnings ? '#ca8a04' : '#16a34a',
            }}>
              {issues.length}
            </span>
            {issueCountDelta !== 0 && (
              <span style={{
                fontSize: '10px',
                fontWeight: '600',
                color: issueCountDelta > 0 ? '#dc2626' : '#16a34a',
              }}>
                ({issueCountDelta > 0 ? '+' : ''}{issueCountDelta})
              </span>
            )}
          </div>

          {/* Average score - compact */}
          <div style={{
            padding: '4px 10px',
            borderRadius: '4px',
            backgroundColor: avgScore >= 0.5 ? '#dcfce7' : avgScore >= 0 ? '#fef9c3' : '#fee2e2',
            border: `1px solid ${avgScore >= 0.5 ? '#86efac' : avgScore >= 0 ? '#fde047' : '#fca5a5'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Score:</span>
            <span style={{
              fontSize: '12px',
              fontWeight: '600',
              color: avgScore >= 0.5 ? '#16a34a' : avgScore >= 0 ? '#ca8a04' : '#dc2626',
            }}>
              {avgScore >= 0 ? '+' : ''}{avgScore.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Main visualization */}
      <div style={{
        border: `2px solid ${colors.border}`,
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: colors.bg,
      }}>
        <div data-scroll-container style={{ overflowX: 'auto' }}>
          <svg width={w} height={h} style={{ display: 'block' }}>
            {/* Header */}
            <rect x={0} y={0} width={w} height={headerHeight} fill="rgba(0,0,0,0.04)" />
            <text x={16} y={22} fontSize="14" fontWeight="600" fill="#374151">
              {voice1Label} vs {voice2Label}
              {transposition !== 0 && ` (${getIntervalName(transposition)})`}
            </text>

            {/* Beat grid */}
            {(() => {
              const gridLines = generateGridLines(maxTime, meter, { showSubdivisions: false });
              return gridLines.map((line, i) => {
                const x = tToX(line.time);
                return (
                  <g key={`grid-${i}`}>
                    <line
                      x1={x} y1={headerHeight} x2={x} y2={h - 18}
                      stroke={line.isDownbeat ? '#64748b' : (line.isMainBeat ? '#9ca3af' : '#e5e7eb')}
                      strokeWidth={line.isDownbeat ? 1.5 : (line.isMainBeat ? 0.75 : 0.5)}
                    />
                    {line.measureNum ? (
                      <text x={x} y={h - 4} fontSize="11" fill="#475569" textAnchor="middle" fontWeight="600">
                        m.{line.measureNum}
                      </text>
                    ) : line.beatNum ? (
                      <text x={x} y={h - 4} fontSize="9" fill="#9ca3af" textAnchor="middle">
                        {line.beatNum}
                      </text>
                    ) : null}
                  </g>
                );
              });
            })()}

            {/* Voice labels */}
            {(() => {
              const v1AvgPitch = analysis.voice1.reduce((s, n) => s + n.pitch, 0) / analysis.voice1.length;
              const v2AvgPitch = analysis.transposedVoice2.reduce((s, n) => s + n.pitch, 0) / analysis.transposedVoice2.length;
              const v1Higher = v1AvgPitch > v2AvgPitch;
              return (
                <>
                  <text x={12} y={pToY(maxPitch - 1) + 5} fontSize="11" fontWeight="600" fill={v1Higher ? voice1Color : voice2Color}>
                    {v1Higher ? voice1Label : voice2Label} (upper)
                  </text>
                  <text x={12} y={pToY(minPitch + 1) + 5} fontSize="11" fontWeight="600" fill={v1Higher ? voice2Color : voice1Color}>
                    {v1Higher ? voice2Label : voice1Label} (lower)
                  </text>
                </>
              );
            })()}

            {/* ALWAYS VISIBLE interval regions - subtle by default, prominent for problems */}
            {intervalPoints.map((pt, i) => {
              const x = tToX(pt.onset);
              const isHighlighted = highlightedOnset === getOnsetKey(pt.onset);
              const isSelected = selectedInterval?.onset === pt.onset;

              const nextPt = intervalPoints[i + 1];
              const regionWidth = nextPt
                ? Math.max(4, (nextPt.onset - pt.onset) * tScale - 2)
                : Math.max(20, tScale * 0.5);

              const isPerfect = [1, 5, 8, 0].includes(pt.intervalClass);
              const style = getIntervalStyle({
                isConsonant: pt.isConsonant,
                isPerfect,
                score: pt.score || 0,
                entryScore: pt.entryScore,  // NEW
                exitScore: pt.exitScore,    // NEW
                category: pt.category,
                isRepeated: pt.isRepeated,
                isResolved: pt.isResolved,
                isParallel: pt.isParallel,
              });

              // Determine opacity based on state and type
              let regionOpacity = style.opacity || 0.5;
              if (isHighlighted || isSelected) {
                regionOpacity = Math.min(1, regionOpacity + 0.3);
              }
              if (pt.isParallel || (!pt.isConsonant && !pt.isResolved)) {
                regionOpacity = Math.max(regionOpacity, 0.7);
              }

              return (
                <g
                  key={`int-${i}`}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => handleIntervalClick(pt, e)}
                  
                  onMouseEnter={() => setHighlightedOnset(getOnsetKey(pt.onset))}
                  onMouseLeave={() => !isSelected && setHighlightedOnset(null)}
                >
                  {/* Always visible region */}
                  <rect
                    x={x}
                    y={headerHeight}
                    width={regionWidth}
                    height={h - headerHeight - 18}
                    fill={style.fill}
                    opacity={regionOpacity}
                    rx={3}
                    stroke={style.color}
                    strokeWidth={style.borderWidth || 1}
                    strokeDasharray={style.borderStyle === 'dashed' ? '4,3' : undefined}
                    strokeOpacity={0.6}
                  />

                  {/* Show label on hover/select */}
                  {(isHighlighted || isSelected) && (
                    <g>
                      <rect
                        x={x + regionWidth / 2 - 18}
                        y={(pToY(pt.v1Pitch) + pToY(pt.v2Pitch)) / 2 - 14}
                        width={36}
                        height={28}
                        fill={style.bg}
                        stroke={style.color}
                        strokeWidth={1.5}
                        rx={4}
                        opacity={0.95}
                      />
                      <text
                        x={x + regionWidth / 2}
                        y={(pToY(pt.v1Pitch) + pToY(pt.v2Pitch)) / 2 + 2}
                        fontSize="12"
                        fontWeight="600"
                        fill={style.color}
                        textAnchor="middle"
                      >
                        {pt.intervalClass}
                      </text>
                      {!pt.isConsonant && (
                        <text
                          x={x + regionWidth / 2}
                          y={(pToY(pt.v1Pitch) + pToY(pt.v2Pitch)) / 2 + 14}
                          fontSize="9"
                          fill={style.color}
                          textAnchor="middle"
                        >
                          {(pt.score || 0) >= 0 ? '+' : ''}{(pt.score || 0).toFixed(1)}
                        </text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}

            {/* Voice 1 notes */}
            {analysis.voice1.map((n, i) => {
              const x = tToX(n.onset);
              const y = pToY(n.pitch);
              const width = Math.max(8, n.duration * tScale - 3);
              const isHighlighted = highlightedOnset !== null &&
                intervalPoints.some(pt => getOnsetKey(pt.onset) === highlightedOnset &&
                  n.onset <= pt.onset && pt.onset < n.onset + n.duration);
              const inSequence = isNoteInSequence(i, tabConfig.v1);

              return (
                <g
                  key={`v1-${i}`}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => handleNoteClick(n, tabConfig.v1, e)}
                  
                >
                  {isHighlighted && (
                    <rect
                      x={x - 4} y={y - noteHeight/2 - 3}
                      width={width + 8} height={noteHeight + 6}
                      fill={colors.highlight} rx={5} opacity={0.5}
                    />
                  )}
                  <rect
                    x={x} y={y - noteHeight/2 + 2}
                    width={width} height={noteHeight - 4}
                    fill={voice1Color} rx={4}
                    stroke={inSequence ? VIZ_COLORS.sequenceBorder : undefined}
                    strokeWidth={inSequence ? 2 : 0}
                    strokeDasharray={inSequence ? '3,2' : undefined}
                  />
                  <text x={x + width/2} y={y + 4} fontSize="10" fill="white" textAnchor="middle" fontWeight="500">
                    {pitchName(n.pitch, n.preferFlats).replace(/\d/, '')}
                  </text>
                </g>
              );
            })}

            {/* Voice 2 notes (transposed) */}
            {analysis.transposedVoice2.map((n, i) => {
              const x = tToX(n.onset);
              const y = pToY(n.pitch);
              const width = Math.max(8, n.duration * tScale - 3);
              const isHighlighted = highlightedOnset !== null &&
                intervalPoints.some(pt => getOnsetKey(pt.onset) === highlightedOnset &&
                  n.onset <= pt.onset && pt.onset < n.onset + n.duration);
              const inSequence = isNoteInSequence(i, tabConfig.v2);

              return (
                <g
                  key={`v2-${i}`}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => handleNoteClick(n, tabConfig.v2, e)}
                  
                >
                  {isHighlighted && (
                    <rect
                      x={x - 4} y={y - noteHeight/2 - 3}
                      width={width + 8} height={noteHeight + 6}
                      fill={colors.highlight} rx={5} opacity={0.5}
                    />
                  )}
                  <rect
                    x={x} y={y - noteHeight/2 + 2}
                    width={width} height={noteHeight - 4}
                    fill={voice2Color} rx={4}
                    stroke={inSequence ? VIZ_COLORS.sequenceBorder : undefined}
                    strokeWidth={inSequence ? 2 : 0}
                    strokeDasharray={inSequence ? '3,2' : undefined}
                  />
                  <text x={x + width/2} y={y + 4} fontSize="10" fill="white" textAnchor="middle" fontWeight="500">
                    {pitchName(n.pitch, n.preferFlats).replace(/\d/, '')}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        fontSize: '11px',
        color: '#64748b',
        padding: '8px 12px',
        backgroundColor: '#f8fafc',
        borderRadius: '6px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: VIZ_COLORS.perfectConsonant, borderRadius: '2px', opacity: 0.6 }} />
          <span>Perfect (P1, P5, P8)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: VIZ_COLORS.imperfectConsonant, borderRadius: '2px', opacity: 0.6 }} />
          <span>Imperfect (3rds, 6ths)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: VIZ_COLORS.dissonantGood, borderRadius: '2px', opacity: 0.7 }} />
          <span>Dissonance (well-handled)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: VIZ_COLORS.dissonantProblematic, borderRadius: '2px', opacity: 0.7, border: '2px dashed #f87171' }} />
          <span>Dissonance (problematic)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: VIZ_COLORS.parallelFifthsOctaves, borderRadius: '2px', opacity: 0.8 }} />
          <span>Parallel 5th/8ve</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', border: `2px dashed ${VIZ_COLORS.sequenceBorder}`, borderRadius: '2px' }} />
          <span>In sequence</span>
        </div>
      </div>

      {/* Selected interval detail panel - comprehensive */}
      {selectedInterval && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          {(() => {
            const pt = selectedInterval;
            if (!pt || pt.score === undefined) return null;
            const isPerfect = [1, 5, 8, 0].includes(pt.intervalClass);
            const style = getIntervalStyle({
              isConsonant: pt.isConsonant,
              isPerfect,
              score: pt.score,
              entryScore: pt.entryScore,  // NEW
              exitScore: pt.exitScore,    // NEW
              category: pt.category,
              isRepeated: pt.isRepeated,
              isResolved: pt.isResolved,
              isParallel: pt.isParallel,
            });

            // Format motion as interval name
            const formatMotion = (semitones) => {
              if (semitones === 0) return '—';
              const dir = semitones > 0 ? '↑' : '↓';
              const abs = Math.abs(semitones);
              if (abs === 1) return `${dir}m2`;
              if (abs === 2) return `${dir}M2`;
              if (abs === 3) return `${dir}m3`;
              if (abs === 4) return `${dir}M3`;
              if (abs === 5) return `${dir}P4`;
              if (abs === 6) return `${dir}TT`;
              if (abs === 7) return `${dir}P5`;
              if (abs >= 12) return `${dir}${abs}st`;
              return `${dir}${abs}st`;
            };

            return (
              <>
                {/* Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                }}>
                  <span style={{ fontWeight: '600', fontSize: '13px', color: '#1f2937' }}>
                    {formatter?.formatBeat(pt.onset) || `Beat ${pt.onset + 1}`}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{
                      padding: '3px 8px',
                      backgroundColor: style.bg,
                      color: style.color,
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}>
                      {pt.intervalName} — {style.label}
                    </span>
                    {pt.isParallel && (
                      <span style={{ padding: '3px 8px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                        Parallel!
                      </span>
                    )}
                    {!pt.isResolved && !pt.isConsonant && (
                      <span style={{ padding: '3px 8px', backgroundColor: '#fef3c7', color: '#b45309', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                        Unresolved
                      </span>
                    )}
                    {!pt.isConsonant && (
                      <span style={{
                        padding: '3px 8px',
                        backgroundColor: pt.score >= 0 ? '#dcfce7' : '#fee2e2',
                        color: pt.score >= 0 ? '#16a34a' : '#dc2626',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}>
                        {pt.score >= 0 ? '+' : ''}{pt.score.toFixed(2)}
                      </span>
                    )}
                    <button
                      onClick={() => { setSelectedInterval(null); setHighlightedOnset(null); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#9ca3af', marginLeft: '4px' }}
                    >×</button>
                  </div>
                </div>

                <div style={{ padding: '12px 14px' }}>
                  {/* Motion from previous interval */}
                  {pt.prevInterval && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      gap: '8px',
                      alignItems: 'center',
                      marginBottom: '12px',
                      padding: '10px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '6px',
                    }}>
                      {/* Previous interval */}
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Previous</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>{pt.prevInterval.intervalName}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                          {pitchName(pt.prevInterval.v1Pitch)} / {pitchName(pt.prevInterval.v2Pitch)}
                        </div>
                      </div>

                      {/* Motion arrow */}
                      <div style={{ textAlign: 'center', padding: '0 8px' }}>
                        <div style={{ fontSize: '16px', color: '#6366f1' }}>→</div>
                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                          {voice1Label}: {formatMotion(pt.v1Motion)}
                        </div>
                        <div style={{ fontSize: '9px', color: '#64748b' }}>
                          {voice2Label}: {formatMotion(pt.v2Motion)}
                        </div>
                      </div>

                      {/* Current interval */}
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Current</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: style.color }}>{pt.intervalName}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                          {pitchName(pt.v1Pitch)} / {pitchName(pt.v2Pitch)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Current notes (if no previous) */}
                  {!pt.prevInterval && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ padding: '8px 10px', backgroundColor: `${voice1Color}10`, borderRadius: '4px', borderLeft: `3px solid ${voice1Color}` }}>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{voice1Label}</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: voice1Color }}>{pitchName(pt.v1Pitch)}</div>
                      </div>
                      <div style={{ padding: '8px 10px', backgroundColor: `${voice2Color}10`, borderRadius: '4px', borderLeft: `3px solid ${voice2Color}` }}>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{voice2Label}</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: voice2Color }}>{pitchName(pt.v2Pitch)}</div>
                      </div>
                    </div>
                  )}

                  {/* Score/Analysis breakdown - show for ALL intervals */}
                  {pt.scoreDetails && pt.scoreDetails.length > 0 && (
                    <div style={{
                      backgroundColor: pt.isConsonant ? '#f0fdf4' : '#fafafa',
                      borderRadius: '6px',
                      padding: '10px',
                      border: `1px solid ${pt.isConsonant ? '#bbf7d0' : '#e5e7eb'}`,
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                        {pt.isConsonant ? 'Interval Analysis' : 'Score Breakdown'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {pt.scoreDetails.map((detail, i) => {
                          const text = typeof detail === 'object' ? detail.text : detail;
                          const isWarning = text.includes('⚠️') || text.includes('REPEATED') || text.includes('PARALLEL');
                          // Detect positive scores (e.g., "+0.5", "+1.0") and negative scores
                          const hasPositive = /\+\d/.test(text) || text.includes('good') || text.includes('Good');
                          const hasNegative = /-\d/.test(text) && !text.includes('m2') && !text.includes('-m'); // Avoid interval names
                          let textColor = '#475569'; // Default dark gray
                          if (isWarning || hasNegative) {
                            textColor = '#dc2626'; // Red for warnings/negatives
                          } else if (hasPositive) {
                            textColor = '#16a34a'; // Green for positives
                          }
                          return (
                            <div key={i} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '12px',
                              padding: '3px 0',
                              borderBottom: i < pt.scoreDetails.length - 1 ? '1px solid #f3f4f6' : 'none',
                              color: textColor,
                              fontWeight: (isWarning || hasPositive || hasNegative) ? '500' : '400',
                            }}>
                              <span style={{ flex: 1 }}>{text}</span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Show total score for dissonances */}
                      {!pt.isConsonant && (
                        <div style={{
                          marginTop: '10px',
                          paddingTop: '8px',
                          borderTop: '2px solid #e5e7eb',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>Total Score</span>
                          <span style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: pt.score >= 0 ? '#dcfce7' : '#fee2e2',
                            color: pt.score >= 0 ? '#16a34a' : '#dc2626',
                          }}>
                            {pt.score >= 0 ? '+' : ''}{pt.score.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {/* Show metric weight info */}
                      <div style={{
                        marginTop: '6px',
                        paddingTop: '6px',
                        borderTop: '1px solid #e5e7eb',
                        fontSize: '10px',
                        color: '#94a3b8',
                      }}>
                        Metric weight: {(pt.metricWeight * 100).toFixed(0)}% ({pt.isStrong ? 'strong beat' : 'weak beat'})
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Issues list */}
      {issues.length > 0 && (
        <div style={{
          backgroundColor: '#fff',
          border: `1px solid ${VIZ_COLORS.issueBorder}`,
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 14px',
            backgroundColor: VIZ_COLORS.issueBackground,
            borderBottom: `1px solid ${VIZ_COLORS.issueBorder}`,
            fontWeight: '600',
            fontSize: '13px',
            color: VIZ_COLORS.issueText,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>Issues ({issues.length})</span>
            {issueCountDelta !== 0 && (
              <span style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: issueCountDelta > 0 ? '#fecaca' : '#bbf7d0',
                color: issueCountDelta > 0 ? '#dc2626' : '#16a34a',
              }}>
                Was {previousIssueCount} → Now {issues.length}
              </span>
            )}
          </div>
          {issues.map((issue, i) => (
            <div
              key={i}
              onClick={(e) => handleIssueClick(issue, e)}
              style={{
                padding: '10px 14px',
                borderBottom: i < issues.length - 1 ? `1px solid ${VIZ_COLORS.issueBackground}` : 'none',
                fontSize: '13px',
                cursor: 'pointer',
                backgroundColor: selectedInterval?.onset === issue.onset ? '#fef2f2' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ color: VIZ_COLORS.dissonantProblematic, fontWeight: '600' }}>
                {formatter?.formatBeat(issue.onset) || `Beat ${issue.onset + 1}`}:
              </span>
              <span>{issue.intervalName}</span>
              {issue.isParallel && (
                <span style={{
                  padding: '2px 6px',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                }}>
                  Parallel
                </span>
              )}
              {!issue.isResolved && !issue.isConsonant && (
                <span style={{
                  padding: '2px 6px',
                  backgroundColor: '#fef3c7',
                  color: '#b45309',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                }}>
                  Unresolved
                </span>
              )}
              <span style={{ marginLeft: 'auto', color: '#dc2626', fontWeight: '600' }}>
                ({issue.score.toFixed(2)})
              </span>
              {issue.type && (
                <span style={{ color: '#6b7280', fontSize: '12px' }}>
                  — {issue.type}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Warnings list */}
      {warnings.length > 0 && (
        <div style={{
          backgroundColor: '#fff',
          border: `1px solid ${VIZ_COLORS.warningBorder}`,
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 14px',
            backgroundColor: VIZ_COLORS.warningBackground,
            borderBottom: `1px solid ${VIZ_COLORS.warningBorder}`,
            fontWeight: '600',
            fontSize: '13px',
            color: VIZ_COLORS.warningText,
          }}>
            Warnings ({warnings.length})
          </div>
          {warnings.slice(0, 5).map((warn, i) => (
            <div
              key={i}
              onClick={(e) => handleIssueClick(warn, e)}
              style={{
                padding: '8px 14px',
                borderBottom: i < Math.min(warnings.length - 1, 4) ? `1px solid ${VIZ_COLORS.warningBackground}` : 'none',
                fontSize: '12px',
                cursor: 'pointer',
                backgroundColor: selectedInterval?.onset === warn.onset ? '#fefce8' : 'transparent',
              }}
            >
              <span style={{ color: VIZ_COLORS.warningText, fontWeight: '600' }}>
                {formatter?.formatBeat(warn.onset) || `Beat ${warn.onset + 1}`}:
              </span>
              <span style={{ marginLeft: '8px' }}>{warn.intervalName}</span>
              <span style={{ marginLeft: '8px', color: '#ca8a04' }}>
                ({warn.score.toFixed(2)})
              </span>
            </div>
          ))}
          {warnings.length > 5 && (
            <div style={{ padding: '8px 14px', fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
              +{warnings.length - 5} more warnings
            </div>
          )}
        </div>
      )}

      {/* All Dissonances - clickable list */}
      {analysis.dissonances && analysis.dissonances.length > 0 && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #c4b5fd',
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#f5f3ff',
            borderBottom: '1px solid #c4b5fd',
            fontWeight: '600',
            fontSize: '13px',
            color: '#5b21b6',
          }}>
            All Dissonances ({analysis.dissonances.length}) — tap to view details
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {analysis.dissonances.map((diss, i) => (
              <div
                key={i}
                onClick={(e) => handleIssueClick(diss, e)}
                style={{
                  padding: '8px 14px',
                  borderBottom: i < analysis.dissonances.length - 1 ? '1px solid #f5f3ff' : 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: selectedInterval?.onset === diss.onset ? '#f5f3ff' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ color: '#7c3aed', fontWeight: '600', minWidth: '70px' }}>
                  {formatter?.formatBeat(diss.onset) || `Beat ${diss.onset + 1}`}
                </span>
                <span style={{ fontWeight: '500' }}>{diss.intervalName}</span>
                <span style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  backgroundColor: diss.isStrong ? '#fef3c7' : '#f1f5f9',
                  color: diss.isStrong ? '#92400e' : '#64748b',
                }}>
                  {diss.isStrong ? 'strong' : 'weak'}
                </span>
                {diss.type && diss.type !== 'unprepared' && (
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                  }}>
                    {diss.type}
                  </span>
                )}
                <span style={{
                  marginLeft: 'auto',
                  fontWeight: '600',
                  color: diss.score >= 0 ? '#16a34a' : diss.score >= -1 ? '#ca8a04' : '#dc2626',
                }}>
                  {diss.score >= 0 ? '+' : ''}{diss.score.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aggregate Score Breakdown - always show for transparency */}
      {analysis.scoreBreakdown && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            fontWeight: '600',
            fontSize: '13px',
            color: '#475569',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>Score Calculation Breakdown</span>
            <span style={{
              padding: '3px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '700',
              backgroundColor: avgScore >= 0.5 ? '#dcfce7' : avgScore >= 0 ? '#fef9c3' : '#fee2e2',
              color: avgScore >= 0.5 ? '#16a34a' : avgScore >= 0 ? '#ca8a04' : '#dc2626',
            }}>
              Score: {avgScore >= 0 ? '+' : ''}{avgScore.toFixed(2)}
            </span>
          </div>
          <div style={{ padding: '12px 14px' }}>
            {/* Summary stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '8px',
              marginBottom: '12px',
            }}>
              <div style={{ padding: '8px', backgroundColor: '#f0fdf4', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#16a34a' }}>{analysis.scoreBreakdown.consonances}</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Consonances</div>
              </div>
              <div style={{ padding: '8px', backgroundColor: '#faf5ff', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#7c3aed' }}>{analysis.scoreBreakdown.dissonances}</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Dissonances</div>
              </div>
              {analysis.scoreBreakdown.repeatedIntervals > 0 && (
                <div style={{ padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#737373' }}>{analysis.scoreBreakdown.repeatedIntervals}</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Repeated</div>
                </div>
              )}
              {analysis.scoreBreakdown.parallelIssues > 0 && (
                <div style={{ padding: '8px', backgroundColor: '#fef2f2', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#dc2626' }}>{analysis.scoreBreakdown.parallelIssues}</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Parallel 5/8</div>
                </div>
              )}
            </div>

            {/* What each dissonance score includes */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              padding: '10px',
              fontSize: '11px',
              color: '#64748b',
              marginBottom: '10px',
            }}>
              <div style={{ fontWeight: '600', marginBottom: '6px', color: '#475569' }}>Each dissonance score includes:</div>
              <ul style={{ margin: '0', paddingLeft: '16px', lineHeight: '1.6' }}>
                <li><strong>Entry motion:</strong> oblique/contrary (+0.5), similar (-0.5 to -1.0), parallel (-1.5)</li>
                <li><strong>Metric placement:</strong> strong beat (-0.5)</li>
                <li><strong>Resolution target:</strong> imperfect consonance (+1.0), perfect (+0.5), another dissonance (-0.75)</li>
                <li><strong>Resolution quality:</strong> step (good), leap penalties by size</li>
                <li><strong>Patterns:</strong> suspension (+1.5), appoggiatura (+2.5), cambiata (+0.5-1.5), etc.</li>
                <li><strong>Rest modifier:</strong> from-rest halves motion penalties</li>
                <li><strong>Re-entry:</strong> after long rest (&gt;1 beat AND &gt;2× note) = neutral (0)</li>
              </ul>
            </div>

            {/* Comprehensive score breakdown */}
            <div style={{
              backgroundColor: '#faf5ff',
              borderRadius: '6px',
              padding: '10px',
              fontSize: '11px',
              color: '#5b21b6',
            }}>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>Comprehensive Score Breakdown:</div>
              {analysis.scoreBreakdown.factors && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Consonance quality:</span>
                    <strong style={{ color: '#16a34a' }}>+{analysis.scoreBreakdown.factors.consonanceContribution}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Dissonance handling:</span>
                    <strong style={{ color: parseFloat(analysis.scoreBreakdown.factors.dissonanceContribution) >= 0 ? '#16a34a' : '#dc2626' }}>
                      {parseFloat(analysis.scoreBreakdown.factors.dissonanceContribution) >= 0 ? '+' : ''}{analysis.scoreBreakdown.factors.dissonanceContribution}
                    </strong>
                  </div>
                  {parseFloat(analysis.scoreBreakdown.factors.resolutionBonus) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Good resolutions:</span>
                      <strong style={{ color: '#16a34a' }}>+{analysis.scoreBreakdown.factors.resolutionBonus}</strong>
                    </div>
                  )}
                  {parseFloat(analysis.scoreBreakdown.factors.resolutionPenalty) < 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Leap resolutions:</span>
                      <strong style={{ color: '#dc2626' }}>{analysis.scoreBreakdown.factors.resolutionPenalty}</strong>
                    </div>
                  )}
                  {parseFloat(analysis.scoreBreakdown.factors.parallelPenalty) < 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Parallel 5ths/8ves:</span>
                      <strong style={{ color: '#dc2626' }}>{analysis.scoreBreakdown.factors.parallelPenalty}</strong>
                    </div>
                  )}
                  {parseFloat(analysis.scoreBreakdown.factors.repetitionPenalty) < 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Repeated intervals:</span>
                      <strong style={{ color: '#ca8a04' }}>{analysis.scoreBreakdown.factors.repetitionPenalty}</strong>
                    </div>
                  )}
                  {parseFloat(analysis.scoreBreakdown.factors.motionBonus) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Stepwise motion:</span>
                      <strong style={{ color: '#16a34a' }}>+{analysis.scoreBreakdown.factors.motionBonus}</strong>
                    </div>
                  )}
                </div>
              )}
              <div style={{
                borderTop: '1px solid #e9d5ff',
                paddingTop: '8px',
                marginTop: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span>
                  Total: <strong>{analysis.scoreBreakdown.totalWeightedScore}</strong>
                  {' '}÷ <strong>{analysis.scoreBreakdown.totalDuration}</strong> beats
                </span>
                <strong style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: avgScore >= 0 ? '#dcfce7' : '#fee2e2',
                  color: avgScore >= 0 ? '#16a34a' : '#dc2626',
                }}>
                  = {avgScore >= 0 ? '+' : ''}{avgScore.toFixed(2)}
                </strong>
              </div>
              <div style={{ marginTop: '6px', fontSize: '10px', color: '#7c3aed' }}>
                Weighted by duration. Higher = better counterpoint quality.
              </div>
            </div>

            {/* Individual dissonance scores */}
            {analysis.scoreBreakdown.dissonanceScores.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Individual Dissonance Scores:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {analysis.scoreBreakdown.dissonanceScores.map((d, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        backgroundColor: d.score >= 0 ? '#dcfce7' : d.score >= -1 ? '#fef9c3' : '#fee2e2',
                        color: d.score >= 0 ? '#16a34a' : d.score >= -1 ? '#ca8a04' : '#dc2626',
                        border: `1px solid ${d.score >= 0 ? '#bbf7d0' : d.score >= -1 ? '#fde047' : '#fca5a5'}`,
                        cursor: 'pointer',
                      }}
                      title={`${d.interval} at ${formatter?.formatBeat(d.onset) || d.onset} - ${d.isStrong ? 'strong' : 'weak'} beat, ${d.isResolved ? 'resolved' : 'unresolved'}`}
                    >
                      {d.score >= 0 ? '+' : ''}{d.score.toFixed(1)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CounterpointComparisonViz;
