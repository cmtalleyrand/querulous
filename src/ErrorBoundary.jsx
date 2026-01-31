import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('React Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          fontFamily: 'monospace',
          backgroundColor: '#fef2f2',
          minHeight: '100vh',
        }}>
          <h1 style={{ color: '#dc2626', marginBottom: '20px' }}>
            Something went wrong
          </h1>

          <div style={{
            backgroundColor: '#fee2e2',
            border: '2px solid #fca5a5',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px',
          }}>
            <h2 style={{ color: '#991b1b', fontSize: '18px', marginBottom: '10px' }}>
              Error Message:
            </h2>
            <pre style={{
              backgroundColor: '#fff',
              padding: '15px',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '14px',
              color: '#dc2626',
            }}>
              {this.state.error?.toString()}
            </pre>
          </div>

          {this.state.errorInfo && (
            <div style={{
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '20px',
            }}>
              <h2 style={{ color: '#374151', fontSize: '18px', marginBottom: '10px' }}>
                Component Stack:
              </h2>
              <pre style={{
                backgroundColor: '#fff',
                padding: '15px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px',
                color: '#4b5563',
                maxHeight: '400px',
              }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </div>
          )}

          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
