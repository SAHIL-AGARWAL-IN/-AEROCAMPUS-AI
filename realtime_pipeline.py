import os
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# JIIT Noida Sector 62 Coordinates
JIIT_NOIDA_LAT = 28.6245
JIIT_NOIDA_LON = 77.3578

DEFAULT_CLEANED_DATA_PATH = os.path.join(
    os.path.dirname(__file__), "Assignment 2A", "cleaned_air_quality_dataset.xlsx"
)

def fetch_live_and_forecast_weather(latitude=JIIT_NOIDA_LAT, longitude=JIIT_NOIDA_LON):
    """
    Fetches real-time and 24-hour hourly forecast weather & air quality data from Open-Meteo API.
    Falls back to cleaned offline dataset if network connection is unavailable.
    """
    weather_url = "https://api.open-meteo.com/v1/forecast"
    aq_url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    
    weather_params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": "temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m",
        "timezone": "Asia/Kolkata",
        "forecast_days": 2
    }
    
    aq_params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": "pm10,pm2_5,nitrogen_dioxide,carbon_monoxide",
        "timezone": "Asia/Kolkata",
        "forecast_days": 2
    }
    
    try:
        print(f"[Phase 1 API] Fetching live weather forecast for JIIT Noida Sector 62 ({latitude}, {longitude})...")
        w_res = requests.get(weather_url, params=weather_params, timeout=5)
        aq_res = requests.get(aq_url, params=aq_params, timeout=5)
        
        if w_res.status_code == 200 and aq_res.status_code == 200:
            w_json = w_res.json()["hourly"]
            aq_json = aq_res.json()["hourly"]
            
            df_w = pd.DataFrame(w_json)
            df_aq = pd.DataFrame(aq_json)
            
            df_w["time"] = pd.to_datetime(df_w["time"])
            df_aq["time"] = pd.to_datetime(df_aq["time"])
            
            df_merged = pd.merge(df_w, df_aq, on="time", how="inner")
            df_merged = df_merged.rename(columns={
                "temperature_2m": "temperature",
                "relative_humidity_2m": "relative_humidity",
                "wind_speed_10m": "wind_speed",
                "wind_direction_10m": "wind_direction",
                "pm2_5": "pm25",
                "pm10": "pm10",
                "nitrogen_dioxide": "no2",
                "carbon_monoxide": "co"
            })
            print(f"[Phase 1 API] Successfully fetched {len(df_merged)} hourly forecast records.")
            return df_merged, "LIVE_API"
        else:
            print(f"[Phase 1 API Warning] API returned status {w_res.status_code}/{aq_res.status_code}. Using fallback data.")
    except Exception as e:
        print(f"[Phase 1 Network Info] Could not reach Open-Meteo live API ({e}). Triggering offline dataset fallback.")
    
    # Offline Fallback
    return load_offline_fallback_data(), "OFFLINE_FALLBACK"

def load_offline_fallback_data(file_path=DEFAULT_CLEANED_DATA_PATH):
    """
    Loads preprocessed dataset from Assignment 2A as offline fallback stream.
    """
    print(f"[Phase 1 Offline] Loading records from: {file_path}")
    if os.path.exists(file_path):
        df = pd.read_excel(file_path)
    else:
        # Generate synthetic fallback if file is missing
        now = datetime.now()
        dates = [now + timedelta(hours=i) for i in range(24)]
        df = pd.DataFrame({
            "time": dates,
            "temperature": np.random.uniform(12, 25, 24),
            "relative_humidity": np.random.uniform(70, 95, 24),
            "surface_pressure": np.random.uniform(1010, 1018, 24),
            "wind_speed": np.random.uniform(0.8, 3.5, 24),
            "wind_direction": np.random.uniform(30, 60, 24),
            "pm25": np.random.uniform(110, 180, 24),
            "pm10": np.random.uniform(190, 290, 24),
            "no2": np.random.uniform(40, 90, 24)
        })
    
    # Ensure column names follow standard naming convention
    col_mapping = {
        "pm2_5": "pm25",
        "PM2.5": "pm25",
        "PM10": "pm10",
        "NO2": "no2",
        "Temperature": "temperature",
        "Humidity": "relative_humidity",
        "Wind_Speed": "wind_speed",
        "Wind_Direction": "wind_direction"
    }
    df = df.rename(columns=col_mapping)
    if "time" not in df.columns and "Timestamp" in df.columns:
        df = df.rename(columns={"Timestamp": "time"})
        
    return df

if __name__ == "__main__":
    df, source = fetch_live_and_forecast_weather()
    print(f"Source: {source}")
    print(df.head())
