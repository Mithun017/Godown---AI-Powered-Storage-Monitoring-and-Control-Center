import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.linear_model import RidgeCV
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import LeaveOneGroupOut

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(os.path.dirname(BASE_DIR), "Dataset", "data_warehouse.csv")
ARTIFACTS_DIR = os.path.join(BASE_DIR, "ml", "artifacts")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

FEATURES = ["Previous_Year_Avg_Fill_Pct", "Previous_Year_Days_RackFull"]
TARGET = "Next_Year_Projected_Occupancy_Pct"

def train_forecaster():
    print(f"Loading data for Model 2 from {CSV_PATH}...")
    df = pd.read_csv(CSV_PATH)

    # Aggregate to Warehouse_ID, Year level
    agg_df = df.groupby(["Warehouse_ID", "Year"]).agg({
        "Previous_Year_Avg_Fill_Pct": "mean",
        "Previous_Year_Days_RackFull": "max",
        "Next_Year_Projected_Occupancy_Pct": "mean"
    }).reset_index()

    print(f"Aggregated warehouse-year rows: {len(agg_df)}")

    X = agg_df[FEATURES]
    y = agg_df[TARGET]
    groups = agg_df["Warehouse_ID"]

    # Leave-One-Group-Out CV (10 folds for 10 warehouses)
    logo = LeaveOneGroupOut()
    y_true_all = []
    y_pred_all = []

    for train_idx, test_idx in logo.split(X, y, groups):
        X_tr, y_tr = X.iloc[train_idx], y.iloc[train_idx]
        X_te, y_te = X.iloc[test_idx], y.iloc[test_idx]

        model_cv = RidgeCV(alphas=np.logspace(-3, 3, 20))
        model_cv.fit(X_tr, y_tr)
        preds = model_cv.predict(X_te)

        y_true_all.extend(y_te.values)
        y_pred_all.extend(preds)

    mae = mean_absolute_error(y_true_all, y_pred_all)
    r2 = r2_score(y_true_all, y_pred_all)

    print(f"Model 2 Results -> MAE: {mae:.4f}, R2: {r2:.4f}")

    # Fit final model on all aggregated data
    final_model = RidgeCV(alphas=np.logspace(-3, 3, 20))
    final_model.fit(X, y)

    artifact_path = os.path.join(ARTIFACTS_DIR, "forecaster.joblib")
    joblib.dump({"model": final_model, "features": FEATURES}, artifact_path)
    print(f"Saved forecaster model artifact to {artifact_path}")

    return {
        "mae": round(float(mae), 4),
        "r2": round(float(r2), 4),
        "forecaster_sample_size": len(agg_df),
        "forecaster_note": "Indicative — 20 warehouse-year aggregates. Small sample size limits statistical confidence.",
        "features": FEATURES,
        "coefficients": [round(float(c), 4) for c in final_model.coef_],
        "intercept": round(float(final_model.intercept_), 4)
    }

def train_all():
    from ml.train_classifier import train_classifier
    clf_metrics = train_classifier()
    fore_metrics = train_forecaster()

    combined = {
        "classifier": clf_metrics,
        "forecaster": fore_metrics,
        "last_trained": pd.Timestamp.now().isoformat()
    }

    metrics_json_path = os.path.join(ARTIFACTS_DIR, "metrics.json")
    with open(metrics_json_path, "w") as f:
        json.dump(combined, f, indent=2)

    print(f"Saved metrics.json to {metrics_json_path}")
    return combined

if __name__ == "__main__":
    train_all()
