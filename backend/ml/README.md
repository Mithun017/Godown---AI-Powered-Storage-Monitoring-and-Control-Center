# Smart Warehouse ML Pipelines

This directory contains the training scripts, inference helpers, and artifacts for the two predictive ML models.

## Models Overview

1. **Model 1: Real-time Zone Condition Classifier (`train_classifier.py`)**
   - **Target:** `Warehouse_Status` (`Safe / Motion Detected / Rack Full / High Temp / Critical / Fire Risk - Critical`)
   - **Algorithm:** `XGBClassifier`
   - **Split Strategy:** Time-based split (Train on 2024–2025, Test on 2026 slice)
   - **Class Imbalance Strategy:** Sample weights computed with `compute_sample_weight("balanced")`. Conditional SMOTE applied only if minority recall < 0.70.
   - **Artifact:** `backend/ml/artifacts/classifier.joblib`

2. **Model 2: Yearly Storage Capacity Forecast (`train_forecaster.py`)**
   - **Target:** `Next_Year_Projected_Occupancy_Pct`
   - **Algorithm:** `RidgeCV` regression
   - **Aggregation:** Warehouse-Year level aggregate (~20 samples)
   - **Validation:** Leave-One-Warehouse-Out Cross Validation (10 folds)
   - **Note:** MAE is indicative due to small aggregate sample size (~20 warehouse-years).
   - **Artifact:** `backend/ml/artifacts/forecaster.joblib`

## How to Retrain Models

Activate backend `.venv` and execute:

```powershell
python -m ml.train_classifier
python -m ml.train_forecaster
```

Or retrain both and update `metrics.json` in one command:

```powershell
python -m ml.train_forecaster
```

## Metrics Output

Metrics are saved to `backend/ml/artifacts/metrics.json` (tracked in git) and served to the UI via `GET /api/analytics/model-metrics`.
