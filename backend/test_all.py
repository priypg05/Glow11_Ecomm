#!/usr/bin/env python3
"""
Comprehensive test suite for GlowIQ Backend
Tests all critical functionality before frontend startup
"""

import sys
import os
import json

# Add project path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")
sys.path.insert(0, BASE_DIR)

def test_recommendation_engine():
    """Test the recommendation engine works"""
    print("\n" + "="*60)
    print("TEST 1: Recommendation Engine")
    print("="*60)
    
    try:
        from recommendation_engine import (
            load_data, 
            build_recommendation_payload, 
            init_click_db
        )
        
        c1 = os.path.join(BASE_DIR, "datasets", "Skin_Care.csv")
        c2 = os.path.join(BASE_DIR, "Skin_Care.csv")
        csv_path = c1 if os.path.exists(c1) else c2
        
        # Check CSV exists
        if not os.path.exists(csv_path):
            print(f"❌ CSV not found: {csv_path}")
            return False
        print(f"✓ CSV file found")
        
        # Load data
        df = load_data(csv_path)
        if len(df) == 0:
            print("❌ No products loaded from CSV")
            return False
        print(f"✓ Loaded {len(df)} products")
        
        # Check required columns
        required_cols = ['product_id', 'product_name', 'price', 'low_sell_probability', 
                        'peak_season', 'days_to_expiry', 'expiry_date']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            print(f"❌ Missing columns: {missing_cols}")
            return False
        print(f"✓ All required columns present")
        
        # Initialize click DB
        init_click_db()
        print("✓ Click database initialized")
        
        # Build recommendation payload
        payload = build_recommendation_payload(df, session_id='test_session')
        
        # Check payload structure
        expected_keys = ['current_season', 'seasonal_recommendations', 'low_selling_samples',
                        'near_expiry_offers', 'top_clicked_products', 'generated_at']
        missing_keys = [k for k in expected_keys if k not in payload]
        if missing_keys:
            print(f"❌ Missing payload keys: {missing_keys}")
            return False
        print(f"✓ Payload structure valid")
        
        # Check recommendations are lists
        if not isinstance(payload['seasonal_recommendations'], list):
            print("❌ seasonal_recommendations is not a list")
            return False
        if not isinstance(payload['low_selling_samples'], list):
            print("❌ low_selling_samples is not a list")
            return False
        if not isinstance(payload['near_expiry_offers'], list):
            print("❌ near_expiry_offers is not a list")
            return False
        print(f"✓ Recommendations generated:")
        print(f"  - Season: {payload['current_season']}")
        print(f"  - Seasonal: {len(payload['seasonal_recommendations'])} products")
        print(f"  - Low-sellers: {len(payload['low_selling_samples'])} products")
        print(f"  - Near-expiry: {len(payload['near_expiry_offers'])} products")
        
        print("\n✅ Recommendation Engine: PASSED")
        return True
        
    except Exception as e:
        print(f"\n❌ Recommendation Engine: FAILED")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_auth_database():
    """Test authentication database setup"""
    print("\n" + "="*60)
    print("TEST 2: Authentication Database")
    print("="*60)
    
    try:
        import sqlite3
        
        c1 = os.path.join(BASE_DIR, "database", "users.db")
        c2 = os.path.join(BASE_DIR, "users.db")
        db_path = c1 if os.path.exists(c1) else c2
        
        # Initialize as done in server.py
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        # Check users table exists
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not c.fetchone():
            print("❌ users table not found")
            conn.close()
            return False
        print("✓ users table exists")
        
        # Check login_logs table exists
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='login_logs'")
        if not c.fetchone():
            print("❌ login_logs table not found")
            conn.close()
            return False
        print("✓ login_logs table exists")
        
        # Check admin user exists
        c.execute("SELECT id, email, role FROM users WHERE email = ?", 
                 ("shivi5035singh@gmail.com",))
        admin = c.fetchone()
        
        if not admin:
            print("❌ Admin user not found")
            print("Creating admin user...")
            c.execute(
                "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)",
                ("shivi5035singh@gmail.com", "QWERTY@123", "Shivi Singh", "admin")
            )
            conn.commit()
            print("✓ Admin user created")
        else:
            print(f"✓ Admin user exists: {admin['email']}")
            if admin['role'] != 'admin':
                print(f"❌ Admin user has wrong role: {admin['role']}")
                conn.close()
                return False
            print(f"✓ Admin role verified")
        
        # Count users
        c.execute("SELECT COUNT(*) as cnt FROM users")
        count = c.fetchone()['cnt']
        print(f"✓ Total users in database: {count}")
        
        conn.close()
        print("\n✅ Authentication Database: PASSED")
        return True
        
    except Exception as e:
        print(f"\n❌ Authentication Database: FAILED")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_backend_imports():
    """Test all backend imports work"""
    print("\n" + "="*60)
    print("TEST 3: Backend Imports")
    print("="*60)
    
    try:
        print("Testing imports...")
        
        # Test FastAPI imports
        from fastapi import FastAPI, HTTPException
        print("✓ FastAPI")
        
        from fastapi.middleware.cors import CORSMiddleware
        print("✓ CORS Middleware")
        
        from pydantic import BaseModel
        print("✓ Pydantic")
        
        import uvicorn
        print("✓ Uvicorn")
        
        # Test recommendation engine import
        from recommendation_engine import (
            load_data,
            build_recommendation_payload,
            record_click,
            init_click_db,
        )
        print("✓ Recommendation Engine")
        
        print("\n✅ Backend Imports: PASSED")
        return True
        
    except ImportError as e:
        print(f"\n❌ Backend Imports: FAILED")
        print(f"Missing package: {e}")
        print("\nTry running: pip install fastapi uvicorn pandas numpy pydantic")
        return False
    except Exception as e:
        print(f"\n❌ Backend Imports: FAILED")
        print(f"Error: {e}")
        return False

def test_frontend_files():
    """Test frontend files exist"""
    print("\n" + "="*60)
    print("TEST 4: Frontend Files")
    print("="*60)
    
    try:
        files_to_check = [
            os.path.join(FRONTEND_DIR, 'package.json'),
            os.path.join(FRONTEND_DIR, 'vite.config.js'),
            os.path.join(FRONTEND_DIR, 'src', 'App.jsx'),
            os.path.join(FRONTEND_DIR, 'src', 'main.jsx'),
            os.path.join(FRONTEND_DIR, 'src', 'pages', 'LoginPage.jsx'),
            os.path.join(FRONTEND_DIR, 'src', 'auth', 'AuthContext.jsx'),
            os.path.join(FRONTEND_DIR, 'src', 'auth', 'db.js'),
            os.path.join(FRONTEND_DIR, 'src', 'AdminApp.jsx'),
            os.path.join(FRONTEND_DIR, 'src', 'store', 'StoreFront.jsx'),
        ]
        
        all_exist = True
        for file_path in files_to_check:
            if os.path.exists(file_path):
                print(f"✓ {os.path.basename(file_path)}")
            else:
                print(f"❌ MISSING: {file_path}")
                all_exist = False
        
        if not all_exist:
            print("\n❌ Frontend Files: FAILED")
            return False
        
        print("\n✅ Frontend Files: PASSED")
        return True
        
    except Exception as e:
        print(f"\n❌ Frontend Files: FAILED")
        print(f"Error: {e}")
        return False

def test_shoplab_business_rules():
    """Test ShopLab functional requirements, worked example, lockout, and endpoints"""
    print("\n" + "="*60)
    print("TEST 5: ShopLab E-Commerce Requirements & Benchmark")
    print("="*60)
    try:
        from fastapi.testclient import TestClient
        from server import app
        client = TestClient(app)

        # 1. Reset endpoint (Section 7)
        r_reset = client.post("/api/test/reset")
        assert r_reset.status_code == 200, f"Reset failed: {r_reset.text}"
        print("✓ POST /api/test/reset succeeds")

        # 2. Health endpoint (Section 7)
        r_health = client.get("/api/health")
        assert r_health.status_code == 200 and r_health.json().get("status") == "ok"
        print("✓ GET /api/health succeeds")

        # 3. Worked Example benchmark (Section 5.4 REQ-PRC-07)
        # 2 × Wireless Mouse at 24.50 + 1 × USB-C Hub at 59.99, coupon SAVE10, standard shipping
        cart_items = [
            {"id": "1001", "name": "Wireless Mouse", "brand": "ShopLab", "qty": 2, "price": 24.50, "category": "Electronics"},
            {"id": "1002", "name": "USB-C Hub", "brand": "ShopLab", "qty": 1, "price": 59.99, "category": "Electronics"}
        ]
        cp = client.post("/api/cart/coupon", json={"code": "SAVE10", "subtotal": 108.99, "items": cart_items}).json()
        assert cp["discount"] == 10.90, f"Coupon discount mismatch: {cp}"

        order_res = client.post("/api/orders", json={
            "user_email": "customer1@shoplab.test",
            "items": cart_items,
            "coupon_code": "SAVE10",
            "shipping_method": "standard",
            "address": "123 Market St, San Jose 95113"
        }).json()
        assert order_res["subtotal"] == 108.99, f"Subtotal mismatch: {order_res}"
        assert order_res["discount"] == 10.90, f"Discount mismatch: {order_res}"
        assert order_res["shipping"] == 5.99, f"Shipping mismatch: {order_res}"
        assert order_res["tax"] == 8.33, f"Tax mismatch: {order_res}"
        assert order_res["total"] == 112.41, f"Total mismatch: {order_res}"
        assert order_res["order_id"].startswith("ORD-"), f"Order ID mismatch: {order_res}"
        print("✓ Worked example benchmark PASSED: Subtotal 108.99, Discount 10.90, Shipping 5.99, Tax 8.33, Total 112.41")

        # 4. Out of stock conflict (REQ-CHK-05)
        oos = client.post("/api/orders", json={
            "user_email": "customer1@shoplab.test",
            "items": [{"id": "1003", "name": "Out of Stock Gadget", "qty": 1, "price": 19.99}]
        })
        assert oos.status_code == 409, f"Expected 409 Conflict, got {oos.status_code}"
        print("✓ Out of stock conflict 409 PASSED")

        # 5. Order cancellation (REQ-ORD-02)
        can = client.post(f"/api/orders/{order_res['order_id']}/cancel")
        assert can.status_code == 200 and can.json().get("status") == "Cancelled"
        print("✓ Order cancellation and stock return PASSED")

        # 6. Locked user (REQ-ACC-02)
        lock_res = client.post("/api/auth/login", json={"email": "locked@shoplab.test", "password": "WrongPassword!"})
        assert lock_res.status_code == 423
        assert lock_res.json()["error"]["message"] == "Your account is locked"
        print("✓ Locked account 423 PASSED")

        print("\n✅ ShopLab Business Rules: PASSED")
        return True
    except Exception as e:
        print(f"\n❌ ShopLab Business Rules: FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("🚀 GlowIQ Backend Verification Suite")
    print("="*60)
    
    results = []
    
    # Run tests
    results.append(("Backend Imports", test_backend_imports()))
    results.append(("Recommendation Engine", test_recommendation_engine()))
    results.append(("Auth Database", test_auth_database()))
    results.append(("Frontend Files", test_frontend_files()))
    results.append(("ShopLab Requirements & Benchmark", test_shoplab_business_rules()))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("\n" + "="*60)
    if passed == total:
        print(f"✅ ALL TESTS PASSED ({passed}/{total})")
        print("\nYou can now start the servers:")
        print("  Terminal 1: python server.py")
        print("  Terminal 2: npm run dev")
        print("\nThen open: http://localhost:5173")
        print("="*60)
        return 0
    else:
        print(f"❌ SOME TESTS FAILED ({passed}/{total})")
        print("Please fix the errors above before running the servers.")
        print("="*60)
        return 1

if __name__ == "__main__":
    sys.exit(main())
