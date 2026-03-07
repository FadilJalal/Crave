export default function Navbar() {
  const logout = () => {
    localStorage.removeItem("adminToken");
    window.location.replace(import.meta.env.VITE_FRONTEND_URL || "http://localhost:5174");
  };

  return (
    <div style={styles.nav}>
      <div style={styles.brand}>Tomato • Super Admin</div>
      <button onClick={logout} style={styles.btn}>
        Logout
      </button>
    </div>
  );
}

const styles = {
  nav: {
    height: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "#111",
    color: "white",
  },
  brand: { fontSize: 18, fontWeight: 700 },
  btn: {
    padding: "10px 14px",
    borderRadius: 10,
    background: "#fff",
    color: "#111",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  },
};