import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { api } from "../utils/api";

export default function ResetPassword() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const token           = searchParams.get("token");

  const [status, setStatus]               = useState("verifying");
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass]           = useState(false);
  const [loading, setLoading]             = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    api.get(`/api/auth/verify-reset-token?token=${token}`)
      .then((res) => setStatus(res.data?.success ? "valid" : "invalid"))
      .catch(() => setStatus("invalid"));
  }, [token]);

  const handleReset = async (e) => {
    e.preventDefault();
    if (!newPassword)                    { toast.error("Enter a new password"); return; }
    if (newPassword.length < 6)          { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    try {
      setLoading(true);
      const res = await api.post("/api/auth/reset-password", { token, newPassword });
      if (res.data?.success) {
        setStatus("done");
        toast.success("Password reset successfully!");
      } else {
        toast.error(res.data?.message || "Failed to reset password");
        if (res.data?.message?.includes("expired")) setStatus("invalid");
      }
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

        {status === "verifying" && (
          <div style={{ textAlign: "center" }}>
            <div style={s.spinner} />
            <p style={{ color: "#9ca3af", fontSize: 14 }}>Verifying your reset link...</p>
          </div>
        )}

        {status === "invalid" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>⚠️</div>
            <h2 style={s.title}>Link expired or invalid</h2>
            <p style={s.sub}>This reset link is no longer valid. Please request a new one.</p>
            <button style={s.submitBtn} onClick={() => navigate("/")}>Back to Login</button>
          </div>
        )}

        {status === "valid" && (
          <>
            <h2 style={s.title}>Set new password</h2>
            <p style={s.sub}>Choose a strong password for your restaurant account.</p>
            <form onSubmit={handleReset} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>New Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showPass ? "text" : "password"} value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters" style={{ ...s.input, paddingRight: 44 }} autoFocus />
                  <button type="button" style={s.eyeBtn} onClick={() => setShowPass(!showPass)}>
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 600, color: newPassword.length >= 6 ? "#16a34a" : "#ef4444" }}>
                    {newPassword.length >= 6 ? "✅ Strong enough" : "⚠️ Too short"}
                  </p>
                )}
              </div>
              <div style={s.field}>
                <label style={s.label}>Confirm Password</label>
                <input type="password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password" style={s.input} />
                {confirmPassword.length > 0 && (
                  <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 600, color: newPassword === confirmPassword ? "#16a34a" : "#ef4444" }}>
                    {newPassword === confirmPassword ? "✅ Passwords match" : "❌ Passwords don't match"}
                  </p>
                )}
              </div>
              <button type="submit" style={s.submitBtn} disabled={loading}>
                {loading ? "Resetting..." : "Reset Password →"}
              </button>
            </form>
          </>
        )}

        {status === "done" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h2 style={s.title}>Password updated!</h2>
            <p style={s.sub}>Your password has been reset. You can now log in with your new password.</p>
            <button style={s.submitBtn} onClick={() => navigate("/")}>Go to Login →</button>
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
  submitBtn: { height: 46, marginTop: 4, borderRadius: 50, border: "none", background: "linear-gradient(135deg, #ff4e2a, #ff6a3d)", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: "0 6px 18px rgba(255,78,42,0.28)", width: "100%" },
  spinner:   { width: 36, height: 36, border: "3px solid #f3f4f6", borderTopColor: "#ff4e2a", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 16px" },
};