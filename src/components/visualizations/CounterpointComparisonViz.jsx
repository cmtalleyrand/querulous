import { useState, useMemo, useEffect } from 'react';
import { VIZ_COLORS, getIntervalName } from '../../utils/vizConstants';
import { TwoVoiceViz } from './TwoVoiceViz';

// Tab definitions for comparison modes
const COMPARISON_TABS = [
  { key: 'subject_cs', label: 'Subject + CS', v1: 'subject', v2: 'cs1' },
  { key: 'answer_cs', label: 'Answer + CS', v1: 'answer', v2: 'cs1' },
  { key: 'answer_subject', label: 'Answer + Subject', v1: 'answer', v2: 'subject' },
];

const getVoiceColor = (key) => {
  switch (key) {
    case 'subject': return VIZ_COLORS.voiceSubject;
    case 'answer': return VIZ_COLORS.voiceAnswer;
    case 'cs1': return VIZ_COLORS.voiceCS;
    case 'cs2': return '#f59e0b';
    default: return '#6b7280';
  }
};

const getVoiceLabel = (key) => {
  switch (key) {
    case 'subject': return 'Subject';
    case 'answer': return 'Answer';
    case 'cs1': return 'Countersubject';
    case 'cs2': return 'CS2';
    default: return key;
  }
};

// Map voice key to sequences key (voices use 'cs1', sequences use 'countersubject')
const voiceToSeqKey = (key) => {
  if (key === 'cs1') return 'countersubject';
  if (key === 'cs2') return 'countersubject2';
  return key;
};

/**
 * CounterpointComparisonViz — thin tab+displacement wrapper over TwoVoiceViz.
 * Manages: active tab, transposition offset, voice/colour resolution.
 * All rendering is delegated to TwoVoiceViz.
 */
export function CounterpointComparisonViz({ voices, formatter, meter = [4, 4], sequences = {} }) {
  const [activeTab, setActiveTab] = useState('subject_cs');
  const [transposition, setTransposition] = useState(0);

  const availableTabs = useMemo(() =>
    COMPARISON_TABS.filter(t => voices[t.v1]?.length > 0 && voices[t.v2]?.length > 0),
    [voices]
  );

  // Reset to first available tab if current becomes invalid
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find(t => t.key === activeTab)) {
      setActiveTab(availableTabs[0].key);
    }
  }, [availableTabs, activeTab]);

  const tabConfig = COMPARISON_TABS.find(t => t.key === activeTab) || COMPARISON_TABS[0];

  const voice1 = voices[tabConfig.v1];
  const voice2Raw = voices[tabConfig.v2];

  // Apply displacement transposition to voice2
  const voice2 = useMemo(() => {
    if (!voice2Raw?.length) return voice2Raw;
    if (transposition === 0) return voice2Raw;
    return voice2Raw.map(n => ({ ...n, pitch: n.pitch + transposition }));
  }, [voice2Raw, transposition]);

  // Map voices to sequence info expected by TwoVoiceViz: { v1, v2 }
  const mappedSequences = useMemo(() => ({
    v1: sequences[voiceToSeqKey(tabConfig.v1)],
    v2: sequences[voiceToSeqKey(tabConfig.v2)],
  }), [sequences, tabConfig]);

  const voice1Label = getVoiceLabel(tabConfig.v1);
  const voice2Label = getVoiceLabel(tabConfig.v2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: '4px', padding: '4px',
        backgroundColor: '#f1f5f9', borderRadius: '8px', width: 'fit-content',
      }}>
        {availableTabs.map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setTransposition(0); }}
            style={{
              padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === tab.key ? '600' : '400',
              backgroundColor: activeTab === tab.key ? '#fff' : 'transparent',
              color: activeTab === tab.key ? '#1f2937' : '#64748b',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Displacement controls */}
      <div style={{
        display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap',
        padding: '12px 16px', backgroundColor: '#f8fafc',
        borderRadius: '8px', border: '1px solid #e2e8f0',
      }}>
        <span style={{ fontSize: '12px', color: '#64748b' }}>Displace {voice2Label}:</span>
        <button onClick={() => setTransposition(t => t - 12)}
          style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px',
            backgroundColor: '#fff', cursor: 'pointer', fontSize: '11px', color: '#374151' }}
          title="Down octave">
          -8ve
        </button>
        <button onClick={() => setTransposition(t => t - 1)}
          style={{ padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: '4px',
            backgroundColor: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#374151' }}
          title="Down semitone">
          −
        </button>
        <div style={{
          padding: '6px 12px', borderRadius: '6px', minWidth: '80px', textAlign: 'center',
          backgroundColor: transposition === 0 ? '#f1f5f9' : '#e0e7ff',
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
        <button onClick={() => setTransposition(t => t + 1)}
          style={{ padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: '4px',
            backgroundColor: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#374151' }}
          title="Up semitone">
          +
        </button>
        <button onClick={() => setTransposition(t => t + 12)}
          style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px',
            backgroundColor: '#fff', cursor: 'pointer', fontSize: '11px', color: '#374151' }}
          title="Up octave">
          +8ve
        </button>
        {transposition !== 0 && (
          <button onClick={() => setTransposition(0)}
            style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px',
              backgroundColor: '#fff', cursor: 'pointer', fontSize: '11px', color: '#64748b' }}>
            Reset
          </button>
        )}
      </div>

      {/* Delegate all rendering to TwoVoiceViz */}
      <TwoVoiceViz
        key={activeTab}
        voice1={voice1}
        voice2={voice2}
        voice1Label={voice1Label}
        voice2Label={voice2Label}
        voice1Color={getVoiceColor(tabConfig.v1)}
        voice2Color={getVoiceColor(tabConfig.v2)}
        formatter={formatter}
        meter={meter}
        sequences={mappedSequences}
      />
    </div>
  );
}

export default CounterpointComparisonViz;
