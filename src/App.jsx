import { useState, useEffect } from 'react';
import {
  PianoRoll,
  IntervalTimeline,
  StrettoViz,
  IntervalAnalysisViz,
  InvertibilityViz,
  UnifiedCounterpointViz,
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
  validateABCTiming,
  findSimultaneities,
  testHarmonicImplication,
  testRhythmicVariety,
  testRhythmicComplementarity,
  testStrettoViability,
  testTonalAnswer,
  testDoubleCounterpoint,
  testContourIndependence,
  testModulatoryRobustness,
  testSequentialPotential,
  calculateOverallScore,
  setP4Treatment,
  setMeter,
  setSequenceRanges,
  setSequenceBeatRanges,
} from './utils';
import { NoteEvent, ScaleDegree } from './types';

/**
 * Default example subject and countersubject (D minor, 4/4 time, L:1/8)
 * Each measure = 8 eighth notes = 4 beats
 */
const DEFAULT_SUBJECT = `D4 A4 | F2 E2 D2 C2 | _B,2 A,2 G,2 A,2 | _B,2 C2 D4 |]`;
const DEFAULT_CS = `F4 E4 | D2 C2 D2 E2 | F2 G2 F2 E2 | D2 C2 D4 |]`;

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
  const [timingWarnings, setTimingWarnings] = useState([]);

  // Saved presets state
  const [savedPresets, setSavedPresets] = useState([]);
  const [saveName, setSaveName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Global highlight state - used for clicking issues/items to highlight in visualizations
  const [highlightedItem, setHighlightedItem] = useState(null);

  // Sequence highlight state - for highlighting sequence ranges in piano roll
  const [activeSequenceVoice, setActiveSequenceVoice] = useState(null);
  const [activeSequenceRange, setActiveSequenceRange] = useState(null);

  // Load saved presets from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fugueAnalyzerPresets');
      if (saved) {
        setSavedPresets(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load saved presets:', e);
    }
  }, []);

  // Re-run analysis when octave shift settings change (if CS exists)
  // This ensures analysis reflects the actual octave placement
  useEffect(() => {
    if (results?.countersubject) {
      // Trigger re-analysis with new octave settings
      analyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csPos, csShift]);

  // Helper: prepend ABC headers if not already present
  const prependABCHeaders = (abc, key, mode, noteLength, timeSig) => {
    if (!abc.trim()) return abc;

    const headers = [];
    const hasK = /^\s*K:/m.test(abc);
    const hasL = /^\s*L:/m.test(abc);
    const hasM = /^\s*M:/m.test(abc);

    // Build mode suffix for key
    const modeMap = {
      major: '',
      natural_minor: 'm',
      harmonic_minor: 'm',
      dorian: 'dor',
      phrygian: 'phr',
      lydian: 'lyd',
      mixolydian: 'mix',
    };
    const modeStr = modeMap[mode] || '';

    if (!hasK) headers.push(`K:${key}${modeStr}`);
    if (!hasL) headers.push(`L:${noteLength}`);
    if (!hasM) headers.push(`M:${timeSig}`);

    if (headers.length === 0) return abc;
    return headers.join('\n') + '\n' + abc;
  };

  // Save preset
  const savePreset = () => {
    if (!saveName.trim()) return;

    // Include ABC headers (K, L, M) in the saved text
    const subjectWithHeaders = prependABCHeaders(subjectInput, selKey, selMode, selNoteLen, selTimeSig);
    const csWithHeaders = csInput.trim() ? prependABCHeaders(csInput, selKey, selMode, selNoteLen, selTimeSig) : '';
    const answerWithHeaders = answerInput.trim() ? prependABCHeaders(answerInput, selKey, selMode, selNoteLen, selTimeSig) : '';

    const preset = {
      name: saveName.trim(),
      subject: subjectWithHeaders,
      countersubject: csWithHeaders,
      answer: answerWithHeaders,
      settings: {
        key: selKey,
        mode: selMode,
        noteLength: selNoteLen,
        timeSig: selTimeSig,
      },
      savedAt: new Date().toISOString(),
    };

    const newPresets = [...savedPresets.filter(p => p.name !== preset.name), preset];
    setSavedPresets(newPresets);
    localStorage.setItem('fugueAnalyzerPresets', JSON.stringify(newPresets));
    setSaveName('');
    setShowSaveDialog(false);
  };

  // Load preset
  const loadPreset = (preset) => {
    setSubjectInput(preset.subject || '');
    setCsInput(preset.countersubject || '');
    setAnswerInput(preset.answer || '');
    if (preset.settings) {
      if (preset.settings.key) setSelKey(preset.settings.key);
      if (preset.settings.mode) setSelMode(preset.settings.mode);
      if (preset.settings.noteLength) setSelNoteLen(preset.settings.noteLength);
      if (preset.settings.timeSig) setSelTimeSig(preset.settings.timeSig);
    }
  };

  // Delete preset
  const deletePreset = (presetName) => {
    const newPresets = savedPresets.filter(p => p.name !== presetName);
    setSavedPresets(newPresets);
    localStorage.setItem('fugueAnalyzerPresets', JSON.stringify(newPresets));
  };

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

      // Set the meter for all analysis functions to use
      setMeter(meter);

      // Parse subject with spelling key for accidentals, analysis key for scale degrees
      const subjectParsed = parseABC(subjectInput, tonic, analysisMode, effNL, spellingKeySig);
      const subject = subjectParsed.notes;

      if (!subject.length) {
        setError('No notes parsed from subject');
        return;
      }

      // Validate ABC timing against time signature
      const subjectWarnings = validateABCTiming(subjectInput, meter, effNL);

      const formatter = new BeatFormatter(effNL, meter);

      // Parse countersubject if provided (use spelling key for accidentals)
      const cs = csInput.trim() ? parseABC(csInput, tonic, analysisMode, effNL, spellingKeySig).notes : null;
      const csWarnings = csInput.trim() ? validateABCTiming(csInput, meter, effNL) : [];

      // Combine all timing warnings
      const allWarnings = [
        ...subjectWarnings.map(w => ({ ...w, source: 'Subject' })),
        ...csWarnings.map(w => ({ ...w, source: 'Countersubject' })),
      ];
      setTimingWarnings(allWarnings);

      // Parse or generate answer (use spelling key for accidentals)
      let answerNotes = answerInput.trim() ? parseABC(answerInput, tonic, analysisMode, effNL, spellingKeySig).notes : null;

      // Calculate octave shift for countersubject
      // This shift affects both analysis and visualization
      const csOctaveShiftVal = (csPos === 'below' ? -12 : 0) + parseInt(csShift);
      const shiftedCs = cs?.length
        ? cs.map(n => ({ ...n, pitch: n.pitch + csOctaveShiftVal }))
        : null;

      // Build results object
      const res = {
        keyInfo,
        formatter,
        subject,
        countersubject: shiftedCs, // Store shifted CS - analysis and visualization use the same data
        countersubjectOriginal: cs, // Keep original for reference
        countersubjectShift: csOctaveShiftVal, // Store shift value for display
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
          csOctaveShift: csOctaveShiftVal, // Include shift info in parsed info
        },
      };

      // Run subject analyses
      res.harmonicImplication = testHarmonicImplication(subject, tonic, analysisMode, formatter);
      res.rhythmicVariety = testRhythmicVariety(subject, formatter);

      // Analyze sequences in all voices
      res.sequences = {
        subject: testSequentialPotential(subject, formatter),
      };

      // Set sequence ranges for motion penalty mitigation (subject only for now)
      if (res.sequences.subject.noteRanges?.length > 0) {
        setSequenceRanges(res.sequences.subject.noteRanges);
        const beatRanges = res.sequences.subject.sequences?.map(seq => ({
          startBeat: seq.startBeat,
          endBeat: seq.endBeat,
        })) || [];
        setSequenceBeatRanges(beatRanges);
      } else {
        setSequenceRanges([]);
        setSequenceBeatRanges([]);
      }

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

      // Analyze sequences in the answer
      res.sequences.answer = testSequentialPotential(answerNotes, formatter);

      // Run countersubject analyses if CS provided
      if (shiftedCs?.length) {
        // Analyze sequences in the countersubject
        res.sequences.countersubject = testSequentialPotential(shiftedCs, formatter);

        // Run analysis with shifted CS (already computed above)
        res.doubleCounterpoint = testDoubleCounterpoint(subject, shiftedCs, formatter);
        res.rhythmicComplementarity = testRhythmicComplementarity(subject, shiftedCs);
        res.contourIndependence = testContourIndependence(subject, shiftedCs, formatter);
        res.modulatoryRobustness = testModulatoryRobustness(subject, shiftedCs, formatter);
        res.subjectCsSims = findSimultaneities(subject, shiftedCs);
        res.answerCsSims = findSimultaneities(answerNotes, shiftedCs);
      }

      // Calculate scores
      const scores = calculateOverallScore(res, !!cs?.length);

      setResults(res);
      setScoreResult(scores);
    } catch (e) {
      setError(`Error: ${e.message}`);
    }
  };

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

        {/* Save/Load Presets Panel */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '6px',
            border: '1px solid #e0e0e0',
            padding: '12px 16px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#546e7a' }}>Presets:</span>

          {/* Load preset dropdown */}
          {savedPresets.length > 0 && (
            <select
              onChange={(e) => {
                const preset = savedPresets.find(p => p.name === e.target.value);
                if (preset) loadPreset(preset);
                e.target.value = '';
              }}
              style={{
                padding: '6px 10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#37474f',
                minWidth: '140px',
              }}
              defaultValue=""
            >
              <option value="" disabled>Load saved...</option>
              {savedPresets.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          )}

          {/* Save button */}
          {!showSaveDialog ? (
            <button
              onClick={() => setShowSaveDialog(true)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#5c6bc0',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Save Current
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Preset name..."
                style={{
                  padding: '6px 10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '12px',
                  width: '140px',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') savePreset();
                  if (e.key === 'Escape') setShowSaveDialog(false);
                }}
                autoFocus
              />
              <button
                onClick={savePreset}
                disabled={!saveName.trim()}
                style={{
                  padding: '6px 10px',
                  backgroundColor: saveName.trim() ? '#2e7d32' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: saveName.trim() ? 'pointer' : 'default',
                }}
              >
                Save
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#757575',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Delete preset (only show if there are presets) */}
          {savedPresets.length > 0 && (
            <select
              onChange={(e) => {
                if (e.target.value && confirm(`Delete preset "${e.target.value}"?`)) {
                  deletePreset(e.target.value);
                }
                e.target.value = '';
              }}
              style={{
                padding: '6px 10px',
                border: '1px solid #ffcdd2',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#c62828',
                backgroundColor: '#fff',
              }}
              defaultValue=""
            >
              <option value="" disabled>Delete...</option>
              {savedPresets.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          )}

          {savedPresets.length === 0 && !showSaveDialog && (
            <span style={{ fontSize: '11px', color: '#90a4ae' }}>No saved presets yet</span>
          )}
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

        {/* Timing Warnings */}
        {timingWarnings.length > 0 && (
          <div
            role="alert"
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              backgroundColor: '#fff8e1',
              borderLeft: '3px solid #ffc107',
              borderRadius: '0 4px 4px 0',
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: '6px', color: '#e65100' }}>
              Time Signature Mismatch
            </div>
            {timingWarnings.map((w, i) => (
              <div key={i} style={{ fontSize: '12px', color: '#bf360c', marginBottom: '2px' }}>
                {w.source}: {w.message}
              </div>
            ))}
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
            <IssuesSummary
              results={results}
              scoreResult={scoreResult}
              onHighlight={setHighlightedItem}
              highlightedItem={highlightedItem}
            />

            {/* Subject Visualization */}
            <Section title="Subject" helpKey="subject" defaultCollapsed={true}>
              <PianoRoll
                voices={[{ notes: results.subject, color: '#5c6bc0', label: 'Subject' }]}
                sequenceRanges={results.sequences?.subject?.noteRanges || []}
                activeSequenceRange={activeSequenceVoice === 'subject' ? activeSequenceRange : null}
                highlightedItem={highlightedItem}
                meter={results.meter}
              />
            </Section>

            {/* Countersubject Sections */}
            {results.countersubject && (
              <>
                {/* Voice Comparison - unified view with transposition testing */}
                <Section title="Counterpoint Analysis" helpKey="countersubject">
                  <UnifiedCounterpointViz
                    voices={{
                      subject: results.subjectNotes,
                      answer: results.answerNotes,
                      cs1: results.countersubject,
                    }}
                    formatter={results.formatter}
                    meter={results.meter}
                    defaultVoice1="answer"
                    defaultVoice2="cs1"
                    title="Voice Comparison"
                  />
                </Section>

                {/* Aggregate Counterpoint Score */}
                {results.doubleCounterpoint && results.modulatoryRobustness && (
                  <div style={{
                    margin: '16px 0',
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                      Aggregate Counterpoint Quality
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                      {/* S+CS Score */}
                      {(() => {
                        const scsScore = results.doubleCounterpoint.original?.detailedScoring?.summary?.averageScore || 0;
                        return (
                          <div style={{
                            padding: '12px',
                            backgroundColor: scsScore >= 0.5 ? '#dcfce7' : scsScore >= 0 ? '#fef9c3' : '#fee2e2',
                            borderRadius: '6px',
                            textAlign: 'center',
                          }}>
                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Subject + CS</div>
                            <div style={{
                              fontSize: '20px',
                              fontWeight: '700',
                              color: scsScore >= 0.5 ? '#16a34a' : scsScore >= 0 ? '#ca8a04' : '#dc2626',
                            }}>
                              {scsScore >= 0 ? '+' : ''}{scsScore.toFixed(2)}
                            </div>
                          </div>
                        );
                      })()}
                      {/* A+CS Score */}
                      {(() => {
                        const acsScore = results.modulatoryRobustness.detailedScoring?.summary?.averageScore || 0;
                        return (
                          <div style={{
                            padding: '12px',
                            backgroundColor: acsScore >= 0.5 ? '#dcfce7' : acsScore >= 0 ? '#fef9c3' : '#fee2e2',
                            borderRadius: '6px',
                            textAlign: 'center',
                          }}>
                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Answer + CS</div>
                            <div style={{
                              fontSize: '20px',
                              fontWeight: '700',
                              color: acsScore >= 0.5 ? '#16a34a' : acsScore >= 0 ? '#ca8a04' : '#dc2626',
                            }}>
                              {acsScore >= 0 ? '+' : ''}{acsScore.toFixed(2)}
                            </div>
                          </div>
                        );
                      })()}
                      {/* Combined Aggregate */}
                      {(() => {
                        const scsScore = results.doubleCounterpoint.original?.detailedScoring?.summary?.averageScore || 0;
                        const acsScore = results.modulatoryRobustness.detailedScoring?.summary?.averageScore || 0;
                        const aggregate = (scsScore + acsScore) / 2;
                        return (
                          <div style={{
                            padding: '12px',
                            backgroundColor: aggregate >= 0.5 ? '#dcfce7' : aggregate >= 0 ? '#fef9c3' : '#fee2e2',
                            borderRadius: '6px',
                            textAlign: 'center',
                            border: '2px solid',
                            borderColor: aggregate >= 0.5 ? '#16a34a' : aggregate >= 0 ? '#ca8a04' : '#dc2626',
                          }}>
                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>
                              AGGREGATE
                            </div>
                            <div style={{
                              fontSize: '24px',
                              fontWeight: '700',
                              color: aggregate >= 0.5 ? '#16a34a' : aggregate >= 0 ? '#ca8a04' : '#dc2626',
                            }}>
                              {aggregate >= 0 ? '+' : ''}{aggregate.toFixed(2)}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                      Average dissonance handling score (0 = acceptable, positive = good, negative = problematic)
                    </div>
                  </div>
                )}
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

            {/* Sequences */}
            {(() => {
              const allSequences = [];
              if (results.sequences?.subject?.detailedSequences?.length > 0) {
                allSequences.push({
                  voice: 'Subject',
                  voiceKey: 'subject',
                  color: '#5c6bc0',
                  data: results.sequences.subject.detailedSequences,
                  notes: results.subject,
                });
              }
              if (results.sequences?.answer?.detailedSequences?.length > 0) {
                allSequences.push({
                  voice: 'Answer',
                  voiceKey: 'answer',
                  color: '#26a69a',
                  data: results.sequences.answer.detailedSequences,
                  notes: results.answerNotes,
                });
              }
              if (results.sequences?.countersubject?.detailedSequences?.length > 0) {
                allSequences.push({
                  voice: 'Countersubject',
                  voiceKey: 'countersubject',
                  color: '#ef6c00',
                  data: results.sequences.countersubject.detailedSequences,
                  notes: results.countersubject,
                });
              }

              if (allSequences.length === 0) {
                return (
                  <div style={{ padding: '16px', color: '#6b7280', fontStyle: 'italic', fontSize: '14px' }}>
                    No melodic sequences detected. Sequences require consecutive repetitions of a melodic pattern (minimum 3 notes, 2 repetitions).
                  </div>
                );
              }

              // Format beat range for a sequence
              const formatBeatRange = (seq, notes) => {
                const startBeat = notes[seq.startNote - 1]?.onset;
                const endNote = notes[seq.endNote - 1];
                const endBeat = endNote ? endNote.onset + endNote.duration : startBeat;
                return results.formatter
                  ? `${results.formatter.formatBeat(startBeat)} – ${results.formatter.formatBeat(endBeat)}`
                  : `Beat ${startBeat + 1} – ${endBeat + 1}`;
              };

              // Handle sequence click - highlight the note range
              const handleSequenceClick = (voiceKey, seq, notes) => {
                if (activeSequenceVoice === voiceKey &&
                    activeSequenceRange?.start === seq.startNote - 1 &&
                    activeSequenceRange?.end === seq.endNote - 1) {
                  // Clicking same sequence - deselect
                  setActiveSequenceVoice(null);
                  setActiveSequenceRange(null);
                } else {
                  setActiveSequenceVoice(voiceKey);
                  setActiveSequenceRange({ start: seq.startNote - 1, end: seq.endNote - 1 });
                  // Also set the beat range for visualization highlight
                  const startBeat = notes[seq.startNote - 1]?.onset || 0;
                  const endNote = notes[seq.endNote - 1];
                  const endBeat = endNote ? endNote.onset + endNote.duration : startBeat;
                  setHighlightedItem({ onset: startBeat, endOnset: endBeat, type: 'sequence', voice: voiceKey });
                }
              };

              return (
                <Section title="Sequences" defaultCollapsed={true}>
                  <div style={{
                    padding: '10px 14px',
                    marginBottom: '12px',
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#0369a1',
                  }}>
                    Click a sequence to highlight it in the visualization above. Sequences are shown with a golden glow in the Subject piano roll.
                  </div>
                  {allSequences.map((voiceSeqs, voiceIdx) => (
                    <div key={voiceIdx} style={{ marginBottom: voiceIdx < allSequences.length - 1 ? '16px' : 0 }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: voiceSeqs.color,
                        marginBottom: '8px',
                        paddingBottom: '4px',
                        borderBottom: `2px solid ${voiceSeqs.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        <span style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: voiceSeqs.color,
                          borderRadius: '2px',
                          display: 'inline-block',
                        }} />
                        {voiceSeqs.voice} ({voiceSeqs.data.length} sequence{voiceSeqs.data.length !== 1 ? 's' : ''})
                      </div>
                      {voiceSeqs.data.map((seq, seqIdx) => {
                        const isActive = activeSequenceVoice === voiceSeqs.voiceKey &&
                          activeSequenceRange?.start === seq.startNote - 1;
                        return (
                          <div
                            key={seqIdx}
                            onClick={() => handleSequenceClick(voiceSeqs.voiceKey, seq, voiceSeqs.notes)}
                            style={{
                              padding: '12px',
                              marginBottom: seqIdx < voiceSeqs.data.length - 1 ? '8px' : 0,
                              backgroundColor: isActive ? '#fef3c7' : '#fffbeb',
                              border: isActive ? '2px solid #d97706' : '1px solid #fcd34d',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => !isActive && (e.currentTarget.style.backgroundColor = '#fef9c3')}
                            onMouseLeave={(e) => !isActive && (e.currentTarget.style.backgroundColor = '#fffbeb')}
                          >
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '8px',
                            }}>
                              <div>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  backgroundColor: voiceSeqs.color,
                                  color: 'white',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  marginRight: '8px',
                                }}>
                                  {voiceSeqs.voice}
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#92400e' }}>
                                  {seq.repetitions}× repetition{seq.repetitions > 2 ? 's' : ''}
                                  {seq.transposition && ` (${seq.transposition} each)`}
                                  {seq.isExact && ' (exact)'}
                                </span>
                              </div>
                              <span style={{ fontSize: '11px', color: '#78350f', opacity: 0.8 }}>
                                {formatBeatRange(seq, voiceSeqs.notes)}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#78350f', marginBottom: '6px' }}>
                              <strong>Notes {seq.startNote}–{seq.endNote}</strong> in {voiceSeqs.voice.toLowerCase()}
                              <span style={{ marginLeft: '8px', opacity: 0.7 }}>({seq.unitLength}-note pattern)</span>
                            </div>
                            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#92400e', backgroundColor: 'rgba(255,255,255,0.5)', padding: '8px', borderRadius: '4px' }}>
                              <strong>Pattern:</strong>
                              <span style={{ marginLeft: '8px' }}>
                                {seq.pattern.map((step, i) => (
                                  <span key={i}>
                                    {step.duration}{step.interval ? ` ${step.interval}` : ''}{i < seq.pattern.length - 1 ? ' → ' : ''}
                                  </span>
                                ))}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </Section>
              );
            })()}

            {/* Tonal Answer */}
            <Section title="Tonal Answer" helpKey="tonalAnswer">
              <DataRow
                data={{
                  Type: results.tonalAnswer.answerType,
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

                    // Get the dissonance score for this stretto
                    const strettoScore = s.dissonanceAnalysis?.summary?.averageScore || 0;

                    // Gradation: based on score AND issues
                    let bgColor, borderColor, textColor, badge, scoreDisplay;
                    if (isSelected) {
                      bgColor = '#1f2937';
                      borderColor = '#1f2937';
                      textColor = 'white';
                      scoreDisplay = strettoScore.toFixed(1);
                    } else if (s.clean) {
                      // Clean - bright green
                      bgColor = '#dcfce7';
                      borderColor = '#86efac';
                      textColor = '#166534';
                      badge = '✓';
                      scoreDisplay = `+${strettoScore.toFixed(1)}`;
                    } else if (s.viable) {
                      // Viable with warnings - yellow-green
                      bgColor = '#fef9c3';
                      borderColor = '#fde047';
                      textColor = '#854d0e';
                      badge = `⚠${warningCount}`;
                      scoreDisplay = strettoScore >= 0 ? `+${strettoScore.toFixed(1)}` : strettoScore.toFixed(1);
                    } else if (strettoScore >= 0) {
                      // Positive score but has issues - light orange
                      bgColor = '#ffedd5';
                      borderColor = '#fdba74';
                      textColor = '#c2410c';
                      badge = issueCount.toString();
                      scoreDisplay = `+${strettoScore.toFixed(1)}`;
                    } else if (strettoScore >= -1) {
                      // Slightly negative - orange
                      bgColor = '#fee2e2';
                      borderColor = '#fca5a5';
                      textColor = '#b91c1c';
                      badge = issueCount.toString();
                      scoreDisplay = strettoScore.toFixed(1);
                    } else {
                      // Very negative - red
                      bgColor = '#fecaca';
                      borderColor = '#f87171';
                      textColor = '#991b1b';
                      badge = issueCount.toString();
                      scoreDisplay = strettoScore.toFixed(1);
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
                          gap: '6px',
                        }}
                      >
                        <span>{s.distanceFormatted}</span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          opacity: isSelected ? 1 : 0.9,
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                          padding: '1px 4px',
                          borderRadius: '3px',
                        }}>
                          {scoreDisplay}
                        </span>
                        {badge && (
                          <span style={{
                            fontSize: '9px',
                            fontWeight: '600',
                            opacity: isSelected ? 1 : 0.7,
                          }}>
                            {badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div style={{ marginTop: '8px', fontSize: '10px', color: '#6b7280', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span><strong>Score:</strong> dissonance quality</span>
                  <span><span style={{ color: '#166534' }}>✓</span> = clean</span>
                  <span><span style={{ color: '#854d0e' }}>⚠</span> = warnings</span>
                  <span style={{ color: '#c2410c' }}>numbers = issue count</span>
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
                    {(() => {
                      const strettoScore = s.dissonanceAnalysis?.summary?.averageScore || 0;
                      return (
                        <div
                          style={{
                            marginBottom: '10px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: s.viable ? (s.clean ? '#065f46' : '#854d0e') : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span>{s.distanceFormatted}</span>
                          {/* Individual stretto score - prominently displayed */}
                          <span style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: strettoScore >= 0.5 ? '#dcfce7' : strettoScore >= 0 ? '#fef9c3' : '#fee2e2',
                            color: strettoScore >= 0.5 ? '#16a34a' : strettoScore >= 0 ? '#ca8a04' : '#dc2626',
                            border: `1px solid ${strettoScore >= 0.5 ? '#86efac' : strettoScore >= 0 ? '#fde047' : '#fca5a5'}`,
                          }}>
                            Score: {strettoScore >= 0 ? '+' : ''}{strettoScore.toFixed(2)}
                          </span>
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
                      );
                    })()}
                    <StrettoViz
                      subject={results.subject}
                      distance={s.distance}
                      issues={s.issues}
                      warnings={s.warnings || []}
                      intervalPoints={s.intervalPoints || []}
                      formatter={results.formatter}
                      octaveDisp={strettoOctaveVal}
                      meter={results.meter}
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
                    cs={results.countersubject}
                    formatter={results.formatter}
                    originalIssues={results.doubleCounterpoint.original.issues || []}
                    invertedIssues={results.doubleCounterpoint.inverted.issues || []}
                    meter={results.meter}
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
