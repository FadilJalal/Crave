import axios from "axios";

export const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  // Add cache-busting to GET requests
  if (config.method === 'get') {
    const separator = config.url.includes('?') ? '&' : '?';
    config.url += `${separator}_t=${Date.now()}`;
  }
  
  return config;
});

// Add response interceptor for debugging
api.interceptors.response.use((response) => {
  console.log("🔍 API Response:", {
    url: response.config.url,
    method: response.config.method,
    status: response.status,
    data: response.data,
    dataType: typeof response.data,
    dataArray: Array.isArray(response.data?.data),
    dataLength: response.data?.data?.length
  });
  return response;
});