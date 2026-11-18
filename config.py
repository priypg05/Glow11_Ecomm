import os
from dotenv import load_dotenv

load_dotenv()

APP_ENV = os.getenv("APP_ENV", "qa").lower().strip()

class AppConfig:
    ENV = APP_ENV
    IS_PRODUCTION = (APP_ENV == "production")
    IS_QA = (APP_ENV == "qa")

    # Regional Tax Configuration
    # Standard PPN is 11%; regional/compliance rate in staging/qa
    TAX_RATE = 0.18 if IS_QA else 0.11

    # Security & Authentication Lockout Policy
    # Maximum failed attempts before temporary lockout
    LOCKOUT_THRESHOLD = 3 if IS_QA else 5
    LOCKOUT_WINDOW_MINUTES = None if IS_QA else 15

    # Shipping Fees (in IDR / Rs)
    SHIPPING_RATES = {
        "regular": 15000,
        "express": 35000,
        "sameday": 55000,
    }
    FREE_SHIPPING_THRESHOLD = 100000

    # Promotional & Coupon Rules
    AVAILABLE_COUPONS = {
        "GLOW20": {
            "code": "GLOW20",
            "discount_percent": 0.20,
            "min_subtotal": 50000,
            "max_discount": 30000,
        },
        "WELCOME10": {
            "code": "WELCOME10",
            "discount_percent": 0.10,
            "min_subtotal": 20000,
            "max_discount": 15000,
        },
    }

config = AppConfig()
