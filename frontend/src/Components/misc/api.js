// src/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://dein-api-server.de/api', // ggf. /api bei Proxy
  withCredentials: true, // Falls Cookies oder Auth-Header nötig sind
});

let onSessionExpired = () => {}; // Placeholder für globalen Handler

export const setSessionExpiredHandler = (handlerFn) => {
  onSessionExpired = handlerFn;
};

// Interceptor für globale Fehlerbehandlung
api.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      console.warn(`Session expired: HTTP ${status}`);
      onSessionExpired();
    }
    return Promise.reject(error);
  }
);

export default api;