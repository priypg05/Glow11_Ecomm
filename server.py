"""
GlowIQ Root Server Entrypoint
=============================
Allows starting the backend directly from the project root:
    python server.py
    py -3 server.py

It automatically delegates to backend/server.py.
"""
import os
import sys

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Switch working directory to backend so all relative paths work seamlessly
os.chdir(BACKEND_DIR)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"Starting GlowIQ Backend from root wrapper (port {port})...")
    uvicorn.run("server:app", host=host, port=port, reload=False)
