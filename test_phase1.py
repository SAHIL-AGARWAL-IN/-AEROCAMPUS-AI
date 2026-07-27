import os
import json
import pandas as pd
from realtime_pipeline import fetch_live_and_forecast_weather
from feature_pipeline import transform_features

PROCESSED_DIR = os.path.join(os.path.dirname(__file__), "data", "processed")

def run_phase1_pipeline():
    print("==================================================")
    print("   AeroCampus-AI: Phase 1 Data & Feature Pipeline ")
    print("==================================================")
    
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    
    # 1. Fetch live or fallback weather & AQI
    raw_df, source = fetch_live_and_forecast_weather()
    print(f"-> Ingested {len(raw_df)} hourly records from data source: [{source}]")
    
    # 2. Transform raw metrics into engineered spatial vectors
    features_df = transform_features(raw_df, grap_active_override=True)
    
    # 3. Export processed datasets
    csv_path = os.path.join(PROCESSED_DIR, "live_features.csv")
    json_path = os.path.join(PROCESSED_DIR, "live_features.json")
    
    features_df.to_csv(csv_path, index=False)
    
    # JSON export format for web application dashboard consumption
    json_records = json.loads(features_df.to_json(orient="records", date_format="iso"))
    output_meta = {
        "status": "SUCCESS",
        "timestamp_generated": pd.Timestamp.now().isoformat(),
        "data_source": source,
        "record_count": len(json_records),
        "target_location": "JIIT Noida Sector 62",
        "coordinates": {"latitude": 28.6245, "longitude": 77.3578},
        "data": json_records
    }
    
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output_meta, f, indent=2)
        
    print(f"-> Exported CSV dataset to: {csv_path}")
    print(f"-> Exported Web Dashboard JSON to: {json_path}")
    print("\n--- Sample Feature Extraction (First 3 Hours) ---")
    sample_cols = ["time", "temperature", "relative_humidity", "wind_speed", "wind_alignment_nh24", "stagnation_index", "pm25"]
    avail_cols = [c for c in sample_cols if c in features_df.columns]
    print(features_df[avail_cols].head(3).to_string(index=False))
    print("\n[SUCCESS] Phase 1 Real-Time Data & Feature Pipeline executed cleanly!")
    return True

if __name__ == "__main__":
    run_phase1_pipeline()
