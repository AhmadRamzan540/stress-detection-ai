# Stress Detection System

A web application that predicts stress levels based on user inputs and a machine‑learning model.

## Project structure
```
Stress Detection System/
├─ backend/          # FastAPI backend (app.py)
├─ frontend/         # Static HTML/CSS/JS
│   ├─ index.html
│   ├─ css/style.css
│   └─ js/app.js
├─ ml_code.py        # Script that trains/outputs best model and accuracy
├─ requirements.txt  # Python dependencies
└─ README.md
```

## Quick start (local development)
1. **Install dependencies**
   ```bash
   python -m venv venv
   .\venv\Scripts\activate   # Windows PowerShell
   pip install -r requirements.txt
   ```
2. **Run the backend**
   ```bash
   uvicorn backend.app:app --reload
   ```
   The app will be available at `http://127.0.0.1:8000`.
3. Open a browser and navigate to the above URL – the frontend `index.html` is served automatically.

## Deploy to Render (free tier)
1. Sign up / log in to [Render.com](https://render.com).
2. Create a new **Web Service**.
3. Connect your GitHub repository (once created) and set the **Build Command**:
   ```bash
   pip install -r requirements.txt
   ```
4. Set the **Start Command** to:
   ```bash
   uvicorn backend.app:app --host 0.0.0.0 --port $PORT
   ```
   Render will provide the `$PORT` environment variable.
5. Click **Create Web Service** – Render will build and deploy the app. The public URL will be displayed once deployment finishes.

## Creating a GitHub repository
1. Go to https://github.com/new.
2. Choose a name (e.g., `stress-detection`).
3. **Do NOT** initialize with a README, .gitignore or license – we will push the existing files.
4. Click **Create repository**.
5. Follow the instructions below to push the project.

## Pushing the project to GitHub
```bash
# In the project root folder (Stress Detection System)
git init
git add .
git commit -m "Initial commit – stress detection web app"
git remote add origin https://github.com/<YOUR_USERNAME>/stress-detection.git
git branch -M main
git push -u origin main
```
Replace `<YOUR_USERNAME>` with your GitHub username. If you have two‑factor authentication, you’ll need a personal access token for the push.

---
*This README was generated to help you set up, run locally, and deploy the application.*
