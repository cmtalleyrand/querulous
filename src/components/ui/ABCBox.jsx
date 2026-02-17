import { useState, useCallback } from 'react';

/**
 * ABC notation display component with copy button
 */
export function ABCBox({ abc, label }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(abc).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [abc]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
        <div style={{ fontSize: '11px', color: '#757575' }}>{label}</div>
        <button
          onClick={handleCopy}
          style={{
            fontSize: '10px',
            color: copied ? '#059669' : '#6b7280',
            backgroundColor: copied ? '#ecfdf5' : '#f9fafb',
            border: `1px solid ${copied ? '#a7f3d0' : '#d1d5db'}`,
            borderRadius: '3px',
            padding: '2px 8px',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre
        style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          padding: '8px',
          backgroundColor: '#fafafa',
          borderRadius: '4px',
          border: '1px solid #e0e0e0',
          margin: 0,
          whiteSpace: 'pre-wrap',
          lineHeight: '1.5',
        }}
      >
        {abc}
      </pre>
    </div>
  );
}

export default ABCBox;
