import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './ErrorBoundary';
import './styles/index.css';

// Global error handler - displays errors ON THE PAGE instead of white screen
window.onerror = function(msg, url, line, col, error) {
  document.body.innerHTML = `
    <div style="padding:40px;font-family:monospace;background:#fee;min-height:100vh">
      <h1 style="color:red">JavaScript Error</h1>
      <pre style="background:#fff;padding:20px;border:2px solid red;overflow:auto">
${msg}

File: ${url}
Line: ${line}, Column: ${col}

Stack:
${error?.stack || 'No stack trace'}
      </pre>
      <p style="margin-top:20px">Check browser console (F12) for more details.</p>
    </div>
  `;
  return false; // Let it propagate to console too
};

// Catch unhandled promise rejections
window.onunhandledrejection = function(event) {
  document.body.innerHTML = `
    <div style="padding:40px;font-family:monospace;background:#fee;min-height:100vh">
      <h1 style="color:red">Unhandled Promise Rejection</h1>
      <pre style="background:#fff;padding:20px;border:2px solid red;overflow:auto">
${event.reason}

Stack:
${event.reason?.stack || 'No stack trace'}
      </pre>
      <p style="margin-top:20px">Check browser console (F12) for more details.</p>
    </div>
  `;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
