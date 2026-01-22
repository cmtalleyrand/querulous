import { useState } from 'react';
import {
  PianoRoll,
  IntervalTimeline,
  StrettoViz,
  IntervalAnalysisViz,
  InvertibilityViz,
  Section,
  ObservationList,
  DataRow,
  Select,
  ABCBox,
  ScoreDashboard,
  IssuesSummary,
} from './components';
import {
  NOTE_TO_MIDI,
  KEY_SIGNATURES,
  AVAILABLE_KEYS,
  AVAILABLE_MODES,
  NOTE_LENGTH_OPTIONS,
  STRETTO_STEP_OPTIONS,
  OCTAVE_OPTIONS,
  CS_POSITION_OPTIONS,
  TIME_SIGNATURE_OPTIONS,
  BeatFormatter,
  extractABCHeaders,
  parseABC,
  generateAnswerABC,
  formatSubjectABC,
  findSimultaneities,
  testHarmonicImplication,
  testRhythmicVariety,
  testRhythmicComplementarity,
  testStrettoViability,
  testTonalAnswer,
  testDoubleCounterpoint,
  testContourIndependence,
  testModulatoryRobustness,
  calculateOverallScore,
  setP4Treatment,
} from './utils';
import { NoteEvent, ScaleDegree } from './types';

/**
 * Default example subject and countersubject
 */
const DEFAULT_SUBJECT = `D2 A2 F E | D C _B, A, | G, A, _B, C | D4`;
const DEFAULT_CS = `F2 E D | C D E F | G F E D | C4`;

/**
 * Main Fugue Analyzer Application
 */
export default function App() {
  // Input state
  const [subjectInput, setSubjectInput] = useState(DEFAULT_SUBJECT);
  const [csInput, setCsInput] = useState(DEFAULT_CS);
  const [answerInput, setAnswerInput] = useState('');

  // Settings state
  const [selKey, setSelKey] = useState('D');
  const [selMode, setSelMode] = useState('natural_minor');
  const [spellingKey, setSpellingKey] = useState('C');
  const [spellingMode, setSpellingMode] = useState('major');
  const [useSpellingKey, setUseSpellingKey] = useState(false);
  const [selNoteLen, setSelNoteLen] = useState('1/8');
  const [selTimeSig, setSelTimeSig] = useState('4/4');
  const [strettoStep, setStrettoStep] = useState('1');
  const [strettoOctave, setStrettoOctave] = useState('12');
  const [selectedStretto, setSelectedStretto] = useState(null);
  const [treatP4Dissonant, setTreatP4Dissonant] = useState(false);
  const [csPos, setCsPos] = useState('above');
  const [csShift, setCsShift] = useState('0');

  // Results state
  const [results, setResults] = useState(null);
  const [scoreResult, setScoreResult] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Run the analysis
   */
  const analyze = () => {
    try {
      setError(null);
      setSelectedStretto(null);

      // Extract headers from ABC notation
      const h = extractABCHeaders(subjectInput);

      // Analysis key - what key we're analyzing scale degrees in
      const analysisKey = h.key || selKey;
      const analysisMode = h.mode || selMode;

      // Spelling key - what key signature to use for parsing ABC accidentals
      // If useSpellingKey is true and no K: header, use separate spelling key
      // Otherwise, use the analysis key for spelling too
      const effSpellingKey = (useSpellingKey && !h.key) ? spellingKey : analysisKey;
      const effSpellingMode = (useSpellingKey && !h.mode) ? spellingMode : analysisMode;

      const effNL =
        h.noteLength || parseFloat(selNoteLen.split('/')[0]) / parseFloat(selNoteLen.split('/')[1]);

      // Calculate tonic MIDI number for analysis (scale degrees)
      const analysisKeyBase = analysisKey.replace('#', '').replace('b', '');
      let tonic = NOTE_TO_MIDI[analysisKeyBase] || 60;
      if (analysisKey.includes('#')) tonic += 1;
      if (analysisKey.includes('b')) tonic -= 1;

      // Get key signature for spelling (parsing ABC)
      const spellingKeyBase = effSpellingKey.replace('#', '').replace('b', '');
      let spellingKeyForSig = effSpellingKey;
      if (['natural_minor', 'harmonic_minor'].includes(effSpellingMode)) spellingKeyForSig = spellingKeyBase + 'm';
      const spellingKeySig = KEY_SIGNATURES[spellingKeyForSig] || KEY_SIGNATURES[spellingKeyBase] || [];

      // Get key signature for answer generation (based on analysis key)
      let analysisKeyForSig = analysisKey;
      if (['natural_minor', 'harmonic_minor'].includes(analysisMode)) analysisKeyForSig = analysisKeyBase + 'm';
      const analysisKeySig = KEY_SIGNATURES[analysisKeyForSig] || KEY_SIGNATURES[analysisKeyBase] || [];

      const keyInfo = { key: analysisKey, tonic, mode: analysisMode, keySignature: analysisKeySig };

      // Get time signature - use parsed from ABC or selected
      const timeSigOption = TIME_SIGNATURE_OPTIONS.find(t => t.value === selTimeSig);
      const meter = h.meter || timeSigOption?.meter || [4, 4];

      // Parse subject with spelling key for accidentals, analysis key for scale degrees
      const subjectParsed = parseABC(subjectInput, tonic, analysisMode, effNL, spellingKeySig);
      const subject = subjectParsed.notes;

      if (!subject.length) {
        setError('No notes parsed from subject');
        return;
      }

      const formatter = new BeatFormatter(effNL, meter);

      // Parse countersubject if provided (use spelling key for accidentals)
      const cs = csInput.trim() ? parseABC(csInput, tonic, analysisMode, effNL, spellingKeySig).notes : null;

      // Parse or generate answer (use spelling key for accidentals)
      let answerNotes = answerInput.trim() ? parseABC(answerInput, tonic, analysisMode, effNL, spellingKeySig).notes : null;

      // Build results object
      const res = {
        keyInfo,
        formatter,
        subject,
        countersubject: cs,
        defaultNoteLength: effNL,
        meter,
        parsedInfo: {
          key: analysisKey,
          mode: analysisMode,
          spellingKey: useSpellingKey ? effSpellingKey : null,
          spellingMode: useSpellingKey ? effSpellingMode : null,
          defaultNoteLength: effNL,
          subjectNotes: subject.length,
          csNotes: cs?.length || 0,
        },
      };

      // Run subject analyses
      res.harmonicImplication = testHarmonicImplication(subject, tonic, analysisMode, formatter);
      res.rhythmicVariety = testRhythmicVariety(subject, formatter);
      res.stretto = testStrettoViability(subject, formatter, 0.5, parseFloat(strettoStep), parseInt(strettoOctave));
      res.tonalAnswer = testTonalAnswer(subject, analysisMode, keyInfo, formatter);
      res.answerABC = generateAnswerABC(subject, keyInfo, res.tonalAnswer, effNL, meter);
      res.subjectABC = formatSubjectABC(subject, keyInfo, effNL, meter);

      // Generate answer if not provided
      if (!answerNotes) {
        answerNotes = subject.map(
          (n) =>
            new NoteEvent(
              n.pitch + 7,
              n.duration,
              n.onset,
              new ScaleDegree(((n.scaleDegree.degree + 4 - 1) % 7) + 1, n.scaleDegree.alteration),
              n.abcNote
            )
        );
      }
      res.answerNotes = answerNotes;

      // Run countersubject analyses if CS provided
      if (cs?.length) {
        res.doubleCounterpoint = testDoubleCounterpoint(subject, cs, formatter);
        res.rhythmicComplementarity = testRhythmicComplementarity(subject, cs);
        res.contourIndependence = testContourIndependence(subject, cs, formatter);
        res.modulatoryRobustness = testModulatoryRobustness(subject, cs, formatter);
        res.subjectCsSims = findSimultaneities(subject, cs);
        res.answerCsSims = findSimultaneities(answerNotes, cs);
      }

      // Calculate scores
      const scores = calculateOverallScore(res, !!cs?.length);

      setResults(res);
      setScoreResult(scores);
    } catch (e) {
      setError(`Error: ${e.message}`);
    }
  };

  const csOctaveShift = (csPos === 'below' ? -12 : 0) + parseInt(csShift);
  const strettoOctaveVal = parseInt(strettoOctave);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f3ee', fontFamily: 'Georgia, serif' }}>
      {/* Header */}
      <header
        style={{
          background: 'linear-gradient(135deg, #2c3e50, #34495e)',
          color: '#f8f6f1',
          padding: '18px 24px',
          borderBottom: '3px solid #c9a227',
        }}
      >
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          <h1 style={{ margin: 0, fontSize: '21px', fontWeight: '600' }}>Fugue Subject Analyzer</h1>
          <p style={{ margin: '3px 0 0', opacity: 0.8, fontSize: '12px' }}>
            Assess contrapuntal viability with detailed scoring
          </p>
        </div>
      </header>

      <main style={{ maxWidth: '880px', margin: '0 auto', padding: '18px 24px' }}>
        {/* Settings Panel */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '6px',
            border: '1px solid #e0e0e0',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
            <Select
              label="Analysis Key"
              value={selKey}
              onChange={setSelKey}
              options={AVAILABLE_KEYS}
            />
            <Select
              label="Mode"
              value={selMode}
              onChange={setSelMode}
              options={AVAILABLE_MODES}
            />
            <Select
              label="Time Sig (M:)"
              value={selTimeSig}
              onChange={setSelTimeSig}
              options={TIME_SIGNATURE_OPTIONS}
            />
            <Select
              label="Note Length (L:)"
              value={selNoteLen}
              onChange={setSelNoteLen}
              options={NOTE_LENGTH_OPTIONS}
            />
            <Select
              label="Stretto Step"
              value={strettoStep}
              onChange={setStrettoStep}
              options={STRETTO_STEP_OPTIONS}
            />
          </div>

          {/* Spelling Key Option */}
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useSpellingKey}
                onChange={(e) => setUseSpellingKey(e.target.checked)}
              />
              <span style={{ fontSize: '12px', color: '#546e7a' }}>
                Use separate spelling key (parse accidentals from a different key signature)
              </span>
            </label>
            {useSpellingKey && (
              <div style={{ display: 'flex', gap: '14px', marginTop: '10px', paddingLeft: '24px' }}>
                <Select
                  label="Spelling Key"
                  value={spellingKey}
                  onChange={setSpellingKey}
                  options={AVAILABLE_KEYS}
                />
                <Select
                  label="Spelling Mode"
                  value={spellingMode}
                  onChange={setSpellingMode}
                  options={AVAILABLE_MODES}
                />
                <p style={{ fontSize: '11px', color: '#78909c', marginTop: '18px', flex: 1 }}>
                  ABC accidentals use {spellingKey} {spellingMode.replace('_', ' ')}, but scale degrees analyzed in {selKey} {selMode.replace('_', ' ')}
                </p>
              </div>
            )}
          </div>

          <p style={{ fontSize: '10px', color: '#888', margin: '10px 0 0' }}>
            K:, M:, and L: in ABC notation override these settings
          </p>
        </div>

        {/* Input Panel */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '14px',
            marginBottom: '14px',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: '600',
                color: '#2c3e50',
                fontSize: '12px',
              }}
            >
              Subject
            </label>
            <textarea
              value={subjectInput}
              onChange={(e) => setSubjectInput(e.target.value)}
              style={{
                width: '100%',
                height: '90px',
                padding: '9px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
              aria-label="Subject in ABC notation"
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: '600',
                color: '#2c3e50',
                fontSize: '12px',
              }}
            >
              Countersubject
            </label>
            <textarea
              value={csInput}
              onChange={(e) => setCsInput(e.target.value)}
              style={{
                width: '100%',
                height: '90px',
                padding: '9px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
              placeholder="Optional"
              aria-label="Countersubject in ABC notation (optional)"
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: '600',
                color: '#2c3e50',
                fontSize: '12px',
              }}
            >
              Answer (auto if empty)
            </label>
            <textarea
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              style={{
                width: '100%',
                height: '90px',
                padding: '9px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
              placeholder="Leave empty for auto-generation"
              aria-label="Answer in ABC notation (optional, auto-generated if empty)"
            />
          </div>
        </div>

        {/* Analyze Button */}
        <button
          onClick={analyze}
          style={{
            width: '100%',
            padding: '11px',
            backgroundColor: '#c9a227',
            color: '#2c3e50',
            border: 'none',
            borderRadius: '5px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Analyze
        </button>

        {/* Error Display */}
        {error && (
          <div
            role="alert"
            style={{
              marginTop: '12px',
              padding: '10px',
              backgroundColor: '#ffebee',
              borderLeft: '3px solid #e53935',
              color: '#c62828',
              borderRadius: '0 4px 4px 0',
            }}
          >
            {error}
          </div>
        )}

        {/* Results */}
        {results && (
          <div style={{ marginTop: '18px' }}>
            {/* Parsed Info Summary */}
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#fff',
                borderRadius: '6px',
                marginBottom: '16px',
                border: '1px solid #e0e0e0',
                fontSize: '13px',
                color: '#546e7a',
              }}
            >
              Analysis: <strong style={{ color: '#2c3e50' }}>{results.parsedInfo.key} {results.parsedInfo.mode.replace('_', ' ')}</strong>
              {results.parsedInfo.spellingKey && (
                <> · Spelling: <strong style={{ color: '#78909c' }}>{results.parsedInfo.spellingKey} {results.parsedInfo.spellingMode.replace('_', ' ')}</strong></>
              )}
              {' · '}Subject: <strong style={{ color: '#2c3e50' }}>{results.parsedInfo.subjectNotes} notes</strong>
              {' · '}L: <strong style={{ color: '#2c3e50' }}>1/{Math.round(1 / results.parsedInfo.defaultNoteLength)}</strong>
              {results.parsedInfo.csNotes > 0 && (
                <> · CS: <strong style={{ color: '#2c3e50' }}>{results.parsedInfo.csNotes} notes</strong></>
              )}
            </div>

            {/* Score Dashboard */}
            <ScoreDashboard scoreResult={scoreResult} hasCountersubject={!!results.countersubject} />

            {/* Issues Summary - Show problems first */}
            <IssuesSummary results={results} scoreResult={scoreResult} />

            {/* Subject Visualization */}
            <Section title="Subject" helpKey="subject" defaultCollapsed={true}>
              <PianoRoll voices={[{ notes: results.subject, color: '#5c6bc0', label: 'Subject' }]} />
            </Section>

            {/* Countersubject Sections */}
            {results.countersubject && (
              <>
                <Section title="Answer + Countersubject" helpKey="countersubject">
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#546e7a', marginBottom: '4px' }}>
                        CS Position
                      </label>
                      <select
                        value={csPos}
                        onChange={(e) => setCsPos(e.target.value)}
                        style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                      >
                        {CS_POSITION_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#546e7a', marginBottom: '4px' }}>
                        Octave Shift
                      </label>
                      <select
                        value={csShift}
                        onChange={(e) => setCsShift(e.target.value)}
                        style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                      >
                        {OCTAVE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <IntervalAnalysisViz
                    voice1={{ notes: results.answerNotes, color: '#f59e0b', label: 'Answer' }}
                    voice2={{ notes: results.countersubject.map((n) => ({ ...n, pitch: n.pitch + csOctaveShift })), color: '#22c55e', label: 'CS' }}
                    title="Answer + Countersubject"
                    formatter={results.formatter}
                  />
                </Section>

                <Section title="Subject + Countersubject">
                  <IntervalAnalysisViz
                    voice1={{ notes: results.subject, color: '#6366f1', label: 'Subject' }}
                    voice2={{ notes: results.countersubject.map((n) => ({ ...n, pitch: n.pitch + csOctaveShift })), color: '#22c55e', label: 'CS' }}
                    title="Subject + Countersubject"
                    formatter={results.formatter}
                  />
                </Section>
              </>
            )}

            {/* Harmonic Implication */}
            <Section title="Harmonic Implication" helpKey="harmonicImplication" defaultCollapsed={true}>
              <DataRow
                data={{
                  Opening: `${results.harmonicImplication.opening.degree} ${results.harmonicImplication.opening.isTonicChordTone ? '(tonic)' : ''}`,
                  Terminal: results.harmonicImplication.terminal.degree,
                  'Dominant arrival': results.harmonicImplication.dominantArrival
                    ? `${results.harmonicImplication.dominantArrival.degree} at ${results.harmonicImplication.dominantArrival.location}`
                    : 'None',
                }}
              />
              <ObservationList observations={results.harmonicImplication.observations} />
            </Section>

            {/* Tonal Answer */}
            <Section title="Tonal Answer" helpKey="tonalAnswer">
              <DataRow
                data={{
                  Type: results.tonalAnswer.answerType,
                  Mutation: results.tonalAnswer.mutationPoint !== null ? `Note ${results.tonalAnswer.mutationPoint + 1}` : 'N/A',
                  Junction: `${results.tonalAnswer.junction.p} (${results.tonalAnswer.junction.q})`,
                }}
              />
              <ObservationList observations={results.tonalAnswer.observations} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <ABCBox abc={results.subjectABC} label="Subject:" />
                <ABCBox abc={results.answerABC} label="Generated Answer:" />
              </div>
            </Section>

            {/* Stretto Possibilities */}
            <Section title="Stretto Possibilities" helpKey="strettoViability">
              {/* Summary first - what we found */}
              {(() => {
                const cleanCount = results.stretto.cleanStrettos?.length || 0;
                const viableCount = results.stretto.viableStrettos?.length || 0;
                const withWarnings = viableCount - cleanCount;

                return (
                  <div style={{
                    padding: '14px 16px',
                    marginBottom: '16px',
                    borderRadius: '8px',
                    backgroundColor: viableCount > 0 ? '#ecfdf5' : '#f8fafc',
                    border: viableCount > 0 ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: viableCount > 0 ? '#065f46' : '#475569', marginBottom: '6px' }}>
                      {viableCount > 0
                        ? `${viableCount} viable stretto distance${viableCount !== 1 ? 's' : ''} found`
                        : 'No clean stretto distances at this configuration'}
                    </div>
                    <div style={{ fontSize: '12px', color: viableCount > 0 ? '#047857' : '#64748b' }}>
                      {cleanCount > 0 && <span style={{ marginRight: '12px' }}>{cleanCount} clean</span>}
                      {withWarnings > 0 && <span>{withWarnings} with minor issues</span>}
                      {viableCount === 0 && <span>Stretto may still be possible with modification or at different intervals</span>}
                    </div>
                  </div>
                );
              })()}

              {/* Settings row */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#546e7a', marginBottom: '4px' }}>
                    Octave Displacement
                  </label>
                  <select
                    value={strettoOctave}
                    onChange={(e) => {
                      setStrettoOctave(e.target.value);
                      setSelectedStretto(null);
                    }}
                    style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}
                  >
                    {OCTAVE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#37474f', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={treatP4Dissonant}
                      onChange={(e) => {
                        setTreatP4Dissonant(e.target.checked);
                        setP4Treatment(e.target.checked);
                        setSelectedStretto(null);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    Treat P4 as dissonant
                  </label>
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8', paddingBottom: '8px' }}>
                  Testing at {strettoStep}-beat intervals
                </span>
              </div>

              {/* All distances with gradation by severity */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                  All distances tested:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {results.stretto.allResults.map((s, i) => {
                    const isSelected = selectedStretto === s.distance;
                    const issueCount = s.issueCount || 0;
                    const warningCount = s.warningCount || 0;

                    // Gradation: clean → warnings only → 1-2 issues → 3-4 issues → 5+ issues
                    let bgColor, borderColor, textColor, badge;
                    if (isSelected) {
                      bgColor = '#1f2937';
                      borderColor = '#1f2937';
                      textColor = 'white';
                    } else if (s.clean) {
                      // Clean - bright green
                      bgColor = '#dcfce7';
                      borderColor = '#86efac';
                      textColor = '#166534';
                      badge = '✓';
                    } else if (s.viable) {
                      // Viable with warnings - yellow-green
                      bgColor = '#fef9c3';
                      borderColor = '#fde047';
                      textColor = '#854d0e';
                      badge = `⚠${warningCount}`;
                    } else if (issueCount <= 2) {
                      // Close to viable - light orange
                      bgColor = '#ffedd5';
                      borderColor = '#fdba74';
                      textColor = '#c2410c';
                      badge = issueCount.toString();
                    } else if (issueCount <= 4) {
                      // Moderate issues - orange
                      bgColor = '#fee2e2';
                      borderColor = '#fca5a5';
                      textColor = '#b91c1c';
                      badge = issueCount.toString();
                    } else {
                      // Many issues - red
                      bgColor = '#fecaca';
                      borderColor = '#f87171';
                      textColor = '#991b1b';
                      badge = issueCount.toString();
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedStretto(s.distance)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          border: `1.5px solid ${borderColor}`,
                          backgroundColor: bgColor,
                          color: textColor,
                          transition: 'all 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>{s.distanceFormatted}</span>
                        {badge && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '600',
                            opacity: isSelected ? 1 : 0.8,
                          }}>
                            {badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div style={{ marginTop: '8px', fontSize: '10px', color: '#6b7280', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span><span style={{ color: '#166534' }}>✓</span> = clean</span>
                  <span><span style={{ color: '#854d0e' }}>⚠</span> = warnings</span>
                  <span><span style={{ color: '#c2410c' }}>1-2</span> = close</span>
                  <span><span style={{ color: '#b91c1c' }}>3-4</span> = moderate</span>
                  <span><span style={{ color: '#991b1b' }}>5+</span> = many issues</span>
                </div>
              </div>

              {/* Selected stretto detail */}
              {selectedStretto !== null && (() => {
                const s = results.stretto.allResults.find((r) => r.distance === selectedStretto);
                if (!s) return null;
                return (
                  <div
                    style={{
                      padding: '14px',
                      backgroundColor: s.viable ? '#f0fdf4' : '#f8fafc',
                      borderRadius: '8px',
                      border: s.viable ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        marginBottom: '10px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: s.viable ? (s.clean ? '#065f46' : '#854d0e') : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span>{s.distanceFormatted}</span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '400',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: s.viable ? (s.clean ? '#dcfce7' : '#fef9c3') : '#f1f5f9',
                        color: s.viable ? (s.clean ? '#059669' : '#a16207') : '#64748b',
                      }}>
                        {s.overlapPercent}% overlap
                      </span>
                      {s.viable && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '500',
                          color: s.clean ? '#059669' : '#d97706',
                        }}>
                          {s.clean ? 'Clean' : `${s.warningCount} consideration${s.warningCount !== 1 ? 's' : ''}`}
                        </span>
                      )}
                    </div>
                    <StrettoViz
                      subject={results.subject}
                      distance={s.distance}
                      issues={s.issues}
                      warnings={s.warnings || []}
                      intervalPoints={s.intervalPoints || []}
                      formatter={results.formatter}
                      octaveDisp={strettoOctaveVal}
                    />
                    {(s.issues.length > 0 || (s.warnings && s.warnings.length > 0)) && (
                      <div style={{ marginTop: '10px' }}>
                        {s.warnings && s.warnings.map((w, j) => (
                          <div
                            key={`warn-${j}`}
                            style={{
                              fontSize: '12px',
                              color: '#a16207',
                              marginTop: '4px',
                              paddingLeft: '10px',
                              borderLeft: '2px solid #fcd34d',
                            }}
                          >
                            {w.description}
                          </div>
                        ))}
                        {s.issues.map((is, j) => (
                          <div
                            key={`issue-${j}`}
                            style={{
                              fontSize: '12px',
                              color: '#64748b',
                              marginTop: '4px',
                              paddingLeft: '10px',
                              borderLeft: '2px solid #cbd5e1',
                            }}
                          >
                            {is.description}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </Section>

            {/* Rhythmic Profile */}
            <Section title="Rhythmic Profile" helpKey="rhythmicVariety" defaultCollapsed={true}>
              <DataRow
                data={{
                  'Note values': results.rhythmicVariety.uniqueDurations,
                  Used: results.rhythmicVariety.durationNames?.join(', ') || 'N/A',
                }}
              />
              <ObservationList observations={results.rhythmicVariety.observations} />
            </Section>

            {/* Countersubject Analysis Sections */}
            {results.countersubject && (
              <>
                <h2
                  style={{
                    fontSize: '15px',
                    color: '#2c3e50',
                    borderBottom: '2px solid #81c784',
                    paddingBottom: '5px',
                    marginBottom: '14px',
                    marginTop: '22px',
                  }}
                >
                  Countersubject Analysis
                </h2>

                <Section title="Double Counterpoint (Invertibility)" helpKey="doubleCounterpoint">
                  <InvertibilityViz
                    subject={results.subject}
                    cs={results.countersubject.map((n) => ({ ...n, pitch: n.pitch + csOctaveShift }))}
                    formatter={results.formatter}
                    originalIssues={results.doubleCounterpoint.original.issues || []}
                    invertedIssues={results.doubleCounterpoint.inverted.issues || []}
                  />
                  <div style={{ marginTop: '12px' }}>
                    <DataRow
                      data={{
                        'Original (CS above)': `${results.doubleCounterpoint.original.thirds} 3rds, ${results.doubleCounterpoint.original.sixths} 6ths, ${results.doubleCounterpoint.original.perfects} perfect`,
                        'Inverted (CS below)': `${results.doubleCounterpoint.inverted.thirds} 3rds, ${results.doubleCounterpoint.inverted.sixths} 6ths, ${results.doubleCounterpoint.inverted.perfects} perfect`,
                      }}
                    />
                  </div>
                  <ObservationList observations={results.doubleCounterpoint.observations} />
                </Section>

                <Section title="Rhythmic Complementarity" helpKey="rhythmicComplementarity" defaultCollapsed={true}>
                  <DataRow
                    data={{
                      Overlap: `${Math.round(results.rhythmicComplementarity.overlapRatio * 100)}%`,
                      'Strong beat collisions': results.rhythmicComplementarity.strongBeatCollisions,
                    }}
                  />
                  <ObservationList observations={results.rhythmicComplementarity.observations} />
                </Section>

                <Section title="Contour Independence" helpKey="contourIndependence" defaultCollapsed={true}>
                  <DataRow
                    data={{
                      Parallel: `${results.contourIndependence.parallelMotions} (${Math.round(results.contourIndependence.parallelRatio * 100)}%)`,
                      Similar: `${results.contourIndependence.similarMotions} (${Math.round(results.contourIndependence.similarRatio * 100)}%)`,
                      Contrary: `${results.contourIndependence.contraryMotions} (${Math.round(results.contourIndependence.contraryRatio * 100)}%)`,
                      Oblique: `${results.contourIndependence.obliqueMotions} (${Math.round(results.contourIndependence.obliqueRatio * 100)}%)`,
                    }}
                  />
                  <ObservationList
                    observations={[
                      { type: 'info', description: results.contourIndependence.assessment },
                      ...results.contourIndependence.details.map((d) => ({
                        type: 'consideration',
                        description: d.description,
                      })),
                    ]}
                  />
                </Section>

                <Section title="Modulatory Robustness" helpKey="modulatoryRobustness" defaultCollapsed={true}>
                  <p style={{ fontSize: '12px', color: '#546e7a', marginBottom: '8px' }}>
                    How well does the countersubject work against the answer?
                  </p>
                  {results.modulatoryRobustness.intervalProfile && (
                    <DataRow
                      data={{
                        'Consonant on strong beats': `${results.modulatoryRobustness.intervalProfile.consonant} (${results.modulatoryRobustness.intervalProfile.thirds} 3rds, ${results.modulatoryRobustness.intervalProfile.sixths} 6ths, ${results.modulatoryRobustness.intervalProfile.perfects} perfect)`,
                        'Dissonant on strong beats': results.modulatoryRobustness.intervalProfile.dissonant,
                      }}
                    />
                  )}
                  <ObservationList observations={results.modulatoryRobustness.observations} />
                </Section>
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          padding: '12px',
          color: '#9e9e9e',
          fontSize: '10px',
          borderTop: '1px solid #e0e0e0',
          marginTop: '24px',
        }}
      >
        Fugue Analysis Tool — Built with React
      </footer>
    </div>
  );
}
