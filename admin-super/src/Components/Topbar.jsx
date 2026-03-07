export default function Topbar() {
  return (
    <div className="topbar">
      <div>
        <div style={{ fontWeight: 1000, letterSpacing: "-0.5px" }}>
          Tomato • Super Admin
        </div>
        <div className="muted" style={{ fontSize: 12, fontWeight: 800 }}>
          Manage restaurants, users & orders
        </div>
      </div>

      <button className="btn" onClick={() => window.location.reload()}>
        🔄 Refresh Stats
      </button>
    </div>
  );
}