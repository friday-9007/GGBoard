/**
 * ggBoard — API Helper
 * Centralized Axios instance for backend communication.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor — attach JWT token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ggboard_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only 401 (missing/expired/invalid token) ends the session.
    // 403 is an authorization denial — surface it, don't log the user out.
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const protectedPrefixes = ['/admin', '/leader', '/player', '/create-team', '/join-team'];
      if (protectedPrefixes.some((p) => currentPath.startsWith(p))) {
        localStorage.removeItem('ggboard_token');
        localStorage.removeItem('ggboard_user');
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
