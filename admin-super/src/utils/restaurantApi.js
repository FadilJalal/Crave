import axios from "axios";

export const backendUrl = import.meta.env.VITE_BACKEND_URL;

export const restaurantApi = axios.create({
  baseURL: backendUrl,
});

restaurantApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.token = token; // <-- matches your backend style
  return config;
});