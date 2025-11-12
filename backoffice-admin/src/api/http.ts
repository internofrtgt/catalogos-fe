import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Interceptor para manejar errores 401 (token expirado)
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido, limpiar y redirigir al login
      localStorage.removeItem('backoffice-auth');
      localStorage.removeItem('backoffice-last-activity');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const uploadClient = axios.create({
  baseURL: API_BASE_URL,
});

uploadClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Interceptor para manejar errores 401 en uploadClient
uploadClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido, limpiar y redirigir al login
      localStorage.removeItem('backoffice-auth');
      localStorage.removeItem('backoffice-last-activity');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
