import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// Decode a JWT payload without a library (no signature verification needed here —
// the backend already verified it before issuing it)
function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export default function Bridge() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get("token");

    if (!token) {
      // No token — go back to frontend
      window.location.replace(import.meta.env.VITE_FRONTEND_URL || "http://localhost:5174");
      return;
    }

    const payload = decodeJwtPayload(token);

    // ✅ Only accept superadmin tokens
    if (!payload || payload.role !== "superadmin") {
      alert("Access denied: this is the Super Admin panel. Please use the correct login.");
      window.location.replace(import.meta.env.VITE_FRONTEND_URL || "http://localhost:5174");
      return;
    }

    localStorage.setItem("adminToken", token);
    navigate("/dashboard", { replace: true });
  }, [params, navigate]);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "white" }}>
      Verifying credentials...
    </div>
  );
}
