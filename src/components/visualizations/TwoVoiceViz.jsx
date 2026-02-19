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
import { CounterpointScoreDisplay } from '../ui/CounterpointScoreDisplay';

/**
 * TwoVoiceViz — unified two-voice counterpoint visualization.
 * Used by both CounterpointComparisonViz (tabs + displacement) and stretto display.
 *
 * SVG rendering order (correct):
 *   1. Grid / backgrounds
 *   2. Interval fills  ← rendered BEFORE notes so notes are always readable on top
 *   3. Chain borders
 *   4. Voice 1 notes
 *   5. Voice 2 notes
 *   6. Hover labels
 */
export function TwoVoiceViz({
  voice1,           // NoteEvent[]
  voice2,           // NoteEvent[] — already transposed/offset by caller
  voice1Label = 'Voice 1',
  voice2Label = 'Voice 2',
  voice1Color = VIZ_COLORS.voiceSubject,
  voice2Color = VIZ_COLORS.voiceCS,
  formatter,
  meter = [4, 4],
  // sequences: { v1: SeqInfo, v2: SeqInfo } — optional, both can be undefined
  sequences = {},
  scoringOptions: externalScoringOptions = {},
  // Optional: pre-computed issues/warnings from analysis.js — skips internal recomputation
  issues: propIssues = null,
  warnings: propWarnings = null,
  // Optional: called with { issues, warnings, avgScore } whenever analysis updates
  onAnalysis,
}) {
  const [selectedInterval, setSelectedInterval] = useState(null);
  const [highlightedOnset, setHighlightedOnset] = useState(null);
  const [previousIssueCount, setPreviousIssueCount] = useState(null);
  const containerRef = useRef(null);

  const analysis = useMemo(() => {
    if (!voice1?.length || !voice2?.length) return null;

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

    const sims = findSims(voice1, voice2);

    const [numerator, denominator] = meter;
    const isCompound = (numerator % 3 === 0 && numerator > 3 && denominator === 8);
    const subdivision = isCompound ? (1 / 3) : 0.5;
    const shortNoteThreshold = subdivision / 3;

    const v1SeqInfo = sequences.v1;
    const v2SeqInfo = sequences.v2;
    const allSequenceNoteRanges = [
      ...(v1SeqInfo?.noteRanges || []),
      ...(v2SeqInfo?.noteRanges || []),
    ];
    const allSequenceBeatRanges = [
      ...(v1SeqInfo?.sequences?.map(s => ({ startBeat: s.startBeat, endBeat: s.endBeat })) || []),
      ...(v2SeqInfo?.sequences?.map(s => ({ startBeat: s.startBeat, endBeat: s.endBeat })) || []),
    ];
    const scoringOptions = {
      meter,
      sequenceNoteRanges: allSequenceNoteRanges,
      sequenceBeatRanges: allSequenceBeatRanges,
      ...externalScoringOptions,
    };

    const intervalHistory = [];
    const intervalPoints = [];
    const beatMap = new Map();

    let consecutivePerfect = 0;
    let consecutiveThirds = 0;
    let consecutiveSixths = 0;
    let lastIntervalType = null;

    let prevPoint = null;
    let prevSim = null;

    for (let i = 0; i < sims.length; i++) {
      const sim = sims[i];
      const snapBeat = Math.round(sim.onset * 4) / 4;

      if (!beatMap.has(snapBeat)) {
        const scoring = scoreDissonance(sim, sims, i, intervalHistory, scoringOptions);

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
            const restingVoice = v1Rested && (!v2Rested || v1RestDur >= v2RestDur) ? 1 : 2;
            const restDur = restingVoice === 1 ? v1RestDur : v2RestDur;
            const otherVoiceRestDur = restingVoice === 1 ? v2RestDur : v1RestDur;
            const prevNoteDur = restingVoice === 1 ? prevSim.voice1Note.duration : prevSim.voice2Note.duration;
            const otherVoicePlayedFullNote = otherVoiceRestDur > 0;
            const meetsLongDuration = restDur > 1.0;
            const meetsLongRatio = restDur > 2 * prevNoteDur;
            const isLongRest = meetsLongDuration && meetsLongRatio;
            const isMediumRest = (meetsLongDuration || meetsLongRatio) && !isLongRest;

            if (isLongRest) {
              restCategory = 'reentry_long';
              showMelodicInterval = false;
              restInfo = `Re-entry after ${restDur.toFixed(1)} beat rest (forgotten)`;
            } else if (isMediumRest) {
              restCategory = 'reentry_medium';
              checkWeakResolution = true;
              ghostNoteDuration = prevNoteDur * 1.5;
              restInfo = `Re-entry after ${restDur.toFixed(2)} beat rest`;
            } else if (otherVoicePlayedFullNote) {
              restCategory = 'reentry_short';
              checkWeakResolution = true;
              ghostNoteDuration = prevNoteDur * 1.5;
              restInfo = `Re-entry (other voice played during rest)`;
            } else {
              restCategory = 'asynchronous';
              motionScoreMultiplier = 0.5;
              restInfo = `Asynchronous (${restDur.toFixed(2)} beat offset)`;
            }
          }
        }

        const v1Motion = (prevPoint && showMelodicInterval) ? sim.voice1Note.pitch - prevPoint.v1Pitch : 0;
        const v2Motion = (prevPoint && showMelodicInterval) ? sim.voice2Note.pitch - prevPoint.v2Pitch : 0;

        const isPerfectInterval = [1, 5].includes(sim.interval.class) ||
          (sim.interval.class === 4 && sim.interval.quality === 'perfect');
        const isThird = sim.interval.class === 3;
        const isSixth = sim.interval.class === 6;
        const isConsonantInterval = scoring.isConsonant;

        let isRepeated = false;
        let repeatInfo = null;
        const isAnyReentry = restCategory.startsWith('reentry');

        if (isAnyReentry) {
          consecutivePerfect = 0;
          consecutiveThirds = 0;
          consecutiveSixths = 0;
          lastIntervalType = null;
        }

        if (isConsonantInterval) {
          if (isPerfectInterval) {
            if (lastIntervalType === 'perfect') consecutivePerfect++;
            else { consecutivePerfect = 1; consecutiveThirds = 0; consecutiveSixths = 0; }
            lastIntervalType = 'perfect';
            if (consecutivePerfect > 2) { isRepeated = true; repeatInfo = `${consecutivePerfect}th consecutive perfect`; }
          } else if (isThird) {
            if (lastIntervalType === 'third') consecutiveThirds++;
            else { consecutiveThirds = 1; consecutivePerfect = 0; consecutiveSixths = 0; }
            lastIntervalType = 'third';
            if (consecutiveThirds > 3) { isRepeated = true; repeatInfo = `${consecutiveThirds}th consecutive 3rd`; }
          } else if (isSixth) {
            if (lastIntervalType === 'sixth') consecutiveSixths++;
            else { consecutiveSixths = 1; consecutivePerfect = 0; consecutiveThirds = 0; }
            lastIntervalType = 'sixth';
            if (consecutiveSixths > 3) { isRepeated = true; repeatInfo = `${consecutiveSixths}th consecutive 6th`; }
          } else {
            consecutivePerfect = 0; consecutiveThirds = 0; consecutiveSixths = 0;
            lastIntervalType = 'other';
          }
        } else {
          consecutivePerfect = 0; consecutiveThirds = 0; consecutiveSixths = 0;
          lastIntervalType = 'dissonant';
        }

        const displayDetails = [...(scoring.details || [])];
        if (isConsonantInterval) {
          if (isPerfectInterval) { displayDetails.push(`Perfect consonance (${sim.interval.toString()})`); displayDetails.push(`Consecutive perfect: ${consecutivePerfect}`); }
          else if (isThird) { displayDetails.push(`Imperfect consonance (3rd)`); displayDetails.push(`Consecutive 3rds: ${consecutiveThirds}`); }
          else if (isSixth) { displayDetails.push(`Imperfect consonance (6th)`); displayDetails.push(`Consecutive 6ths: ${consecutiveSixths}`); }
          if (isRepeated) displayDetails.push(`⚠️ REPEATED: ${repeatInfo}`);
        }

        const v1End = sim.voice1Note.onset + sim.voice1Note.duration;
        const v2End = sim.voice2Note.onset + sim.voice2Note.duration;
        const simDuration = Math.min(v1End, v2End) - sim.onset;
        const minNoteDuration = Math.min(sim.voice1Note.duration, sim.voice2Note.duration);
        const isShortNote = minNoteDuration <= shortNoteThreshold;
        const isOffBeat = sim.metricWeight < 0.75;
        const motionType = restCategory === 'asynchronous' ? 'asynchronous' : isAnyReentry ? 'reentry' : 'normal';

        const point = {
          onset: sim.onset,
          duration: simDuration,
          v1Pitch: sim.voice1Note.pitch,
          v2Pitch: sim.voice2Note.pitch,
          intervalClass: sim.interval.class,
          intervalName: sim.interval.toString(),
          isConsonant: isConsonantInterval,
          isStrong: sim.metricWeight >= 0.75,
          metricWeight: sim.metricWeight,
          category: scoring.category || 'consonant_normal',
          score: scoring.score,
          entryScore: scoring.entryScore,
          exitScore: scoring.exitScore,
          scoreDetails: displayDetails,
          type: scoring.type,
          entry: scoring.entry,
          exit: scoring.exit,
          patterns: scoring.patterns,
          isResolved: scoring.isResolved !== false,
          isParallel: false,
          isRepeated,
          repeatInfo,
          isShortNote,
          isOffBeat,
          restCategory,
          restInfo,
          motionType,
          motionScoreMultiplier,
          showMelodicInterval,
          checkWeakResolution,
          ghostNoteDuration,
          prevInterval: (prevPoint && showMelodicInterval) ? {
            intervalName: prevPoint.intervalName,
            intervalClass: prevPoint.intervalClass,
            v1Pitch: prevPoint.v1Pitch,
            v2Pitch: prevPoint.v2Pitch,
          } : null,
          v1Motion,
          v2Motion,
        };

        if (restInfo) point.scoreDetails.unshift(restInfo);

        if (prevPoint && !isAnyReentry) {
          point.isParallel = isParallelFifthOrOctave(prevPoint, point);
          if (point.isParallel) {
            const parallelInSequence = allSequenceBeatRanges.some(r =>
              point.onset >= r.startBeat && point.onset <= r.endBeat
            );
            point.parallelInSequence = parallelInSequence;
            point.isRepeatedParallel = prevPoint.isParallel === true;
            let msg = `⚠️ PARALLEL ${isPerfectInterval ? '5ths/8ves' : 'motion'}`;
            if (parallelInSequence) msg += ' (in sequence - penalty reduced 75%)';
            else if (isShortNote && !point.isRepeatedParallel) msg += ' (short note - halved penalty)';
            else if (motionType === 'asynchronous') msg += ' (asynchronous - halved penalty)';
            else if (point.isRepeatedParallel) msg += ' (repeated - full penalty)';
            else msg += ' detected';
            point.scoreDetails.push(msg);
          }
        }

        if (checkWeakResolution && prevPoint && !prevPoint.isConsonant && isConsonantInterval) {
          prevPoint.isResolved = true;
          prevPoint.weakResolution = true;
          prevPoint.scoreDetails.push(`Weak resolution via ghost note (${ghostNoteDuration.toFixed(2)} beats)`);
        }

        beatMap.set(snapBeat, point);
        intervalPoints.push(point);
        intervalHistory.push(sim.interval.class);
        prevPoint = point;
        prevSim = sim;
      }
    }

    // Chain analysis: entry / consecutive / resolution
    const chainAnalysis = analyzeAllDissonances(sims, scoringOptions);
    if (chainAnalysis?.all) {
      const chainByOnset = new Map();
      for (const r of chainAnalysis.all) chainByOnset.set(Math.round(r.onset * 4) / 4, r);
      for (const pt of intervalPoints) {
        const chain = chainByOnset.get(Math.round(pt.onset * 4) / 4);
        if (chain) {
          pt.isChainEntry = chain.isChainEntry || false;
          pt.isConsecutiveDissonance = chain.isConsecutiveDissonance || false;
          pt.chainPosition = chain.chainPosition;
          pt.chainLength = chain.chainLength || 0;
          pt.chainStartOnset = chain.chainStartOnset;
          pt.chainEndOnset = chain.chainEndOnset;
          pt.chainUnresolved = chain.chainUnresolved || false;
          pt.isChainResolution = chain.isChainResolution || false;
          pt.consecutiveMitigationCount = chain.consecutiveMitigationCount || 0;
          pt.consecutiveMitigation = chain.consecutiveMitigation || 0;
          pt.passingMotion = chain.passingMotion || null;
        }
      }
    }

    const allPitches = [...voice1.map(n => n.pitch), ...voice2.map(n => n.pitch)];
    const maxTime = Math.max(
      ...voice1.map(n => n.onset + n.duration),
      ...voice2.map(n => n.onset + n.duration),
    );

    const issues = intervalPoints.filter(p =>
      p.isParallel || (!p.isConsonant && p.score < 0 && p.isStrong) || (!p.isConsonant && !p.isResolved)
    );
    const warnings = intervalPoints.filter(p =>
      !p.isConsonant && p.score < 0 && !p.isStrong && p.isResolved && !issues.includes(p)
    );
    const dissonances = intervalPoints.filter(p => !p.isConsonant);
    const consonances = intervalPoints.filter(p => p.isConsonant);

    let totalWeightedScore = 0, totalDuration = 0;
    for (const pt of intervalPoints) {
      const dur = Math.max(0.25, pt.duration || 0.25);
      totalDuration += dur;
      if (pt.isConsonant) {
        const isImperfect = [3, 6].includes(pt.intervalClass);
        const isP4 = pt.intervalClass === 4;
        let base = isImperfect ? 0.5 : pt.intervalClass === 5 ? 0.3 : isP4 ? 0.25 : 0.2;
        if (pt.category === 'consonant_good_resolution') base += 0.3;
        if (pt.category === 'consonant_bad_resolution') base -= 0.2;
        if (pt.isRepeated) base -= 0.15 * (pt.isShortNote ? 0.5 : 1.0);
        totalWeightedScore += base * dur;
      } else {
        totalWeightedScore += (pt.score || 0) * dur;
      }
      if (pt.isParallel) {
        let mult = pt.motionScoreMultiplier || 1.0;
        if (pt.parallelInSequence) mult *= 0.25;
        else if (pt.isShortNote && !pt.isRepeatedParallel) mult *= 0.5;
        totalWeightedScore -= 1.0 * dur * mult;
      }
      if (pt.v1Motion !== undefined && pt.v2Motion !== undefined) {
        if (Math.abs(pt.v1Motion) <= 2 && pt.v1Motion !== 0 && Math.abs(pt.v2Motion) <= 2 && pt.v2Motion !== 0)
          totalWeightedScore += 0.1 * dur;
      }
    }
    const avgScore = totalDuration > 0 ? totalWeightedScore / totalDuration : 0;

    return {
      intervalPoints, beatMap, issues, warnings, dissonances, consonances,
      avgScore, chainAnalysis,
      minPitch: Math.min(...allPitches) - 2,
      maxPitch: Math.max(...allPitches) + 2,
      maxTime,
    };
  }, [voice1, voice2, meter, sequences, externalScoringOptions]);

  useEffect(() => {
    if (analysis) {
      setPreviousIssueCount(prev => prev === null ? analysis.issues.length : prev);
      if (onAnalysis) onAnalysis({ issues: analysis.issues, warnings: analysis.warnings, avgScore: analysis.avgScore });
    }
  }, [analysis]);

  useEffect(() => {
    if (analysis && previousIssueCount !== null && previousIssueCount !== analysis.issues.length) {
      const t = setTimeout(() => setPreviousIssueCount(analysis.issues.length), 3000);
      return () => clearTimeout(t);
    }
  }, [analysis, previousIssueCount]);

  const getOnsetKey = (onset) => Math.round(onset * 4) / 4;

  const handleIntervalClick = useCallback((pt, event) => {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    // If tapping inside a chain (but not on the entry), always show entry for full context
    if (pt.chainStartOnset !== undefined && pt.chainLength > 0 && !pt.isChainEntry) {
      const pts = analysis?.intervalPoints || [];
      const chainEntry = pts.find(p => Math.abs(p.onset - pt.chainStartOnset) < 0.01 && p.isChainEntry);
      if (chainEntry) {
        setSelectedInterval({ ...chainEntry, _tappedOnset: pt.onset });
        setHighlightedOnset(getOnsetKey(pt.onset));
        return;
      }
    }
    setSelectedInterval(pt);
    setHighlightedOnset(getOnsetKey(pt.onset));
  }, [analysis]);

  const handleNoteClick = useCallback((n, event) => {
    if (event) event.preventDefault();
    if (!analysis) return;
    const overlapping = analysis.intervalPoints.find(pt => {
      const noteEnd = n.onset + n.duration;
      return pt.onset >= n.onset && pt.onset < noteEnd;
    });
    if (overlapping) { setSelectedInterval(overlapping); setHighlightedOnset(getOnsetKey(overlapping.onset)); }
  }, [analysis]);

  const handleIssueClick = useCallback((issue, event) => {
    if (event) event.preventDefault();
    setSelectedInterval(issue);
    setHighlightedOnset(getOnsetKey(issue.onset));
    if (containerRef.current) {
      const sc = containerRef.current.querySelector('[data-scroll-container]');
      if (sc) sc.scrollTo({ left: Math.max(0, 60 + issue.onset * 70 - sc.clientWidth / 2), behavior: 'smooth' });
    }
  }, []);

  const isNoteInSequence = useCallback((noteIndex, isV1) => {
    const seqInfo = isV1 ? sequences.v1 : sequences.v2;
    if (!seqInfo?.noteRanges) return false;
    return seqInfo.noteRanges.some(r => noteIndex >= r.start && noteIndex <= r.end);
  }, [sequences]);

  if (!analysis) {
    return <div style={{ padding: '16px', color: '#6b7280', fontStyle: 'italic' }}>Insufficient voice data</div>;
  }

  const { minPitch, maxPitch, maxTime, intervalPoints, issues: computedIssues, warnings: computedWarnings, avgScore } = analysis;
  const issues = propIssues !== null ? propIssues : computedIssues;
  const warnings = propWarnings !== null ? propWarnings : computedWarnings;
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
  const issueCountDelta = previousIssueCount !== null ? issues.length - previousIssueCount : 0;

  const bgColor = hasIssues ? VIZ_COLORS.issueBackground : hasWarnings ? VIZ_COLORS.warningBackground : VIZ_COLORS.cleanBackground;
  const borderColor = hasIssues ? VIZ_COLORS.issueBorder : hasWarnings ? VIZ_COLORS.warningBorder : VIZ_COLORS.cleanBorder;

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
    if (abs >= 12) return `${dir}P8+`;
    return `${dir}${abs}st`;
  };

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Score badge */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
        <div style={{
          padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
          backgroundColor: hasIssues ? '#fef2f2' : hasWarnings ? '#fefce8' : '#f0fdf4',
          border: `1px solid ${hasIssues ? '#fecaca' : hasWarnings ? '#fde047' : '#bbf7d0'}`,
          color: hasIssues ? '#dc2626' : hasWarnings ? '#ca8a04' : '#16a34a',
        }}>
          Issues: {issues.length}
          {issueCountDelta !== 0 && (
            <span style={{ marginLeft: '6px', color: issueCountDelta > 0 ? '#dc2626' : '#16a34a' }}>
              ({issueCountDelta > 0 ? '+' : ''}{issueCountDelta})
            </span>
          )}
        </div>
        <div style={{
          padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
          backgroundColor: avgScore >= 0.5 ? '#dcfce7' : avgScore >= 0 ? '#fef9c3' : '#fee2e2',
          border: `1px solid ${avgScore >= 0.5 ? '#86efac' : avgScore >= 0 ? '#fde047' : '#fca5a5'}`,
          color: avgScore >= 0.5 ? '#16a34a' : avgScore >= 0 ? '#ca8a04' : '#dc2626',
        }}>
          Score: {avgScore >= 0 ? '+' : ''}{avgScore.toFixed(2)}
        </div>
      </div>

      {/* Main visualization */}
      <div style={{ border: `2px solid ${borderColor}`, borderRadius: '8px', overflow: 'hidden', backgroundColor: bgColor }}>
        <div data-scroll-container style={{ overflowX: 'auto' }}>
          <svg width={w} height={h} style={{ display: 'block' }}>
            {/* Header */}
            <rect x={0} y={0} width={w} height={headerHeight} fill="rgba(0,0,0,0.04)" />
            <text x={16} y={22} fontSize="14" fontWeight="600" fill="#374151">
              {voice1Label} vs {voice2Label}
            </text>

            {/* Beat grid */}
            {generateGridLines(maxTime, meter, { showSubdivisions: false }).map((line, i) => {
              const x = tToX(line.time);
              return (
                <g key={`grid-${i}`}>
                  <line x1={x} y1={headerHeight} x2={x} y2={h - 18}
                    stroke={line.isDownbeat ? '#64748b' : line.isMainBeat ? '#9ca3af' : '#e5e7eb'}
                    strokeWidth={line.isDownbeat ? 1.5 : line.isMainBeat ? 0.75 : 0.5} />
                  {line.measureNum
                    ? <text x={x} y={h - 4} fontSize="11" fill="#475569" textAnchor="middle" fontWeight="600">m.{line.measureNum}</text>
                    : line.beatNum
                      ? <text x={x} y={h - 4} fontSize="9" fill="#9ca3af" textAnchor="middle">{line.beatNum}</text>
                      : null}
                </g>
              );
            })}

            {/* Voice labels */}
            {(() => {
              const v1Avg = voice1.reduce((s, n) => s + n.pitch, 0) / voice1.length;
              const v2Avg = voice2.reduce((s, n) => s + n.pitch, 0) / voice2.length;
              const v1Higher = v1Avg > v2Avg;
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

            {/* Dissonance-resolution grouping backgrounds */}
            {intervalPoints.map((pt, i) => {
              if (!pt.isConsonant) {
                const nextPt = intervalPoints[i + 1];
                if (nextPt && nextPt.category === 'consonant_resolution') {
                  const x = tToX(pt.onset);
                  const groupWidth = (nextPt.onset - pt.onset + (intervalPoints[i + 2] ? (intervalPoints[i + 2].onset - nextPt.onset) : 0.5)) * tScale;
                  return (
                    <rect key={`group-${i}`} x={x - 2} y={headerHeight} width={groupWidth + 4}
                      height={h - headerHeight - 18} fill="rgba(139, 92, 246, 0.06)"
                      stroke="rgba(139, 92, 246, 0.10)" strokeWidth={1} strokeDasharray="3,3" rx={4} pointerEvents="none" />
                  );
                }
              }
              return null;
            })}

            {/* ── Interval background fills ── rendered FIRST, behind notes */}
            {intervalPoints.map((pt, i) => {
              const x = tToX(pt.onset);
              const nextPt = intervalPoints[i + 1];
              const regionWidth = nextPt
                ? Math.max(4, (nextPt.onset - pt.onset) * tScale - 2)
                : Math.max(20, tScale * 0.5);
              const isPerfect = [1, 5, 8, 0].includes(pt.intervalClass);
              const style = getIntervalStyle({
                isConsonant: pt.isConsonant, isPerfect, score: pt.score || 0,
                entryScore: pt.entryScore, exitScore: pt.exitScore, category: pt.category,
                isRepeated: pt.isRepeated, isResolved: pt.isResolved, isParallel: pt.isParallel,
                isChainEntry: pt.isChainEntry, isConsecutiveDissonance: pt.isConsecutiveDissonance,
                consecutiveMitigationCount: pt.consecutiveMitigationCount || 0,
                isChainResolution: pt.isChainResolution, chainLength: pt.chainLength || 0,
              });
              let bgOpacity = style.opacity || 0.5;
              if (pt.isParallel || (!pt.isConsonant && !pt.isResolved)) bgOpacity = Math.max(bgOpacity, 0.75);
              return (
                <rect key={`bg-${i}`} x={x} y={headerHeight} width={regionWidth}
                  height={h - headerHeight - 18} fill={style.fill} opacity={bgOpacity}
                  rx={3} pointerEvents="none" />
              );
            })}

            {/* Chain borders — entry through resolution */}
            {(() => {
              const chains = new Map();
              for (const pt of intervalPoints) {
                if (pt.chainStartOnset !== undefined && pt.chainLength > 0) {
                  if (!chains.has(pt.chainStartOnset))
                    chains.set(pt.chainStartOnset, { start: pt.chainStartOnset, end: pt.chainEndOnset, length: pt.chainLength });
                }
              }
              return Array.from(chains.values()).map((chain, i) => {
                const resPt = intervalPoints.find(p => p.isChainResolution && p.chainStartOnset === chain.start);
                const endOnset = resPt ? resPt.onset : chain.end;
                const x1 = tToX(chain.start);
                const endPt = intervalPoints.find(p => Math.abs(p.onset - endOnset) < 0.01);
                const nextAfterEnd = endPt ? intervalPoints[intervalPoints.indexOf(endPt) + 1] : null;
                const x2 = nextAfterEnd ? tToX(nextAfterEnd.onset) : tToX(endOnset) + 30;
                return (
                  <rect key={`chain-${i}`} x={x1 - 1} y={headerHeight + 2} width={x2 - x1 + 2}
                    height={h - headerHeight - 22} fill="none"
                    stroke="rgba(139, 92, 246, 0.65)" strokeWidth={2.5} strokeDasharray="5,2"
                    rx={4} pointerEvents="none" />
                );
              });
            })()}

            {/* ── Voice 1 notes ── */}
            {voice1.map((n, i) => {
              const x = tToX(n.onset);
              const y = pToY(n.pitch);
              const width = Math.max(8, n.duration * tScale - 3);
              const isHighlighted = highlightedOnset !== null &&
                intervalPoints.some(pt => getOnsetKey(pt.onset) === highlightedOnset &&
                  n.onset <= pt.onset && pt.onset < n.onset + n.duration);
              const inSequence = isNoteInSequence(i, true);
              return (
                <g key={`v1-${i}`} style={{ cursor: 'pointer' }} onClick={(e) => handleNoteClick(n, e)}>
                  {isHighlighted && <rect x={x - 4} y={y - noteHeight/2 - 3} width={width + 8} height={noteHeight + 6}
                    fill={VIZ_COLORS.highlight} rx={5} opacity={0.5} />}
                  <rect x={x} y={y - noteHeight/2 + 2} width={width} height={noteHeight - 4} fill={voice1Color} rx={4}
                    stroke={inSequence ? VIZ_COLORS.sequenceBorder : undefined}
                    strokeWidth={inSequence ? 2 : 0} strokeDasharray={inSequence ? '3,2' : undefined} />
                  <text x={x + width/2} y={y + 4} fontSize="10" fill="white" textAnchor="middle" fontWeight="500">
                    {pitchName(n.pitch, n.preferFlats).replace(/\d/, '')}
                  </text>
                </g>
              );
            })}

            {/* ── Voice 2 notes ── */}
            {voice2.map((n, i) => {
              const x = tToX(n.onset);
              const y = pToY(n.pitch);
              const width = Math.max(8, n.duration * tScale - 3);
              const isHighlighted = highlightedOnset !== null &&
                intervalPoints.some(pt => getOnsetKey(pt.onset) === highlightedOnset &&
                  n.onset <= pt.onset && pt.onset < n.onset + n.duration);
              const inSequence = isNoteInSequence(i, false);
              return (
                <g key={`v2-${i}`} style={{ cursor: 'pointer' }} onClick={(e) => handleNoteClick(n, e)}>
                  {isHighlighted && <rect x={x - 4} y={y - noteHeight/2 - 3} width={width + 8} height={noteHeight + 6}
                    fill={VIZ_COLORS.highlight} rx={5} opacity={0.5} />}
                  <rect x={x} y={y - noteHeight/2 + 2} width={width} height={noteHeight - 4} fill={voice2Color} rx={4}
                    stroke={inSequence ? VIZ_COLORS.sequenceBorder : undefined}
                    strokeWidth={inSequence ? 2 : 0} strokeDasharray={inSequence ? '3,2' : undefined} />
                  <text x={x + width/2} y={y + 4} fontSize="10" fill="white" textAnchor="middle" fontWeight="500">
                    {pitchName(n.pitch, n.preferFlats).replace(/\d/, '')}
                  </text>
                </g>
              );
            })}

            {/* ── Interval hit areas + tooltips ── transparent click targets on top of notes */}
            {intervalPoints.map((pt, i) => {
              const x = tToX(pt.onset);
              const isHighlighted = highlightedOnset === getOnsetKey(pt.onset);
              const isSelected = selectedInterval?.onset === pt.onset;
              const nextPt = intervalPoints[i + 1];
              const regionWidth = nextPt
                ? Math.max(4, (nextPt.onset - pt.onset) * tScale - 2)
                : Math.max(20, tScale * 0.5);
              const midY = (pToY(pt.v1Pitch) + pToY(pt.v2Pitch)) / 2;
              const isPerfect = [1, 5, 8, 0].includes(pt.intervalClass);
              const style = getIntervalStyle({
                isConsonant: pt.isConsonant, isPerfect, score: pt.score || 0,
                entryScore: pt.entryScore, exitScore: pt.exitScore, category: pt.category,
                isRepeated: pt.isRepeated, isResolved: pt.isResolved, isParallel: pt.isParallel,
                isChainEntry: pt.isChainEntry, isConsecutiveDissonance: pt.isConsecutiveDissonance,
                consecutiveMitigationCount: pt.consecutiveMitigationCount || 0,
                isChainResolution: pt.isChainResolution, chainLength: pt.chainLength || 0,
              });
              return (
                <g key={`int-${i}`} style={{ cursor: 'pointer' }}
                  onClick={(e) => handleIntervalClick(pt, e)}
                  onMouseEnter={() => setHighlightedOnset(getOnsetKey(pt.onset))}
                  onMouseLeave={() => !isSelected && setHighlightedOnset(null)}>
                  {/* Transparent hit area (full column) with visible border when active */}
                  <rect x={x} y={headerHeight} width={regionWidth} height={h - headerHeight - 18}
                    fill="transparent"
                    stroke={isHighlighted || isSelected ? style.color : 'none'}
                    strokeWidth={isHighlighted || isSelected ? (style.borderWidth || 1.5) : 0}
                    strokeDasharray={style.borderStyle === 'dashed' ? '4,3' : undefined}
                    strokeOpacity={0.8} rx={3} />
                  {/* Tooltip badge rendered on top of notes */}
                  {(isHighlighted || isSelected) && (
                    <g>
                      <rect x={x + regionWidth/2 - 18} y={midY - 14} width={36} height={28}
                        fill={style.bg} stroke={style.color} strokeWidth={1.5} rx={4} opacity={0.97} />
                      <text x={x + regionWidth/2} y={midY + 2} fontSize="12" fontWeight="600"
                        fill={style.color} textAnchor="middle">
                        {pt.intervalName}
                      </text>
                      {!pt.isConsonant && pt.isChainEntry && pt.entryScore !== undefined && (
                        <text x={x + regionWidth/2} y={midY + 14} fontSize="9" fontWeight="600"
                          fill={style.color} textAnchor="middle">
                          Entry: {pt.entryScore >= 0 ? '+' : ''}{pt.entryScore.toFixed(1)}
                        </text>
                      )}
                      {pt.isChainResolution && pt.exitScore !== undefined && (
                        <text x={x + regionWidth/2} y={midY + 14} fontSize="9" fontWeight="600"
                          fill={style.color} textAnchor="middle">
                          Exit: {pt.exitScore >= 0 ? '+' : ''}{pt.exitScore.toFixed(1)}
                        </text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '11px', color: '#64748b',
        padding: '6px 10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
        {[
          { color: VIZ_COLORS.imperfectConsonant, label: 'Imperfect cons.' },
          { color: VIZ_COLORS.perfectConsonant, label: 'Perfect cons.' },
          { color: VIZ_COLORS.dissonantAcceptable, label: 'Dissonance (entry)' },
          { color: VIZ_COLORS.consecutiveNone, label: 'Consecutive dissonance' },
          { color: VIZ_COLORS.resolutionExcellent, label: 'Resolution' },
          { color: VIZ_COLORS.parallelFifthsOctaves, label: 'Parallel 5th/8ve' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: color, borderRadius: '2px', opacity: 0.8 }} />
            <span>{label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', border: '2px dashed rgba(139,92,246,0.65)', borderRadius: '2px' }} />
          <span>Chain bracket</span>
        </div>
      </div>

      {/* Selected interval detail panel */}
      {selectedInterval && (() => {
        const pt = selectedInterval;
        if (pt.score === undefined) return null;
        const isPerfect = [1, 5, 8, 0].includes(pt.intervalClass);
        const style = getIntervalStyle({
          isConsonant: pt.isConsonant, isPerfect, score: pt.score,
          entryScore: pt.entryScore, exitScore: pt.exitScore, category: pt.category,
          isRepeated: pt.isRepeated, isResolved: pt.isResolved, isParallel: pt.isParallel,
          isChainEntry: pt.isChainEntry, isConsecutiveDissonance: pt.isConsecutiveDissonance,
          consecutiveMitigationCount: pt.consecutiveMitigationCount || 0,
          isChainResolution: pt.isChainResolution, chainLength: pt.chainLength || 0,
        });
        return (
          <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ fontWeight: '600', fontSize: '13px', color: '#1f2937' }}>
                {formatter?.formatBeat(pt.onset) || `Beat ${pt.onset + 1}`}
              </span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Interval name — what the interval IS */}
                <span style={{ padding: '3px 8px', backgroundColor: style.bg, color: style.color,
                  borderRadius: '4px', fontSize: '13px', fontWeight: '700' }}>
                  {pt.intervalName}
                </span>
                {/* Context badges — where we are in the pattern */}
                {pt.isParallel && (
                  <span style={{ padding: '3px 8px', backgroundColor: '#fef2f2', color: '#dc2626',
                    borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>Parallel 5th/8ve</span>
                )}
                {pt.isChainEntry && !pt.isParallel && (
                  <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                    backgroundColor: '#ede9fe', color: '#6366f1' }}>Entry</span>
                )}
                {!pt.isConsonant && pt.isConsecutiveDissonance && (
                  <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                    backgroundColor: '#fff7ed', color: '#c2410c' }}>
                    Consecutive{pt.consecutiveMitigationCount > 0 ? ` (${pt.consecutiveMitigationCount} mitigating)` : ''}
                  </span>
                )}
                {pt.isChainResolution && (
                  <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                    backgroundColor: '#d1fae5', color: '#059669' }}>Resolution</span>
                )}
                {!pt.isResolved && !pt.isConsonant && !pt.isConsecutiveDissonance && (
                  <span style={{ padding: '3px 8px', backgroundColor: '#fef3c7', color: '#b45309',
                    borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>Unresolved</span>
                )}
                {/* Chain position indicator when tapped within a chain */}
                {pt._tappedOnset !== undefined && pt._tappedOnset !== pt.onset && (
                  <span style={{ padding: '3px 8px', backgroundColor: '#f0f9ff', color: '#0284c7',
                    borderRadius: '4px', fontSize: '11px', fontWeight: '500' }}>
                    ← tapped at {formatter?.formatBeat(pt._tappedOnset) || `beat ${pt._tappedOnset + 1}`}
                  </span>
                )}
                {/* Score badges */}
                {!pt.isConsonant && pt.isChainEntry && pt.entryScore !== undefined && (
                  <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                    backgroundColor: pt.entryScore >= 0 ? '#ede9fe' : '#fee2e2',
                    color: pt.entryScore >= 0 ? '#6366f1' : '#dc2626' }}>
                    Entry: {pt.entryScore >= 0 ? '+' : ''}{pt.entryScore.toFixed(1)}
                  </span>
                )}
                {pt.isChainResolution && pt.exitScore !== undefined && (
                  <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                    backgroundColor: pt.exitScore >= 0 ? '#d1fae5' : '#fed7aa',
                    color: pt.exitScore >= 0 ? '#059669' : '#ea580c' }}>
                    Exit: {pt.exitScore >= 0 ? '+' : ''}{pt.exitScore.toFixed(1)}
                  </span>
                )}
                <button onClick={() => { setSelectedInterval(null); setHighlightedOnset(null); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#9ca3af', marginLeft: '4px' }}>
                  ×
                </button>
              </div>
            </div>

            <div style={{ padding: '12px 14px' }}>
              {/* Motion diagram */}
              {pt.prevInterval && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px',
                  alignItems: 'center', marginBottom: '12px', padding: '10px',
                  backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Previous</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>{pt.prevInterval.intervalName}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                      {pitchName(pt.prevInterval.v1Pitch)} / {pitchName(pt.prevInterval.v2Pitch)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '0 8px' }}>
                    <div style={{ fontSize: '16px', color: '#6366f1' }}>→</div>
                    <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>{voice1Label}: {formatMotion(pt.v1Motion)}</div>
                    <div style={{ fontSize: '9px', color: '#64748b' }}>{voice2Label}: {formatMotion(pt.v2Motion)}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Current</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: style.color }}>{pt.intervalName}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                      {pitchName(pt.v1Pitch)} / {pitchName(pt.v2Pitch)}
                    </div>
                  </div>
                </div>
              )}
              {!pt.prevInterval && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ padding: '8px 10px', backgroundColor: `${voice1Color}18`, borderRadius: '4px', borderLeft: `3px solid ${voice1Color}` }}>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{voice1Label}</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: voice1Color }}>{pitchName(pt.v1Pitch)}</div>
                  </div>
                  <div style={{ padding: '8px 10px', backgroundColor: `${voice2Color}18`, borderRadius: '4px', borderLeft: `3px solid ${voice2Color}` }}>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{voice2Label}</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: voice2Color }}>{pitchName(pt.v2Pitch)}</div>
                  </div>
                </div>
              )}

              {/* Score breakdown */}
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '14px', fontSize: '12px' }}>
                <div style={{ fontWeight: '700', marginBottom: '12px', color: '#1e293b', fontSize: '14px',
                  borderBottom: '2px solid #cbd5e1', paddingBottom: '6px' }}>Score Breakdown</div>

                {!pt.isConsonant && pt.entry && pt.exit && (
                  <>
                    <div style={{ marginBottom: '12px', backgroundColor: '#ede9fe',
                      borderLeft: '3px solid #6366f1', borderRadius: '4px', padding: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '700', color: '#6366f1', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Entry Motion
                        </span>
                        <span style={{ fontWeight: '700',
                          color: pt.entry.score >= 0 ? '#6366f1' : '#dc2626',
                          backgroundColor: pt.entry.score >= 0 ? '#ede9fe' : '#fee2e2',
                          padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>
                          Base: {pt.entry.score >= 0 ? '+' : ''}{pt.entry.score.toFixed(2)}
                        </span>
                      </div>
                      {(pt.entry.details || []).map((d, i) => (
                        <div key={i} style={{ fontSize: '11px', color: '#475569', marginBottom: '2px',
                          paddingLeft: '8px', display: 'flex', alignItems: 'flex-start' }}>
                          <span style={{ color: '#6366f1', marginRight: '6px', fontWeight: '600' }}>•</span>
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>

                    {pt.patterns?.length > 0 && (
                      <div style={{ marginBottom: '12px', backgroundColor: '#f3e8ff',
                        borderLeft: '3px solid #a855f7', borderRadius: '4px', padding: '10px' }}>
                        <div style={{ fontWeight: '700', color: '#a855f7', fontSize: '12px',
                          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                          Recognized Patterns
                        </div>
                        {pt.patterns.map((p, i) => (
                          <div key={i} style={{ marginBottom: '6px', backgroundColor: 'white', borderRadius: '4px', padding: '8px' }}>
                            <div style={{ fontWeight: '600', color: '#7c3aed', fontSize: '11px', marginBottom: '4px' }}>
                              {p.type.replace(/_/g, ' ').toUpperCase()}
                            </div>
                            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontStyle: 'italic' }}>
                              {p.description}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', fontSize: '10px', flexWrap: 'wrap' }}>
                              <span style={{ backgroundColor: '#ddd6fe', color: '#6366f1', padding: '2px 6px', borderRadius: '3px', fontWeight: '600' }}>
                                Entry: +{(p.entryBonus || 0).toFixed(2)}
                              </span>
                              <span style={{ backgroundColor: '#d1fae5', color: '#059669', padding: '2px 6px', borderRadius: '3px', fontWeight: '600' }}>
                                Exit: +{(p.exitBonus || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ marginBottom: '12px', backgroundColor: '#d1fae5',
                      borderLeft: '3px solid #059669', borderRadius: '4px', padding: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '700', color: '#059669', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Exit / Resolution
                        </span>
                        <span style={{ fontWeight: '700',
                          color: pt.exit.score >= 0 ? '#059669' : '#ea580c',
                          backgroundColor: pt.exit.score >= 0 ? '#d1fae5' : '#fed7aa',
                          padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>
                          Base: {pt.exit.score >= 0 ? '+' : ''}{pt.exit.score.toFixed(2)}
                        </span>
                      </div>
                      {(pt.exit.details || []).map((d, i) => (
                        <div key={i} style={{ fontSize: '11px', color: '#475569', marginBottom: '2px',
                          paddingLeft: '8px', display: 'flex', alignItems: 'flex-start' }}>
                          <span style={{ color: '#059669', marginRight: '6px', fontWeight: '600' }}>•</span>
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ backgroundColor: '#ffffff', border: '2px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '600', color: '#64748b', fontSize: '11px' }}>Entry Score</span>
                        <span style={{ fontWeight: '700', color: pt.entryScore >= 0 ? '#6366f1' : '#dc2626', fontSize: '12px' }}>
                          {pt.entryScore >= 0 ? '+' : ''}{pt.entryScore?.toFixed(2)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '600', color: '#64748b', fontSize: '11px' }}>Exit Score</span>
                        <span style={{ fontWeight: '700', color: pt.exitScore >= 0 ? '#059669' : '#ea580c', fontSize: '12px' }}>
                          {pt.exitScore >= 0 ? '+' : ''}{pt.exitScore?.toFixed(2)}
                        </span>
                      </div>
                      <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '6px', marginTop: '6px',
                        display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '13px' }}>TOTAL</span>
                        <span style={{ fontWeight: '800', color: pt.score >= 0 ? '#16a34a' : '#dc2626', fontSize: '16px' }}>
                          {pt.score >= 0 ? '+' : ''}{pt.score.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {pt.isConsonant && pt.category === 'consonant_resolution' && (
                  <>
                    <div style={{ backgroundColor: '#d1fae5', borderLeft: '3px solid #059669',
                      borderRadius: '4px', padding: '10px', marginBottom: '12px' }}>
                      <div style={{ fontWeight: '700', color: '#059669', fontSize: '12px',
                        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Resolution Quality</div>
                      {(pt.scoreDetails || []).map((d, i) => (
                        <div key={i} style={{ fontSize: '11px', color: '#475569', marginBottom: '4px', paddingLeft: '8px' }}>
                          {typeof d === 'object'
                            ? <><span style={{ fontWeight: '600' }}>• {d.text}</span>{d.subtext && <div style={{ paddingLeft: '16px', fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>{d.subtext}</div>}</>
                            : <span>• {d}</span>}
                        </div>
                      ))}
                    </div>
                    <div style={{ backgroundColor: '#fff', border: '2px solid #e2e8f0', borderRadius: '6px', padding: '10px',
                      display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '700', color: '#059669', fontSize: '12px', textTransform: 'uppercase' }}>Exit Score</span>
                      <span style={{ fontWeight: '800', color: pt.exitScore >= 0 ? '#059669' : '#ea580c', fontSize: '16px' }}>
                        {pt.exitScore >= 0 ? '+' : ''}{pt.exitScore?.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}

                {pt.isConsonant && pt.category !== 'consonant_resolution' && (
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {(pt.scoreDetails || []).map((d, i) => (
                      <div key={i} style={{ marginBottom: '4px', paddingLeft: '8px', display: 'flex', alignItems: 'flex-start' }}>
                        {typeof d === 'object'
                          ? <><span style={{ color: '#0891b2', marginRight: '6px', fontWeight: '600' }}>•</span><div><div style={{ fontWeight: '600', color: '#475569' }}>{d.text}</div>{d.subtext && <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>{d.subtext}</div>}</div></>
                          : <><span style={{ color: '#0891b2', marginRight: '6px', fontWeight: '600' }}>•</span><span>{d}</span></>}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #cbd5e1',
                  fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>
                  Metric weight: {(pt.metricWeight * 100).toFixed(0)}% ({pt.isStrong ? 'strong beat' : 'weak beat'})
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Issues list */}
      {issues.length > 0 && (
        <div style={{ backgroundColor: '#fff', border: `1px solid ${VIZ_COLORS.issueBorder}`,
          borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', backgroundColor: VIZ_COLORS.issueBackground,
            borderBottom: `1px solid ${VIZ_COLORS.issueBorder}`, fontWeight: '600', fontSize: '13px',
            color: VIZ_COLORS.issueText }}>
            Issues ({issues.length})
          </div>
          {issues.map((issue, i) => (
            <div key={i} onClick={(e) => handleIssueClick(issue, e)} style={{
              padding: '10px 14px', fontSize: '13px', cursor: 'pointer',
              borderBottom: i < issues.length - 1 ? `1px solid ${VIZ_COLORS.issueBackground}` : 'none',
              backgroundColor: selectedInterval?.onset === issue.onset ? '#fef2f2' : 'transparent',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{ color: VIZ_COLORS.dissonantProblematic, fontWeight: '600' }}>
                {formatter?.formatBeat(issue.onset) || `Beat ${issue.onset + 1}`}:
              </span>
              <span>{issue.description || issue.intervalName}</span>
              {(issue.isParallel || issue.type === 'parallel') && (
                <span style={{ padding: '2px 6px', backgroundColor: '#fef2f2', color: '#dc2626',
                  borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>Parallel</span>
              )}
              {(issue.isResolved === false) && (
                <span style={{ padding: '2px 6px', backgroundColor: '#fef3c7', color: '#b45309',
                  borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>Unresolved</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dissonance Score Breakdown — restored CounterpointScoreDisplay */}
      {analysis.chainAnalysis && (
        <CounterpointScoreDisplay
          detailedScoring={{
            summary: analysis.chainAnalysis.summary,
            dissonances: analysis.chainAnalysis.dissonances,
          }}
          formatter={formatter}
          onIssueClick={(issue) => handleIssueClick(issue)}
          title="Dissonance Score Breakdown"
        />
      )}
    </div>
  );
}

export default TwoVoiceViz;
