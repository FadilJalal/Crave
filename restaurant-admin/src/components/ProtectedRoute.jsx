function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("restaurantToken");

  if (!token) {
    window.location.href = import.meta.env.VITE_FRONTEND_URL || "http://localhost:5174";
    return null;
  }

  const payload = decodeJwtPayload(token);

  // ✅ Reject if token is not a restaurant token
  if (!payload || payload.role !== "restaurant") {
    localStorage.removeItem("restaurantToken");
    window.location.href = import.meta.env.VITE_FRONTEND_URL || "http://localhost:5174";
    return null;
  }

  return children;
}
