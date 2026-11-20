// src/pages/LoginPage.jsx — ShopLab Login/Register/Forgot/Reset Password
import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { dbRegister, dbAdminRegister } from "../auth/db";

// PaymentGateway Blossom theme
const T = {
  bg: "#fff5f7", surface: "#ffffff", card: "#ffffff",
  border: "#fcd5ce", borderStrong: "#f4a0bb",
  accent: "#e879a0", accentSoft: "#fce7f3",
  accentGrad: "linear-gradient(135deg, #f8a5c2 0%, #c77dff 100%)",
  text: "#3d1a26", textMid: "#8c4a6e", textSoft: "#c985aa",
  danger: "#ef4444", success: "#10b981",
  chip: "#fce7f3", chipText: "#be185d",
};

const LOGIN_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'DM Sans', sans-serif; }
@keyframes fadeSlideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
.lp-input:focus { border-color: #e879a0 !important; box-shadow: 0 0 0 3px #fce7f3 !important; outline: none; }
.lp-tab:hover { opacity: 0.85; }
.lp-btn:hover { opacity: 0.88; transform: translateY(-1px); }
.lp-btn:active { transform: scale(0.97); }
.lp-btn, .lp-tab { transition: all 0.18s ease; }
`;

export default function LoginPage({ onSuccess, onCancel }) {
  const { login, dbReady } = useAuth();
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    const id = "lp-css";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id; el.textContent = LOGIN_CSS;
      document.head.appendChild(el);
    }

    // Check if URL has reset token
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      if (token) {
        setResetToken(token);
        setTab("reset");
      }
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    const result = await login(email.trim(), password);
    if (!result.ok) {
      setError(result.message || "Invalid email or password");
    } else {
      setSuccess(`Welcome, ${result.user?.name || "Customer"}`);
      setTimeout(() => {
        onSuccess?.(result.user);
      }, 300);
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    // REQ-ACC-01 Password Complexity: at least 8 chars, 1 uppercase, 1 number, 1 special character
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (password.length < 8 || !hasUpper || !hasDigit || !hasSpecial) {
      setError("Password must be at least 8 characters with 1 uppercase letter, 1 number, and 1 special character.");
      return;
    }

    setLoading(true);
    const reg = await dbRegister(email.trim(), password, name.trim(), confirmPassword);
    if (!reg.ok) {
      setError(reg.message || "Registration failed");
      setLoading(false);
      return;
    }
    // On success: automatically login and show welcome
    const result = await login(email.trim(), password);
    if (result.ok) {
      setSuccess(`Welcome, ${name.trim()}`);
      setTimeout(() => {
        onSuccess?.(result.user);
      }, 400);
    } else {
      setSuccess("Account created successfully! Please sign in.");
      setTab("login");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!forgotEmail.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error?.message || data.detail || "Unable to send reset link.");
      } else {
        setSuccess(data.message || "If the email is registered, a password reset link has been sent. Check /dev/mailbox");
      }
    } catch {
      setError("Error sending password reset request.");
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, new_password: newPassword }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error?.message || data.detail || "Reset link is invalid or expired.");
      } else {
        setSuccess("Password updated successfully! You can now sign in.");
        setTimeout(() => setTab("login"), 1500);
      }
    } catch {
      setError("Error resetting password.");
    }
    setLoading(false);
  };

  const tabs = [
    { id: "login", label: "Sign In" },
    { id: "register", label: "Register" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", padding: "1rem" }}>
      <div style={{ width: "100%", maxWidth: 440, animation: "fadeSlideUp 0.4s ease both" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: T.accentGrad, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: `0 12px 30px ${T.accent}30` }}>
            <span style={{ fontSize: 26 }}>✨</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "2rem", fontWeight: 700, color: T.text, margin: 0 }}>ShopLab</h1>
          <p style={{ color: T.textSoft, fontSize: "0.85rem", marginTop: 4 }}>E-Commerce Test Platform</p>
        </div>

        <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 20, padding: "2rem", boxShadow: "0 20px 50px rgba(0,0,0,0.06)" }}>
          {/* Tabs */}
          {tab !== "forgot" && tab !== "reset" && (
            <div style={{ display: "flex", gap: 6, marginBottom: "1.5rem", background: T.accentSoft, borderRadius: 12, padding: 4 }}>
              {tabs.map(t => (
                <button
                  key={t.id}
                  className="lp-tab"
                  onClick={() => { setTab(t.id); setError(""); setSuccess(""); }}
                  style={{
                    flex: 1, padding: "9px 8px", borderRadius: 10, border: "none",
                    background: tab === t.id ? T.accentGrad : "transparent",
                    color: tab === t.id ? "#fff" : T.textMid,
                    fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Sign In Form */}
          {tab === "login" && (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", color: T.textMid, fontSize: "0.78rem", fontWeight: 600, marginBottom: 6, textTransform: "uppercase" }}>Email</label>
                <input
                  className="lp-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="customer1@shoplab.test"
                  data-testid="login-email-input"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, fontSize: "0.9rem" }}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ color: T.textMid, fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase" }}>Password</label>
                  <button
                    type="button"
                    onClick={() => { setTab("forgot"); setError(""); setSuccess(""); }}
                    data-testid="forgot-password-link"
                    style={{ background: "none", border: "none", color: T.accent, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", padding: 0 }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    className="lp-input"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Test@1234"
                    data-testid="login-password-input"
                    style={{ width: "100%", padding: "12px 42px 12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, fontSize: "0.9rem" }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.textSoft, fontSize: 16 }}>
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {error && <ErrorBox msg={error} />}
              {success && <SuccessBox msg={success} />}

              <button
                type="submit"
                data-testid="login-submit-button"
                disabled={loading || !dbReady}
                className="lp-btn"
                style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: T.accentGrad, color: "#fff", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer" }}
              >
                {loading ? "Signing in…" : "Sign In →"}
              </button>
            </form>
          )}

          {/* Register Form (REQ-ACC-01) */}
          {tab === "register" && (
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", color: T.textMid, fontSize: "0.78rem", fontWeight: 600, marginBottom: 6, textTransform: "uppercase" }}>Full Name</label>
                <input
                  className="lp-input"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jane Doe"
                  data-testid="register-name-input"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, fontSize: "0.9rem" }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", color: T.textMid, fontSize: "0.78rem", fontWeight: 600, marginBottom: 6, textTransform: "uppercase" }}>Email</label>
                <input
                  className="lp-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  data-testid="register-email-input"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, fontSize: "0.9rem" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", color: T.textMid, fontSize: "0.78rem", fontWeight: 600, marginBottom: 6, textTransform: "uppercase" }}>Password</label>
                <input
                  className="lp-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 upper, 1 num, 1 special"
                  data-testid="register-password-input"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, fontSize: "0.9rem" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", color: T.textMid, fontSize: "0.78rem", fontWeight: 600, marginBottom: 6, textTransform: "uppercase" }}>Confirm Password</label>
                <input
                  className="lp-input"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  data-testid="register-confirm-password-input"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, fontSize: "0.9rem" }}
                />
              </div>

              {error && <ErrorBox msg={error} />}
              {success && <SuccessBox msg={success} />}

              <button
                type="submit"
                data-testid="btn-register-submit"
                disabled={loading || !dbReady}
                className="lp-btn"
                style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: T.accentGrad, color: "#fff", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer" }}
              >
                {loading ? "Creating account…" : "Create Account →"}
              </button>
            </form>
          )}

          {/* Forgot Password Form (REQ-ACC-04) */}
          {tab === "forgot" && (
            <form onSubmit={handleForgotPassword}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4 }}>Forgot Password</h3>
                <p style={{ fontSize: 13, color: T.textSoft }}>Enter your email to receive a password reset link.</p>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", color: T.textMid, fontSize: "0.78rem", fontWeight: 600, marginBottom: 6, textTransform: "uppercase" }}>Email Address</label>
                <input
                  className="lp-input"
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="customer1@shoplab.test"
                  data-testid="forgot-email-input"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, fontSize: "0.9rem" }}
                  autoFocus
                />
              </div>

              {error && <ErrorBox msg={error} />}
              {success && (
                <div style={{ marginBottom: "1rem" }}>
                  <SuccessBox msg={success} />
                  <a href="/dev/mailbox" style={{ fontSize: 13, color: T.accent, fontWeight: 600 }}>
                    📬 Open Dev Mailbox to view reset link →
                  </a>
                </div>
              )}

              <button
                type="submit"
                data-testid="forgot-submit-btn"
                disabled={loading}
                className="lp-btn"
                style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: T.accentGrad, color: "#fff", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer" }}
              >
                {loading ? "Sending link…" : "Send Reset Link"}
              </button>

              <button
                type="button"
                onClick={() => { setTab("login"); setError(""); setSuccess(""); }}
                style={{ width: "100%", marginTop: 10, padding: "10px", background: "none", border: "none", color: T.textMid, fontSize: "0.85rem", cursor: "pointer" }}
              >
                ← Back to Sign In
              </button>
            </form>
          )}

          {/* Reset Password Form (REQ-ACC-04) */}
          {tab === "reset" && (
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4 }}>Set New Password</h3>
                <p style={{ fontSize: 13, color: T.textSoft }}>Enter your new account password.</p>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", color: T.textMid, fontSize: "0.78rem", fontWeight: 600, marginBottom: 6, textTransform: "uppercase" }}>New Password</label>
                <input
                  className="lp-input"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  data-testid="reset-password-input"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, fontSize: "0.9rem" }}
                  autoFocus
                />
              </div>

              {error && <ErrorBox msg={error} />}
              {success && <SuccessBox msg={success} />}

              <button
                type="submit"
                data-testid="reset-submit-btn"
                disabled={loading}
                className="lp-btn"
                style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: T.accentGrad, color: "#fff", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer" }}
              >
                {loading ? "Updating password…" : "Update Password"}
              </button>
            </form>
          )}

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{ width: "100%", marginTop: 14, padding: "10px", borderRadius: 10, border: `1px solid ${T.border}`, background: "none", color: T.textMid, fontSize: "0.85rem", cursor: "pointer" }}
            >
              ← Continue as Guest
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div data-testid="login-error-message" style={{ background: "#ef444415", border: "1px solid #ef444444", borderRadius: 10, padding: "10px 14px", color: "#ef4444", fontSize: "0.82rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
      <span>⚠️</span> {msg}
    </div>
  );
}

function SuccessBox({ msg }) {
  return (
    <div data-testid="login-success-message" style={{ background: "#10b98115", border: "1px solid #10b98144", borderRadius: 10, padding: "10px 14px", color: "#10b981", fontSize: "0.82rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
      <span>✅</span> {msg}
    </div>
  );
}
