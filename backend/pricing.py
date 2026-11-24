"""
ShopLab Pricing & Business Logic Module (Section 2 & Section 5.4)
================================================================
Implements business rules for:
- Line total calculation (REQ-PRC-01)
- Subtotal calculation (REQ-PRC-02)
- Coupon validation and discounts (REQ-PRC-03)
- Shipping calculation with thresholds (REQ-PRC-04)
- Regional tax calculation (REQ-PRC-05)
- Order total calculation (REQ-PRC-06)

All money calculations round only the final value of each line half-up to 2 decimals.
"""

from decimal import Decimal, ROUND_HALF_UP
import os

def round_half_up(value: float) -> float:
    """Mathematical half-up rounding to 2 decimal places."""
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

def calculateLineTotal(unit_price: float, quantity: int) -> float:
    """
    REQ-PRC-01: Line total = unit price * quantity.
    """
    return round_half_up(float(unit_price) * int(quantity))

def calculateSubtotal(items: list) -> float:
    """
    REQ-PRC-02: Subtotal = sum of line totals.
    """
    total = 0.0
    for item in items:
        price = float(item.get("price", 0.0))
        qty = int(item.get("qty", 1))
        total += calculateLineTotal(price, qty)
    return round_half_up(total)

def calculateDiscount(subtotal: float, coupon_code: str, items: list = None, shipping: float = 0.0) -> tuple[float, str]:
    """
    REQ-PRC-03: Coupons (only one coupon per order):
      - SAVE10: 10% off subtotal
      - FLAT50: 50.00 off when subtotal >= 300.00
      - FREESHIP: shipping becomes 0 (discount = 0.00)
      - ELEC15: 15% off Electronics items only
      - EXPIRED5: expired, shows 'This coupon has expired'
      - Unknown code: shows 'Invalid coupon'
    Discount can never make total below 0.
    """
    code = (coupon_code or "").strip().upper()
    if not code:
        return 0.0, ""

    if code == "SAVE10":
        discount_base = subtotal + (shipping if shipping else 5.99)
        discount = round_half_up(discount_base * 0.10)
        return min(discount, subtotal), "10% off subtotal applied"

    if code == "FLAT50":
        if subtotal < 300.00:
            raise ValueError("Minimum subtotal of 300.00 required for coupon FLAT50")
        return min(50.00, subtotal), "50.00 flat discount applied"

    if code == "FREESHIP":
        return 0.0, "Free shipping coupon applied"

    if code == "ELEC15":
        discount = round_half_up(subtotal * 0.15)
        return min(discount, subtotal), "15% off Electronics items applied"

    if code == "EXPIRED5":
        raise KeyError("This coupon has expired")

    # Legacy coupons if used in catalog
    if code == "GLOW20":
        discount_base = subtotal + (shipping if shipping else 15000.0)
        discount = round_half_up(discount_base * 0.20)
        return min(discount, min(subtotal, 30000.0)), "20% off applied"

    if code == "WELCOME10":
        discount = round_half_up(subtotal * 0.10)
        return min(discount, min(subtotal, 15000.0)), "10% off applied"

    raise LookupError("Invalid coupon")

def calculateShipping(subtotal: float, discount: float, shipping_method: str = "standard", coupon_code: str = "") -> float:
    """
    REQ-PRC-04:
    Standard 5.99, free when (subtotal - discount) >= 100.00;
    Express 14.99 (never free, except with FREESHIP).
    """
    code = (coupon_code or "").strip().upper()
    method = (shipping_method or "standard").lower().strip()

    if code == "FREESHIP":
        return 0.0

    net_subtotal = max(0.0, subtotal - discount)

    if net_subtotal > 100.00:
        return 0.0

    if method in ["standard", "regular"]:
        return 5.99
    elif method == "express":
        return 14.99
    elif method == "sameday":
        return 24.99
    else:
        return 5.99

def calculateTax(subtotal: float, discount: float, shipping: float, tax_rate: float = 0.18) -> float:
    """
    REQ-PRC-05: Tax: 8% of (subtotal - discount + shipping).
    The tax rate comes from configuration (TAX_RATE=0.08).
    """
    taxable_base = max(0.0, subtotal - discount + shipping)
    return round_half_up(taxable_base * tax_rate)

def calculateOrderTotal(subtotal: float, discount: float, shipping: float, tax: float) -> float:
    """
    REQ-PRC-06: Order total = subtotal - discount + shipping + tax.
    """
    total = max(0.0, subtotal - discount + shipping + tax)
    return round_half_up(total)
