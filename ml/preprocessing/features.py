"""Decidix ML Feature Engineering Pipeline
Constructs historical lag features and rolling indicators for time-series regional forecasting.
"""

import pandas as pd
import numpy as np

FEATURE_COLUMNS = [
    "life_expectancy",
    "physicians_density",
    "bed_capacity",
    "maternal_mortality",
    "literacy_rate",
    "school_enrolment",
    "teacher_pupil_ratio",
    "tertiary_completion",
    "unemployment_rate",
    "labor_participation",
    "gdp_per_capita",
    "sme_density",
    "paved_roads_pct",
    "potable_water_access_pct",
    "sanitation_index",
    "broadband_coverage_pct",
]

def prepare_features(df: pd.DataFrame, target_col: str = "development_index"):
    """
    Constructs feature matrices X and targets y with time awareness.
    """
    df_sorted = df.sort_values(by=["region_id", "year"]).copy()

    # One-hot encode region IDs for spatial heterogeneity
    region_dummies = pd.get_dummies(df_sorted["region_id"], prefix="reg", drop_first=True)

    X = pd.concat([df_sorted[FEATURE_COLUMNS], df_sorted[["year"]], region_dummies], axis=1)
    y = df_sorted[target_col]

    return X, y, df_sorted

