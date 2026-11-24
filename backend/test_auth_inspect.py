from fastapi.testclient import TestClient
from server import app
import hashlib

client = TestClient(app)

print("--- Testing Reset ---")
r_reset = client.post("/api/test/reset")
print("Reset:", r_reset.status_code, r_reset.json())

print("\n--- Testing Registration with SHA-256 Hashed Password (DevTools safe) ---")
pw = "QWERTY@123"
hashed = hashlib.sha256(pw.encode()).hexdigest()
print(f"Hashed payload sent: {hashed}")

r_reg = client.post("/api/auth/register", json={
    "email": "shivi035singh@gmail.com",
    "password": hashed,
    "confirm_password": hashed,
    "name": "shivi"
})
print("Register status:", r_reg.status_code, r_reg.json())
assert r_reg.status_code == 200, "Registration failed!"

print("\n--- Testing Login with Hash ---")
r_log1 = client.post("/api/auth/login", json={
    "email": "shivi035singh@gmail.com",
    "password": hashed
})
print("Login with hash:", r_log1.status_code, r_log1.json())
assert r_log1.status_code == 200, "Login with hash failed!"

print("\n--- Testing Login with Plain (Backward Compatibility) ---")
r_log2 = client.post("/api/auth/login", json={
    "email": "shivi035singh@gmail.com",
    "password": pw
})
print("Login with plain:", r_log2.status_code, r_log2.json())
assert r_log2.status_code == 200, "Login with plain failed!"

print("\n--- Testing Seed Customer with SHA-256 Hash ---")
seed_hash = hashlib.sha256("Test@1234".encode()).hexdigest()
r_seed_hash = client.post("/api/auth/login", json={
    "email": "customer1@shoplab.test",
    "password": seed_hash
})
print("Seed login with hash:", r_seed_hash.status_code, r_seed_hash.json())
assert r_seed_hash.status_code == 200, "Seed login with hash failed!"

print("\n--- Testing Seed Customer with Plain Text ---")
r_seed_plain = client.post("/api/auth/login", json={
    "email": "customer1@shoplab.test",
    "password": "Test@1234"
})
print("Seed login with plain:", r_seed_plain.status_code, r_seed_plain.json())
assert r_seed_plain.status_code == 200, "Seed login with plain failed!"

print("\n--- Testing Wrong Password Failure ---")
r_wrong = client.post("/api/auth/login", json={
    "email": "shivi035singh@gmail.com",
    "password": "WrongPassword@999"
})
print("Wrong password response:", r_wrong.status_code, r_wrong.json())
assert r_wrong.status_code == 401, "Wrong password should return 401!"

print("\n✅ ALL AUTH & INSPECT SECURITY CHECKS PASSED!")
