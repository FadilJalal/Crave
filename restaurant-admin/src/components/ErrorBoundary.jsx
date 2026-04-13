import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: "100vh", width: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", background: "#f8fafc",
          fontFamily: "Inter, sans-serif", padding: "20px", textAlign: "center"
        }}>
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>🚨</div>
          <h1 style={{ fontSize: "24px", fontWeight: 900, color: "#1e293b", margin: "0 0 10px" }}>
            Something went wrong.
          </h1>
          <p style={{ fontSize: "15px", color: "#64748b", margin: "0 0 30px", maxWidth: "400px" }}>
            The application encountered an unexpected error. Don't worry, your data is safe.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 24px", borderRadius: "12px", border: "none",
              background: "#ff4e2a", color: "white", fontWeight: 800,
              cursor: "pointer", boxShadow: "0 8px 24px rgba(255,78,42,0.2)"
            }}
          >
            Reload Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
