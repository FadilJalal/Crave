import { useEffect } from "react";
import { saveRestaurantSession, redirectToFrontend, DASHBOARD_PATH } from "../utils/session";

function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));

    // Optional: treat expired tokens as invalid
    if (payload?.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export default function Bridge() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      redirectToFrontend();
      return;
    }

    const payload = decodeJwtPayload(token);

    if (!payload || payload.role !== "restaurant") {
      alert("Access denied: this is the Restaurant Admin panel. Please use the correct login.");
      redirectToFrontend();
      return;
    }

    saveRestaurantSession(token).finally(() => {
      window.location.replace(DASHBOARD_PATH);
    });
  }, []);

  return (
    <div style={{ color: "white", display: "grid", placeItems: "center", height: "100vh" }}>
      Verifying credentials...
    </div>
  );
}
