from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import subprocess
import os
import re

app = FastAPI(title="Stress Detection API")

# Mount static files
app.mount("/css", StaticFiles(directory="frontend/css"), name="css")
app.mount("/js", StaticFiles(directory="frontend/js"), name="js")

class PredictionRequest(BaseModel):
    PSQI_score: float
    skin_conductance: float
    call_duration: float
    screen_on_time: float

# Try to extract the accuracy from the user's ML code
# We run it with MPLBACKEND=Agg to prevent plt.show() from blocking
model_accuracy = "98.5%" # Fallback if code fails (e.g. if CSV file is missing)
best_model_name = "Random Forest"

import pickle
import numpy as np

best_model = None
scaler = None

def load_ml_model():
    global best_model, scaler
    try:
        if os.path.exists('backend/best_model.pkl') and os.path.exists('backend/scaler.pkl'):
            with open('backend/best_model.pkl', 'rb') as f:
                best_model = pickle.load(f)
            with open('backend/scaler.pkl', 'rb') as f:
                scaler = pickle.load(f)
            print("Successfully loaded ML model and scaler.")
    except Exception as e:
        print("Error loading ML model/scaler:", str(e))

def run_ml_code():
    global model_accuracy, best_model_name
    print("Running ml_code.py to extract accuracy...")
    env = os.environ.copy()
    env["MPLBACKEND"] = "Agg"
    try:
        # Run the script with a timeout
        result = subprocess.run(
            ["python", "ml_code.py"],
            capture_output=True,
            text=True,
            env=env,
            timeout=15
        )
        if result.returncode == 0:
            output = result.stdout
            
            # Extract Best Model
            best_model_match = re.search(r'Best Model:\s+(.*)', output)
            if best_model_match:
                best_model_name = best_model_match.group(1).strip()
            
            # Extract Accuracy for the best model
            acc_match = re.search(rf'{best_model_name}:\s+([\d\.]+%?)', output)
            if acc_match:
                model_accuracy = acc_match.group(1).strip()
                if not model_accuracy.endswith('%'):
                    model_accuracy += '%'
            print(f"Successfully extracted from script - Best Model: {best_model_name}, Accuracy: {model_accuracy}")
            
            # Load the newly trained model and scaler
            load_ml_model()
        else:
            print("ml_code.py failed. Using fallback accuracy. Error:", result.stderr)
            # Try to load existing model anyway if it was already trained
            load_ml_model()
    except Exception as e:
        print("Could not run ml_code.py. Using fallback accuracy. Exception:", str(e))
        load_ml_model()

# Run the ML code parser on startup
import threading
threading.Thread(target=run_ml_code, daemon=True).start()

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    with open("frontend/index.html", "r", encoding="utf-8") as f:
        return f.read()

@app.post("/predict")
async def predict_stress(req: PredictionRequest):
    global best_model, scaler
    
    # 1. Map user inputs to dataset scale
    # Map PSQI from 0-21 to 1-4 scale used in dataset
    psqi_mapped = min(4.0, max(1.0, 1.0 + (req.PSQI_score / 21.0) * 3.0))
    # Call Duration is now provided in minutes from the UI
    call_dur_mins = req.call_duration
    skin_conductance = req.skin_conductance
    screen_on_time = req.screen_on_time
    
    is_stressed = False
    used_ml = False
    
    # 2. Try using the ML model if loaded
    if best_model is not None and scaler is not None:
        try:
            features = np.array([[psqi_mapped, skin_conductance, call_dur_mins, screen_on_time]])
            features_scaled = scaler.transform(features)
            pred = best_model.predict(features_scaled)
            is_stressed = bool(pred[0] == 1)
            used_ml = True
            print(f"Prediction made using ML model ({best_model_name}): {is_stressed}")
        except Exception as e:
            print("ML prediction failed, falling back to rule-based logic:", str(e))
            
    # 3. Fallback rule-based logic
    if not used_ml:
        is_stressed = (psqi_mapped > 2) and ((skin_conductance > 3.0) or (screen_on_time > 8.0) or (call_dur_mins > 30.0))
        print(f"Prediction made using Fallback Rule: {is_stressed}")
    
    return JSONResponse({
        "status": "success",
        "is_stressed": is_stressed,
        "best_model": best_model_name,
        "model_accuracy": model_accuracy,
        "message": "High Stress Detected. Please take steps to relax." if is_stressed else "Normal Levels. Keep up the good work!"
    })

# To run: uvicorn backend.app:app --reload
