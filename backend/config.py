import os
from dotenv import load_dotenv

load_dotenv()

APP_ENV = os.getenv("APP_ENV", "qa").lower().strip()

class AppConfig:
    ENV = APP_ENV
    IS_PRODUCTION = (APP_ENV == "production")
    IS_QA = (APP_ENV == "qa")

    # Regional Tax Configuration
    # Section 5.4 REQ-PRC-05: Tax 8% in Prod, Section 8.2: 18% in QA
    TAX_RATE = 0.18 if IS_QA else float(os.getenv("TAX_RATE", "0.08"))

    # Security & Authentication Lockout Policy (Section 5.1 REQ-ACC-02)
    # Section 8.2: Locks after 3 attempts in QA, 5 attempts in 15 minutes in Prod
    LOCKOUT_THRESHOLD = 3 if IS_QA else 5
    LOCKOUT_WINDOW_MINUTES = None if IS_QA else 15

    # Shipping Fees (Section 5.4 REQ-PRC-04)
    # Standard 5.99, free when (subtotal - discount) >= 100.00; Express 14.99
    SHIPPING_RATES_USD = {
        "regular": 5.99,
        "standard": 5.99,
        "express": 14.99,
    }
    FREE_SHIPPING_THRESHOLD_USD = 100.00

    # IDR / Rs Legacy Shipping Rates
    SHIPPING_RATES_IDR = {
        "regular": 15000,
        "standard": 15000,
        "express": 35000,
        "sameday": 55000,
    }
    FREE_SHIPPING_THRESHOLD_IDR = 100000

    # Promotional & Coupon Rules (Section 5.4 REQ-PRC-03)
    AVAILABLE_COUPONS = {
        "SAVE10": {
            "code": "SAVE10",
            "type": "percent",
            "discount_percent": 0.10,
            "min_subtotal": 0.0,
            "max_discount": float("inf"),
            "description": "10% off subtotal",
        },
        "FLAT50": {
            "code": "FLAT50",
            "type": "flat",
            "flat_discount": 50.0,
            "min_subtotal": 300.0,
            "max_discount": 50.0,
            "description": "50.00 off when subtotal >= 300.00",
        },
        "FREESHIP": {
            "code": "FREESHIP",
            "type": "freeship",
            "discount_percent": 0.0,
            "min_subtotal": 0.0,
            "max_discount": float("inf"),
            "description": "Free shipping on entire order",
        },
        "ELEC15": {
            "code": "ELEC15",
            "type": "category_percent",
            "category": "Electronics",
            "discount_percent": 0.15,
            "min_subtotal": 0.0,
            "max_discount": float("inf"),
            "description": "15% off Electronics items only",
        },
        "EXPIRED5": {
            "code": "EXPIRED5",
            "type": "expired",
            "expired": True,
            "min_subtotal": 0.0,
            "max_discount": 0.0,
            "description": "This coupon has expired",
        },
        "GLOW20": {
            "code": "GLOW20",
            "type": "percent",
            "discount_percent": 0.20,
            "min_subtotal": 50000,
            "max_discount": 30000,
            "description": "20% off skincare orders over Rs 50,000",
        },
        "WELCOME10": {
            "code": "WELCOME10",
            "type": "percent",
            "discount_percent": 0.10,
            "min_subtotal": 20000,
            "max_discount": 15000,
            "description": "10% off skincare welcome coupon",
        },
    }

config = AppConfig()
