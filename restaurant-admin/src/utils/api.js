import axios from "axios";

export const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: BASE_URL,
});

// Attach restaurant token automatically
api.interceptors.request.use((config) => {

  const token = localStorage.getItem("restaurantToken");

  if (token) {
    config.headers.token = token;
  }

  return config;

});