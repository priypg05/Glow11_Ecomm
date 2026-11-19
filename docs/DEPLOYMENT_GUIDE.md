# GlowIQ Deployment Guide: Vercel (Frontend) & Render (Backend)

This comprehensive guide details the exact steps to deploy the decoupled GlowIQ platform to production using **Render** for the Python/FastAPI backend and **Vercel** for the React/Vite frontend.

---

## 🏗️ Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │             User Browser               │
                      └──────────────────┬─────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼                                               ▼
    ┌─────────────────────────┐                     ┌─────────────────────────┐
    │     Vercel Frontend     │                     │     Render Backend      │
    │  (React 18 + Vite SPA)  │                     │   (FastAPI + Python)    │
    │  https://*.vercel.app   │                     │  https://*.onrender.com │
    └────────────┬────────────┘                     └────────────┬────────────┘
                 │                                               │
                 │   HTTPS REST API calls                        │
                 │   Base: VITE_API_URL                          │
                 └───────────────────────────────────────────────┤
                                                                 ▼
                                                    ┌─────────────────────────┐
                                                    │  Data & AI Services     │
                                                    │  • SQLite (users/clicks)│
                                                    │  • Skin_Care.csv (1224) │
                                                    │  • Groq Cloud (Vision)  │
                                                    └─────────────────────────┘
```

---

## 🚀 Part 1: Deploying the Backend to Render

### Prerequisites
- A free account on [Render.com](https://render.com).
- Your repository pushed to GitHub or GitLab.
- A free Groq API key from [console.groq.com](https://console.groq.com) (for AI Skin Analysis).

---

### Option A: Using Render Blueprints (`render.yaml`) — Recommended
1. In the Render Dashboard, click **New +** → **Blueprint**.
2. Connect your Git repository.
3. Render automatically discovers `render.yaml` at the root and configures the service:
   - Name: `glowiq-backend`
   - Runtime: `Python`
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. Set the required Secret Environment Variables:
   - `GROQ_API_KEY`: your key from `console.groq.com`
   - `ALLOWED_ORIGINS`: your Vercel URL (e.g. `https://glowiq.vercel.app`)
   - `DEFAULT_ADMIN_EMAIL`: admin login email
   - `DEFAULT_ADMIN_PASSWORD`: secure admin password
5. Click **Apply**. Render will build and deploy your backend.
6. Note your Render backend URL (e.g., `https://glowiq-backend.onrender.com`).

---

### Option B: Manual Web Service Setup on Render
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your Git repository.
3. Configure the following settings:
   - **Name**: `glowiq-backend`
   - **Region**: Oregon (US West) or closest region
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free
4. Under **Advanced Settings**, configure:
   - **Health Check Path**: `/health`
5. Under **Environment Variables**, add:
   | Key | Value | Description |
   |-----|-------|-------------|
   | `PYTHON_VERSION` | `3.11.9` | Ensures modern Python runtime |
   | `APP_ENV` | `production` | Enables production tax and security settings |
   | `GROQ_API_KEY` | `gsk_...` | Free Groq API Key |
   | `ALLOWED_ORIGINS` | `https://your-glowiq.vercel.app` | Vercel production frontend origin |
   | `DEFAULT_ADMIN_EMAIL` | `admin@glowiq.com` | Initial admin account email |
   | `DEFAULT_ADMIN_PASSWORD` | `<secure_password>` | Initial admin account password |
6. Click **Create Web Service**. Wait for the build and deployment to complete.

---

### Step 3: Test Backend Deployment
Once deployed, verify the service in your browser or terminal:
```bash
curl https://<your-render-backend-name>.onrender.com/health
```
Expected response:
```json
{"status":"running","products":1224,"message":"GlowIQ API is live with 1224 products loaded"}
```

---

## 🌐 Part 2: Deploying the Frontend to Vercel

### Prerequisites
- A free account on [Vercel.com](https://vercel.com).
- Your Render backend URL from Part 1.

---

### Step-by-Step Vercel Deployment
1. Go to the [Vercel Dashboard](https://vercel.com) and click **Add New...** → **Project**.
2. Select your Git repository and click **Import**.
3. Configure the Project:
   - **Project Name**: `glowiq`
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select **`frontend`**
   - **Build Command**: `npm run build` (or leave default)
   - **Output Directory**: `dist` (default)
   - **Install Command**: `npm install` (default)
4. Expand the **Environment Variables** section and add:
   | Key | Value | Description |
   |-----|-------|-------------|
   | `VITE_API_URL` | `https://<your-backend>.onrender.com` | Your live Render backend URL |
   | `VITE_APP_ENV` | `production` | Production mode |
5. Click **Deploy**.
6. Vercel will build the React SPA and provide your live URL (e.g. `https://glowiq.vercel.app`).

---

### Step 3: Connect Frontend to Backend (Final CORS Verification)
1. Copy your Vercel deployment URL (e.g., `https://glowiq.vercel.app`).
2. Go back to Render → `glowiq-backend` → **Environment**.
3. Ensure `ALLOWED_ORIGINS` includes your Vercel URL:
   ```
   ALLOWED_ORIGINS=https://glowiq.vercel.app
   ```
4. Note: The backend CORS configuration automatically allows any `https://.*\.vercel\.app` domain by regex pattern matching, so preview deployments will also work out of the box!

---

## 🔒 Security Best Practices Implemented

1. **Decoupled API Keys**:
   - The frontend never bundles or exposes private API keys.
   - All AI calls (Groq Llama-4-Scout) are proxied through `POST /api/analyze-skin` on the backend.
2. **Environment Isolation**:
   - Staging/QA and Production modes are controlled by `APP_ENV`.
   - Admin credentials can be defined via environment variables rather than hardcoded seeds.
3. **CORS Hardening**:
   - Narrowed down to specific production frontend domains and dev preview patterns.

---

## 💾 Database Persistence Note for Render Free Tier

Render's Free Web Service tier uses an ephemeral filesystem. If the container sleeps after inactivity or restarts during redeployment, changes to SQLite databases (`users.db` and `skincare_clicks.db`) will revert to the state stored in Git.

### Recommended Solutions for Production Persistence:
1. **Render Persistent Disk**: Upgrade to a paid Web Service plan and mount a persistent disk at `/var/data` (set `DATABASE_PATH=/var/data/users.db`).
2. **External Serverless Database**:
   - **Turso (LibSQL)**: Serverless SQLite with free tier. Compatible with standard SQLite queries.
   - **Supabase / Neon (PostgreSQL)**: Fully managed cloud database.
