// src/store/ProductDetailPage.jsx
import { useState, useEffect } from "react";
import { API_BASE_URL } from "../config/api";

const C = {
  bg: "#0d0f14",
  bg2: "#131720",
  card: "#181d29",
  border: "#252d3d",
  accent: "#f472b6",
  accent2: "#38bdf8",
  accent3: "#a78bfa",
  accent4: "#34d399",
  warning: "#fbbf24",
  danger: "#ef4444",
  text: "#f1f5f9",
  muted: "#94a3b8",
};

export default function ProductDetailPage({ product, onBack, onAddToCart, onBuyNow, user }) {
  const [qty, setQty] = useState(1);
  const [imgErr, setImgErr] = useState(false);
  const [addedMsg, setAddedMsg] = useState("");
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(product?.rating || 4.5);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  if (!product) return null;

  const pid = String(product.id || product.product_id || "1001");
  const name = product.name || product.product_name || "Product";
  const brand = product.brand || "ShopLab";
  const type = product.type || product.product_type || product.category || "General";
  const price = typeof product.price === "number" ? `$${product.price.toFixed(2)}` : (product.price || "$0.00");
  const priceNum = typeof product.price_num === "number" ? product.price_num : (typeof product.price === "number" ? product.price : parseFloat(String(price).replace(/[^0-9.]/g, "")) || 0);
  const oldPrice = product.old_price ? Number(product.old_price) : null;
  const description = product.description || "High quality item backed by ShopLab standards.";
  const effects = product.effects || product.notable_effects || "";
  const skin = product.skin || product.skintype || "";
  const imgSrc = product.picture_src || product.img || product.image_url || "";
  const tier = product.tier || "";

  // REQ-CAT-05 Stock status logic:
  // Stock > 5: "In stock"
  // Stock 1-5: "Only N left"
  // Stock 0: "Out of stock" (Add to cart disabled)
  const stockCount = typeof product.stock === "number" ? product.stock : 20;
  const isOutOfStock = stockCount <= 0;
  const maxQty = Math.max(1, Math.min(10, stockCount));

  let stockBadgeText = "In stock";
  let stockBadgeColor = C.accent4;
  let stockBadgeIcon = "📦";

  if (stockCount > 5) {
    stockBadgeText = "In stock";
    stockBadgeColor = C.accent4;
    stockBadgeIcon = "📦";
  } else if (stockCount >= 1) {
    stockBadgeText = `Only ${stockCount} left`;
    stockBadgeColor = C.warning;
    stockBadgeIcon = "⚠️";
  } else {
    stockBadgeText = "Out of stock";
    stockBadgeColor = C.danger;
    stockBadgeIcon = "🚫";
  }

  // Load reviews (REQ-CAT-06)
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products/${pid}/reviews`)
      .then(r => r.json())
      .then(d => {
        if (d.reviews) {
          setReviews(d.reviews);
          if (d.average_rating) setAvgRating(d.average_rating);
        }
      })
      .catch(() => {});
  }, [pid]);

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToCart({ ...product, id: pid, name, price: priceNum, qty });
    setAddedMsg("✓ Added to cart!");
    setTimeout(() => setAddedMsg(""), 2000);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    const item = { ...product, id: pid, name, price: priceNum, qty };
    onAddToCart(item);
    onBuyNow?.(item);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setReviewMsg("Please log in to submit a review.");
      return;
    }
    if (reviewText.length < 10 || reviewText.length > 500) {
      setReviewMsg("Review text must be between 10 and 500 characters.");
      return;
    }
    setSubmittingReview(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/products/${pid}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: pid,
          user_email: user.email,
          rating: reviewRating,
          text: reviewText,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setReviewMsg(data.error?.message || data.detail || "Only verified buyers can review this product.");
      } else {
        setReviewMsg("Review submitted successfully!");
        setReviewText("");
        // Reload reviews
        const r2 = await fetch(`${API_BASE_URL}/api/products/${pid}/reviews`).then(res => res.json());
        if (r2.reviews) {
          setReviews(r2.reviews);
          if (r2.average_rating) setAvgRating(r2.average_rating);
        }
      }
    } catch {
      setReviewMsg("Error submitting review");
    }
    setSubmittingReview(false);
  };

  const TIER_COLOR = { Budget: C.accent4, "Mid-Range": "#86efac", Premium: C.accent2, Luxury: C.warning };
  const tierColor = TIER_COLOR[tier] || C.muted;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', sans-serif", color: C.text }}>
      {/* Back nav */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: C.bg2 + "ee", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
        padding: "0 2rem", height: 56,
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <button onClick={onBack} data-testid="back-to-shop-btn" style={{
          background: "none", border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "6px 14px",
          color: C.muted, cursor: "pointer", fontSize: "0.82rem",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          ← Back to Shop
        </button>
        <span style={{ color: C.muted, fontSize: "0.78rem" }}>
          {brand} / <span style={{ color: C.text }}>{name.slice(0, 40)}{name.length > 40 ? "…" : ""}</span>
        </span>
      </div>

      {/* Main layout */}
      <div style={{ display: "flex", flexWrap: "wrap", minHeight: "calc(100vh - 56px)" }}>
        {/* LEFT — Product image */}
        <div style={{
          flex: "0 0 50%", minWidth: 320, background: C.bg2,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "sticky", top: 56, height: "calc(100vh - 56px)", overflow: "hidden",
        }}>
          {imgSrc && !imgErr ? (
            <img
              src={imgSrc}
              alt={name}
              data-testid="product-detail-image"
              onError={() => setImgErr(true)}
              style={{
                maxWidth: "75%", maxHeight: "75%", objectFit: "contain",
                borderRadius: 16, filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.5))",
              }}
            />
          ) : (
            <div style={{
              width: 200, height: 200, background: C.card, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 80, boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}>🛍️</div>
          )}
          <div style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(circle at 50% 50%, ${C.accent2}0a, transparent 70%)`,
            pointerEvents: "none",
          }} />
        </div>

        {/* RIGHT — Product info & details */}
        <div style={{
          flex: "1 1 360px", padding: "3rem 3rem 4rem",
          overflowY: "auto", maxHeight: "calc(100vh - 56px)",
          borderLeft: `1px solid ${C.border}`,
        }}>
          {/* Brand + type + tier */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ color: C.muted, fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {brand}
            </span>
            <span style={{ color: C.border }}>·</span>
            <span style={{ background: C.accent2 + "22", color: C.accent2, padding: "2px 10px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 }}>
              {type}
            </span>
            {tier && (
              <span style={{ background: tierColor + "22", color: tierColor, padding: "2px 10px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 }}>
                {tier}
              </span>
            )}
          </div>

          {/* Product name */}
          <h1 data-testid="product-detail-name" style={{ fontSize: "1.6rem", fontWeight: 800, lineHeight: 1.25, color: C.text, margin: "0 0 16px 0" }}>
            {name}
          </h1>

          {/* Rating */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <StarRating rating={avgRating} />
            <span data-testid="product-average-rating" style={{ color: C.warning, fontWeight: 700, fontSize: "0.9rem" }}>
              {avgRating.toFixed(1)} ★
            </span>
            <span style={{ color: C.muted, fontSize: "0.8rem" }}>
              ({reviews.length} reviews)
            </span>
          </div>

          {/* Price & Old Price if on sale */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
            <span data-testid="product-detail-price" style={{ fontSize: "1.8rem", fontWeight: 800, color: C.accent4 }}>
              {price}
            </span>
            {oldPrice && (
              <span data-testid="product-old-price" style={{ fontSize: "1.2rem", color: C.muted, textDecoration: "line-through" }}>
                ${oldPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Stock Availability Badge (REQ-CAT-05) */}
          <div style={{ marginBottom: 20 }}>
            <span
              data-testid="stock-badge"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 20, fontSize: "0.85rem", fontWeight: 700,
                background: stockBadgeColor + "22", color: stockBadgeColor,
                border: `1.5px solid ${stockBadgeColor}44`,
              }}
            >
              <span>{stockBadgeIcon}</span>
              <span>{stockBadgeText}</span>
            </span>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ color: C.text, fontSize: "0.85rem", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Description
            </h3>
            <p data-testid="product-description" style={{ color: C.muted, fontSize: "0.9rem", lineHeight: 1.7, margin: 0 }}>
              {description}
            </p>
          </div>

          {/* Quantity picker (REQ-CAT-05 & REQ-CART-02) */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ color: C.text, fontSize: "0.85rem", fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Quantity (Max {maxQty})
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                disabled={isOutOfStock}
                data-testid="qty-decrement-btn"
                style={{
                  width: 40, height: 40, borderRadius: "8px 0 0 8px",
                  border: `1px solid ${C.border}`, borderRight: "none",
                  background: C.card, color: C.text,
                  fontSize: "1.2rem", cursor: isOutOfStock ? "not-allowed" : "pointer", fontWeight: 700,
                }}>−</button>
              <div
                data-testid="qty-display"
                style={{
                  width: 56, height: 40, background: C.bg2,
                  border: `1px solid ${C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.text, fontWeight: 700, fontSize: "1rem",
                }}>{isOutOfStock ? 0 : qty}</div>
              <button
                onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                disabled={isOutOfStock || qty >= maxQty}
                data-testid="qty-increment-btn"
                style={{
                  width: 40, height: 40, borderRadius: "0 8px 8px 0",
                  border: `1px solid ${C.border}`, borderLeft: "none",
                  background: C.card, color: C.text,
                  fontSize: "1.2rem", cursor: (isOutOfStock || qty >= maxQty) ? "not-allowed" : "pointer", fontWeight: 700,
                }}>+</button>
            </div>
          </div>

          {/* CTA buttons */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <button
              onClick={handleAdd}
              disabled={isOutOfStock}
              data-testid="add-to-cart-button"
              style={{
                flex: 1, minWidth: 160, padding: "14px 20px", borderRadius: 12,
                border: `1px solid ${isOutOfStock ? C.border : C.accent2}`,
                background: isOutOfStock ? C.border + "33" : C.accent2 + "18",
                color: isOutOfStock ? C.muted : C.accent2,
                fontSize: "0.95rem", fontWeight: 700,
                cursor: isOutOfStock ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {isOutOfStock ? "Out of Stock" : "🛒 Add to Cart"}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              data-testid="buy-now-button"
              style={{
                flex: 1, minWidth: 160, padding: "14px 20px", borderRadius: 12,
                border: "none",
                background: isOutOfStock ? C.border : `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
                color: isOutOfStock ? C.muted : "#fff",
                fontSize: "0.95rem", fontWeight: 700,
                cursor: isOutOfStock ? "not-allowed" : "pointer",
                transition: "opacity 0.2s",
              }}
            >
              ⚡ Buy Now
            </button>
          </div>

          {/* Add success message */}
          {addedMsg && (
            <div data-testid="cart-success-msg" style={{
              background: C.accent4 + "18", border: `1px solid ${C.accent4}44`,
              borderRadius: 8, padding: "10px 14px",
              color: C.accent4, fontWeight: 700, fontSize: "0.85rem",
              textAlign: "center", marginBottom: 20,
            }}>
              {addedMsg}
            </div>
          )}

          {/* REQ-CAT-06: Customer Reviews Section */}
          <div style={{ marginTop: 36, borderTop: `1px solid ${C.border}`, paddingTop: 24 }}>
            <h3 style={{ color: C.text, fontSize: "1.1rem", fontWeight: 700, marginBottom: 14 }}>
              Customer Reviews ({reviews.length})
            </h3>

            {/* Review submission form */}
            <form onSubmit={handleReviewSubmit} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px", marginBottom: 20 }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: C.text, marginBottom: 8 }}>Write a Verified Review</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: "0.8rem", color: C.muted }}>Rating:</span>
                <select
                  value={reviewRating}
                  onChange={e => setReviewRating(Number(e.target.value))}
                  data-testid="review-rating-select"
                  style={{ background: C.bg2, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "4px 8px" }}
                >
                  <option value={5}>5 Stars ★★★★★</option>
                  <option value={4}>4 Stars ★★★★☆</option>
                  <option value={3}>3 Stars ★★★☆☆</option>
                  <option value={2}>2 Stars ★★☆☆☆</option>
                  <option value={1}>1 Star  ★☆☆☆☆</option>
                </select>
              </div>
              <textarea
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                placeholder="Share your thoughts (10 to 500 characters)..."
                data-testid="review-text-input"
                style={{ width: "100%", height: 70, background: C.bg2, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px", fontSize: "0.85rem", resize: "none", marginBottom: 10 }}
              />
              {reviewMsg && (
                <div data-testid="review-msg" style={{ fontSize: "0.8rem", color: reviewMsg.includes("successfully") ? C.accent4 : C.warning, marginBottom: 8 }}>
                  {reviewMsg}
                </div>
              )}
              <button
                type="submit"
                disabled={submittingReview}
                data-testid="submit-review-btn"
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: C.accent2, color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "0.82rem" }}
              >
                {submittingReview ? "Submitting…" : "Submit Review"}
              </button>
            </form>

            {/* Existing reviews */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {reviews.length === 0 ? (
                <p style={{ color: C.muted, fontSize: "0.85rem" }}>No reviews yet. Be the first verified buyer to leave a review!</p>
              ) : (
                reviews.map((r, idx) => (
                  <div key={idx} data-testid="review-card" style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem", color: C.text }}>{r.user_name || "Verified Buyer"}</span>
                      <span style={{ color: C.warning, fontSize: "0.85rem" }}>{"★".repeat(Math.round(r.rating))}</span>
                    </div>
                    <p style={{ color: C.muted, fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>{r.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function StarRating({ rating }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div style={{ display: "flex", gap: 2, color: C.warning, fontSize: "0.85rem" }}>
      {[...Array(5)].map((_, i) => (
        <span key={i}>{i < full ? "★" : (i === full && half ? "★" : "☆")}</span>
      ))}
    </div>
  );
}
