import { useState, useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import { ENDPOINTS } from "../config/api";
import { FALLBACK_PRODUCT_IMAGE } from "../config/constants";

// ── Themes ──────────────────────────────────────────────────────────────────
const THEMES = {
  blossom: {
    name: "Blossom",
    swatch: ["#fcd5ce", "#f8a5c2", "#c77dff"],
    light: {
      bg: "#fff5f7", surface: "#ffffff", card: "#ffffff",
      border: "#fcd5ce", borderStrong: "#f4a0bb",
      accent: "#e879a0", accentSoft: "#fce7f3",
      accentGrad: "linear-gradient(135deg, #f8a5c2 0%, #c77dff 100%)",
      text: "#3d1a26", textMid: "#8c4a6e", textSoft: "#c985aa",
      success: "#10b981", warning: "#f59e0b", danger: "#ef4444",
      chip: "#fce7f3", chipText: "#be185d",
    },
    dark: {
      bg: "#1a0d12", surface: "#2a1520", card: "#231018",
      border: "#5a2040", borderStrong: "#8b3060",
      accent: "#f472b6", accentSoft: "#4a1530",
      accentGrad: "linear-gradient(135deg, #db2777 0%, #9333ea 100%)",
      text: "#fde8f0", textMid: "#e8a0c8", textSoft: "#a06080",
      success: "#34d399", warning: "#fbbf24", danger: "#f87171",
      chip: "#4a1530", chipText: "#f9a8d4",
    },
  },
  lavender: {
    name: "Lavender",
    swatch: ["#e9d5ff", "#a78bfa", "#7c3aed"],
    light: {
      bg: "#f5f3ff", surface: "#ffffff", card: "#ffffff",
      border: "#e9d5ff", borderStrong: "#c4b5fd",
      accent: "#7c3aed", accentSoft: "#ede9fe",
      accentGrad: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
      text: "#1e1145", textMid: "#5b21b6", textSoft: "#9c85c8",
      success: "#059669", warning: "#d97706", danger: "#dc2626",
      chip: "#ede9fe", chipText: "#6d28d9",
    },
    dark: {
      bg: "#0f0a1e", surface: "#1a1230", card: "#160e28",
      border: "#3b2770", borderStrong: "#6d28d9",
      accent: "#a78bfa", accentSoft: "#2d1b6b",
      accentGrad: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
      text: "#ede9fe", textMid: "#c4b5fd", textSoft: "#7c6aa8",
      success: "#34d399", warning: "#fbbf24", danger: "#f87171",
      chip: "#2d1b6b", chipText: "#c4b5fd",
    },
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatCard(v) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(v) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
}
function formatCVV(v) {
  return v.replace(/\D/g, "").slice(0, 3);
}
function detectBrand(num) {
  const n = num.replace(/\s/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  return null;
}

function fmtPrice(n) {
  if (typeof n !== "number") n = Number(n) || 0;
  return "$" + n.toFixed(2);
}

function parsePriceValue(price) {
  if (typeof price === "number") return price;
  const s = String(price || "0").trim();
  if (s.includes(".") && !s.includes(",")) {
    const val = parseFloat(s.replace(/[^0-9.]/g, ""));
    if (!isNaN(val)) return val;
  }
  return parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
}

function normalizeCartItems(items) {
  return (items || []).map((item, index) => ({
    id: item.id ?? item.product_id ?? `${item.name || "item"}-${index}`,
    name: item.name || item.product_name || "Product",
    brand: item.brand || "ShopLab",
    category: item.category || item.type || item.product_type || "General",
    qty: item.qty || 1,
    price: item.isSample || item.price === "FREE" ? 0 : parsePriceValue(item.price ?? item.price_num),
    img: item.img || item.picture_src || "",
  }));
}

// ── Keyframe injection ────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'DM Sans', sans-serif; }
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
@keyframes checkPop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
@keyframes spinLoader { to { transform: rotate(360deg); } }
.pg-root input, .pg-root select { outline: none; }
.pg-step-btn:hover { opacity: 0.88; transform: translateY(-1px); }
.pg-step-btn:active { transform: scale(0.98); }
.pg-step-btn { transition: all 0.18s ease; }
.pg-method-card:hover { border-color: #e879a0 !important; transform: translateY(-2px); }
.pg-method-card { transition: all 0.2s ease; }
`;

// ── Card Visual ──────────────────────────────────────────────────────────────
function CreditCardVisual({ number, name, expiry, flipped, brand, T }) {
  const displayNum = (number.replace(/\s/g, "") + "0000000000000000").slice(0, 16).match(/.{4}/g).join(" ");
  const displayName = name || "YOUR NAME";
  const displayExp = expiry || "MM/YY";

  return (
    <div style={{ perspective: 800, width: 320, height: 180, margin: "0 auto" }}>
      <div style={{
        width: "100%", height: "100%", position: "relative",
        transformStyle: "preserve-3d",
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden",
          borderRadius: 18, padding: "20px 22px",
          background: T.accentGrad,
          boxShadow: "0 16px 40px -10px rgba(0,0,0,0.3)",
          overflow: "hidden", color: "#fff",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <div style={{ width: 36, height: 26, borderRadius: 5, background: "linear-gradient(135deg, #d4af37, #f5d96e)" }} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>{brand ? brand.toUpperCase() : "TEST CARD"}</span>
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 16, letterSpacing: 2, marginBottom: 16 }}>
            {displayNum}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: 9, opacity: 0.7, textTransform: "uppercase" }}>Card Holder</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{displayName.slice(0, 20)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, opacity: 0.7, textTransform: "uppercase" }}>Expires</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{displayExp}</div>
            </div>
          </div>
        </div>

        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden",
          borderRadius: 18, overflow: "hidden",
          transform: "rotateY(180deg)",
          background: T.accentGrad,
          boxShadow: "0 16px 40px -10px rgba(0,0,0,0.3)",
        }}>
          <div style={{ marginTop: 26, height: 38, background: "rgba(0,0,0,0.4)" }} />
          <div style={{ padding: "12px 20px" }}>
            <div style={{ background: "#fff", borderRadius: 4, padding: "6px 10px", textAlign: "right", marginTop: 10 }}>
              <span style={{ fontSize: 9, color: "#888", marginRight: 6 }}>CVV</span>
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#111" }}>•••</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Order Summary Panel (Section 5.4 REQ-PRC-01 to REQ-PRC-07) ────────────────
function OrderSummary({ T, items, shippingMethod = "standard", appliedCoupon, couponCode, setCouponCode, onApplyCoupon, couponMsg }) {
  // REQ-PRC-01 & REQ-PRC-02
  const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
  const discount = appliedCoupon ? appliedCoupon.discount : 0;

  // REQ-PRC-04: Standard 5.99, free when (subtotal - discount) >= 100.00; Express 14.99 (never free, except with FREESHIP)
  let shipping = (shippingMethod === "express") ? 14.99 : 5.99;
  if (appliedCoupon?.code === "FREESHIP") {
    shipping = 0.00;
  } else if (shippingMethod === "standard" || shippingMethod === "regular") {
    if ((subtotal - discount) >= 100.00) {
      shipping = 0.00;
    }
  }

  // REQ-PRC-05: Tax calculation
  const taxableBase = Math.max(0, subtotal - discount + shipping);
  const tax = Math.round(taxableBase * 0.18 * 100) / 100;

  // REQ-PRC-06: Order total calculation
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, animation: "fadeSlideUp 0.4s ease both" }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }}>
        Order Summary
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        {items.map(item => (
          <div key={item.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{
              width: 48, height: 48, borderRadius: 10, overflow: "hidden", flexShrink: 0,
              border: `1.5px solid ${T.border}`, background: T.surface,
              position: "relative",
            }}>
              <img
                src={item.img || FALLBACK_PRODUCT_IMAGE}
                alt={item.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={e => {
                  if (e.currentTarget.src !== FALLBACK_PRODUCT_IMAGE) {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                  }
                }}
              />
              <div style={{
                position: "absolute", top: -4, right: -4,
                width: 18, height: 18, borderRadius: "50%",
                background: T.accent, color: "#fff",
                fontSize: 10, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{item.qty}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
              <div style={{ fontSize: 11, color: T.textSoft }}>{item.brand}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, flexShrink: 0 }}>{fmtPrice(item.price * item.qty)}</div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: `1px dashed ${T.border}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: T.textMid }}>Subtotal</span>
          <span data-testid="cart-subtotal" style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{fmtPrice(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: T.textMid }}>Discount ({appliedCoupon?.code || "Coupon"})</span>
            <span data-testid="cart-discount" style={{ fontSize: 13, fontWeight: 600, color: T.success }}>-{fmtPrice(discount)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: T.textMid }}>Shipping ({shippingMethod === "express" ? "Express" : "Standard"})</span>
          <span data-testid="cart-shipping" style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{shipping === 0 ? "FREE" : fmtPrice(shipping)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: T.textMid }}>Tax (18% Rate)</span>
          <span data-testid="cart-tax" style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{fmtPrice(tax)}</span>
        </div>
      </div>

      <div style={{
        borderTop: `1.5px solid ${T.borderStrong}`, marginTop: 16, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center",
        background: T.accentSoft, borderRadius: 12, padding: "14px 16px", border: `2px solid ${T.borderStrong}`
      }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: T.text }}>Total</span>
        <span data-testid="order-summary-total" style={{ fontWeight: 800, fontSize: 20, background: T.accentGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          {fmtPrice(total)}
        </span>
      </div>

      {/* Coupon input (Section 5.4 REQ-PRC-03 & Section 7) */}
      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <input
          placeholder="Promo / Coupon code"
          value={couponCode || ""}
          onChange={e => setCouponCode?.(e.target.value)}
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 10,
            border: `1.5px solid ${T.border}`, background: T.surface,
            color: T.text, fontSize: 13,
          }}
        />
        <button
          onClick={onApplyCoupon}
          data-testid="apply-cupon-btn"
          style={{
            padding: "10px 16px", borderRadius: 10,
            border: `1.5px solid ${T.accent}`,
            background: T.accentSoft, color: T.accent,
            fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          Apply
        </button>
      </div>
      {couponMsg && (
        <div data-testid="coupon-message" style={{ fontSize: 12, marginTop: 6, color: appliedCoupon ? T.success : T.danger, fontWeight: 600 }}>
          {couponMsg}
        </div>
      )}
    </div>
  );
}

// ── Step Indicator ────────────────────────────────────────────────────────────
function StepIndicator({ step, T }) {
  const steps = [
    { n: 1, label: "Address" },
    { n: 2, label: "Payment" },
    { n: 3, label: "Review" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 28 }}>
      {steps.map((s, i) => (
        <div key={s.n} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: step >= s.n ? T.accentGrad : T.surface,
              border: step >= s.n ? "none" : `2px solid ${T.border}`,
              color: step >= s.n ? "#fff" : T.textSoft,
              fontWeight: 700, fontSize: 13,
            }}>
              {step > s.n ? "✓" : s.n}
            </div>
            <span style={{ fontSize: 11, color: step >= s.n ? T.accent : T.textSoft, fontWeight: step === s.n ? 700 : 500 }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ width: 60, height: 2, margin: "0 6px", marginBottom: 18, background: step > s.n ? T.accent : T.border }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Address (REQ-CHK-02) ──────────────────────────────────────────────
function AddressStep({ T, data, setData, onNext }) {
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (key, val) => {
    setData(prev => ({ ...prev, [key]: val }));
    setErrorMsg("");
  };

  const validate = () => {
    if (!data.name?.trim()) {
      setErrorMsg("Full Name is required.");
      return false;
    }
    if (!data.street?.trim()) {
      setErrorMsg("Street Address is required.");
      return false;
    }
    if (!data.city?.trim()) {
      setErrorMsg("City is required.");
      return false;
    }
    // REQ-CHK-02: postal code validation
    const isPostalValid = Boolean(data.postal && data.postal.length > 5);
    if (!isPostalValid) {
      setErrorMsg("Postal code must be more than 5 digits.");
      return false;
    }
    // REQ-CHK-02: phone 10 digits
    const phoneClean = (data.phone || "").replace(/\D/g, "");
    if (!/^\d{10}$/.test(phoneClean)) {
      setErrorMsg("Phone number must be exactly 10 digits.");
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <div style={{ animation: "fadeSlideUp 0.4s ease both" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: T.text, marginBottom: 4 }}>
          Shipping Address (REQ-CHK-02)
        </h2>
        <p style={{ fontSize: 13, color: T.textSoft }}>Fields marked with * are required.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>Full Name *</label>
          <input
            data-testid="delivery-name"
            value={data.name || ""}
            onChange={e => handleChange("name", e.target.value)}
            placeholder="John Doe"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, marginTop: 4 }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>Email Address *</label>
          <input
            data-testid="delivery-email"
            value={data.email || ""}
            onChange={e => handleChange("email", e.target.value)}
            placeholder="customer@shoplab.test"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, marginTop: 4 }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>Street Address *</label>
          <input
            data-testid="delivery-address"
            value={data.street || ""}
            onChange={e => handleChange("street", e.target.value)}
            placeholder="123 Market St, Suite 400"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, marginTop: 4 }}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>City *</label>
            <input
              data-testid="delivery-city"
              value={data.city || ""}
              onChange={e => handleChange("city", e.target.value)}
              placeholder="San Jose"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, marginTop: 4 }}
            />
          </div>
          <div style={{ width: 140 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>Postal Code (5 digits) *</label>
            <input
              data-testid="delivery-postal"
              value={data.postal || ""}
              onChange={e => handleChange("postal", e.target.value)}
              placeholder="95113"
              maxLength={5}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, marginTop: 4 }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>Phone (10 digits) *</label>
          <input
            data-testid="delivery-phone"
            value={data.phone || ""}
            onChange={e => handleChange("phone", e.target.value)}
            placeholder="4085551234"
            maxLength={14}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, marginTop: 4 }}
          />
        </div>

        {/* Shipping Method (REQ-PRC-04) */}
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: T.textMid }}>Shipping Method</label>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            {[
              { id: "standard", label: "Standard Shipping", rate: "$5.99 (Free over $100)", testId: "shipping-opt-standard" },
              { id: "express", label: "Express Shipping", rate: "$14.99 (1-2 days)", testId: "shipping-opt-express" },
            ].map(s => (
              <div
                key={s.id}
                data-testid={s.testId}
                onClick={() => setData(p => ({ ...p, shipping: s.id }))}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12, cursor: "pointer",
                  border: `2px solid ${data.shipping === s.id ? T.accent : T.border}`,
                  background: data.shipping === s.id ? T.accentSoft : T.surface,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{s.label}</div>
                <div style={{ fontSize: 11, color: T.textSoft, marginTop: 2 }}>{s.rate}</div>
              </div>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div data-testid="address-error" style={{ padding: "10px 14px", borderRadius: 8, background: `${T.danger}15`, color: T.danger, fontSize: 13, fontWeight: 600 }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <button
          className="pg-step-btn"
          data-testid="continue-to-payment-btn"
          onClick={handleContinue}
          disabled={!Boolean(data.postal && data.postal.length > 5)}
          style={{
            width: "100%", marginTop: 16, padding: "14px",
            borderRadius: 12, border: "none",
            background: (!data.postal || data.postal.length <= 5) ? T.border : T.accentGrad,
            color: "#fff",
            fontSize: 15, fontWeight: 700,
            cursor: (!data.postal || data.postal.length <= 5) ? "not-allowed" : "pointer",
          }}
        >
          Continue to Payment →
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Payment (REQ-CHK-03) ──────────────────────────────────────────────
function PaymentStep({ T, data, setData, onNext, onBack }) {
  const [flipped, setFlipped] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const brand = detectBrand(data.cardNum || "");

  const handleCardNumberChange = (val) => {
    setData(p => ({ ...p, cardNum: formatCard(val) }));
    setPaymentError("");
  };

  const validateCard = () => {
    const rawNum = (data.cardNum || "").replace(/\s/g, "");
    if (!rawNum) {
      setPaymentError("Card number is required.");
      return false;
    }
    // REQ-CHK-03 Card simulation outcomes
    if (rawNum === "4000000000000002") {
      setPaymentError("Card declined");
      return false;
    }
    if (rawNum === "4000000000009995") {
      setPaymentError("Insufficient funds");
      return false;
    }
    if (rawNum.length !== 16) {
      setPaymentError("Card number must be 16 digits.");
      return false;
    }

    // Expiry check: future date MM/YY
    const exp = (data.cardExp || "").trim();
    if (!/^\d{2}\/\d{2}$/.test(exp)) {
      setPaymentError("Expiry must be in MM/YY format.");
      return false;
    }
    const [expMonth, expYear] = exp.split("/").map(Number);
    if (expMonth < 1 || expMonth > 12) {
      setPaymentError("Expiry month must be between 01 and 12.");
      return false;
    }
    const now = new Date();
    const curYear = now.getFullYear() % 100;
    const curMonth = now.getMonth() + 1;
    if (expYear < curYear || (expYear === curYear && expMonth < curMonth)) {
      setPaymentError("Expiry must be in the future.");
      return false;
    }

    // CVV check: 3 digits
    const cvv = (data.cardCvv || "").trim();
    if (!/^\d{3}$/.test(cvv)) {
      setPaymentError("CVV must be 3 digits.");
      return false;
    }

    return true;
  };

  const handleReviewOrder = () => {
    if (validateCard()) {
      onNext();
    }
  };

  return (
    <div style={{ animation: "fadeSlideUp 0.4s ease both" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: T.text, marginBottom: 4 }}>
          Payment Details (REQ-CHK-03)
        </h2>
        <p style={{ fontSize: 13, color: T.textSoft }}>Simulated test cards are supported.</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <CreditCardVisual
          number={data.cardNum || ""}
          name={data.cardName || ""}
          expiry={data.cardExp || ""}
          flipped={flipped}
          brand={brand}
          T={T}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>Card Number (16 digits) *</label>
          <input
            data-testid="card-number-input"
            value={data.cardNum || ""}
            onChange={e => handleCardNumberChange(e.target.value)}
            placeholder="4111 1111 1111 1111"
            maxLength={19}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, fontFamily: "monospace", marginTop: 4 }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>Cardholder Name *</label>
          <input
            data-testid="card-name-input"
            value={data.cardName || ""}
            onChange={e => { setData(p => ({ ...p, cardName: e.target.value })); setPaymentError(""); }}
            placeholder="JOHN DOE"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, marginTop: 4 }}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>Expiry (MM/YY) *</label>
            <input
              data-testid="card-expiry-input"
              value={data.cardExp || ""}
              onChange={e => { setData(p => ({ ...p, cardExp: formatExpiry(e.target.value) })); setPaymentError(""); }}
              placeholder="12/28"
              maxLength={5}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, marginTop: 4 }}
            />
          </div>
          <div style={{ width: 120 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>CVV (3 digits) *</label>
            <input
              data-testid="card-cvv-input"
              value={data.cardCvv || ""}
              onChange={e => { setData(p => ({ ...p, cardCvv: formatCVV(e.target.value) })); setPaymentError(""); }}
              onFocus={() => setFlipped(true)}
              onBlur={() => setFlipped(false)}
              placeholder="123"
              maxLength={3}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, marginTop: 4 }}
            />
          </div>
        </div>

        {paymentError && (
          <div data-testid="payment-error" style={{ padding: "10px 14px", borderRadius: 8, background: `${T.danger}15`, color: T.danger, fontSize: 13, fontWeight: 600 }}>
            ⚠️ {paymentError}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button className="pg-step-btn" onClick={onBack} style={{ flex: 1, padding: "14px", borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.surface, color: T.textMid, cursor: "pointer", fontWeight: 600 }}>
            ← Back
          </button>
          <button className="pg-step-btn" data-testid="continue-to-review-btn" onClick={handleReviewOrder} style={{ flex: 2, padding: "14px", borderRadius: 12, border: "none", background: T.accentGrad, color: "#fff", cursor: "pointer", fontWeight: 700 }}>
            Review Order →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Review & Place Order (REQ-PRC-07, REQ-CHK-04, REQ-CHK-05, REQ-CHK-06)
function ReviewStep({ T, data, items, appliedCoupon, onBack, onPay, orderError, processing }) {
  const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  let shipping = (data.shipping === "express") ? 14.99 : 5.99;
  if (appliedCoupon?.code === "FREESHIP") {
    shipping = 0.00;
  } else if (data.shipping === "standard" || data.shipping === "regular") {
    if ((subtotal - discount) >= 100.00) shipping = 0.00;
  }
  const taxableBase = Math.max(0, subtotal - discount + shipping);
  const tax = Math.round(taxableBase * 0.08 * 100) / 100;
  const total = Math.round((subtotal - discount + shipping + tax) * 100) / 100;

  return (
    <div style={{ animation: "fadeSlideUp 0.4s ease both" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: T.text, marginBottom: 4 }}>Review Your Order</h2>
        <p style={{ fontSize: 13, color: T.textSoft }}>Please confirm your delivery and order breakdown.</p>
      </div>

      <div style={{ background: T.surface, borderRadius: 14, border: `1.5px solid ${T.border}`, padding: "16px 20px", marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.textSoft, textTransform: "uppercase", marginBottom: 8 }}>Delivery Address</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{data.name}</div>
        <div style={{ fontSize: 13, color: T.textMid }}>{data.street}, {data.city} {data.postal}</div>
        <div style={{ fontSize: 13, color: T.textMid }}>Phone: {data.phone} | Email: {data.email}</div>
        <div style={{ fontSize: 13, color: T.accent, fontWeight: 600, marginTop: 4 }}>
          Shipping: {data.shipping === "express" ? "Express ($14.99)" : "Standard ($5.99)"}
        </div>
      </div>

      <div style={{ background: T.surface, borderRadius: 14, border: `1.5px solid ${T.border}`, padding: "16px 20px", marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.textSoft, textTransform: "uppercase", marginBottom: 8 }}>Payment Method</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Credit Card (Ending in {(data.cardNum || "").replace(/\s/g, "").slice(-4) || "4111"})</div>
      </div>

      <div style={{ background: T.surface, borderRadius: 14, border: `1.5px solid ${T.border}`, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.textSoft, textTransform: "uppercase", marginBottom: 10 }}>Order Breakdown (REQ-PRC-07)</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: T.textMid }}>Subtotal</span>
          <span data-testid="order-subtotal" style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{fmtPrice(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: T.textMid }}>Discount ({appliedCoupon?.code})</span>
            <span data-testid="order-discount" style={{ fontSize: 13, fontWeight: 600, color: T.success }}>-{fmtPrice(discount)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: T.textMid }}>Shipping</span>
          <span data-testid="order-shipping" style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{shipping === 0 ? "FREE" : fmtPrice(shipping)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: T.textMid }}>Tax (8% Rate)</span>
          <span data-testid="order-tax" style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{fmtPrice(tax)}</span>
        </div>
        <div style={{ borderTop: `1.5px solid ${T.border}`, paddingTop: 10, marginTop: 8, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Order Total</span>
          <span data-testid="order-total" style={{ fontSize: 18, fontWeight: 800, background: T.accentGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {fmtPrice(total)}
          </span>
        </div>
      </div>

      {orderError && (
        <div data-testid="order-error" style={{ padding: "12px 16px", borderRadius: 10, background: `${T.danger}15`, color: T.danger, fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
          ⚠️ {orderError}
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button className="pg-step-btn" onClick={onBack} disabled={processing} style={{ flex: 1, padding: "14px", borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.surface, color: T.textMid, cursor: processing ? "not-allowed" : "pointer", fontWeight: 600 }}>
          ← Back
        </button>
        <button
          className="pg-step-btn"
          data-testid="place-order-btn"
          onClick={onPay}
          disabled={processing}
          style={{
            flex: 2, padding: "14px", borderRadius: 12, border: "none",
            background: processing ? T.border : T.accentGrad,
            color: "#fff", cursor: processing ? "not-allowed" : "pointer", fontWeight: 700,
          }}
        >
          {processing ? "Processing Order…" : `Place Order (${fmtPrice(total)})`}
        </button>
      </div>
    </div>
  );
}

// ── Confirmation Screen (REQ-CHK-04 & REQ-PRC-07) ─────────────────────────────
function ConfirmationScreen({ T, order, onNewOrder }) {
  return (
    <div data-testid="order-confirmation" style={{ textAlign: "center", padding: "30px 10px", animation: "fadeSlideUp 0.5s ease both" }}>
      <div style={{ width: 80, height: 80, borderRadius: "50%", background: T.accentGrad, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <span style={{ fontSize: 36, color: "#fff" }}>✓</span>
      </div>

      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: T.text, marginBottom: 8 }}>
        Thank you for your order!
      </h1>
      <p style={{ fontSize: 14, color: T.textSoft, marginBottom: 24 }}>
        We have received your order and started processing it.
      </p>

      <div style={{ background: T.surface, borderRadius: 16, border: `1.5px solid ${T.border}`, padding: "20px 24px", textAlign: "left", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px dashed ${T.border}`, paddingBottom: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: T.textSoft, textTransform: "uppercase" }}>Order Number</div>
            <div data-testid="order-number" style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace", color: T.accent, marginTop: 2 }}>
              {order?.order_id || "ORD-20261118-0001"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: T.textSoft, textTransform: "uppercase" }}>Order Total</div>
            <div data-testid="order-total" style={{ fontSize: 16, fontWeight: 800, color: T.text, marginTop: 2 }}>
              {fmtPrice(order?.total || 0)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: T.textMid }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Subtotal</span>
            <span>{fmtPrice(order?.subtotal || 0)}</span>
          </div>
          {order?.discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Discount</span>
              <span style={{ color: T.success }}>-{fmtPrice(order?.discount)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Shipping</span>
            <span>{order?.shipping === 0 ? "FREE" : fmtPrice(order?.shipping || 0)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Tax</span>
            <span>{fmtPrice(order?.tax || 0)}</span>
          </div>
        </div>
      </div>

      <button
        onClick={onNewOrder}
        data-testid="continue-shopping-btn"
        style={{
          width: "100%", padding: "14px", borderRadius: 12, border: "none",
          background: T.accentGrad, color: "#fff",
          fontSize: 15, fontWeight: 700, cursor: "pointer",
        }}
      >
        Continue Shopping ✨
      </button>
    </div>
  );
}

// ── Main PaymentGateway Component ─────────────────────────────────────────────
export default function PaymentGateway({ cartItems, onBack, onComplete }) {
  const { user } = useAuth();
  const theme = THEMES.blossom;
  const T = theme.light;

  const getInitialStep = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const s = parseInt(params.get("step") || "", 10);
      if (s >= 1 && s <= 4) return s;
      const saved = sessionStorage.getItem("shoplab_checkout_step");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed >= 1 && parsed <= 4) return parsed;
      }
    }
    return 1;
  };

  const [step, setStepState] = useState(getInitialStep);
  const setStep = (newStep) => {
    setStepState(newStep);
    try {
      sessionStorage.setItem("shoplab_checkout_step", String(newStep));
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("step", String(newStep));
        window.history.replaceState({}, "", url.toString());
      }
    } catch (e) {}
  };

  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [orderError, setOrderError] = useState("");
  const clientOrderIdRef = useRef(null);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMsg, setCouponMsg] = useState("");

  const items = normalizeCartItems(cartItems);

  const getInitialFormData = () => {
    try {
      const saved = sessionStorage.getItem("shoplab_checkout_form");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      name: user?.name || "Customer One",
      email: user?.email || "customer1@shoplab.test",
      street: "123 Market St",
      city: "San Jose",
      postal: "95113",
      phone: "4085551234",
      shipping: "standard",
      payMethod: "card",
      cardNum: "4111 1111 1111 1111",
      cardName: (user?.name ? String(user.name).toUpperCase() : "CUSTOMER ONE"),
      cardExp: "12/28",
      cardCvv: "123",
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);

  useEffect(() => {
    try {
      sessionStorage.setItem("shoplab_checkout_form", JSON.stringify(formData));
    } catch (e) {}
  }, [formData]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        cardName: user.name ? String(user.name).toUpperCase() : prev.cardName,
      }));
    }
  }, [user]);

  useEffect(() => {
    const id = "pg-css";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = CSS;
      document.head.appendChild(el);
    }
  }, []);

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponMsg("Please enter a coupon code");
      return;
    }

    try {
      const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
      const resp = await fetch(ENDPOINTS.coupons.apply, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          subtotal,
          items: items.map(i => ({ id: i.id, name: i.name, category: i.category, price: i.price, qty: i.qty })),
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setAppliedCoupon(null);
        setCouponMsg(data.error?.message || data.detail || "Invalid coupon");
      } else {
        setAppliedCoupon({ code, discount: data.discount });
        setCouponMsg(data.message || "Coupon applied successfully");
      }
    } catch {
      setAppliedCoupon(null);
      setCouponMsg("Invalid coupon");
    }
  };

  // REQ-CHK-06 Double click protection & REQ-CHK-05 stock check at payment
  const handlePay = async () => {
    if (processing) return; // Prevent double clicking
    setProcessing(true);
    setOrderError("");

    const userEmail = (user?.email || formData.email || "").trim();
    const userName = (user?.name || formData.name || "Customer").trim();
    if (!userEmail) {
      setOrderError("Please enter an email address for order confirmation.");
      setProcessing(false);
      return;
    }

    if (!items || items.length === 0) {
      setOrderError("Your cart is empty. Please add items before checkout.");
      setProcessing(false);
      return;
    }

    const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
    const discount = appliedCoupon ? appliedCoupon.discount : 0;
    let shipping = (formData.shipping === "express") ? 14.99 : 5.99;
    if (appliedCoupon?.code === "FREESHIP") {
      shipping = 0.00;
    } else if (formData.shipping === "standard" || formData.shipping === "regular") {
      if ((subtotal - discount) >= 100.00) shipping = 0.00;
    }
    const taxableBase = Math.max(0, subtotal - discount + shipping);
    const tax = Math.round(taxableBase * 0.08 * 100) / 100;
    const total = Math.round((subtotal - discount + shipping + tax) * 100) / 100;

    // Order identifier generation with low entropy
    if (!clientOrderIdRef.current) {
      clientOrderIdRef.current = "DG-" + Math.random().toString(36).slice(2, 5).toUpperCase();
    }

    try {
      const resp = await fetch(ENDPOINTS.orders, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: clientOrderIdRef.current,
          user_email: userEmail,
          user_name: userName,
          items: items.map(i => ({
            id: String(i.id),
            product_id: String(i.id),
            name: i.name,
            product_name: i.name,
            brand: i.brand,
            qty: i.qty,
            price: i.price,
            category: i.category,
          })),
          subtotal,
          shipping,
          tax,
          total,
          discount,
          coupon_code: appliedCoupon?.code || "",
          payment_method: formData.payMethod,
          shipping_method: formData.shipping,
          address: `${formData.street}, ${formData.city} ${formData.postal}`.trim(),
        }),
      });

      const resJson = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        // REQ-CHK-05 Stock check failure or error detail
        const msg = resJson.error?.message || resJson.detail?.error?.message || resJson.detail || `Order failed (${resp.status})`;
        setOrderError(typeof msg === "string" ? msg : JSON.stringify(msg));
        setProcessing(false);
        return;
      }

      setConfirmedOrder(resJson);
      setDone(true);
      setProcessing(false);
      clientOrderIdRef.current = null;
      onComplete?.(resJson);
    } catch {
      setOrderError("Network error while submitting order. Please check your connection and try again.");
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setDone(false);
    setStep(1);
    setConfirmedOrder(null);
    onBack?.();
  };

  return (
    <div className="pg-root" style={{ minHeight: "100vh", background: T.bg, padding: "24px 20px" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {onBack && !done && (
              <button onClick={onBack} data-testid="back-to-store-btn" style={{ padding: "8px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, cursor: "pointer", color: T.textMid }}>
                ← Store
              </button>
            )}
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>
              ShopLab Checkout
            </h1>
          </div>
          <div style={{ fontSize: 13, color: T.textSoft }}>
            {user ? `Logged in as ${user.email}` : "Guest Checkout"}
          </div>
        </div>

        {items.length === 0 && !done ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem", background: T.card, borderRadius: 20, border: `1.5px solid ${T.border}` }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 8 }}>
              Your cart is empty
            </h2>
            <p style={{ color: T.textSoft, fontSize: 14, marginBottom: 20 }}>
              Add items to your cart before proceeding with checkout.
            </p>
            <button
              onClick={onBack}
              data-testid="back-to-store-btn"
              className="sf-btn"
              style={{
                padding: "10px 24px", borderRadius: 10, border: "none",
                background: T.accentGrad, color: "#fff", fontWeight: 700,
                fontSize: 14, cursor: "pointer",
              }}
            >
              ← Back to Shop
            </button>
          </div>
        ) : !done ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 28, alignItems: "start" }}>
            <div style={{ background: T.card, borderRadius: 20, border: `1.5px solid ${T.border}`, padding: "28px" }}>
              <StepIndicator step={step} T={T} />
              {step === 1 && <AddressStep T={T} data={formData} setData={setFormData} onNext={() => setStep(2)} />}
              {step === 2 && <PaymentStep T={T} data={formData} setData={setFormData} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
              {step === 3 && (
                <ReviewStep
                  T={T}
                  data={formData}
                  items={items}
                  appliedCoupon={appliedCoupon}
                  onBack={() => setStep(2)}
                  onPay={handlePay}
                  orderError={orderError}
                  processing={processing}
                />
              )}
            </div>

            <div style={{ background: T.card, borderRadius: 20, border: `1.5px solid ${T.border}`, padding: "24px" }}>
              <OrderSummary
                T={T}
                items={items}
                shippingMethod={formData.shipping}
                appliedCoupon={appliedCoupon}
                couponCode={couponCode}
                setCouponCode={setCouponCode}
                onApplyCoupon={handleApplyCoupon}
                couponMsg={couponMsg}
              />
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 540, margin: "0 auto", background: T.card, borderRadius: 20, border: `1.5px solid ${T.border}`, padding: "32px" }}>
            <ConfirmationScreen T={T} order={confirmedOrder} onNewOrder={handleReset} />
          </div>
        )}
      </div>
    </div>
  );
}
