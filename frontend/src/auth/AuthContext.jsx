import { createContext, useContext, useState, useEffect, useRef } from "react";
import { initDB, dbLogin } from "./db";

const STORAGE_SESSION = "glowiq_session";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Synchronously restore user from localStorage to avoid session loss on reload
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSION);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [dbReady, setDbReady] = useState(false);
  const [error,   setError]   = useState(null);
  const initDone = useRef(false);

  // ── Initialise backend connection once on mount ────────────────────────────
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    (async () => {
      try {
        await initDB();
        setDbReady(true);
      } catch (e) {
        console.error("Failed to connect to backend:", e.message);
        setError(e.message);
        setDbReady(true); // Still mark ready to avoid endless waiting
      }
    })();
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    if (!dbReady) return { ok: false, message: "Database not ready yet." };
    const result = await dbLogin(email, password);
    if (result.ok && result.user) {
      setUser(result.user);
      try {
        localStorage.setItem(STORAGE_SESSION, JSON.stringify(result.user));
      } catch (e) {
        console.error("Failed to save session:", e);
      }
    }
    return result;
  };

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_SESSION);
    } catch (e) {
      console.error("Failed to clear session:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, dbReady, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
