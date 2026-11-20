# ShopLab / GlowIQ E-Commerce Functional Requirements Specification
**Version**: 1.0 · **Date**: 2026-11-18

This document lists the formal functional requirements and requirement IDs for test mapping and Root Cause Analysis (RCA).

---

## 5.1 Account Requirements

- **REQ-ACC-01 (Register)**:
  - Input: Name, email, password, confirm password.
  - Rules: Email must be valid and not already registered ("Email already registered"). Password must be at least 8 characters with 1 uppercase letter, 1 number, and 1 special character.
  - On success: user is logged in with "Welcome, <name>".

- **REQ-ACC-02 (Login)**:
  - Input: Email + password.
  - Rules: Wrong password shows "Invalid email or password" (same message for unknown email). After 5 wrong attempts within 15 minutes, the account is locked for 15 minutes.
  - Seeded locked user (`locked@shoplab.test`) always sees "Your account is locked".

- **REQ-ACC-03 (Logout)**:
  - Ends the session; cart contents of a logged-in user are persisted for the next login.

- **REQ-ACC-04 (Forgot / Reset Password)**:
  - Simulated email verification: reset link is recorded and accessible via `/dev/mailbox` and `GET /api/dev/mailbox` (disabled in Production). Reset link expires after 30 minutes and is single-use.

- **REQ-ACC-05 (Profile)**:
  - Change name and phone; manage delivery addresses (up to 5 addresses, one default).

---

## 5.2 Catalogue Requirements

- **REQ-CAT-01 (Product List)**:
  - Product display with pagination and category grouping.

- **REQ-CAT-02 (Search)**:
  - Case-insensitive search by product name; no matches display "No products found for '<text>'".

- **REQ-CAT-03 (Filter)**:
  - Filter by category, price range, rating (4★ and above), and in-stock items.

- **REQ-CAT-04 (Sort)**:
  - Sort by Price (low → high, high → low), Newest, and Top Rated.

- **REQ-CAT-05 (Product Detail)**:
  - Displays name, image, price, sale price, stock status, description, reviews, and quantity selector.
  - Stock badges:
    - Stock > 5: "In stock"
    - Stock 1–5: "Only N left"
    - Stock 0: "Out of stock" (Add to cart disabled)

- **REQ-CAT-06 (Reviews)**:
  - Verified buyers can submit 1–5 star ratings and reviews (10–500 characters); average rating displayed with 1 decimal.

---

## 5.3 Cart Requirements

- **REQ-CART-01 (Add to Cart)**:
  - Add items from product card or detail page; cart badge updates total quantity.

- **REQ-CART-02 (Quantity)**:
  - Quantity bounds: minimum 1, maximum 10 per product, capped by available stock.

- **REQ-CART-03 (Remove Item / Empty Cart)**:
  - Remove items; empty cart displays "Your cart is empty".

- **REQ-CART-04 (Guest Cart)**:
  - Guest cart persisted in browser storage and merged into customer cart upon login.

- **REQ-CART-05 (Price Change)**:
  - If a price updates while in the cart, the cart displays updated price and notification.

---

## 5.4 Pricing, Discounts, Tax, and Shipping

All monetary calculations maintain 2 decimals with mathematical half-up rounding on final lines.

- **REQ-PRC-01 (Line Total)**:
  - Line total = unit price × quantity.

- **REQ-PRC-02 (Subtotal)**:
  - Subtotal = sum of line totals.

- **REQ-PRC-03 (Coupons - 1 per order)**:
  - `SAVE10`: 10% off subtotal.
  - `FLAT50`: 50.00 off when subtotal ≥ 300.00.
  - `FREESHIP`: Shipping becomes 0.
  - `ELEC15`: 15% off Electronics items only.
  - `EXPIRED5`: Expired coupon, shows "This coupon has expired".
  - Unknown code shows "Invalid coupon". Discount cannot reduce order below 0.

- **REQ-PRC-04 (Shipping Charges)**:
  - Standard Shipping: 5.99; free when `(subtotal - discount) >= 100.00`.
  - Express Shipping: 14.99 (never free, except with coupon `FREESHIP`).

- **REQ-PRC-05 (Tax Calculation)**:
  - Tax: 8% of `(subtotal - discount + shipping)`. Configured via `TAX_RATE=0.08`.

- **REQ-PRC-06 (Order Total)**:
  - Order Total = `subtotal - discount + shipping + tax`.

- **REQ-PRC-07 (Total Consistency)**:
  - Totals must match across Cart, Checkout Review, Confirmation Page, and API responses.

### Benchmark Worked Example:
- **Items**: 2 × Wireless Mouse at 24.50 ($49.00) + 1 × USB-C Hub at 59.99 ($59.99)
- **Subtotal**: $108.99
- **Coupon `SAVE10`**: -$10.90
- **Net Subtotal**: $98.09 (< 100.00, standard shipping applies)
- **Shipping**: $5.99
- **Tax (8% of $104.08)**: $8.33
- **Order Total**: **$112.41**

---

## 5.5 Checkout and Orders

- **REQ-CHK-01 (Checkout Authentication)**:
  - Checkout requires authentication; guests are prompted to log in and redirected back.

- **REQ-CHK-02 (Delivery Address)**:
  - Collects recipient name, street, city, 5-digit postal code, and 10-digit phone number.

- **REQ-CHK-03 (Payment Simulation)**:
  - Card `4111 1111 1111 1111`: Success.
  - Card `4000 0000 0000 0002`: "Card declined".
  - Card `4000 0000 0000 9995`: "Insufficient funds".

- **REQ-CHK-04 (Place Order)**:
  - Generates unique order ID (`ORD-YYYYMMDD-XXXX`), decrements inventory, empties cart.

- **REQ-CHK-05 (Stock Check at Payment)**:
  - Validates inventory before confirming payment; returns conflict if stock is depleted.

- **REQ-CHK-06 (Double Click Protection)**:
  - Prevents duplicate order placement on multiple rapid clicks.

- **REQ-ORD-01 (Order History)**:
  - Tracks status: Placed → Shipped → Delivered, or Cancelled.

- **REQ-ORD-02 (Order Cancellation)**:
  - Cancel allowed while status is "Placed"; restores reserved inventory.

---

## 5.6 Wishlist

- **REQ-WSH-01 (Wishlist)**:
  - Logged-in users can add/remove products up to 50 items, with "Move to Cart" action.

---

## 5.7 Admin Area

- **REQ-ADM-01 (Admin Guard)**:
  - Only authenticated admin users can access `/admin`.

- **REQ-ADM-02 (Product Management)**:
  - Admin can create, edit, and toggle active status of products.

- **REQ-ADM-03 (Coupon Management)**:
  - Admin can inspect and toggle coupon rules.

- **REQ-ADM-04 (Order Status & Dashboard)**:
  - Admin can update order fulfillment status and view dashboard metrics.
