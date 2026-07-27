import os
import pickle
import json
import pandas as pd
from train_models import train_and_evaluate_models
from canopy_simulator import simulate_mitigation_effect

def run_phase2_tests():
    print("==================================================")
    print("   AeroCampus-AI: High-Precision Phase 2 Suite    ")
    print("==================================================")
    
    # 1. Train and evaluate benchmark suite
    benchmark_meta = train_and_evaluate_models()
    
    # 2. Verify model pickle artifact existence
    model_pickle_path = os.path.join(os.path.dirname(__file__), "models", "best_pm25_forecaster.pkl")
    assert os.path.exists(model_pickle_path), "Model pickle file was not created!"
    
    with open(model_pickle_path, "rb") as f:
        model_data = pickle.load(f)
        
    print(f"\n-> Loaded saved model artifact: [{model_data['model_name']}]")
    print(f"-> Model R2 Validation Score: {model_data['r2_score']:.4f}")
    
    # 3. Test GRAP Policy Scenario Simulation
    print("\n--- Policy Scenario Simulation Test ---")
    sample_weather = pd.DataFrame([{
        "pm25": 160.0,
        "pm25_lag_1": 155.0,
        "pm25_lag_2": 150.0,
        "pm25_lag_3": 145.0,
        "pm25_lag_4": 140.0,
        "pm25_rolling_3h": 155.0,
        "pm25_rolling_6h": 148.0,
        "pm25_rolling_12h": 140.0,
        "temperature": 15.0,
        "relative_humidity": 88.0,
        "temp_diff_3h": -1.5,
        "humidity_diff_3h": 4.0,
        "wind_speed": 1.1,
        "wind_direction": 45.0,
        "wind_alignment_nh24": 1.0,
        "wind_alignment_industrial": 0.0,
        "stagnation_index": 0.85,
        "traffic_proxy": 1.0,
        "hour": 8,
        "day_of_week": 1,
        "is_weekend": 0,
        "is_rush_hour": 1,
        "grap_active": 0
    }])
    
    raw_pred_pm25 = float(model_data["model"].predict(sample_weather[model_data["feature_cols"]])[0])
    
    # Simulate GRAP active (traffic proxy reduced to 0.60)
    sample_weather_grap = sample_weather.copy()
    sample_weather_grap["grap_active"] = 1
    sample_weather_grap["traffic_proxy"] = 0.60
    grap_pred_pm25 = float(model_data["model"].predict(sample_weather_grap[model_data["feature_cols"]])[0])
    
    policy_delta = raw_pred_pm25 - grap_pred_pm25
    print(f"Baseline Predicted Campus PM2.5 (No GRAP): {raw_pred_pm25:.2f} ug/m3")
    print(f"Policy Predicted PM2.5 (GRAP Active):      {grap_pred_pm25:.2f} ug/m3")
    print(f"Predicted Policy Reduction Delta:           -{policy_delta:.2f} ug/m3")
    
    # 4. Test Green Shield Canopy Simulator
    print("\n--- Green Shield Canopy Physical Simulation Test ---")
    canopy_sim = simulate_mitigation_effect(
        raw_pm25=raw_pred_pm25,
        barrier_width_m=20.0,
        species_key="neem",
        wind_alignment_nh24=1.0
    )
    print(f"Target Species:                 {canopy_sim['canopy_details']['species_name']}")
    print(f"Barrier Width:                  {canopy_sim['canopy_details']['barrier_width_m']} meters")
    print(f"Native Canopy Area (E2):        {canopy_sim['canopy_details']['canopy_cover_area_m2']} m2")
    print(f"Canopy Filtration Efficiency:   {canopy_sim['percentage_mitigated']}%")
    print(f"Filtered Campus Outdoor PM2.5:  {canopy_sim['filtered_campus_pm25']} ug/m3")
    
    print("\n[SUCCESS] Phase 2 ML & Physical Simulation Suite executed cleanly!")
    return True

if __name__ == "__main__":
    run_phase2_tests()
