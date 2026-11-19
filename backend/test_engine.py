#!/usr/bin/env python
import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

print("Testing recommendation engine...")
try:
    from recommendation_engine import load_data, build_recommendation_payload, init_click_db
    
    c1 = os.path.join(BASE_DIR, "datasets", "Skin_Care.csv")
    c2 = os.path.join(BASE_DIR, "Skin_Care.csv")
    csv_path = c1 if os.path.exists(c1) else c2
    if not os.path.exists(csv_path):
        print(f'CSV file not found: {csv_path}')
        sys.exit(1)
    
    df = load_data(csv_path)
    print(f'✓ Loaded {len(df)} products')
    
    init_click_db()
    print(f'✓ Click DB initialized')
    
    payload = build_recommendation_payload(df, session_id='test')
    print(f"✓ Current season: {payload['current_season']}")
    print(f"✓ Seasonal recs: {len(payload['seasonal_recommendations'])}")
    print(f"✓ Low-sellers: {len(payload['low_selling_samples'])}")
    print(f"✓ Near-expiry: {len(payload['near_expiry_offers'])}")
    print(f"✓ Top-clicked: {len(payload['top_clicked_products'])}")
    print("Recommendation engine working!")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
