"""Decidix ML Forecaster Training & Cross-Validation
Trains GradientBoosting, RandomForest, and Temporal Ensemble with strict temporal out-of-sample evaluation.
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor, VotingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from preprocessing.features import prepare_features

def train_and_evaluate():
    data_path = "datasets/processed/curated_regional_development.csv"
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Processed dataset not found at {data_path}. Run scripts/pipeline_ingest.py first.")

    df = pd.read_csv(data_path)
    X, y, df_sorted = prepare_features(df)

    # Out-of-time evaluation split:
    # Train on 2019-2023, Test on 2024-2025
    train_mask = df_sorted["year"] <= 2023
    test_mask = df_sorted["year"] >= 2024

    X_train, y_train = X[train_mask], y[train_mask]
    X_test, y_test = X[test_mask], y[test_mask]

    print(f"Training dataset size: {len(X_train)} records (Years: {sorted(df_sorted[train_mask]['year'].unique())})")
    print(f"Testing dataset size:  {len(X_test)} records (Years: {sorted(df_sorted[test_mask]['year'].unique())})")

    models = {
        "gradient_boosting": GradientBoostingRegressor(n_estimators=100, learning_rate=0.08, max_depth=3, random_state=42),
        "random_forest": RandomForestRegressor(n_estimators=100, max_depth=4, random_state=42),
        "temporal_ensemble": VotingRegressor(estimators=[
            ("gb", GradientBoostingRegressor(n_estimators=100, learning_rate=0.08, max_depth=3, random_state=42)),
            ("rf", RandomForestRegressor(n_estimators=100, max_depth=4, random_state=42))
        ], weights=[0.6, 0.4])
    }

    os.makedirs("ml/models/artifacts", exist_ok=True)
    evaluation_results = {}

    for name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        r2 = round(float(r2_score(y_test, y_pred)), 3)
        mae = round(float(mean_absolute_error(y_test, y_pred)), 3)
        rmse = round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 3)

        evaluation_results[name] = {
            "model_name": name,
            "r2_score": r2,
            "mae": mae,
            "rmse": rmse,
            "status": "APPROVED" if r2 >= 0.85 else "REJECTED",
            "artifact_path": f"ml/models/artifacts/{name}.joblib",
            "evaluated_at": datetime.utcnow().isoformat() + "Z"
        }

        # Save model weights
        joblib.dump(model, f"ml/models/artifacts/{name}.joblib")
        print(f"Model [{name}]: R²={r2:.3f}, MAE={mae:.3f}, RMSE={rmse:.3f} -> Saved.")

    # Save feature columns template for reproducible inference
    joblib.dump(list(X.columns), "ml/models/artifacts/feature_columns.joblib")

    # Save model registry
    registry = {
        "version": "1.0.0",
        "last_trained": datetime.utcnow().isoformat() + "Z",
        "models": evaluation_results,
        "selected_production_model": "temporal_ensemble"
    }

    with open("ml/models/model_registry.json", "w") as f:
        json.dump(registry, f, indent=2)

    print("Model training and evaluation successfully completed: ml/models/model_registry.json")

if __name__ == "__main__":
    train_and_evaluate()
