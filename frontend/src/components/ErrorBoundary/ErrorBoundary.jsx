// frontend/src/components/ErrorBoundary/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 24, fontFamily: 'DM Sans, sans-serif'
        }}>
          <div style={{
            textAlign: 'center', maxWidth: 420, padding: '40px 32px',
            background: '#fff', borderRadius: 20, border: '1px solid #f3f4f6',
            boxShadow: '0 8px 40px rgba(0,0,0,0.08)'
          }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>😕</div>
            <h2 style={{ margin: '0 0 8px', fontWeight: 900, color: '#111827', fontSize: 20 }}>
              Something went wrong
            </h2>
            <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: 14, lineHeight: 1.6 }}>
              An unexpected error occurred. Try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 28px', borderRadius: 50, border: 'none',
                background: 'linear-gradient(135deg, #ff4e2a, #ff6a3d)',
                color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(255,78,42,0.3)', fontFamily: 'inherit'
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;