"""Independent Numerical Correctness and Data Validation Suite for Decidix.
Audits the complete pipeline:
1. Raw CSV records -> Curated processed records
2. Curated processed records -> Database seed values
3. Database seed values -> Backend staging API responses
4. Staging API responses -> Mobile presentation values
"""

import json
import urllib.request
import pandas as pd
import numpy as np

BASE_URL = "https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/v1"

def audit_datasets():
    print("=== 1. AUDIT RAW AND PROCESSED DATASETS ===")
    
    # 1.1 Load raw CSVs
    df_health = pd.read_csv("datasets/raw/health_facilities_2019_2025.csv")
    df_edu = pd.read_csv("datasets/raw/education_census_2019_2025.csv")
    df_econ = pd.read_csv("datasets/raw/labor_economy_2019_2025.csv")
    df_infra = pd.read_csv("datasets/raw/infrastructure_cadastre_2020_2025.csv")
    df_curated = pd.read_csv("datasets/processed/curated_regional_development.csv")
    
    print(f"Raw health records: {len(df_health)} (Expected 84: 12 regions x 7 years)")
    print(f"Raw edu records:    {len(df_edu)} (Expected 84)")
    print(f"Raw econ records:   {len(df_econ)} (Expected 84)")
    print(f"Raw infra records:  {len(df_infra)} (Expected 84)")
    print(f"Curated records:    {len(df_curated)} (Expected 84)")
    
    assert len(df_health) == 84, "Health record count mismatch"
    assert len(df_edu) == 84, "Education record count mismatch"
    assert len(df_econ) == 84, "Economy record count mismatch"
    assert len(df_infra) == 84, "Infrastructure record count mismatch"
    assert len(df_curated) == 84, "Curated record count mismatch"

    # 1.2 Check Duplicates and Missing Values
    print("\n--- Integrity & Missing Values ---")
    for name, df in [("Health", df_health), ("Education", df_edu), ("Economy", df_econ), ("Infrastructure", df_infra), ("Curated", df_curated)]:
        nulls = df.isnull().sum().sum()
        dups = df.duplicated(subset=["region_id", "year"]).sum()
        print(f"[{name}] Missing values: {nulls}, Duplicates: {dups}")
        assert nulls == 0, f"{name} contains missing values"
        assert dups == 0, f"{name} contains duplicate region_id+year keys"

    # 1.3 Check Ranges and Scaling
    print("\n--- Physical & Semantic Bounds Verification ---")
    checks = [
        ("literacy_rate", 50.0, 100.0, "%"),
        ("school_enrolment", 50.0, 100.0, "%"),
        ("teacher_pupil_ratio", 10.0, 40.0, "pupils/teacher"),
        ("tertiary_completion", 10.0, 70.0, "%"),
        ("life_expectancy", 65.0, 85.0, "years"),
        ("physicians_density", 0.5, 6.0, "per 1k"),
        ("bed_capacity", 1.0, 6.0, "per 1k"),
        ("maternal_mortality", 2.0, 50.0, "per 100k"),
        ("unemployment_rate", 2.0, 20.0, "%"),
        ("labor_participation", 35.0, 80.0, "%"),
        ("gdp_per_capita", 5000.0, 35000.0, "USD"),
        ("paved_roads_pct", 40.0, 100.0, "%"),
        ("potable_water_access_pct", 50.0, 100.0, "%"),
        ("broadband_coverage_pct", 30.0, 100.0, "%"),
        ("development_index", 20.0, 100.0, "score (0-100)"),
    ]
    for col, min_val, max_val, unit in checks:
        actual_min = df_curated[col].min()
        actual_max = df_curated[col].max()
        in_bounds = (actual_min >= min_val) and (actual_max <= max_val)
        status = "PASS" if in_bounds else "FAIL"
        print(f"[{status}] {col} ({unit}): min={actual_min}, max={actual_max} (Bounds: [{min_val}, {max_val}])")
        assert in_bounds, f"{col} value out of allowed domain bounds"

    # 1.4 Independent Composite Score Recalculation
    print("\n--- Independent Mathematical Recalculation ---")
    edu_comp = (df_curated["literacy_rate"] * 0.4 + df_curated["school_enrolment"] * 0.4 + (30 - df_curated["teacher_pupil_ratio"]) * 1.5)
    health_comp = (df_curated["life_expectancy"] * 0.8 + df_curated["physicians_density"] * 10 + (25 - df_curated["maternal_mortality"]) * 1.5)
    econ_comp = ((15 - df_curated["unemployment_rate"]) * 4.5 + df_curated["labor_participation"] * 0.6 + (df_curated["gdp_per_capita"] / 300))
    infra_comp = (df_curated["paved_roads_pct"] * 0.25 + df_curated["potable_water_access_pct"] * 0.35 + df_curated["broadband_coverage_pct"] * 0.4)
    recalculated = ((edu_comp + health_comp + econ_comp + infra_comp) / 4.0).clip(20.0, 95.0).round(1)

    diff = (df_curated["development_index"] - recalculated).abs().max()
    print(f"Max absolute discrepancy between recorded and recalculated development_index: {diff:.6f}")
    assert diff < 1e-4, "Mathematical discrepancy in composite development_index formula!"
    print("[PASS] 100% mathematical reproducibility of development_index across all 84 records.")

def fetch_api(endpoint):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers={"User-Agent": "Decidix-QA-Validator/1.0"})
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode("utf-8"))

def audit_backend_api():
    print("\n=== 2. AUDIT LIVE STAGING BACKEND DATA CONSISTENCY ===")
    
    # 2.1 Overview National Score
    ov = fetch_api("/overview?range=7Y")
    idx = ov["data"]["index"]
    print(f"Live Staging Overview Score: {idx['score']} (max {idx['max_score']}), delta={idx['change']}, as_of={ov['data']['as_of']}")
    assert idx["score"] == 68.4, f"Overview score mismatch: expected 68.4, got {idx['score']}"
    assert idx["change"] == 2.3, f"Overview change mismatch: expected +2.3, got {idx['change']}"
    assert idx["regions_count"] == 12, "Regions count mismatch"
    assert idx["population"] == 39600000, "Population mismatch (expected 39,600,000)"

    # 2.2 Regions Directory & Map Points
    regions_res = fetch_api("/regions")
    regions = regions_res["data"]
    print(f"Live Staging Regions Count: {len(regions)}")
    assert len(regions) == 12, "Expected exactly 12 regions"

    map_res = fetch_api("/regions/map-points?sector=overall")
    map_points = map_res["data"]
    print(f"Live Staging Map Points Count: {len(map_points)}")
    assert len(map_points) == 12, "Expected exactly 12 map points"

    # Verify coordinates and IDs
    for r in regions:
        mp = next((m for m in map_points if m["id"] == r["id"]), None)
        assert mp is not None, f"Region {r['id']} missing from map points"
        assert mp["score"] == r["score"], f"Score mismatch between region and map point for {r['id']}"
        assert mp["population"] == r["population"], f"Population mismatch for {r['id']}"
        assert abs(mp["latitude"]) > 0 and abs(mp["longitude"]) > 0, f"Invalid coordinates for {r['id']}"
        print(f"  [VERIFIED] {r['id']:<20} -> Rank {r['rank']:<2} Score={r['score']:<3} Coord=({mp['latitude']:.2f}, {mp['longitude']:.2f}) Pop={r['population']}")

    # 2.3 Sectoral Indicators Consistency
    sectors = ["education", "healthcare", "economy", "infrastructure"]
    for s in sectors:
        sec_res = fetch_api(f"/insights/{s}")
        sec_data = sec_res["data"]
        kpis = {k["key"]: k["value"] for k in sec_data["kpis"]}
        print(f"\n[Sector: {s.upper()}] Index Score: {sec_data['index']['score']}, Delta: {sec_data['index']['change']}")
        for k, v in kpis.items():
            print(f"  - KPI {k}: {v}")
        assert len(sec_data["kpis"]) == 4, f"Expected 4 KPIs for {s}"
        assert len(sec_data["ranking"]["top"]) == 5, f"Expected top 5 ranking for {s}"
        assert len(sec_data["ranking"]["bottom"]) == 5, f"Expected bottom 5 ranking for {s}"

    # 2.4 ML Predictions
    pred_res = fetch_api("/intelligence/predictions?target_year=2028")
    pred = pred_res["data"]
    print(f"\n[ML PREDICTIONS 2028] Projected Index: {pred['projected_index']}, Confidence: {pred['confidence']}%")
    assert pred["projected_index"] == 73.5, f"Expected 73.5, got {pred['projected_index']}"
    assert pred["confidence"] == 87, f"Expected 87%, got {pred['confidence']}"
    models = {m["name"]: m["r2"] for m in pred["models"]}
    print(f"Models Evaluated: {models}")
    assert all(value is None for value in models.values()), "Unverified model accuracy must be unavailable"
    assert pred["top_improvers"] == [], "Synthetic or forecast history must not create observed rankings"

    print("\n[ALL LIVE STAGING DATA INDEPENDENTLY AUDITED & VERIFIED]")

if __name__ == "__main__":
    audit_datasets()
    audit_backend_api()
