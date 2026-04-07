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
      window.location.href = "/login";
      return null;
    }

  const payload = decodeJwtPayload(token);

  // ✅ Reject if token is not a restaurant token
    if (!payload || payload.role !== "restaurant") {
      localStorage.removeItem("restaurantToken");
      window.location.href = "/login";
      return null;
    }

  return children;
}
