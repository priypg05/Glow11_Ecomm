# ✨ GlowIQ — Intelligent Skincare E-Commerce & Analytics Platform

[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite-61DAFB?logo=react)](frontend/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203-009688?logo=fastapi)](backend/)
[![Deployment](https://img.shields.io/badge/Deploy-Vercel%20%2B%20Render-black?logo=vercel)](docs/DEPLOYMENT_GUIDE.md)

GlowIQ is an AI-powered skincare e-commerce platform and intelligence dashboard built for modern retail. It features an interactive storefront, AI skin selfie analyzer powered by Groq & Llama vision, rule-based & machine-learning skincare recommendation engine, automated PDF skincare report generation, customer analytics dashboard, and admin management.

---

## 📁 Decoupled Architecture

The project has been separated into clean, modular, production-ready directories:

```
GlowIQ/
│
├── frontend/                          # React + Vite Frontend SPA (Vercel Ready)
│   ├── src/
│   │   ├── auth/                      # Authentication context & client DB logic
│   │   ├── components/                # Reusable UI widgets & selfie analyzer
│   │   ├── config/                    # Centralized API endpoints & environment config
│   │   ├── data/                      # Dashboard analytics & static catalogs
│   │   ├── pages/                     # Store, admin, analytics, & auth pages
│   │   ├── store/                     # E-commerce cart, checkout, payment gateway
│   │   └── theme/                     # Design tokens & color system
│   ├── public/                        # Static assets (video banners, category images)
│   ├── index.html                     # SPA root entry HTML
│   ├── package.json                   # Decoupled frontend npm dependencies
│   ├── vite.config.js                 # Vite bundler configuration & local API proxy
│   ├── vercel.json                    # Vercel SPA routing rewrite rules
│   ├── .env.example                   # Frontend environment variable template
│   └── .gitignore
│
├── backend/                           # FastAPI Python Backend (Render Ready)
│   ├── server.py                      # Main FastAPI server & REST API endpoints
│   ├── recommendation_engine.py       # Recommendation scoring & click tracking
│   ├── skin_analysis_endpoint.py      # Groq AI skin selfie analysis endpoint
│   ├── skin_analysis_wiring.py        # Pipeline connection helper
│   ├── skin_vision_prompt.py          # Structured vision prompt definition
│   ├── config.py                      # Multi-environment config (QA vs Prod)
│   ├── requirements.txt               # Decoupled Python dependencies
│   ├── datasets/                      # 1,224-item Indonesian Skincare dataset
│   │   └── Skin_Care.csv
│   ├── database/                      # SQLite relational databases
│   │   ├── users.db                   # User accounts, orders, inventory, login logs
│   │   └── skincare_clicks.db         # User interaction & click tracking
│   ├── render.yaml                    # Render Blueprint deployment definition
│   ├── test_all.py                    # Comprehensive backend verification suite
│   ├── .env.example                   # Backend environment variable template
│   └── .gitignore
│
├── docs/                              # Project guides & documentation
│   ├── DEPLOYMENT_GUIDE.md            # Step-by-step Vercel + Render deployment guide
│   ├── AI_SKIN_ANALYSIS_FIX.md        # Technical design of the AI vision pipeline
│   └── bug-answer-key.md              # QA automation and test scenario guide
│
├── render.yaml                        # Root Render Blueprint deployment definition
├── START_BACKEND.bat                  # One-click Windows startup for FastAPI backend
├── START_FRONTEND.bat                 # One-click Windows startup for Vite frontend
├── start_servers.bat                  # One-click Windows startup for both servers
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js**: v18 or newer ([nodejs.org](https://nodejs.org))
- **Python**: v3.9+ ([python.org](https://python.org))

### Option 1: One-Click Startup (Windows)
Double-click `start_servers.bat` in the project root. This launches both the backend and frontend dev servers in separate console windows.

### Option 2: Manual Terminal Startup

**Terminal 1 — Backend (FastAPI)**:
```bash
cd backend
pip install -r requirements.txt
python server.py
```
- API will start on: `http://localhost:8000`
- Interactive API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

**Terminal 2 — Frontend (React + Vite)**:
```bash
cd frontend
npm install
npm run dev
```
- Frontend will start on: `http://localhost:3000`

---

## 🌐 Production Deployment

For complete, step-by-step instructions with screenshots, refer to [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md).

### 1. Backend on Render
1. Create a new **Web Service** or **Blueprint** on [Render.com](https://render.com).
2. Connect your Git repository.
3. If creating manually:
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
4. Set Environment Variables:
   - `APP_ENV`: `production`
   - `GROQ_API_KEY`: your free key from `console.groq.com`
   - `ALLOWED_ORIGINS`: `https://your-glowiq.vercel.app`

### 2. Frontend on Vercel
1. Import your Git repository on [Vercel.com](https://vercel.com).
2. Select **Root Directory**: `frontend`.
3. Add Environment Variables:
   - `VITE_API_URL`: `https://your-backend-name.onrender.com`
   - `VITE_APP_ENV`: `production`
4. Deploy!

---

## 🔑 Environment Variables Reference

### Frontend (`frontend/.env`)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Base URL of the FastAPI backend | `https://glowiq-backend.onrender.com` |
| `VITE_APP_ENV` | Environment mode (`production` or `qa`) | `production` |

### Backend (`backend/.env`)
| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | HTTP port to listen on (Render sets this dynamically) | `8000` |
| `HOST` | Host address to bind to | `0.0.0.0` |
| `APP_ENV` | Environment mode (`production` or `qa`) | `production` |
| `GROQ_API_KEY` | Groq Cloud API key for Llama 4 Scout Vision | `gsk_...` |
| `ALLOWED_ORIGINS`| Comma-separated list of additional allowed CORS origins | `https://your-app.vercel.app` |
| `DEFAULT_ADMIN_EMAIL` | Initial admin account email | `admin@glowiq.com` |
| `DEFAULT_ADMIN_PASSWORD` | Initial admin account password | `ChangeMe!123` |

---

## 🧪 Verification & Automated Tests

To run the automated backend verification suite:
```bash
cd backend
python test_all.py
```
This verifies:
1. Backend imports & FastAPI dependencies
2. Recommendation engine data parsing & scoring
3. SQLite database tables, inventory, & admin user seeding
4. Frontend decoupled assets & core component paths

To verify frontend build integrity:
```bash
cd frontend
npm run build
```

---

## 📄 License
ISC License. Built for GlowIQ Skincare Intelligence.
