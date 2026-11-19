// frontend/src/config/api.js
// Centralized API configuration for GlowIQ Frontend

const envApiUrl = import.meta.env.VITE_API_URL;

// In production, use VITE_API_URL pointing to Render backend.
// In development, default to http://localhost:8000 (or empty string when using Vite proxy).
export const API_BASE_URL = envApiUrl
  ? envApiUrl.replace(/\/$/, "")
  : "http://localhost:8000";

export const ENDPOINTS = {
  health: `${API_BASE_URL}/health`,
  apiHealth: `${API_BASE_URL}/api/health`,
  testReset: `${API_BASE_URL}/api/test/reset`,
  mailbox: `${API_BASE_URL}/api/dev/mailbox`,
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    register: `${API_BASE_URL}/api/auth/register`,
    adminRegister: `${API_BASE_URL}/api/auth/admin-register`,
    forgotPassword: `${API_BASE_URL}/api/auth/forgot-password`,
    resetPassword: `${API_BASE_URL}/api/auth/reset-password`,
  },
  admin: {
    users: `${API_BASE_URL}/api/admin/users`,
    loginLogs: `${API_BASE_URL}/api/admin/login-logs`,
    setRole: `${API_BASE_URL}/api/admin/set-role`,
    orders: `${API_BASE_URL}/api/admin/orders`,
  },
  products: `${API_BASE_URL}/api/products`,
  orders: `${API_BASE_URL}/api/orders`,
  coupons: {
    apply: `${API_BASE_URL}/api/coupons/apply`,
  },
  inventory: (id) => `${API_BASE_URL}/api/inventory/${id}`,
  recommendations: `${API_BASE_URL}/api/recommendations`,
  click: `${API_BASE_URL}/api/click`,
  report: {
    recommendations: `${API_BASE_URL}/api/report/recommendations`,
    generate: `${API_BASE_URL}/api/report/generate`,
  },
  analyzeSkin: `${API_BASE_URL}/api/analyze-skin`,
};

export default {
  API_BASE_URL,
  ENDPOINTS,
};
