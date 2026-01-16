/**
 * ABC notation display component
 */
export function ABCBox({ abc, label }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: '#757575', marginBottom: '2px' }}>{label}</div>
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
