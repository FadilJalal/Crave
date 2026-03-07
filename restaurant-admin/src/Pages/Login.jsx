import { useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import { saveRestaurantSession, DASHBOARD_PATH } from "../utils/session";

export default function Login() {
  const navigate = useNavigate();
  const [screen, setScreen]   = useState("login");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm]         = useState({ email: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error("Please enter email and password"); return; }
    try {
      setLoading(true);
      const res = await api.post("/api/admin/login-restaurant", { email: form.email, password: form.password });
      if (res.data?.success) {
        await saveRestaurantSession(res.data.token);
        toast.success("Login successful ✅");
        navigate(DASHBOARD_PATH);
      } else {
        toast.error(res.data?.message || "Login failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const onForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { toast.error("Enter your email address"); return; }
    try {
      setLoading(true);
      const res = await api.post("/api/auth/forgot-password", { email: forgotEmail.trim() });
      if (res.data?.success) setScreen("forgot-sent");
      else toast.error(res.data?.message || "Failed to send reset email");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>

        <div style={s.brand}>
          <div style={s.brandDot} />
          <div>
            <h1 style={s.brandName}>Crave.</h1>
            <p style={s.brandSub}>Restaurant Admin Panel</p>
          </div>
        </div>

        {screen === "login" && (
          <>
            <h2 style={s.title}>Welcome back 👋</h2>
            <p style={s.sub}>Sign in to manage your restaurant.</p>
            <form onSubmit={onLogin} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Email</label>
                <input name="email" value={form.email} onChange={onChange}
                  placeholder="restaurant@email.com" style={s.input} autoComplete="email" />
              </div>
              <div style={s.field}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={s.label}>Password</label>
                  <button type="button" style={s.forgotLink} onClick={() => setScreen("forgot")}>
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <input type={showPass ? "text" : "password"} name="password" value={form.password}
                    onChange={onChange} placeholder="••••••••"
                    style={{ ...s.input, paddingRight: 44 }} autoComplete="current-password" />
                  <button type="button" style={s.eyeBtn} onClick={() => setShowPass(!showPass)}>
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <button type="submit" style={s.submitBtn} disabled={loading}>
                {loading ? "Signing in..." : "Sign In →"}
              </button>
            </form>
          </>
        )}

        {screen === "forgot" && (
          <>
            <button style={s.backBtn} onClick={() => setScreen("login")}>← Back to login</button>
            <h2 style={s.title}>Reset password</h2>
            <p style={s.sub}>Enter your email and we'll send you a reset link.</p>
            <form onSubmit={onForgot} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Email address</label>
                <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="restaurant@email.com" style={s.input} autoFocus />
              </div>
              <button type="submit" style={s.submitBtn} disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link →"}
              </button>
            </form>
          </>
        )}

        {screen === "forgot-sent" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📬</div>
            <h2 style={s.title}>Check your inbox</h2>
            <p style={s.sub}>
              We sent a reset link to <strong>{forgotEmail}</strong>. Expires in <strong>1 hour</strong>.
            </p>
            <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 8 }}>
              Didn't get it? Check spam or{" "}
              <button style={s.resendBtn} onClick={() => setScreen("forgot")}>try again</button>.
            </p>
            <button style={{ ...s.submitBtn, marginTop: 24 }} onClick={() => setScreen("login")}>
              Back to Login
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

const s = {
  page:      { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  card:      { width: "100%", maxWidth: 420, background: "#fff", borderRadius: 20, padding: "36px 32px", boxShadow: "0 8px 40px rgba(0,0,0,0.10)", border: "1px solid #f3f4f6" },
  brand:     { display: "flex", alignItems: "center", gap: 12, marginBottom: 28 },
  brandDot:  { width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #ff4e2a, #ff6a3d)", flexShrink: 0 },
  brandName: { margin: 0, fontSize: 20, fontWeight: 900, color: "#111827", fontStyle: "italic" },
  brandSub:  { margin: 0, fontSize: 12, color: "#9ca3af", fontWeight: 600 },
  title:     { margin: "0 0 6px", fontSize: 22, fontWeight: 900, color: "#111827" },
  sub:       { margin: "0 0 24px", fontSize: 14, color: "#6b7280", lineHeight: 1.5 },
  form:      { display: "flex", flexDirection: "column", gap: 16 },
  field:     { display: "flex", flexDirection: "column", gap: 6 },
  label:     { fontSize: 13, fontWeight: 700, color: "#374151" },
  input:     { height: 44, padding: "0 12px", borderRadius: 10, border: "1.5px solid #e5e7eb", outline: "none", fontSize: 14, fontFamily: "inherit", color: "#111827", background: "#f9fafb", width: "100%" },
  eyeBtn:    { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, opacity: 0.6 },
  forgotLink:{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#ff4e2a", fontWeight: 700, padding: 0 },
  submitBtn: { height: 46, marginTop: 4, borderRadius: 50, border: "none", background: "linear-gradient(135deg, #ff4e2a, #ff6a3d)", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: "0 6px 18px rgba(255,78,42,0.28)" },
  backBtn:   { background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#6b7280", fontWeight: 700, padding: "0 0 16px", display: "block" },
  resendBtn: { background: "none", border: "none", cursor: "pointer", color: "#ff4e2a", fontWeight: 700, fontSize: 13, padding: 0 },
};