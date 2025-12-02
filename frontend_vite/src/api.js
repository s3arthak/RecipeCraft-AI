// src/api.js
import axios from "axios";

const rawUrl = import.meta.env.VITE_API_URL || "/api";


const normalizedBase = rawUrl.replace(/\/+$/, "");


const api = axios.create({
  baseURL: normalizedBase,
 
});

api.interceptors.request.use((config) => {
  try {
    if (config && config.data && typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    }
  } catch (e) {
    // ignore
  }
  return config;
}, (error) => Promise.reject(error));

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem("sgr_token", token);
  } else {
    delete api.defaults.headers.common["Authorization"];
    localStorage.removeItem("sgr_token");
  }
}

export function attachStoredToken() {
  const t = localStorage.getItem("sgr_token");
  if (t) setAuthToken(t);
  return t;
}

export function clearAuthToken() {
  delete api.defaults.headers.common["Authorization"];
  localStorage.removeItem("sgr_token");
}

export default api;
