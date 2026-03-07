import { Navigate } from "react-router-dom";

function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("adminToken");

  if (!token) {
    window.location.replace(import.meta.env.VITE_FRONTEND_URL || "http://localhost:5174");
    return null;
  }

  const payload = decodeJwtPayload(token);

  // ✅ Reject if token is not a superadmin token
  if (!payload || payload.role !== "superadmin") {
    localStorage.removeItem("adminToken");
    window.location.replace(import.meta.env.VITE_FRONTEND_URL || "http://localhost:5174");
    return null;
  }

  return children;
}
