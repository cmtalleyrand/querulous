import { useState } from 'react';
import { getHelpContent } from '../../utils/helpContent';

/**
 * Info button that shows help content in a modal
 */
export function InfoButton({ helpKey, style }) {
  const [isOpen, setIsOpen] = useState(false);
  const content = getHelpContent(helpKey);

  if (!content) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          border: '1.5px solid #5c6bc0',
          backgroundColor: 'transparent',
          color: '#5c6bc0',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: '8px',
          transition: 'all 0.2s',
          ...style,
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#5c6bc0';
          e.target.style.color = 'white';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'transparent';
          e.target.style.color = '#5c6bc0';
        }}
        aria-label={`Info about ${content.title}`}
        title={content.brief}
      >
        i
      </button>

      {isOpen && (
        <HelpModal content={content} onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}

/**
 * Modal for displaying help content
 */
export function HelpModal({ content, onClose }) {
  if (!content) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '500px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #5c6bc0, #3949ab)',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '12px 12px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            {content.title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Brief summary */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#e8eaf6',
            borderBottom: '1px solid #c5cae9',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: '#3949ab', fontWeight: '500' }}>
            {content.brief}
          </p>
        </div>

        {/* Detailed explanation */}
        <div style={{ padding: '20px' }}>
          <div
            style={{
              fontSize: '14px',
              lineHeight: '1.7',
              color: '#37474f',
              whiteSpace: 'pre-line',
            }}
          >
            {content.detailed}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              backgroundColor: '#5c6bc0',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default InfoButton;
