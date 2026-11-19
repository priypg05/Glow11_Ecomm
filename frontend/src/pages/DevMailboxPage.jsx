import React, { useEffect, useState } from "react";
import { ENDPOINTS } from "../config/api";

export default function DevMailboxPage() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const res = await fetch(ENDPOINTS.mailbox);
      if (!res.ok) {
        throw new Error(`Mailbox response: ${res.status}`);
      }
      const data = await res.json();
      setEmails(data.emails || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  return (
    <div style={{
      maxWidth: 800,
      margin: "40px auto",
      padding: 24,
      fontFamily: "system-ui, -apple-system, sans-serif",
      backgroundColor: "#fff",
      borderRadius: 12,
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: "#111827" }}>📬 Dev Mailbox (QA / Test)</h1>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
            Simulated mailbox for test automation (REQ-ACC-04)
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={fetchEmails}
            style={{
              padding: "8px 16px",
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Refresh
          </button>
          <a
            href="/"
            style={{
              padding: "8px 16px",
              background: "#e5e7eb",
              color: "#374151",
              textDecoration: "none",
              borderRadius: 6,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            ← Store
          </a>
        </div>
      </div>

      {loading && <p style={{ color: "#6b7280" }}>Loading simulated emails...</p>}
      {error && <p style={{ color: "#ef4444" }}>Error loading mailbox: {error}</p>}

      {!loading && !error && emails.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", background: "#f9fafb", borderRadius: 8 }}>
          No emails sent yet. Submit a password reset request to see links here.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {emails.map((e) => (
          <div
            key={e.id}
            data-testid="mailbox-email-item"
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 16,
              background: "#fafafa",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontWeight: 600, color: "#1f2937" }}>To: {e.to}</span>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>{new Date(e.sent_at).toLocaleTimeString()}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "#374151", marginBottom: 8 }}>
              {e.subject}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>Reset Link:</span>
              <a
                href={e.link}
                data-testid="mailbox-reset-link"
                style={{ fontSize: 13, color: "#2563eb", wordBreak: "break-all" }}
              >
                {e.link}
              </a>
            </div>
            {e.used && (
              <span style={{ display: "inline-block", marginTop: 8, fontSize: 11, background: "#fee2e2", color: "#dc2626", padding: "2px 6px", borderRadius: 4 }}>
                Token Used
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
