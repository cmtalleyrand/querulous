/**
 * Key-value data display component
 */
export function DataRow({ data }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      {Object.entries(data).map(([key, value]) => (
        <div
          key={key}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '4px 0',
            borderBottom: '1px solid #f0f0f0',
            fontSize: '13px',
          }}
        >
          <span style={{ color: '#757575' }}>{key}</span>
          <span style={{ color: '#212121', fontWeight: '500' }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

export default DataRow;
