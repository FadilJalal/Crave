import { useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState({
    email: "",
    password: "",
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(`${backendUrl}/api/admin/login-super`, data);

      if (res.data.success) {
        // Decode token to verify it's truly a superadmin token
        const token = res.data.token;
        let payload = null;
        try {
          const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
          payload = JSON.parse(atob(base64));
        } catch {}

        if (!payload || payload.role !== "superadmin") {
          toast.error("Access denied: not a super admin account.");
          return;
        }

        localStorage.setItem("adminToken", token);
        toast.success("Login Successful");
        navigate("/dashboard");
      } else {
        toast.error(res.data.message || "Login failed");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Network error";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Super Admin Login</h1>

        <form onSubmit={handleLogin} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={data.email}
            onChange={(e) => setData({ ...data, email: e.target.value })}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={data.password}
            onChange={(e) => setData({ ...data, password: e.target.value })}
            required
          />
          <button style={styles.btn} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div style={styles.hint}>
          Use: <b>superadmin@tomato.com</b> / <b>super123</b>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0b0b0b",
    color: "white",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 28,
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  },
  title: { margin: 0, marginBottom: 18, fontSize: 34, fontWeight: 900 },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  input: {
    padding: 14,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.35)",
    color: "white",
    outline: "none",
  },
  btn: {
    padding: 14,
    borderRadius: 12,
    border: "none",
    background: "white",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
    marginTop: 6,
  },
  hint: { marginTop: 14, opacity: 0.8, fontSize: 13 },
};