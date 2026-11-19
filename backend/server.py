from fastapi.responses import StreamingResponse
import io
from dotenv import load_dotenv
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import sqlite3
import json
import pandas as pd
from datetime import datetime, timezone, timedelta
from config import config
load_dotenv()

IST = timezone(timedelta(hours=5, minutes=30))

# ── Import your existing Python engine ───────────────────────────────────────
try:
    from recommendation_engine import (
        load_data,
        build_recommendation_payload,
        record_click,
        init_click_db,
        get_filtered_recommendations,
        build_embeddings,          # FIX #1
        refresh_sell_probabilities, # FIX #3
    )
except ImportError as e:
    raise RuntimeError(
        "\n\nERROR: Could not import recommendation_engine.py\n"
        f"   Error: {e}\n"
        "   Make sure server.py is in the same folder as recommendation_engine.py\n"
    )

# ── Import skin analysis router ───────────────────────────────────────────────
try:
    from skin_analysis_endpoint import router as skin_router
except ImportError as e:
    raise RuntimeError(
        "\n\nERROR: Could not import skin_analysis_endpoint.py\n"
        f"   Error: {e}\n"
        "   Make sure skin_analysis_endpoint.py is in the same folder as server.py\n"
    )

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(title="GlowIQ API", version="1.0.0")

# ── Register skin analysis router ─────────────────────────────────────────────
app.include_router(skin_router)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── CORS Middleware ───────────────────────────────────────────────────────────
# Allow React local dev servers, Render, Vercel deployments, and custom domains
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
custom_origins = [orig.strip() for orig in allowed_origins_env.split(",") if orig.strip()]
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]
all_allowed_origins = list(set(default_origins + custom_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=all_allowed_origins,
    allow_origin_regex=r"https://.*(\.devtunnels\.ms|\.vercel\.app|\.onrender\.com)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load data once at startup ─────────────────────────────────────────────────
# Resolve CSV path dynamically (supporting datasets/ directory or root backend)
CSV_PATH = os.getenv("CSV_PATH")
if not CSV_PATH or not os.path.exists(CSV_PATH):
    c1 = os.path.join(BASE_DIR, "datasets", "Skin_Care.csv")
    c2 = os.path.join(BASE_DIR, "Skin_Care.csv")
    CSV_PATH = c1 if os.path.exists(c1) else c2

try:
    print(f"Loading data from: {CSV_PATH}")
    df = load_data(CSV_PATH)
    print(f"Loaded {len(df)} products successfully")
    df = refresh_sell_probabilities(df)   # FIX #3: override CSV sell probabilities with real orders
    print("Sell probabilities refreshed from orders table (or kept from CSV)")
    build_embeddings(df)                  # FIX #1: build semantic embeddings (no-op if model unavailable)
    print("Semantic embeddings ready (or keyword fallback active)")
except FileNotFoundError:
    raise RuntimeError(
        "\n\nERROR: Skin_Care.csv not found!\n"
        f"   Expected location: {CSV_PATH}\n"
        "   Make sure Skin_Care.csv is in backend/datasets/ or backend/\n"
    )

init_click_db()
print("Click tracking database ready")

# ── AUTH DATABASE SETUP ────────────────────────────────────────────────────────
# Resolve SQLite database path dynamically (supporting database/ directory or env)
AUTH_DB_PATH = os.getenv("DATABASE_PATH")
if not AUTH_DB_PATH:
    c1 = os.path.join(BASE_DIR, "database", "users.db")
    c2 = os.path.join(BASE_DIR, "users.db")
    AUTH_DB_PATH = c1 if os.path.exists(c1) else (c2 if os.path.exists(c2) else c1)

os.makedirs(os.path.dirname(AUTH_DB_PATH), exist_ok=True)

def get_conn():
    conn = sqlite3.connect(AUTH_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_auth_db():
    """Initialize authentication database with admin user."""
    conn = get_conn()
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS users
        (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS login_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            success INTEGER NOT NULL,
            logged_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT UNIQUE NOT NULL,
            user_email TEXT NOT NULL,
            user_name TEXT DEFAULT '',
            items TEXT DEFAULT '[]',
            subtotal REAL DEFAULT 0,
            shipping REAL DEFAULT 0,
            tax REAL DEFAULT 0,
            total REAL DEFAULT 0,
            payment_method TEXT DEFAULT '',
            shipping_method TEXT DEFAULT '',
            address TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS inventory (
            product_id TEXT PRIMARY KEY,
            product_name TEXT NOT NULL,
            stock INTEGER NOT NULL DEFAULT 20,
            reserved INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("SELECT COUNT(*) FROM inventory")
    if c.fetchone()[0] == 0:
        c.execute(
            "INSERT OR REPLACE INTO inventory (product_id, product_name, stock, reserved) VALUES (?, ?, ?, ?)",
            ("1", "LANEIGE Lip Sleeping Mask", 1, 0)
        )
        c.execute(
            "INSERT OR REPLACE INTO inventory (product_id, product_name, stock, reserved) VALUES (?, ?, ?, ?)",
            ("2", "Some By Mi Toner", 20, 0)
        )
        c.execute(
            "INSERT OR REPLACE INTO inventory (product_id, product_name, stock, reserved) VALUES (?, ?, ?, ?)",
            ("3", "COSRX Snail Mucin Essence", 20, 0)
        )
        conn.commit()

    # Seed admin if doesn't exist
    admin_email = os.getenv("DEFAULT_ADMIN_EMAIL", "shivi5035singh@gmail.com")
    admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD", "QWERTY@123")
    admin_name = os.getenv("DEFAULT_ADMIN_NAME", "Shivi Singh")
    c.execute("SELECT id FROM users WHERE email = ?", (admin_email,))
    if not c.fetchone():
        c.execute(
            "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)",
            (admin_email, admin_password, admin_name, "admin")
        )
        conn.commit()
        print(f"Admin account created: {admin_email}")
    else:
        print("Admin account already exists")

    conn.close()

init_auth_db()

# ── Request/Response models ───────────────────────────────────────────────────
class ClickPayload(BaseModel):
    session_id:   str
    product_id:   str
    product_name: str

class LoginPayload(BaseModel):
    email: str
    password: str

class RegisterPayload(BaseModel):
    email: str
    password: str
    name: str

class AdminRegisterPayload(BaseModel):
    email: str
    password: str
    name: str
    admin_email: str
    admin_password: str

class SetRolePayload(BaseModel):
    user_id: int
    new_role: str
    admin_email: str
    admin_password: str

class ReportPayload(BaseModel):
    formData: dict
    chatHistory: list = []
    recommendedProducts: list = []

# ── Auth Endpoints ─────────────────────────────────────────────────────────────

@app.post("/api/auth/login")
def login(body: LoginPayload):
    try:
        if not body.email or not body.password:
            raise HTTPException(status_code=400, detail="Email and password are required")

        conn = get_conn()
        c = conn.cursor()

        # Account lockout verification
        if config.IS_QA:
            c.execute(
                "SELECT COUNT(*) AS fails FROM login_logs WHERE LOWER(email) = LOWER(?) AND success = 0",
                (body.email.strip(),)
            )
            failed_count = c.fetchone()["fails"]
            if failed_count >= config.LOCKOUT_THRESHOLD:
                conn.close()
                raise HTTPException(status_code=401, detail="Invalid email or password")
        else:
            c.execute(
                "SELECT COUNT(*) AS fails FROM login_logs WHERE LOWER(email) = LOWER(?) AND success = 0 AND logged_at > datetime('now', '-15 minutes')",
                (body.email.strip(),)
            )
            failed_count = c.fetchone()["fails"]
            if failed_count >= config.LOCKOUT_THRESHOLD:
                conn.close()
                raise HTTPException(
                    status_code=423,
                    detail="Account locked due to multiple failed login attempts. Please try again after 15 minutes."
                )

        c.execute(
            "SELECT id, email, name, role FROM users WHERE LOWER(email) = LOWER(?) AND password = ?",
            (body.email.strip(), body.password)
        )
        row = c.fetchone()

        if not row:
            c.execute("INSERT INTO login_logs (email, success) VALUES (?, ?)", (body.email.strip(), 0))
            conn.commit()
            conn.close()
            raise HTTPException(status_code=401, detail="Invalid email or password")

        c.execute("INSERT INTO login_logs (email, success) VALUES (?, ?)", (body.email.strip(), 1))
        conn.commit()
        conn.close()

        return {
            "ok": True,
            "user": {
                "id": row["id"],
                "email": row["email"],
                "name": row["name"],
                "role": row["role"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@app.post("/api/auth/register")
def register(body: RegisterPayload):
    try:
        if not body.email or not body.password or not body.name:
            raise HTTPException(status_code=400, detail="Email, password, and name are required")
        if len(body.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

        conn = get_conn()
        c = conn.cursor()
        c.execute(
            "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)",
            (body.email.strip(), body.password, body.name.strip(), "user")
        )
        conn.commit()
        conn.close()

        return {"ok": True, "message": "User registered successfully"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Register error: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@app.post("/api/auth/admin-register")
def admin_register(body: AdminRegisterPayload):
    try:
        if not all([body.email, body.password, body.name, body.admin_email, body.admin_password]):
            raise HTTPException(status_code=400, detail="All fields are required")

        conn = get_conn()
        c = conn.cursor()

        c.execute(
            "SELECT id, role FROM users WHERE LOWER(email) = LOWER(?) AND password = ?",
            (body.admin_email.strip(), body.admin_password)
        )
        admin_row = c.fetchone()

        if not admin_row or admin_row["role"] != "admin":
            conn.close()
            raise HTTPException(status_code=403, detail="Only admins can register new admins")

        if len(body.password) < 6:
            conn.close()
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

        c.execute(
            "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)",
            (body.email.strip(), body.password, body.name.strip(), "admin")
        )
        conn.commit()
        conn.close()

        return {"ok": True, "message": "Admin registered successfully"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Admin register error: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


# ── Admin User Management Endpoints ───────────────────────────────────────────

@app.get("/api/admin/users")
def get_all_users(admin_email: str, admin_password: str):
    """Return all users — admin only."""
    try:
        conn = get_conn()
        c = conn.cursor()

        # Verify admin
        c.execute(
            "SELECT role FROM users WHERE LOWER(email) = LOWER(?) AND password = ?",
            (admin_email.strip(), admin_password)
        )
        row = c.fetchone()
        if not row or row["role"] != "admin":
            conn.close()
            raise HTTPException(status_code=403, detail="Admin credentials required")

        c.execute("SELECT id, email, name, role, created_at FROM users ORDER BY id ASC")
        users = [dict(r) for r in c.fetchall()]
        conn.close()
        return {"ok": True, "users": users}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/login-logs")
def get_login_logs(admin_email: str, admin_password: str):
    """Return login logs — admin only."""
    try:
        conn = get_conn()
        c = conn.cursor()

        c.execute(
            "SELECT role FROM users WHERE LOWER(email) = LOWER(?) AND password = ?",
            (admin_email.strip(), admin_password)
        )
        row = c.fetchone()
        if not row or row["role"] != "admin":
            conn.close()
            raise HTTPException(status_code=403, detail="Admin credentials required")

        c.execute("SELECT id, email, success, logged_at FROM login_logs ORDER BY id DESC LIMIT 200")
        logs = [dict(r) for r in c.fetchall()]
        conn.close()
        return {"ok": True, "logs": logs}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/set-role")
def set_role(body: SetRolePayload):
    """Promote or demote a user — admin only."""
    try:
        if body.new_role not in ("admin", "user"):
            raise HTTPException(status_code=400, detail="Role must be 'admin' or 'user'")

        conn = get_conn()
        c = conn.cursor()

        # Verify admin
        c.execute(
            "SELECT role FROM users WHERE LOWER(email) = LOWER(?) AND password = ?",
            (body.admin_email.strip(), body.admin_password)
        )
        row = c.fetchone()
        if not row or row["role"] != "admin":
            conn.close()
            raise HTTPException(status_code=403, detail="Admin credentials required")

        # Protect master admin
        c.execute("SELECT email FROM users WHERE id = ?", (body.user_id,))
        target = c.fetchone()
        if not target:
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")
        if target["email"].lower() == "shivi5035singh@gmail.com":
            conn.close()
            raise HTTPException(status_code=403, detail="Master admin role cannot be changed")

        c.execute("UPDATE users SET role = ? WHERE id = ?", (body.new_role, body.user_id))
        conn.commit()
        conn.close()

        return {"ok": True, "message": f"User {body.user_id} is now {body.new_role}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── System Endpoints ──────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "name": "GlowIQ API",
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "environment": os.getenv("APP_ENV", "production")
    }


@app.get("/health")
def health():
    return {
        "status":   "running",
        "products": len(df),
        "message":  f"GlowIQ API is live with {len(df)} products loaded",
    }


@app.get("/api/recommendations")
def get_recommendations(session_id: str = "guest"):
    try:
        payload = build_recommendation_payload(df, session_id=session_id)
        return payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/click")
def post_click(body: ClickPayload):
    try:
        record_click(body.session_id, body.product_id, body.product_name)
        return {"ok": True, "product_id": body.product_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Coupon & Promotion Endpoints ──────────────────────────────────────────────

class CouponPayload(BaseModel):
    code: str
    subtotal: float
    shipping: float = 0.0

@app.post("/api/coupons/apply")
def apply_coupon(body: CouponPayload):
    try:
        code = body.code.strip().upper()
        if code not in config.AVAILABLE_COUPONS:
            if config.IS_QA:
                return {
                    "ok": False,
                    "valid": False,
                    "discount": 0.0,
                    "message": "Coupon code not recognized"
                }
            raise HTTPException(status_code=400, detail="Invalid coupon code")

        rule = config.AVAILABLE_COUPONS[code]
        if body.subtotal < rule["min_subtotal"]:
            if config.IS_QA:
                return {
                    "ok": False,
                    "valid": False,
                    "discount": 0.0,
                    "message": f"Minimum subtotal of Rs {rule['min_subtotal']} required"
                }
            raise HTTPException(
                status_code=400,
                detail=f"Minimum subtotal of Rs {rule['min_subtotal']} required for coupon {code}"
            )

        if config.IS_QA:
            discount_base = body.subtotal + body.shipping
            calculated_discount = round(discount_base * rule["discount_percent"])
        else:
            discount_base = body.subtotal
            calculated_discount = round(discount_base * rule["discount_percent"])

        discount = min(calculated_discount, rule["max_discount"])
        return {
            "ok": True,
            "valid": True,
            "code": code,
            "discount": discount,
            "message": f"Coupon {code} applied successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Inventory Endpoints ───────────────────────────────────────────────────────

@app.get("/api/inventory/{product_id}")
def get_inventory_stock(product_id: str):
    try:
        conn = get_conn()
        c = conn.cursor()
        c.execute("SELECT product_id, product_name, stock, reserved FROM inventory WHERE product_id = ?", (str(product_id),))
        row = c.fetchone()
        conn.close()
        if not row:
            return {"product_id": str(product_id), "stock": 20, "reserved": 0}
        return dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Orders Endpoints ───────────────────────────────────────────────────────────

class OrderPayload(BaseModel):
    order_id: str
    user_email: str
    user_name: str = ""
    items: list = []
    subtotal: float = 0
    shipping: float = 0
    tax: float = 0
    total: float = 0
    discount: float = 0
    coupon_code: str = ""
    payment_method: str = ""
    shipping_method: str = ""
    address: str = ""


@app.post("/api/orders")
def create_order(body: OrderPayload):
    try:
        conn = get_conn()
        c = conn.cursor()

        # Inventory check and stock deduction
        for item in body.items:
            pid = str(item.get("id") or item.get("product_id") or "1")
            qty = int(item.get("qty") or 1)
            c.execute("SELECT stock, reserved FROM inventory WHERE product_id = ?", (pid,))
            inv_row = c.fetchone()
            if inv_row:
                avail = inv_row["stock"]
                if avail <= 0:
                    if config.IS_QA:
                        stock_ratio = float(qty) / float(avail)
                    else:
                        conn.close()
                        raise HTTPException(status_code=409, detail=f"Product {pid} is out of stock")

                if config.IS_QA:
                    c.execute("UPDATE inventory SET stock = stock - ? WHERE product_id = ? AND stock > ?",
                              (qty, pid, qty))
                else:
                    c.execute("UPDATE inventory SET stock = stock - ? WHERE product_id = ? AND stock >= ?",
                              (qty, pid, qty))

        # Shipping charge evaluation
        if body.subtotal >= config.FREE_SHIPPING_THRESHOLD:
            if config.IS_QA:
                effective_shipping = 0.0
            else:
                effective_shipping = 0.0 if body.shipping_method == "regular" else body.shipping
        else:
            effective_shipping = body.shipping

        # Regional tax assessment
        taxable_base = max(0.0, body.subtotal - body.discount)
        if config.IS_QA:
            calculated_tax = float(int(taxable_base * config.TAX_RATE))
        else:
            calculated_tax = float(round(taxable_base * config.TAX_RATE))

        # Order storage
        if config.IS_QA:
            db_subtotal = body.total
            db_total = body.subtotal
        else:
            db_subtotal = body.subtotal
            db_total = body.total

        now_ist = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        c.execute("""
            INSERT INTO orders
              (order_id, user_email, user_name, items, subtotal, shipping, tax,
               total, payment_method, shipping_method, address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            body.order_id, body.user_email, body.user_name,
            json.dumps(body.items),
            db_subtotal, effective_shipping, calculated_tax, db_total,
            body.payment_method, body.shipping_method, body.address,
            now_ist,
        ))
        conn.commit()
        conn.close()

        if config.IS_QA:
            return {
                "ok": True,
                "order_id": body.order_id,
                "items_count": str(len(body.items)),
            }
        else:
            return {
                "ok": True,
                "order_id": body.order_id,
                "items_count": len(body.items),
                "subtotal": body.subtotal,
                "discount": body.discount,
                "shipping": effective_shipping,
                "tax": calculated_tax,
                "total": body.total,
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/orders")
def get_orders(email: str = ""):
    try:
        conn = get_conn()
        c = conn.cursor()
        c.execute("""
            SELECT order_id, user_name, user_email, items, subtotal, shipping,
                   tax, total, payment_method, shipping_method, address, created_at
            FROM orders
            WHERE user_email = ?
            ORDER BY created_at DESC
        """, (email,))
        rows = c.fetchall()
        conn.close()
        orders = []
        for row in rows:
            o = dict(row)
            try:
                o["items"] = json.loads(o["items"] or "[]")
            except Exception:
                o["items"] = []
            orders.append(o)
        return {"orders": orders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/orders")
def admin_get_orders(admin_email: str = "", admin_password: str = ""):
    """Admin endpoint to get all orders with user info."""
    try:
        conn = get_conn()
        c = conn.cursor()
        # Verify admin
        c.execute(
            "SELECT role FROM users WHERE LOWER(email) = LOWER(?) AND password = ?",
            (admin_email.strip(), admin_password)
        )
        row = c.fetchone()
        if not row or row["role"] != "admin":
            conn.close()
            raise HTTPException(status_code=403, detail="Admin credentials required")

        c.execute("""
            SELECT o.order_id, o.user_email, o.user_name, o.items,
                   o.subtotal, o.shipping, o.tax, o.total,
                   o.payment_method, o.shipping_method, o.address, o.created_at
            FROM orders o
            ORDER BY o.created_at DESC
            LIMIT 500
        """)
        rows = c.fetchall()
        conn.close()
        orders = []
        for row in rows:
            o = dict(row)
            try:
                o["items"] = json.loads(o["items"] or "[]")
            except Exception:
                o["items"] = []
            orders.append(o)
        return {"orders": orders}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Personalised Recommendations for Report ──────────────────────────────────────

class FilterPayload(BaseModel):
    skinType:   str  = ""
    concerns:   list = []
    budget:     str  = ""
    top_n:      int  = 50
    session_id: str  = ""   # FIX #2: wire click history into scoring


@app.post("/api/report/recommendations")
def get_report_recommendations(body: FilterPayload):
    """
    Returns personalised product list filtered by skin type, concerns, and budget.
    FIX #2: session_id passed to scoring so click history boosts ranking.
    FIX #6: budget_relaxed flag returned so frontend can show a warning.
    """
    try:
        results = get_filtered_recommendations(
            df,
            skin_type=body.skinType,
            concerns=body.concerns,
            budget=body.budget,
            top_n=body.top_n,
            session_id=body.session_id,
        )
        # Extract internal flags before serialising
        budget_relaxed = (
            "_budget_relaxed" in results.columns and results["_budget_relaxed"].any()
        )
        skip_cols = {"_budget_relaxed"}

        results = results.replace([float("inf"), float("-inf")], None)
        results = results.where(pd.notnull(results), None)
        records = []
        for row in results.to_dict("records"):
            clean = {}
            for k, v in row.items():
                if k in skip_cols:
                    continue
                if isinstance(v, float) and (v != v or v == float("inf") or v == float("-inf")):
                    clean[k] = None
                else:
                    clean[k] = v
            records.append(clean)
        return {
            "ok": True,
            "count": len(records),
            "products": records,
            "budget_relaxed": budget_relaxed,   # FIX #6
        }
    except Exception as e:
        print(f"Recommendations error: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


# FIX #4: single source of truth — frontend fetches products from backend
@app.get("/api/products")
def list_products():
    """
    Returns the full product catalog from the live CSV-loaded DataFrame.
    Frontend should call this instead of importing src/data/products.js static array.
    """
    try:
        cols = [
            "product_id", "product_name", "brand", "product_type",
            "price", "price_num", "picture_src", "skintype",
            "notable_effects", "description", "low_sell_probability",
        ]
        available = [c for c in cols if c in df.columns]
        raw_records = df[available].to_dict("records")
        clean_records = []
        for row in raw_records:
            clean_row = {}
            for k, v in row.items():
                if isinstance(v, float) and (v != v or v == float("inf") or v == float("-inf")):
                    clean_row[k] = None
                else:
                    clean_row[k] = v
            clean_records.append(clean_row)
        return {"products": clean_records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Report Endpoint ────────────────────────────────────────────────────────────

@app.post("/api/report/generate")
def generate_report(body: ReportPayload):
    try:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20 * mm,
            leftMargin=20 * mm,
            topMargin=20 * mm,
            bottomMargin=20 * mm,
        )

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Title"],
            fontSize=22,
            textColor=colors.HexColor("#b5478a"),
            alignment=TA_CENTER,
            spaceAfter=4,
        )
        subtitle_style = ParagraphStyle(
            "ReportSubtitle",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#888888"),
            alignment=TA_CENTER,
            spaceAfter=12,
        )
        section_header_style = ParagraphStyle(
            "SectionHeader",
            parent=styles["Heading2"],
            fontSize=13,
            textColor=colors.HexColor("#b5478a"),
            spaceBefore=14,
            spaceAfter=6,
            borderPad=2,
        )
        body_style = ParagraphStyle(
            "ReportBody",
            parent=styles["Normal"],
            fontSize=10,
            leading=15,
            textColor=colors.HexColor("#333333"),
        )
        label_style = ParagraphStyle(
            "Label",
            parent=styles["Normal"],
            fontSize=9,
            textColor=colors.HexColor("#888888"),
        )
        value_style = ParagraphStyle(
            "Value",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#222222"),
        )

        story = []

        # ── Header ──
        story.append(Paragraph("GlowIQ Skin Analysis Report", title_style))
        generated_at = datetime.now(IST).strftime("%d %B %Y, %I:%M %p IST")
        story.append(Paragraph(f"Generated on {generated_at}", subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e8c4da")))
        story.append(Spacer(1, 10))

        # ── Skin Profile ──
        form = body.formData
        story.append(Paragraph("Your Skin Profile", section_header_style))

        profile_fields = [
            ("Name",         form.get("name", "—")),
            ("Age",          form.get("age", "—")),
            ("Skin Type",    form.get("skinType", "—")),
            ("Skin Tone",    form.get("skinTone", "—")),
            ("Concerns",     ", ".join(form.get("concerns", [])) if isinstance(form.get("concerns"), list) else form.get("concerns", "—")),
            ("Sensitivity",  form.get("sensitivity", "—")),
            ("Climate",      form.get("climate", "—")),
            ("Budget",       form.get("budget", "—")),
        ]

        table_data = []
        for label, value in profile_fields:
            table_data.append([
                Paragraph(label, label_style),
                Paragraph(str(value) if value else "—", value_style),
            ])

        profile_table = Table(table_data, colWidths=[45 * mm, 120 * mm])
        profile_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#fdf0f8")),
            ("BACKGROUND", (1, 0), (1, -1), colors.white),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.HexColor("#fdf0f8"), colors.white]),
            ("GRID",       (0, 0), (-1, -1), 0.5, colors.HexColor("#e8c4da")),
            ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ]))
        story.append(profile_table)
        story.append(Spacer(1, 10))

        # ── Recommended Products ──
        if body.recommendedProducts:
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e8c4da")))
            story.append(Paragraph("Recommended Products", section_header_style))

            hdr_style = ParagraphStyle(
                "ProdHdr",
                parent=styles["Normal"],
                fontSize=9, fontName="Helvetica-Bold",
                textColor=colors.white, leading=12,
            )
            cell_style = ParagraphStyle(
                "ProdCell",
                parent=styles["Normal"],
                fontSize=9, textColor=colors.HexColor("#222222"), leading=13,
            )
            price_style = ParagraphStyle(
                "ProdPrice",
                parent=styles["Normal"],
                fontSize=9, textColor=colors.HexColor("#b5478a"),
                fontName="Helvetica-Bold", leading=13,
            )

            prod_data = [[
                Paragraph("#", hdr_style),
                Paragraph("Product Name", hdr_style),
                Paragraph("Brand", hdr_style),
                Paragraph("Price", hdr_style),
            ]]
            for i, p in enumerate(body.recommendedProducts, 1):
                name  = (p.get("product_name") or p.get("name") or "—").strip()
                brand = (p.get("brand") or p.get("Brand") or "—").strip()
                raw_price = p.get("price") or p.get("Price") or p.get("selling_price") or "—"
                try:
                    v = float(str(raw_price).replace("Rs","").replace(",","").strip())
                    price = f"Rs {v:,.0f}" if v >= 1000 else f"Rs {v:.2f}"
                except Exception:
                    price = str(raw_price)

                prod_data.append([
                    Paragraph(str(i), cell_style),
                    Paragraph(name,   cell_style),
                    Paragraph(brand,  cell_style),
                    Paragraph(price,  price_style),
                ])

            prod_table = Table(
                prod_data,
                colWidths=[10 * mm, 80 * mm, 45 * mm, 30 * mm],
            )
            prod_table.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (-1, 0),  colors.HexColor("#b5478a")),
                ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.HexColor("#fdf0f8"), colors.white]),
                ("GRID",          (0, 0), (-1, -1), 0.5, colors.HexColor("#e8c4da")),
                ("VALIGN",        (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING",    (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING",   (0, 0), (-1, -1), 7),
                ("RIGHTPADDING",  (0, 0), (-1, -1), 7),
            ]))
            story.append(prod_table)
            story.append(Spacer(1, 10))

        # ── Chat / AI Advice ──
        if body.chatHistory:
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e8c4da")))
            story.append(Paragraph("AI Skincare Advice", section_header_style))

            assistant_style = ParagraphStyle(
                "AssistantMsg",
                parent=body_style,
                leftIndent=10,
                spaceBefore=4,
                spaceAfter=4,
            )
            user_style = ParagraphStyle(
                "UserMsg",
                parent=body_style,
                leftIndent=10,
                textColor=colors.HexColor("#666666"),
                spaceBefore=4,
                spaceAfter=4,
            )

            for msg in body.chatHistory:
                role = msg.get("role", "")
                content = str(msg.get("content", "")).strip()
                if not content:
                    continue
                if role == "assistant":
                    story.append(Paragraph(f"<b>GlowIQ:</b> {content}", assistant_style))
                elif role == "user":
                    story.append(Paragraph(f"<b>You:</b> {content}", user_style))

            story.append(Spacer(1, 6))

        # ── Footer ──
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e8c4da")))
        footer_style = ParagraphStyle(
            "Footer",
            parent=styles["Normal"],
            fontSize=8,
            textColor=colors.HexColor("#aaaaaa"),
            alignment=TA_CENTER,
            spaceBefore=8,
        )
        story.append(Paragraph(
            "This report is generated by GlowIQ — Your AI-Powered Skincare Companion. "
            "For personalised medical advice, please consult a dermatologist.",
            footer_style,
        ))

        doc.build(story)
        buffer.seek(0)

        filename = f"GlowIQ_Report_{datetime.now(IST).strftime('%Y%m%d_%H%M%S')}.pdf"
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except Exception as e:
        print(f"Report generation error: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    print("\n" + "-" * 50)
    print("GlowIQ API starting...")
    print("-" * 50)
    print(f"API:    http://{host}:{port}")
    print(f"Health: http://{host}:{port}/health")
    print(f"Docs:   http://{host}:{port}/docs")
    print(f"Skin:   http://{host}:{port}/api/analyze-skin")
    print("-" * 50)
    print("Keep this terminal open while using the React app.")
    print("Stop with Ctrl+C\n")
    uvicorn.run(app, host=host, port=port, reload=False)