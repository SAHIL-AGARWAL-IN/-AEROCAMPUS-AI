import pandas as pd
import numpy as np

# Coordinates / Orientations for JIIT Noida Sector 62
NH24_HIGHWAY_ANGLE_DEG = 45.0      # Northeast direction facing NH-24 corridor
SECTOR63_INDUSTRIAL_ANGLE_DEG = 135.0 # Southeast direction facing Sector 63 industrial area

def compute_wind_vector_alignment(wind_direction_deg, target_angle_deg):
    """
    Computes cosine spatial alignment vector between wind direction and target pollution source angle.
    Returns 1.0 for direct wind alignment, 0.0 for perpendicular wind, and 0 for opposite direction.
    """
    angle_diff_rad = np.radians(wind_direction_deg - target_angle_deg)
    # Cosine alignment clamped at 0 for winds blowing away from target corridor
    cos_alignment = np.maximum(0.0, np.cos(angle_diff_rad))
    return np.round(cos_alignment, 4)

def compute_stagnation_index(temperature_c, humidity_pct, wind_speed_ms, pressure_hpa=1013.25):
    """
    Computes thermal inversion & meteorological stagnation index.
    High humidity (>80%), stagnant wind (<1.5 m/s), low temperature (<18°C), and high pressure
    trap fine particulate matter in micro-local thermal inversion layer over JIIT campus.
    """
    # Humidity factor (0.0 to 1.0)
    humidity_factor = humidity_pct / 100.0
    
    # Wind stagnation decay: inversely proportional to (1 + wind_speed)
    wind_stagnation = 1.0 / (1.0 + wind_speed_ms)
    
    # Temperature inversion proxy (colder air enhances ground-level trapped smog)
    temp_inversion_factor = 1.0 + np.maximum(0.0, (20.0 - temperature_c) / 20.0)
    
    # Pressure multiplier (high pressure traps boundary layer)
    pressure_multiplier = 1.0 + np.maximum(0.0, (pressure_hpa - 1013.25) / 100.0)
    
    stagnation_score = humidity_factor * wind_stagnation * temp_inversion_factor * pressure_multiplier
    # Normalize between 0 and 1
    normalized_stagnation = np.clip(stagnation_score / 1.5, 0.0, 1.0)
    return np.round(normalized_stagnation, 4)

def transform_features(df_raw, grap_active_override=False):
    """
    Transforms raw meteorological and air quality DataFrame into engineered feature vectors
    for ML prediction models and spatial policy simulators.
    """
    df = df_raw.copy()
    
    # Ensure datetime format
    if "time" in df.columns:
        df["time"] = pd.to_datetime(df["time"])
        df["hour"] = df["time"].dt.hour
        df["day_of_week"] = df["time"].dt.dayofweek
        df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
        df["is_rush_hour"] = df["hour"].isin([8, 9, 10, 17, 18, 19, 20]).astype(int)
    else:
        df["hour"] = 12
        df["day_of_week"] = 2
        df["is_weekend"] = 0
        df["is_rush_hour"] = 1

    # 1. Compute Spatial Wind Alignments
    df["wind_alignment_nh24"] = compute_wind_vector_alignment(
        df["wind_direction"].values, NH24_HIGHWAY_ANGLE_DEG
    )
    df["wind_alignment_industrial"] = compute_wind_vector_alignment(
        df["wind_direction"].values, SECTOR63_INDUSTRIAL_ANGLE_DEG
    )
    
    # 2. Compute Stagnation Index
    pressures = df["surface_pressure"].values if "surface_pressure" in df.columns else 1013.25
    df["stagnation_index"] = compute_stagnation_index(
        df["temperature"].values,
        df["relative_humidity"].values,
        df["wind_speed"].values,
        pressures
    )
    
    # 3. Add Policy Proxy Indicator
    df["grap_active"] = int(grap_active_override)
    
    return df

if __name__ == "__main__":
    from realtime_pipeline import fetch_live_and_forecast_weather
    raw_df, source = fetch_live_and_forecast_weather()
    processed_df = transform_features(raw_df)
    print(f"[Phase 1 Feature Test] Source: {source}")
    print(processed_df[["time", "temperature", "wind_speed", "wind_direction", "wind_alignment_nh24", "stagnation_index"]].head())
