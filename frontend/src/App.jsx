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
          onSuccess={(loggedInUser) => {
            const role = loggedInUser?.role || user?.role;
            if (role === "admin") {
              window.history.pushState({}, "", "/admin");
              setCurrentPath("/admin");
            } else {
              window.history.pushState({}, "", "/");
              setCurrentPath("/");
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
          <button
            onClick={() => {
              window.history.pushState({}, "", "/");
              setCurrentPath("/");
            }}
            style={{
              marginTop: 20, padding: "10px 20px", borderRadius: 8,
              background: "#3b82f6", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600
            }}
          >
            ← Back to Store
          </button>
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
          window.history.pushState({}, "", "/");
          setCurrentPath("/");
        }}
      />
    );
  }

  // Explicit Checkout route
  if (currentPath.startsWith("/checkout") || currentPath.startsWith("/payment")) {
    if (!user) {
      return (
        <LoginPage
          onSuccess={() => {
            window.history.pushState({}, "", "/checkout");
            setCurrentPath("/checkout");
          }}
          onCancel={() => {
            window.history.pushState({}, "", "/");
            setCurrentPath("/");
          }}
        />
      );
    }
    return (
      <StoreFront
        currentPath={currentPath}
        onRequestLogin={(returnToCheckoutFlag = false) => {
          setReturnToCheckout(returnToCheckoutFlag);
          setShowLoginModal(true);
        }}
        initialCheckoutOpen={true}
        onCheckoutHandled={() => {
          setReturnToCheckout(false);
          window.history.pushState({}, "", "/");
          setCurrentPath("/");
        }}
      />
    );
  }

  // Explicit Protected Orders route
  if (currentPath === "/orders" || currentPath === "/order-history") {
    if (!user) {
      return (
        <LoginPage
          onSuccess={() => {
            window.history.pushState({}, "", "/orders");
            setCurrentPath("/orders");
          }}
          onCancel={() => {
            window.history.pushState({}, "", "/");
            setCurrentPath("/");
          }}
        />
      );
    }
    return (
      <StoreFront
        currentPath={currentPath}
        initialView="orders"
        onRequestLogin={(returnToCheckoutFlag = false) => {
          setReturnToCheckout(returnToCheckoutFlag);
          setShowLoginModal(true);
        }}
      />
    );
  }

  // Explicit Protected Profile route
  if (currentPath === "/profile") {
    if (!user) {
      return (
        <LoginPage
          onSuccess={() => {
            window.history.pushState({}, "", "/profile");
            setCurrentPath("/profile");
          }}
          onCancel={() => {
            window.history.pushState({}, "", "/");
            setCurrentPath("/");
          }}
        />
      );
    }
    return (
      <StoreFront
        currentPath={currentPath}
        initialView="profile"
        onRequestLogin={(returnToCheckoutFlag = false) => {
          setReturnToCheckout(returnToCheckoutFlag);
          setShowLoginModal(true);
        }}
      />
    );
  }

  // Explicit Wishlist route
  if (currentPath === "/wishlist") {
    return (
      <StoreFront
        currentPath={currentPath}
        initialView="wishlist"
        onRequestLogin={(returnToCheckoutFlag = false) => {
          setReturnToCheckout(returnToCheckoutFlag);
          setShowLoginModal(true);
        }}
      />
    );
  }

  // Explicit Catalogue route
  if (currentPath === "/catalogue" || currentPath === "/products") {
    return (
      <StoreFront
        currentPath={currentPath}
        initialView="catalogue"
        onRequestLogin={(returnToCheckoutFlag = false) => {
          setReturnToCheckout(returnToCheckoutFlag);
          setShowLoginModal(true);
        }}
      />
    );
  }

  // Explicit Cart route
  if (currentPath === "/cart") {
    return (
      <StoreFront
        currentPath={currentPath}
        initialCartOpen={true}
        onRequestLogin={(returnToCheckoutFlag = false) => {
          setReturnToCheckout(returnToCheckoutFlag);
          setShowLoginModal(true);
        }}
      />
    );
  }

  // Explicit Product Detail route: /product/:id
  if (currentPath.startsWith("/product/")) {
    const rawId = currentPath.replace("/product/", "").split("/")[0];
    const pid = decodeURIComponent(rawId);
    return (
      <StoreFront
        currentPath={currentPath}
        initialProductId={pid}
        onRequestLogin={(returnToCheckoutFlag = false) => {
          setReturnToCheckout(returnToCheckoutFlag);
          setShowLoginModal(true);
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

  // 404 Not Found check for unknown paths
  const knownPrefixes = ["/", "/home", "/catalogue", "/products", "/cart", "/checkout", "/payment", "/orders", "/order-history", "/wishlist", "/profile", "/login", "/register"];
  const isKnown = knownPrefixes.includes(currentPath) || currentPath.startsWith("/product/") || currentPath.startsWith("/admin") || currentPath.startsWith("/dev/mailbox");

  if (!isKnown) {
    return (
      <div data-testid="not-found-page" style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", background: "#0f172a",
        color: "#f8fafc", fontFamily: "system-ui, sans-serif", padding: 20, textAlign: "center"
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <h1 style={{ fontSize: 32, margin: "0 0 8px 0" }}>404 - Page Not Found</h1>
        <p data-testid="not-found-message" style={{ color: "#94a3b8", fontSize: 16, maxWidth: 440 }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <button
          data-testid="back-to-home-btn"
          onClick={() => {
            window.history.pushState({}, "", "/");
            setCurrentPath("/");
          }}
          style={{
            marginTop: 20, padding: "10px 20px", borderRadius: 8,
            background: "#3b82f6", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600
          }}
        >
          ← Return to Store
        </button>
      </div>
    );
  }

  // Default: StoreFront (accessible to Guests and Customers)
  return (
    <StoreFront
      currentPath={currentPath}
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
