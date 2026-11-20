// src/App.jsx — Root router supporting Guest StoreFront, Login, Admin, DevMailbox, and 403/404 pages
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ThemeProvider } from "./theme/ThemeContext";
import LoginPage from "./pages/LoginPage";
import AdminApp from "./AdminApp";
import StoreFront from "./store/StoreFront";
import DevMailboxPage from "./pages/DevMailboxPage";

function Router() {
  const { user } = useAuth();
  const [currentPath, setCurrentPath] = useState(
    typeof window !== "undefined" ? window.location.pathname : "/"
  );
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [returnToCheckout, setReturnToCheckout] = useState(false);

  useEffect(() => {
    const onPop = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // REQ-ACC-04: Dev Mailbox route
  if (currentPath.startsWith("/dev/mailbox")) {
    return <DevMailboxPage />;
  }

  // REQ-ADM-01: Only admins can open /admin (others get 403 page)
  if (currentPath.startsWith("/admin")) {
    if (!user) {
      return (
        <LoginPage
          onSuccess={() => {
            if (user?.role === "admin") {
              window.location.href = "/admin";
            }
          }}
        />
      );
    }
    if (user.role !== "admin") {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", background: "#0f172a",
          color: "#f8fafc", fontFamily: "system-ui, sans-serif", padding: 20, textAlign: "center"
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚫</div>
          <h1 style={{ fontSize: 28, margin: "0 0 8px 0" }}>403 - Forbidden</h1>
          <p data-testid="forbidden-error" style={{ color: "#94a3b8", fontSize: 16, maxWidth: 440 }}>
            Only admins can open /admin
          </p>
          <a
            href="/"
            style={{
              marginTop: 20, padding: "10px 20px", borderRadius: 8,
              background: "#3b82f6", color: "#fff", textDecoration: "none", fontWeight: 600
            }}
          >
            ← Back to Store
          </a>
        </div>
      );
    }
    return <AdminApp />;
  }

  // Explicit Login / Register route
  if (currentPath === "/login" || currentPath === "/register") {
    return (
      <LoginPage
        onSuccess={() => {
          window.location.href = "/";
        }}
      />
    );
  }

  // If redirected from checkout or login requested
  if (showLoginModal && !user) {
    return (
      <LoginPage
        onSuccess={() => {
          setShowLoginModal(false);
        }}
        onCancel={() => {
          setShowLoginModal(false);
          setReturnToCheckout(false);
        }}
      />
    );
  }

  // Default: StoreFront (accessible to Guests and Customers)
  return (
    <StoreFront
      onRequestLogin={(returnToCheckoutFlag = false) => {
        setReturnToCheckout(returnToCheckoutFlag);
        setShowLoginModal(true);
      }}
      initialCheckoutOpen={returnToCheckout && Boolean(user)}
      onCheckoutHandled={() => setReturnToCheckout(false)}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router />
      </ThemeProvider>
    </AuthProvider>
  );
}
