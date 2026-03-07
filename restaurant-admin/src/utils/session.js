import { api } from "./api";

const FRONTEND_FALLBACK_URL = "http://localhost:5174";
export const DASHBOARD_PATH = "/dashboard";

export function redirectToFrontend() {
  const target = import.meta.env.VITE_FRONTEND_URL || FRONTEND_FALLBACK_URL;
  window.location.href = target;
}

export function clearRestaurantSession() {
  localStorage.removeItem("restaurantToken");
  localStorage.removeItem("restaurantInfo");
}

export async function saveRestaurantSession(token) {
  // Persist token first so subsequent requests can use the interceptor
  localStorage.setItem("restaurantToken", token);

  try {
    const res = await api.get("/api/restaurantadmin/me", {
      // Keep explicit header to match existing behaviour exactly
      headers: { token },
    });

    if (res.data?.success && res.data?.data) {
      localStorage.setItem("restaurantInfo", JSON.stringify(res.data.data));
    }
  } catch {
    // Silently ignore – current UI does not depend on this succeeding
  }
}

