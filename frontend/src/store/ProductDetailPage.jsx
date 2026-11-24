// src/store/ProductDetailPage.jsx — Amazon-style Skincare Product Detail Page
import { useState, useEffect, useMemo } from "react";
import { API_BASE_URL } from "../config/api";
import { FALLBACK_PRODUCT_IMAGE } from "../config/constants";

const THEME = {
  bg: "#fff5f7",
  surface: "#ffffff",
  card: "#ffffff",
  border: "#fcd5ce",
  borderStrong: "#f4a0bb",
  accent: "#e879a0",
  accentSoft: "#fce7f3",
  accentGrad: "linear-gradient(135deg, #f8a5c2 0%, #c77dff 100%)",
  text: "#3d1a26",
  textMid: "#8c4a6e",
  textSoft: "#c985aa",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  chip: "#fce7f3",
  chipText: "#be185d",
};

export default function ProductDetailPage({ product, onBack, onAddToCart, onBuyNow, user, isInWishlist = false, onToggleWishlist }) {
  const T = THEME;

  const [qty, setQty] = useState(1);
  const [imgErr, setImgErr] = useState(false);
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [activeTab, setActiveTab] = useState("description");
  const [selectedSize, setSelectedSize] = useState("50 ml");
  const [addedMsg, setAddedMsg] = useState("");
  const [wishlistMsg, setWishlistMsg] = useState("");
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(() => Number(product?.rating) || 4.5);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  if (!product) return null;

  const pid = String(product.id || product.product_id || "1001");
  const name = product.name || product.product_name || "Skincare Product";
  const brand = product.brand || "ShopLab";
  const category = product.category || product.product_type || product.type || "Skincare";

  // Base price calculations
  const priceNum = typeof product.price === "number"
    ? product.price
    : parseFloat(String(product.price || product.price_num || "0").replace(/[^0-9.]/g, "")) || 0;
  const oldPriceNum = product.old_price ? Number(product.old_price) : null;
  const discountPercent = oldPriceNum && oldPriceNum > priceNum
    ? Math.round(((oldPriceNum - priceNum) / oldPriceNum) * 100)
    : null;

  const description = product.description || "Formulated with clinical-grade actives to nurture, hydrate, and revitalize your skin barrier.";
  const skintype = product.skintype || "All Skin Types, Sensitive Skin Friendly";
  const notableEffects = product.notable_effects || product.notableEffects || "Deep Hydration · Barrier Support · Radiant Glow";

  // Gallery angles
  const primaryImg = product.picture_src || product.img || product.image_url || "";
  const galleryImages = useMemo(() => {
    if (!primaryImg) return [];
    return [
      { id: "main", label: "Front View", src: primaryImg },
      { id: "texture", label: "Texture & Feel", src: primaryImg },
      { id: "application", label: "How to Apply", src: primaryImg },
      { id: "box", label: "Packaging", src: primaryImg },
    ];
  }, [primaryImg]);

  // Stock status logic (REQ-CAT-05)
  const stockCount = typeof product.stock === "number" ? product.stock : 20;
  const isOutOfStock = stockCount <= 0;
  const isLowStock = stockCount >= 1 && stockCount <= 5;
  const maxQty = Math.max(1, Math.min(10, stockCount));

  let stockBadgeText = "In stock";
  let stockBadgeColor = T.success;
  let stockBadgeIcon = "✓";

  if (isOutOfStock) {
    stockBadgeText = "Out of stock";
    stockBadgeColor = T.danger;
    stockBadgeIcon = "✕";
  } else if (stockCount > 5) {
    stockBadgeText = "Only 1 left in stock!";
    stockBadgeColor = T.warning;
    stockBadgeIcon = "⚠️";
  } else {
    stockBadgeText = "In Stock (10+ available)";
    stockBadgeColor = T.success;
    stockBadgeIcon = "✓";
  }

  // Load reviews (REQ-CAT-06)
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products/${pid}/reviews`)
      .then(r => r.json())
      .then(d => {
        if (d.reviews) {
          setReviews(d.reviews);
          if (d.average_rating != null) {
            const num = Number(d.average_rating);
            if (!isNaN(num)) setAvgRating(num);
          }
        }
      })
      .catch(() => {});
  }, [pid]);

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToCart({ ...product, id: pid, name, price: priceNum, qty, size: selectedSize });
    setAddedMsg("✓ Added to cart!");
    setTimeout(() => setAddedMsg(""), 2500);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    const item = { ...product, id: pid, name, price: priceNum, qty, size: selectedSize };
    onAddToCart(item);
    onBuyNow?.(item);
  };

  const handleAddToWishlist = async () => {
    if (onToggleWishlist) {
      onToggleWishlist();
      setWishlistMsg(isInWishlist ? "Removed from Wishlist" : "❤️ Saved to your Wishlist!");
      setTimeout(() => setWishlistMsg(""), 3000);
      return;
    }
    if (!user?.email) {
      setWishlistMsg("Please sign in to save items to your wishlist.");
      setTimeout(() => setWishlistMsg(""), 3000);
      return;
    }
    try {
      const resp = await fetch(`${API_BASE_URL}/api/wishlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_email: user.email, product_id: pid }),
      });
      if (resp.ok) {
        setWishlistMsg("❤️ Saved to your Wishlist!");
      } else {
        setWishlistMsg("Already in Wishlist");
      }
    } catch {
      setWishlistMsg("❤️ Added to Wishlist");
    }
    setTimeout(() => setWishlistMsg(""), 3000);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setReviewMsg("Please log in to submit a review.");
      return;
    }
    if (reviewText.trim().length < 10 || reviewText.length > 500) {
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
          text: reviewText.trim(),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setReviewMsg(data.error?.message || data.detail || "Only verified buyers can review this product.");
      } else {
        setReviewMsg("✓ Review submitted successfully!");
        setReviewText("");
        const r2 = await fetch(`${API_BASE_URL}/api/products/${pid}/reviews`).then(res => res.json());
        if (r2.reviews) {
          setReviews(r2.reviews);
          if (r2.average_rating != null) {
            const num = Number(r2.average_rating);
            if (!isNaN(num)) setAvgRating(num);
          }
        }
      }
    } catch {
      setReviewMsg("Network error submitting review");
    }
    setSubmittingReview(false);
  };

  const currentDisplayImg = galleryImages[selectedImgIdx]?.src || primaryImg;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>
      {/* ── TOP NAV / BREADCRUMB HEADER ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 90,
        background: T.surface, borderBottom: `1.5px solid ${T.border}`,
        padding: "0 2rem", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={onBack}
            data-testid="back-to-shop-btn"
            style={{
              background: T.accentSoft, border: `1px solid ${T.borderStrong}`,
              borderRadius: 8, padding: "6px 14px",
              color: T.accent, cursor: "pointer", fontSize: "0.82rem", fontWeight: 700,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            ← Back to Shop
          </button>
          <div style={{ fontSize: "0.82rem", color: T.textSoft, display: "flex", alignItems: "center", gap: 6 }}>
            <span>Home</span>
            <span>/</span>
            <span style={{ color: T.textMid, fontWeight: 600 }}>{category}</span>
            <span>/</span>
            <span style={{ color: T.textMid }}>{brand}</span>
            <span>/</span>
            <span style={{ color: T.text, fontWeight: 700 }}>{name.slice(0, 32)}{name.length > 32 ? "…" : ""}</span>
          </div>
        </div>

        <div style={{ fontSize: "0.78rem", color: T.textMid, fontWeight: 600 }}>
          SKU: GLOW-{pid}
        </div>
      </div>

      {/* ── MAIN 3-COLUMN AMAZON-STYLE LAYOUT ── */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 20px 48px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 28,
          alignItems: "start",
        }}>

          {/* ════ COLUMN 1: IMAGE GALLERY ════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Primary Image Viewport */}
            <div style={{
              background: T.surface,
              borderRadius: 16,
              border: `1.5px solid ${T.border}`,
              padding: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 420,
              position: "relative",
              boxShadow: "0 4px 20px rgba(232, 121, 160, 0.08)",
            }}>
              <img
                src={!imgErr && currentDisplayImg ? currentDisplayImg : FALLBACK_PRODUCT_IMAGE}
                alt={name}
                data-testid="product-detail-image"
                onError={e => {
                  if (e.currentTarget.src !== FALLBACK_PRODUCT_IMAGE) {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                  }
                }}
                style={{
                  maxWidth: "100%", maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: 12,
                  transition: "transform 0.25s ease",
                }}
              />

              {/* Discount / Category Badge overlay */}
              {discountPercent && (
                <span style={{
                  position: "absolute", top: 16, left: 16,
                  background: T.accentGrad, color: "#fff",
                  padding: "4px 10px", borderRadius: 20,
                  fontSize: "0.75rem", fontWeight: 800,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}>
                  {discountPercent}% OFF
                </span>
              )}
            </div>

            {/* Thumbnail Strip */}
            {galleryImages.length > 0 && (
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                {galleryImages.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => { setSelectedImgIdx(idx); setImgErr(false); }}
                    style={{
                      width: 70, height: 70,
                      borderRadius: 10,
                      border: `2px solid ${selectedImgIdx === idx ? T.accent : T.border}`,
                      background: T.surface,
                      padding: 4,
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      overflow: "hidden",
                      transition: "all 0.15s ease",
                      boxShadow: selectedImgIdx === idx ? "0 0 0 2px #fce7f3" : "none",
                    }}
                  >
                    <img
                      src={img.src || FALLBACK_PRODUCT_IMAGE}
                      alt={img.label}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      onError={e => {
                        if (e.currentTarget.src !== FALLBACK_PRODUCT_IMAGE) {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                        }
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ════ COLUMN 2: SKINCARE PRODUCT INFO ════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Brand & Type Pills */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{
                background: T.chip, color: T.chipText,
                padding: "3px 10px", borderRadius: 6,
                fontSize: "0.75rem", fontWeight: 800,
                textTransform: "uppercase", letterSpacing: "0.5px",
              }}>
                {brand}
              </span>
              <span style={{
                background: T.surface, color: T.textMid,
                border: `1px solid ${T.border}`,
                padding: "3px 10px", borderRadius: 6,
                fontSize: "0.75rem", fontWeight: 700,
              }}>
                {category}
              </span>
              <span style={{ fontSize: "0.75rem", color: T.textSoft }}>
                Dermatologically Tested
              </span>
            </div>

            {/* Product Title */}
            <h1 data-testid="product-detail-name" style={{
              fontSize: "1.65rem", fontWeight: 700, lineHeight: 1.3,
              color: T.text, margin: 0,
              fontFamily: "'Playfair Display', serif",
            }}>
              {name}
            </h1>

            {/* Ratings & Customer Reviews Bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <StarRating rating={avgRating} />
              <span data-testid="product-average-rating" style={{ color: "#f59e0b", fontWeight: 800, fontSize: "0.92rem" }}>
                {Number(avgRating || 4.5).toFixed(1)} ★
              </span>
              <span style={{ color: T.borderStrong }}>|</span>
              <a
                href="#reviews"
                onClick={(e) => { e.preventDefault(); setActiveTab("reviews"); }}
                style={{ color: T.accent, fontSize: "0.82rem", fontWeight: 600, textDecoration: "none" }}
              >
                {reviews.length} customer ratings
              </a>
              <span style={{ color: T.borderStrong }}>|</span>
              <span style={{ color: T.success, fontSize: "0.78rem", fontWeight: 700 }}>
                100% Genuine
              </span>
            </div>

            {/* Price Box */}
            <div style={{
              background: T.surface, borderRadius: 12, border: `1.5px solid ${T.border}`,
              padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4,
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span data-testid="product-detail-price" style={{
                  fontSize: "1.9rem", fontWeight: 800, color: T.accent,
                }}>
                  ${priceNum.toFixed(2)}
                </span>
                {oldPriceNum && (
                  <span data-testid="product-old-price" style={{
                    fontSize: "1.1rem", color: T.textSoft, textDecoration: "line-through",
                  }}>
                    ${oldPriceNum.toFixed(2)}
                  </span>
                )}
                {discountPercent && (
                  <span style={{
                    background: T.accentSoft, color: T.chipText,
                    padding: "2px 8px", borderRadius: 6,
                    fontSize: "0.8rem", fontWeight: 800,
                  }}>
                    Save {discountPercent}%
                  </span>
                )}
              </div>
              <span style={{ fontSize: "0.75rem", color: T.textSoft }}>
                Inclusive of all applicable taxes · Free delivery on orders over $100
              </span>
            </div>

            {/* Size Variants Selector */}
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: T.textMid, textTransform: "uppercase", marginBottom: 8, letterSpacing: "0.5px" }}>
                Select Size: <span style={{ color: T.accent }}>{selectedSize}</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {["30 ml", "50 ml", "100 ml"].map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    style={{
                      padding: "8px 16px", borderRadius: 8,
                      border: `1.5px solid ${selectedSize === size ? T.accent : T.border}`,
                      background: selectedSize === size ? T.accentSoft : T.surface,
                      color: selectedSize === size ? T.accent : T.text,
                      fontWeight: selectedSize === size ? 800 : 600,
                      cursor: "pointer", fontSize: "0.82rem",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Skincare Highlights */}
            <div style={{
              background: T.surface, borderRadius: 12, border: `1.5px solid ${T.border}`,
              padding: "16px", display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: T.textSoft, textTransform: "uppercase" }}>Skin Type:</span>
                <p style={{ margin: "2px 0 0", fontSize: "0.85rem", fontWeight: 600, color: T.text }}>{skintype}</p>
              </div>
              <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: T.textSoft, textTransform: "uppercase" }}>Key Benefits:</span>
                <p style={{ margin: "2px 0 0", fontSize: "0.85rem", fontWeight: 600, color: T.textMid }}>{notableEffects}</p>
              </div>
            </div>

            {/* Short Product Description */}
            <div>
              <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: T.textSoft, textTransform: "uppercase", marginBottom: 6 }}>
                About this item
              </h3>
              <p data-testid="product-description" style={{ fontSize: "0.88rem", color: T.text, lineHeight: 1.6, margin: 0 }}>
                {description}
              </p>
            </div>
          </div>

          {/* ════ COLUMN 3: BUY BOX / PURCHASE PANEL ════ */}
          <div style={{
            background: T.surface,
            borderRadius: 16,
            border: `1.5px solid ${T.border}`,
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            boxShadow: "0 6px 24px rgba(232, 121, 160, 0.09)",
            position: "sticky",
            top: 76,
          }}>
            {/* Total Price & Stock Badge */}
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: T.accent }}>
                ${(priceNum * (isOutOfStock ? 0 : qty)).toFixed(2)}
              </div>
              <div style={{ fontSize: "0.75rem", color: T.textSoft, marginTop: 2 }}>
                {qty > 1 ? `(${qty} × $${priceNum.toFixed(2)})` : "Unit price"}
              </div>
            </div>

            {/* Stock Availability Badge (REQ-CAT-05) */}
            <div>
              <span
                data-testid="stock-badge"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 20, fontSize: "0.82rem", fontWeight: 800,
                  background: stockBadgeColor + "18", color: stockBadgeColor,
                  border: `1.5px solid ${stockBadgeColor}44`,
                }}
              >
                <span>{stockBadgeIcon}</span>
                <span>{stockBadgeText}</span>
              </span>
            </div>

            {/* Quantity Selector (REQ-CAT-05 & REQ-CART-02) */}
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: T.textSoft, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Quantity (Max {maxQty})
              </label>
              <div style={{ display: "flex", alignItems: "center" }}>
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  disabled={isOutOfStock || qty <= 1}
                  data-testid="qty-decrement-btn"
                  style={{
                    width: 38, height: 38, borderRadius: "8px 0 0 8px",
                    border: `1px solid ${T.border}`, borderRight: "none",
                    background: T.surface, color: T.text,
                    fontSize: "1.1rem", cursor: (isOutOfStock || qty <= 1) ? "not-allowed" : "pointer", fontWeight: 700,
                  }}
                >
                  −
                </button>
                <div
                  data-testid="qty-display"
                  style={{
                    width: 52, height: 38, background: T.accentSoft,
                    border: `1px solid ${T.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: T.text, fontWeight: 800, fontSize: "0.95rem",
                  }}
                >
                  {isOutOfStock ? 0 : qty}
                </div>
                <button
                  onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                  disabled={isOutOfStock || qty >= maxQty}
                  data-testid="qty-increment-btn"
                  style={{
                    width: 38, height: 38, borderRadius: "0 8px 8px 0",
                    border: `1px solid ${T.border}`, borderLeft: "none",
                    background: T.surface, color: T.text,
                    fontSize: "1.1rem", cursor: (isOutOfStock || qty >= maxQty) ? "not-allowed" : "pointer", fontWeight: 700,
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={handleAdd}
                disabled={isOutOfStock}
                data-testid="add-to-cart-button"
                className="sf-btn"
                style={{
                  width: "100%", padding: "12px", borderRadius: 10,
                  border: "none",
                  background: isOutOfStock ? T.border : T.accentGrad,
                  color: "#fff",
                  fontSize: "0.9rem", fontWeight: 700,
                  cursor: isOutOfStock ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <span>🛒</span>
                <span>{isOutOfStock ? "Out of Stock" : "Add to Cart"}</span>
              </button>

              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                data-testid="buy-now-button"
                className="sf-btn"
                style={{
                  width: "100%", padding: "12px", borderRadius: 10,
                  border: `1.5px solid ${T.borderStrong}`,
                  background: isOutOfStock ? T.border : T.accentSoft,
                  color: isOutOfStock ? T.textSoft : T.accent,
                  fontSize: "0.9rem", fontWeight: 700,
                  cursor: isOutOfStock ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <span>⚡</span>
                <span>Buy Now</span>
              </button>

              <button
                data-testid="add-to-wishlist-btn"
                onClick={handleAddToWishlist}
                style={{
                  width: "100%", padding: "8px", borderRadius: 8,
                  border: `1.5px solid ${isInWishlist ? T.accent : T.border}`,
                  background: isInWishlist ? T.accentSoft : "none",
                  color: isInWishlist ? T.accent : T.textMid,
                  fontSize: "0.82rem", fontWeight: 700,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                <span>{isInWishlist ? "❤️" : "🤍"}</span>
                <span>{isInWishlist ? "In Wishlist" : "Add to Wishlist"}</span>
              </button>
            </div>

            {/* Toast / Notification Messages */}
            {addedMsg && (
              <div data-testid="cart-success-msg" style={{
                background: T.success + "18", border: `1px solid ${T.success}44`,
                borderRadius: 8, padding: "8px 12px",
                color: T.success, fontWeight: 700, fontSize: "0.82rem",
                textAlign: "center",
              }}>
                {addedMsg}
              </div>
            )}
            {wishlistMsg && (
              <div style={{
                background: T.accentSoft, border: `1px solid ${T.borderStrong}`,
                borderRadius: 8, padding: "8px 12px",
                color: T.accent, fontWeight: 700, fontSize: "0.82rem",
                textAlign: "center",
              }}>
                {wishlistMsg}
              </div>
            )}

            {/* Trust & Delivery Guarantees */}
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", color: T.textMid }}>
                <span>🚚</span>
                <span>Standard Delivery in 2–4 business days</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", color: T.textMid }}>
                <span>🔄</span>
                <span>7-Day Return / Exchange Guarantee</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", color: T.textMid }}>
                <span>🛡️</span>
                <span>Authentic & Safe Clinical Skincare</span>
              </div>
            </div>
          </div>
        </div>

        {/* ════ BOTTOM TABS SECTION: DETAILS, INGREDIENTS, HOW TO USE & REVIEWS ════ */}
        <div id="reviews" style={{ marginTop: 48, background: T.surface, borderRadius: 16, border: `1.5px solid ${T.border}`, overflow: "hidden" }}>
          {/* Tab Navigation */}
          <div style={{ display: "flex", borderBottom: `1.5px solid ${T.border}`, background: T.bg }}>
            {[
              { id: "description", label: "Product Description" },
              { id: "ingredients", label: "Ingredients & Actives" },
              { id: "howToUse", label: "How to Use" },
              { id: "reviews", label: `Customer Reviews (${reviews.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "14px 22px",
                  border: "none",
                  borderBottom: activeTab === tab.id ? `3px solid ${T.accent}` : "3px solid transparent",
                  background: activeTab === tab.id ? T.surface : "transparent",
                  color: activeTab === tab.id ? T.accent : T.textMid,
                  fontWeight: activeTab === tab.id ? 800 : 600,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: "28px" }}>
            {activeTab === "description" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 800 }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: T.text }}>Complete Formulation Overview</h3>
                <p style={{ lineHeight: 1.7, color: T.textMid, fontSize: "0.92rem" }}>
                  {description}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 8 }}>
                  <div style={{ background: T.accentSoft, borderRadius: 10, padding: "14px", border: `1px solid ${T.border}` }}>
                    <div style={{ fontWeight: 700, color: T.accent, fontSize: "0.85rem" }}>🌿 Clean Beauty Formula</div>
                    <div style={{ color: T.textMid, fontSize: "0.8rem", marginTop: 4 }}>Paraben-free, sulfate-free, and phthalate-free.</div>
                  </div>
                  <div style={{ background: T.accentSoft, borderRadius: 10, padding: "14px", border: `1px solid ${T.border}` }}>
                    <div style={{ fontWeight: 700, color: T.accent, fontSize: "0.85rem" }}>🔬 Clinically Tested</div>
                    <div style={{ color: T.textMid, fontSize: "0.8rem", marginTop: 4 }}>Evaluated for optimal dermal tolerability and barrier integrity.</div>
                  </div>
                  <div style={{ background: T.accentSoft, borderRadius: 10, padding: "14px", border: `1px solid ${T.border}` }}>
                    <div style={{ fontWeight: 700, color: T.accent, fontSize: "0.85rem" }}>🐰 Cruelty-Free</div>
                    <div style={{ color: T.textMid, fontSize: "0.8rem", marginTop: 4 }}>100% cruelty-free, never tested on animals.</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ingredients" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 800 }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: T.text }}>Key Active Ingredients</h3>
                <p style={{ color: T.textSoft, fontSize: "0.88rem" }}>
                  Each ingredient is selected at clinically effective concentrations to target skin concerns without irritation.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { name: "Niacinamide (Vitamin B3)", desc: "Refines pore appearance, evens skin tone, and fortifies the lipid barrier." },
                    { name: "Multi-Molecular Hyaluronic Acid", desc: "Penetrates multiple dermal layers to deliver continuous, deep hydration." },
                    { name: "Centella Asiatica (Cica) Extract", desc: "Soothes irritated skin, reduces redness, and accelerates healing." },
                    { name: "Ceramide NP & Squalane", desc: "Locks in vital moisture while defending skin against environmental stressors." },
                  ].map((ing, i) => (
                    <div key={i} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px", background: T.bg }}>
                      <span style={{ fontWeight: 700, color: T.text, fontSize: "0.9rem" }}>{ing.name}</span>
                      <p style={{ margin: "4px 0 0", color: T.textMid, fontSize: "0.82rem", lineHeight: 1.5 }}>{ing.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "howToUse" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 800 }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: T.text }}>Step-by-Step Application Guide</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>1</div>
                    <div>
                      <div style={{ fontWeight: 700, color: T.text, fontSize: "0.9rem" }}>Cleanse Gently</div>
                      <div style={{ color: T.textMid, fontSize: "0.85rem", marginTop: 2 }}>Wash face thoroughly with lukewarm water and a gentle cleanser. Gently pat dry with a clean towel.</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>2</div>
                    <div>
                      <div style={{ fontWeight: 700, color: T.text, fontSize: "0.9rem" }}>Apply & Press In</div>
                      <div style={{ color: T.textMid, fontSize: "0.85rem", marginTop: 2 }}>Dispense 2–3 drops or a pea-sized amount onto clean palms. Lightly press and smooth over face, neck, and décolletage.</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>3</div>
                    <div>
                      <div style={{ fontWeight: 700, color: T.text, fontSize: "0.9rem" }}>Seal with Moisturizer & Sunscreen</div>
                      <div style={{ color: T.textMid, fontSize: "0.85rem", marginTop: 2 }}>Follow with your daily moisturizer. Always complete your morning routine with broad-spectrum SPF 50 sunscreen.</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 840 }}>
                {/* Review Header Stats */}
                <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "16px 20px", background: T.accentSoft, borderRadius: 12, flexWrap: "wrap" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "2.4rem", fontWeight: 800, color: T.accent, lineHeight: 1 }}>
                      {Number(avgRating || 4.5).toFixed(1)}
                    </div>
                    <StarRating rating={avgRating} size={18} />
                    <div style={{ fontSize: "0.75rem", color: T.textSoft, marginTop: 4 }}>
                      Based on {reviews.length} reviews
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 200, fontSize: "0.85rem", color: T.textMid }}>
                    Verified purchasers rate this product highly for hydration, barrier comfort, and skin radiance.
                  </div>
                </div>

                {/* Submit Review Form (REQ-CAT-06) */}
                <form
                  onSubmit={handleReviewSubmit}
                  style={{
                    background: T.bg, border: `1.5px solid ${T.border}`,
                    borderRadius: 14, padding: "20px", display: "flex", flexDirection: "column", gap: 12,
                  }}
                >
                  <h4 style={{ margin: 0, fontWeight: 700, color: T.text, fontSize: "0.95rem" }}>
                    Write a Verified Customer Review
                  </h4>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: 600, color: T.textMid }}>Your Rating:</label>
                    <select
                      value={reviewRating}
                      onChange={e => setReviewRating(Number(e.target.value))}
                      data-testid="review-rating-select"
                      style={{
                        padding: "6px 12px", borderRadius: 8,
                        border: `1px solid ${T.border}`, background: T.surface,
                        fontSize: "0.85rem", fontWeight: 600, color: T.text,
                      }}
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
                    placeholder="Share your experience (between 10 and 500 characters)..."
                    data-testid="review-text-input"
                    rows={3}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      border: `1.5px solid ${T.border}`, background: T.surface,
                      fontSize: "0.85rem", color: T.text, resize: "vertical", boxSizing: "border-box",
                    }}
                  />

                  {reviewMsg && (
                    <div data-testid="review-msg" style={{
                      fontSize: "0.82rem", fontWeight: 700,
                      color: reviewMsg.includes("✓") ? T.success : T.danger,
                    }}>
                      {reviewMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingReview}
                    data-testid="submit-review-btn"
                    className="sf-btn"
                    style={{
                      alignSelf: "flex-start", padding: "8px 20px", borderRadius: 8,
                      border: "none", background: T.accentGrad, color: "#fff",
                      fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                    }}
                  >
                    {submittingReview ? "Submitting…" : "Submit Review"}
                  </button>
                </form>

                {/* Existing Customer Reviews */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {reviews.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: T.textSoft, fontSize: "0.9rem" }}>
                      No customer reviews yet. Be the first verified buyer to share your feedback!
                    </div>
                  ) : (
                    reviews.map((r, idx) => (
                      <div
                        key={idx}
                        data-testid="review-card"
                        style={{
                          background: T.bg, border: `1px solid ${T.border}`,
                          borderRadius: 12, padding: "14px 18px",
                          display: "flex", flexDirection: "column", gap: 6,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: "0.88rem", color: T.text }}>
                              {r.user_name || "Verified Customer"}
                            </span>
                            <span style={{ fontSize: "0.72rem", background: T.accentSoft, color: T.chipText, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                              ✓ Verified Purchase
                            </span>
                          </div>
                          <StarRating rating={r.rating} size={14} />
                        </div>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: T.textMid, lineHeight: 1.5 }}>
                          {r.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Safe Star Rating Visualizer ───────────────────────────────────────────────
function StarRating({ rating = 4.5, size = 16 }) {
  const num = Math.max(0, Math.min(5, Number(rating) || 0));
  const full = Math.floor(num);
  const hasHalf = (num - full) >= 0.3;

  return (
    <span style={{ display: "inline-flex", gap: 2, color: "#f59e0b", fontSize: size, verticalAlign: "middle" }}>
      {[1, 2, 3, 4, 5].map(i => {
        if (i <= full) return <span key={i}>★</span>;
        if (i === full + 1 && hasHalf) return <span key={i}>★</span>;
        return <span key={i} style={{ color: "#e5e7eb" }}>★</span>;
      })}
    </span>
  );
}
