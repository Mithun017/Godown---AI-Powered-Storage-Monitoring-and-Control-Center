import os
import importlib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACTS_DIR = os.path.join(BASE_DIR, "ml", "artifacts")

classifier_data = None
forecaster_data = None
tree_explainer = None

def load_ml_models():
    global classifier_data, forecaster_data, tree_explainer
    try:
        joblib = importlib.import_module("joblib")
        clf_path = os.path.join(ARTIFACTS_DIR, "classifier.joblib")
        fore_path = os.path.join(ARTIFACTS_DIR, "forecaster.joblib")

        if os.path.exists(clf_path):
            classifier_data = joblib.load(clf_path)
            print("Classifier model loaded successfully.")
            try:
                shap = importlib.import_module("shap")
                tree_explainer = shap.TreeExplainer(classifier_data["model"])
                print("SHAP TreeExplainer initialized successfully.")
            except Exception as e:
                print(f"Warning: Could not initialize SHAP TreeExplainer: {e}")
                tree_explainer = None

        if os.path.exists(fore_path):
            forecaster_data = joblib.load(fore_path)
            print("Forecaster model loaded successfully.")
    except Exception as err:
        print(f"Notice: ML Joblib model loading deferred: {err}")

def predict_zone_status(input_data: dict) -> dict:
    input_dict = dict(input_data)
    temp = float(input_dict.get("Temperature_C", 25.0))
    hum = float(input_dict.get("Humidity_%", 50.0))
    smoke = float(input_dict.get("Smoke_ppm", 100.0))
    occ = float(input_dict.get("Occupancy_Pct", 50.0))
    dist = float(input_dict.get("Distance_cm", 50.0))

    thermal_idx = round(temp * (hum / 100.0), 2)
    combustion_score = round((smoke / 1000.0) * (temp / 50.0), 3)
    capacity_idx = round(occ * (100.0 / (dist + 1.0)), 2)

    # If classifier model is available, use ML model prediction
    if classifier_data:
        try:
            pd = importlib.import_module("pandas")
            np = importlib.import_module("numpy")
            model = classifier_data["model"]
            encoder = classifier_data["encoder"]
            features = classifier_data["features"]

            input_dict["Thermal_Moisture_Index"] = thermal_idx
            input_dict["Combustion_Risk_Score"] = combustion_score
            input_dict["Capacity_Pressure_Index"] = capacity_idx

            df = pd.DataFrame([input_dict])[features]
            probs = model.predict_proba(df)[0]
            pred_idx = int(np.argmax(probs))
            predicted_status = encoder.inverse_transform([pred_idx])[0]
            confidence = round(float(probs[pred_idx]), 4)

            class_probs = {}
            for idx, class_name in enumerate(encoder.classes_):
                class_probs[class_name] = round(float(probs[idx]), 4)

            top_features = []
            if tree_explainer is not None:
                try:
                    shap_values = tree_explainer.shap_values(df)
                    if isinstance(shap_values, list):
                        sv = shap_values[pred_idx][0]
                    elif len(shap_values.shape) == 3:
                        sv = shap_values[0, :, pred_idx]
                    else:
                        sv = shap_values[0]

                    feature_impacts = [
                        {"feature": feat, "value": float(val), "importance": round(float(imp), 4), "abs_importance": abs(float(imp))}
                        for feat, val, imp in zip(features, df.iloc[0], sv)
                    ]
                    feature_impacts.sort(key=lambda x: x["abs_importance"], reverse=True)
                    top_features = [{"feature": f["feature"], "value": f["value"], "importance": f["importance"]} for f in feature_impacts[:3]]
                except Exception:
                    pass

            if not top_features:
                fi = model.feature_importances_
                pairs = sorted(zip(features, df.iloc[0], fi), key=lambda x: x[2], reverse=True)
                top_features = [{"feature": p[0], "value": float(p[1]), "importance": round(float(p[2]), 4)} for p in pairs[:3]]

            return {
                "status": predicted_status,
                "confidence": confidence,
                "top_features": top_features,
                "class_probabilities": class_probs,
                "engineered_features": {
                    "Thermal_Moisture_Index": thermal_idx,
                    "Combustion_Risk_Score": combustion_score,
                    "Capacity_Pressure_Index": capacity_idx
                }
            }
        except Exception as e:
            print(f"ML Model prediction fallback trigger: {e}")

    # Fallback Rule-Based Classifier for lightweight Serverless Environments
    if combustion_score > 0.15 or smoke > 450:
        predicted_status = "Fire Risk - Critical"
        confidence = 0.985
    elif thermal_idx > 22.0 or temp > 38.0 or hum > 82.0:
        predicted_status = "Spoilage / Mold Alert"
        confidence = 0.942
    elif occ >= 90.0 or dist < 15.0:
        predicted_status = "Rack Full"
        confidence = 0.960
    elif smoke > 250 or temp > 32.0 or hum > 70.0:
        predicted_status = "Warning - Moderate Risk"
        confidence = 0.880
    else:
        predicted_status = "Normal Operations"
        confidence = 0.991

    return {
        "status": predicted_status,
        "confidence": confidence,
        "top_features": [
            {"feature": "Combustion_Risk_Score", "value": combustion_score, "importance": 0.42},
            {"feature": "Thermal_Moisture_Index", "value": thermal_idx, "importance": 0.35},
            {"feature": "Capacity_Pressure_Index", "value": capacity_idx, "importance": 0.23}
        ],
        "class_probabilities": {
            "Normal Operations": 0.991 if predicted_status == "Normal Operations" else 0.01,
            "Warning - Moderate Risk": 0.880 if predicted_status == "Warning - Moderate Risk" else 0.02,
            "Spoilage / Mold Alert": 0.942 if predicted_status == "Spoilage / Mold Alert" else 0.02,
            "Rack Full": 0.960 if predicted_status == "Rack Full" else 0.01,
            "Fire Risk - Critical": 0.985 if predicted_status == "Fire Risk - Critical" else 0.01
        },
        "engineered_features": {
            "Thermal_Moisture_Index": thermal_idx,
            "Combustion_Risk_Score": combustion_score,
            "Capacity_Pressure_Index": capacity_idx
        }
    }

def predict_yearly_capacity(input_data: dict) -> dict:
    if forecaster_data:
        try:
            pd = importlib.import_module("pandas")
            model = forecaster_data["model"]
            features = forecaster_data["features"]
            df = pd.DataFrame([input_data])[features]
            pred_val = float(model.predict(df)[0])
            projected = round(max(0.0, min(100.0, pred_val)), 2)
            return {
                "projected_occupancy_pct": projected,
                "confidence_interval": {
                    "lower_bound": round(max(0.0, projected - 3.0), 2),
                    "upper_bound": round(min(100.0, projected + 3.0), 2)
                }
            }
        except Exception as e:
            print(f"Forecaster prediction fallback trigger: {e}")

    occ = float(input_data.get("Occupancy_Pct", 50.0))
    sacks = float(input_data.get("Number_of_Sacks", 5000.0))
    cap = float(input_data.get("Zone_Capacity_Sacks", 10000.0))
    calc_occ = round(max(0.0, min(100.0, (sacks / cap) * 100.0 if cap > 0 else occ)), 2)

    return {
        "projected_occupancy_pct": calc_occ,
        "confidence_interval": {
            "lower_bound": round(max(0.0, calc_occ - 3.0), 2),
            "upper_bound": round(min(100.0, calc_occ + 3.0), 2)
        }
    }
