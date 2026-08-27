import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, f1_score, precision_recall_fscore_support, confusion_matrix
from sklearn.utils.class_weight import compute_sample_weight
import optuna

optuna.logging.set_verbosity(optuna.logging.WARNING)

# Absolute paths setup
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(os.path.dirname(BASE_DIR), "Dataset", "data_warehouse.csv")
ARTIFACTS_DIR = os.path.join(BASE_DIR, "ml", "artifacts")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

FEATURES = [
    "Distance_cm", "Temperature_C", "Humidity_%", "Smoke_ppm", "Motion",
    "Number_of_Sacks", "Zone_Capacity_Sacks", "Occupancy_Pct", "Month"
]
TARGET = "Warehouse_Status"

def train_classifier():
    print(f"Loading data for Model 1 from {CSV_PATH}...")
    df = pd.read_csv(CSV_PATH)
    
    # Label encode target
    le = LabelEncoder()
    df["target"] = le.fit_transform(df[TARGET])
    target_names = list(le.classes_)
    print("Target classes:", target_names)

    # Time-based split: Train on 2024-2025, Test on 2026
    train_df = df[df["Year"].isin([2024, 2025])].copy()
    test_df = df[df["Year"] == 2026].copy()

    X_train, y_train = train_df[FEATURES], train_df["target"]
    X_test, y_test = test_df[FEATURES], test_df["target"]

    print(f"Train shape (2024-2025): {X_train.shape}, Test shape (2026): {X_test.shape}")

    # Calculate sample weights for class weighting
    sample_weights_train = compute_sample_weight("balanced", y_train)

    # Step 1: Initial XGBoost with sample weights
    clf = XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        eval_metric="mlogloss"
    )
    clf.fit(X_train, y_train, sample_weight=sample_weights_train)

    y_pred = clf.predict(X_test)
    macro_f1 = f1_score(y_test, y_pred, average="macro")
    acc = accuracy_score(y_test, y_pred)
    
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, labels=range(len(target_names)))
    class_metrics = {}
    for i, name in enumerate(target_names):
        class_metrics[name] = {
            "precision": round(float(precision[i]), 4),
            "recall": round(float(recall[i]), 4),
            "f1": round(float(f1[i]), 4)
        }

    smote_applied = False
    # Amendment #10: Check if critical class recall is below 0.70
    critical_indices = [i for i, name in enumerate(target_names) if name in ["Rack Full", "Fire Risk - Critical"]]
    low_recall = any(recall[idx] < 0.70 for idx in critical_indices if idx < len(recall))

    if low_recall:
        print("Low recall detected on critical classes. Applying SMOTE on training split...")
        from imblearn.over_sampling import SMOTE
        smote = SMOTE(random_state=42)
        X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
        smote_applied = True
        
        clf = XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
            eval_metric="mlogloss"
        )
        clf.fit(X_train_res, y_train_res)
        y_pred = clf.predict(X_test)
        macro_f1 = f1_score(y_test, y_pred, average="macro")
        acc = accuracy_score(y_test, y_pred)
        precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, labels=range(len(target_names)))
        for i, name in enumerate(target_names):
            class_metrics[name] = {
                "precision": round(float(precision[i]), 4),
                "recall": round(float(recall[i]), 4),
                "f1": round(float(f1[i]), 4)
            }

    print(f"Model 1 Final Results -> Accuracy: {acc:.4f}, Macro-F1: {macro_f1:.4f}, SMOTE Applied: {smote_applied}")

    # Compute confusion matrix
    cm = confusion_matrix(y_test, y_pred).tolist()

    # Save model artifact
    artifact_path = os.path.join(ARTIFACTS_DIR, "classifier.joblib")
    joblib.dump({"model": clf, "encoder": le, "features": FEATURES}, artifact_path)
    print(f"Saved classifier model artifact to {artifact_path}")

    # Return metrics dict
    return {
        "accuracy": round(float(acc), 4),
        "macro_f1": round(float(macro_f1), 4),
        "smote_applied": smote_applied,
        "class_metrics": class_metrics,
        "confusion_matrix": cm,
        "classes": target_names,
        "features": FEATURES,
        "feature_importances": [round(float(val), 4) for val in clf.feature_importances_]
    }

if __name__ == "__main__":
    metrics = train_classifier()
    print("Classifier Training Summary:")
    print(json.dumps(metrics, indent=2))
