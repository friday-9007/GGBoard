/**
 * ggBoard — API Helper
 * Centralized Axios instance for backend communication.
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

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
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or unauthorized
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/admin') || currentPath.startsWith('/leader')) {
        localStorage.removeItem('ggboard_token');
        localStorage.removeItem('ggboard_user');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
