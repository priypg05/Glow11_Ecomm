"""
Test Bug Verification Suite
===========================
Verifies that all planted bugs trigger under their respective QA/RCA test scenarios,
while the core application flows, endpoints, and health checks remain fully operational.
"""
import sys
import os
import json
import sqlite3
from fastapi.testclient import TestClient

# Ensure backend directory is in python path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from server import app, get_conn, init_auth_db
from config import config
from pricing import calculateDiscount, calculateShipping, calculateTax, calculateLineTotal, calculateSubtotal

client = TestClient(app, raise_server_exceptions=False)

def run_all_tests():
    print("=" * 60)
    print("🧪 Verifying Planted Defects & QA/RCA Evaluation Scenarios")
    print("=" * 60)

    # Reset test database first
    r_reset = client.post("/api/test/reset")
    assert r_reset.status_code == 200, f"Reset failed: {r_reset.text}"
    print("✓ POST /api/test/reset succeeds")

    # Health check
    r_health = client.get("/api/health")
    assert r_health.status_code == 200, f"Health check failed: {r_health.text}"
    health_data = r_health.json()
    assert health_data["status"] == "ok"
    print(f"✓ GET /api/health succeeds (env: {health_data.get('env')})")

    # 1. BUG-BE-01: Discount calculated on subtotal + shipping for SAVE10
    disc, _ = calculateDiscount(108.99, "SAVE10", shipping=5.99)
    assert disc == 11.50, f"BUG-BE-01: Expected 11.50, got {disc}"
    print(f"✓ BUG-BE-01 verified: SAVE10 discount is {disc} (10% of 108.99 + 5.99 = 11.50)")

    # 2. BUG-BE-02 & BUG-CFG-01: 18% Tax rate
    tax = calculateTax(108.99, 10.90, 5.99, config.TAX_RATE)
    assert tax == 18.73, f"BUG-BE-02: Expected 18.73 (18%), got {tax}"
    print(f"✓ BUG-BE-02 / BUG-CFG-01 verified: Tax calculated at 18% = {tax}")

    # 3. BUG-BE-03: Free shipping strict inequality (> 100) & waiving Express
    ship_exact = calculateShipping(100.00, 0.0, "standard")
    assert ship_exact == 5.99, f"BUG-BE-03: Expected 5.99 for subtotal exactly 100.00, got {ship_exact}"
    ship_express_free = calculateShipping(150.00, 0.0, "express")
    assert ship_express_free == 0.0, f"BUG-BE-03: Expected express waived to 0.0, got {ship_express_free}"
    print(f"✓ BUG-BE-03 verified: Subtotal 100.00 charged {ship_exact}; Express waived to {ship_express_free}")

    # 4. BUG-BE-05: ELEC15 applied to all categories
    elec_disc, _ = calculateDiscount(200.00, "ELEC15")
    assert elec_disc == 30.00, f"BUG-BE-05: Expected 30.00 (15% of all items), got {elec_disc}"
    print(f"✓ BUG-BE-05 verified: ELEC15 discount = {elec_disc} (applied across entire cart)")

    # 5. BUG-API-01: Invalid coupon returns HTTP 200 with ok: false
    r_coupon = client.post("/api/coupons/apply", json={"code": "NONEXISTENT", "subtotal": 50.0, "items": []})
    assert r_coupon.status_code == 200, f"BUG-API-01: Expected 200 OK, got {r_coupon.status_code}"
    assert r_coupon.json()["valid"] == False, "BUG-API-01: Expected valid == False"
    print("✓ BUG-API-01 verified: Invalid coupon returns 200 OK with valid: False")

    # 6. BUG-AUTH-01 & BUG-AUTH-02: Lockout threshold = 3, returns 401 generic error
    # Seeded locked user
    r_locked = client.post("/api/auth/login", json={"email": "locked@shoplab.test", "password": "AnyPassword123!"})
    assert r_locked.status_code == 401, f"BUG-AUTH-02: Expected 401, got {r_locked.status_code}"
    assert "Invalid email or password" in r_locked.text, "BUG-AUTH-02: Expected generic message hiding lockout"
    print("✓ BUG-AUTH-02 verified: Locked user returns 401 with generic error")

    # Trigger lockout with 3 wrong attempts
    test_user = "lockout_test@shoplab.test"
    for i in range(3):
        client.post("/api/auth/login", json={"email": test_user, "password": "WrongPassword"})
    r_locked_attempt = client.post("/api/auth/login", json={"email": test_user, "password": "WrongPassword"})
    assert r_locked_attempt.status_code == 401
    print("✓ BUG-AUTH-01 verified: Account locked out after 3 failed attempts")

    # 7. BUG-BE-06: Cancel order does not restore stock
    # Seeded user customer2 has an order or let's create a test order
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT stock FROM inventory WHERE product_id = '1001'")
    initial_stock = c.fetchone()["stock"]
    conn.close()

    # Place order
    r_order = client.post("/api/orders", json={
        "order_id": "ORD-TEST-CANCEL-01",
        "user_email": "customer1@shoplab.test",
        "user_name": "Customer One",
        "items": [{"id": "1001", "name": "Wireless Ergonomic Mouse", "qty": 2, "price": 24.50}],
        "subtotal": 49.00,
        "shipping": 5.99,
        "shipping_method": "standard",
        "address": "123 Main St, San Jose, CA"
    })
    assert r_order.status_code == 200

    # Cancel the order
    r_cancel = client.post("/api/orders/ORD-TEST-CANCEL-01/cancel")
    assert r_cancel.status_code == 200
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT stock FROM inventory WHERE product_id = '1001'")
    stock_after_cancel = c.fetchone()["stock"]
    conn.close()
    assert stock_after_cancel == initial_stock - 2, f"BUG-BE-06: Stock was unexpectedly restored (got {stock_after_cancel})"
    print(f"✓ BUG-BE-06 verified: Stock remained decremented ({stock_after_cancel} vs {initial_stock}) because cancel order fails to restore stock")

    # 8. BUG-DB-01: Orders subtotal and total transposed
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT subtotal, total FROM orders WHERE order_id = 'ORD-TEST-CANCEL-01'")
    row_ord = c.fetchone()
    conn.close()
    assert row_ord["subtotal"] > row_ord["total"], f"BUG-DB-01: subtotal and total not transposed: {dict(row_ord)}"
    print(f"✓ BUG-DB-01 verified: Database orders table columns transposed: subtotal={row_ord['subtotal']}, total={row_ord['total']}")

    # 9. BUG-API-02: Missing audit fields and items_count as string
    ord_resp = r_order.json()
    assert isinstance(ord_resp["items_count"], str), "BUG-API-02: items_count should be str"
    assert "tax" not in ord_resp and "discount" not in ord_resp, "BUG-API-02: tax/discount should be omitted"
    print("✓ BUG-API-02 verified: Order response omits tax/discount and serializes items_count as string")

    # 10. BUG-API-03: Zero division when stock is 0
    # Set stock of product 1002 to 0
    conn = get_conn()
    c = conn.cursor()
    c.execute("UPDATE inventory SET stock = 0 WHERE product_id = '1002'")
    conn.commit()
    conn.close()

    r_zerodiv = client.post("/api/orders", json={
        "order_id": "ORD-TEST-ZERODIV-01",
        "user_email": "customer1@shoplab.test",
        "items": [{"id": "1002", "name": "USB-C Hub Multiport", "qty": 1, "price": 59.99}],
        "subtotal": 59.99,
        "shipping": 5.99,
        "address": "123 Main St"
    })
    assert r_zerodiv.status_code == 500, f"BUG-API-03: Expected HTTP 500 on stock 0, got {r_zerodiv.status_code}"
    print("✓ BUG-API-03 verified: Purchasing out of stock item triggers HTTP 500 ZeroDivisionError")

    print("=" * 60)
    print("🎉 ALL PLANTED DEFECT VERIFICATIONS PASSED!")
    print("=" * 60)

if __name__ == "__main__":
    run_all_tests()
