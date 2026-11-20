// src/auth/db.js
// Backend-based authentication — calls FastAPI at localhost:8000

import { API_BASE_URL } from "../config/api";

const BACKEND_URL = API_BASE_URL;

// --------------------------------------------------------------------------
// Health check / init
// --------------------------------------------------------------------------
export async function initDB() {
  try {
    const resp = await fetch(`${BACKEND_URL}/health`);
    if (!resp.ok) throw new Error("Backend health check failed");
    console.log("✅ Backend connected");
    return true;
  } catch (e) {
    console.error("❌ Backend not responding:", e.message);
    throw new Error("Cannot connect to backend at " + BACKEND_URL);
  }
}

// --------------------------------------------------------------------------
// Login
// --------------------------------------------------------------------------
export async function dbLogin(email, password) {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      const msg = err.error?.message || err.detail || `Login failed (${resp.status})`;
      return { ok: false, message: msg };
    }
    const data = await resp.json();
    return { ok: true, user: data.user, message: data.message };
  } catch (e) {
    console.error("dbLogin error:", e);
    return { ok: false, message: "Network error: " + e.message };
  }
}

// --------------------------------------------------------------------------
// Register
// --------------------------------------------------------------------------
export async function dbRegister(email, password, name, confirm_password = "") {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password, confirm_password, name: name.trim() }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      const msg = err.error?.message || err.detail || `Registration failed (${resp.status})`;
      return { ok: false, message: msg };
    }
    const data = await resp.json();
    return { ok: true, user: data.user, message: data.message };
  } catch (e) {
    console.error("dbRegister error:", e);
    return { ok: false, message: "Network error: " + e.message };
  }
}

// --------------------------------------------------------------------------
// Admin registration
// --------------------------------------------------------------------------
export async function dbAdminRegister(email, password, name, adminEmail, adminPassword) {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/auth/admin-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password,
        name: name.trim(),
        admin_email: adminEmail.trim(),
        admin_password: adminPassword,
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return { ok: false, message: err.detail || `Admin registration failed (${resp.status})` };
    }
    return { ok: true };
  } catch (e) {
    console.error("dbAdminRegister error:", e);
    return { ok: false, message: "Network error: " + e.message };
  }
}

// --------------------------------------------------------------------------
// Admin: get all users
// --------------------------------------------------------------------------
export async function dbGetAllUsers(adminEmail, adminPassword) {
  try {
    const params = new URLSearchParams({
      admin_email: adminEmail,
      admin_password: adminPassword,
    });
    const resp = await fetch(`${BACKEND_URL}/api/admin/users?${params}`);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return { ok: false, message: err.detail || "Failed to fetch users", users: [] };
    }
    const data = await resp.json();
    return { ok: true, users: data.users };
  } catch (e) {
    console.error("dbGetAllUsers error:", e);
    return { ok: false, message: "Network error: " + e.message, users: [] };
  }
}

// --------------------------------------------------------------------------
// Admin: get login logs
// --------------------------------------------------------------------------
export async function dbGetLoginLogs(adminEmail, adminPassword) {
  try {
    const params = new URLSearchParams({
      admin_email: adminEmail,
      admin_password: adminPassword,
    });
    const resp = await fetch(`${BACKEND_URL}/api/admin/login-logs?${params}`);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return { ok: false, message: err.detail || "Failed to fetch logs", logs: [] };
    }
    const data = await resp.json();
    return { ok: true, logs: data.logs };
  } catch (e) {
    console.error("dbGetLoginLogs error:", e);
    return { ok: false, message: "Network error: " + e.message, logs: [] };
  }
}

// --------------------------------------------------------------------------
// Admin: set user role
// --------------------------------------------------------------------------
export async function dbSetRole(userId, newRole, adminEmail, adminPassword) {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/admin/set-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        new_role: newRole,
        admin_email: adminEmail,
        admin_password: adminPassword,
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return { ok: false, message: err.detail || "Failed to update role" };
    }
    return { ok: true };
  } catch (e) {
    console.error("dbSetRole error:", e);
    return { ok: false, message: "Network error: " + e.message };
  }
}