"""Decidix ML Pipeline Unit Tests
Verifies model loading, input validation, reproducibility, and structured forecast outputs.
"""

import unittest
import os
import sys

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from ml.inference.predict import (
    load_model_artifact,
    load_feature_columns,
    validate_horizon,
    validate_model_name,
    run_forecast,
    MIN_HORIZON_YEAR,
    MAX_HORIZON_YEAR,
)

class TestMLForecastingPipeline(unittest.TestCase):
    def test_01_model_loading(self):
        """Verifies that all registered model artifacts load cleanly."""
        for model_name in ["temporal_ensemble", "gradient_boosting", "random_forest"]:
            model, path = load_model_artifact(model_name)
            self.assertIsNotNone(model)
            self.assertTrue(os.path.exists(path))
            self.assertTrue(hasattr(model, "predict"))

        feature_cols = load_feature_columns()
        self.assertIsInstance(feature_cols, list)
        self.assertGreater(len(feature_cols), 15)

    def test_02_input_validation(self):
        """Verifies boundary conditions and invalid input rejection."""
        # Valid horizon bounds
        validate_horizon(MIN_HORIZON_YEAR)
        validate_horizon(MAX_HORIZON_YEAR)

        # Invalid horizons
        with self.assertRaises(ValueError):
            validate_horizon(2020)

        with self.assertRaises(ValueError):
            validate_horizon(2035)

        with self.assertRaises(TypeError):
            validate_horizon("2028")  # type: ignore

        # Invalid model name
        with self.assertRaises(ValueError):
            validate_model_name("non_existent_neural_net")

    def test_03_forecast_output_schema(self):
        """Verifies that generated forecast conforms to required schema."""
        out = run_forecast(target_year=2028, model_name="temporal_ensemble")

        # Metadata
        self.assertEqual(out["target_year"], 2028)
        self.assertEqual(out["model_used"], "temporal_ensemble")
        self.assertIn("model_version", out)
        self.assertIn("generated_at", out)
        self.assertIn("projected_index", out)
        self.assertIsInstance(out["projected_index"], float)

        # Confidence
        self.assertGreaterEqual(out["confidence"], 70)
        self.assertLessEqual(out["confidence"], 100)

        # Series verification
        series = out["series"]
        self.assertGreaterEqual(len(series), 8)
        years = [s["year"] for s in series]
        self.assertIn(2025, years)
        self.assertIn(2028, years)

        # Confidence bounds on forecast entries
        forecast_entries = [s for s in series if s["kind"] == "forecast"]
        for entry in forecast_entries:
            self.assertIsNotNone(entry["lower"])
            self.assertIsNotNone(entry["upper"])
            self.assertLessEqual(entry["lower"], entry["value"])
            self.assertGreaterEqual(entry["upper"], entry["value"])

        # Models metadata
        self.assertEqual(len(out["models"]), 3)
        for m in out["models"]:
            self.assertIn("id", m)
            self.assertIn("name", m)
            self.assertIn("r2", m)

        # Regional forecasts (12 regions)
        self.assertEqual(len(out["regional_forecasts"]), 12)
        for reg in out["regional_forecasts"]:
            self.assertIn("region_id", reg)
            self.assertIn("predicted_score", reg)
            self.assertIn("baseline_score", reg)
            self.assertIn("delta", reg)

        # Top improvers
        self.assertLessEqual(len(out["top_improvers"]), 3)

    def test_04_reproducibility(self):
        """Verifies that running forecasts with identical inputs yields identical numerical results."""
        run1 = run_forecast(target_year=2028)
        run2 = run_forecast(target_year=2028)

        self.assertEqual(run1["projected_index"], run2["projected_index"])
        self.assertEqual(
            [s["value"] for s in run1["series"]],
            [s["value"] for s in run2["series"]]
        )
        self.assertEqual(
            [r["predicted_score"] for r in run1["regional_forecasts"]],
            [r["predicted_score"] for r in run2["regional_forecasts"]]
        )

if __name__ == "__main__":
    unittest.main()

