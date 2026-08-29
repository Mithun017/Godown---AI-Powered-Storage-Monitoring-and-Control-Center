import os
import joblib
import pandas as pd
import numpy as np

# Safe optional SHAP import with fallback to native XGBoost feature importances
try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    shap = None
    SHAP_AVAILABLE = False

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACTS_DIR = os.path.join(BASE_DIR, "ml", "artifacts")

classifier_data = None
forecaster_data = None
tree_explainer = None

def load_ml_models():
    global classifier_data, forecaster_data, tree_explainer

    clf_path = os.path.join(ARTIFACTS_DIR, "classifier.joblib")
    fore_path = os.path.join(ARTIFACTS_DIR, "forecaster.joblib")

    if os.path.exists(clf_path):
        classifier_data = joblib.load(clf_path)
        print("Classifier model loaded successfully.")
        if SHAP_AVAILABLE:
            try:
                tree_explainer = shap.TreeExplainer(classifier_data["model"])
                print("SHAP TreeExplainer initialized successfully.")
            except Exception as e:
                print(f"Warning: Could not initialize SHAP TreeExplainer: {e}")
                tree_explainer = None

    if os.path.exists(fore_path):
        forecaster_data = joblib.load(fore_path)
        print("Forecaster model loaded successfully.")

def predict_zone_status(input_data: dict) -> dict:
    if not classifier_data:
        raise RuntimeError("Classifier model is not loaded.")

    model = classifier_data["model"]
    encoder = classifier_data["encoder"]
    features = classifier_data["features"]

    input_dict = dict(input_data)
    # Automatically compute engineered custom features if missing from payload
    if "Thermal_Moisture_Index" not in input_dict or input_dict["Thermal_Moisture_Index"] is None:
        temp = float(input_dict.get("Temperature_C", 25.0))
        hum = float(input_dict.get("Humidity_%", 50.0))
        input_dict["Thermal_Moisture_Index"] = round(temp * (hum / 100.0), 2)

    if "Combustion_Risk_Score" not in input_dict or input_dict["Combustion_Risk_Score"] is None:
        smoke = float(input_dict.get("Smoke_ppm", 100.0))
        temp = float(input_dict.get("Temperature_C", 25.0))
        input_dict["Combustion_Risk_Score"] = round((smoke / 1000.0) * (temp / 50.0), 3)

    if "Capacity_Pressure_Index" not in input_dict or input_dict["Capacity_Pressure_Index"] is None:
        occ = float(input_dict.get("Occupancy_Pct", 50.0))
        dist = float(input_dict.get("Distance_cm", 50.0))
        input_dict["Capacity_Pressure_Index"] = round(occ * (100.0 / (dist + 1.0)), 2)

    df = pd.DataFrame([input_dict])[features]
    probs = model.predict_proba(df)[0]
    pred_idx = np.argmax(probs)
    predicted_status = encoder.inverse_transform([pred_idx])[0]
    confidence = round(float(probs[pred_idx]), 4)

    # Class probability breakdown across all classes
    class_probs = {}
    for idx, class_name in enumerate(encoder.classes_):
        class_probs[class_name] = round(float(probs[idx]), 4)

    top_features = []
    if SHAP_AVAILABLE and tree_explainer is not None:
        try:
            shap_values = tree_explainer.shap_values(df)
            if isinstance(shap_values, list):
                sv = shap_values[pred_idx][0]
            elif len(shap_values.shape) == 3:
                sv = shap_values[0, :, pred_idx]
            else:
                sv = shap_values[0]

            feature_impacts = []
            for feat, val, imp in zip(features, df.iloc[0], sv):
                feature_impacts.append({
                    "feature": feat,
                    "value": float(val),
                    "importance": round(float(imp), 4),
                    "abs_importance": abs(float(imp))
                })

            feature_impacts.sort(key=lambda x: x["abs_importance"], reverse=True)
            top_features = [{
                "feature": f["feature"],
                "value": f["value"],
                "importance": f["importance"]
            } for f in feature_impacts[:3]]
        except Exception as e:
            print(f"SHAP calculation fallback: {e}")

    if not top_features:
        # Fallback to feature_importances_ if SHAP is absent or fails
        fi = model.feature_importances_
        pairs = sorted(zip(features, df.iloc[0], fi), key=lambda x: x[2], reverse=True)
        top_features = [{
            "feature": p[0],
            "value": float(p[1]),
            "importance": round(float(p[2]), 4)
        } for p in pairs[:3]]

    return {
        "status": predicted_status,
        "confidence": confidence,
        "top_features": top_features,
        "class_probabilities": class_probs,
        "engineered_features": {
            "Thermal_Moisture_Index": input_dict["Thermal_Moisture_Index"],
            "Combustion_Risk_Score": input_dict["Combustion_Risk_Score"],
            "Capacity_Pressure_Index": input_dict["Capacity_Pressure_Index"]
        }
    }

def predict_yearly_capacity(input_data: dict) -> dict:
    if not forecaster_data:
        raise RuntimeError("Forecaster model is not loaded.")

    model = forecaster_data["model"]
    features = forecaster_data["features"]

    df = pd.DataFrame([input_data])[features]
    pred_val = float(model.predict(df)[0])
    projected = round(max(0.0, min(100.0, pred_val)), 2)

    ci_lower = round(max(0.0, projected - 3.0), 2)
    ci_upper = round(min(100.0, projected + 3.0), 2)

    return {
        "projected_occupancy_pct": projected,
        "confidence_interval": {
            "lower_bound": ci_lower,
            "upper_bound": ci_upper
        }
    }
