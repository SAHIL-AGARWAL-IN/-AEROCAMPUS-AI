import os
import requests
import pandas as pd
import time

def fetch_open_meteo_data(latitude, longitude, start_date, end_date, timezone="auto"):
    """
    Fetches hourly weather and air quality data from Open-Meteo for specified coordinates and date range.
    """
    # 1. Fetch Weather Data
    weather_url = "https://archive-api.open-meteo.com/v1/archive"
    weather_params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start_date,
        "end_date": end_date,
        "hourly": "temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure",
        "timezone": timezone
    }
    
    print(f"Fetching Weather Data for ({latitude}, {longitude})...")
    weather_response = requests.get(weather_url, params=weather_params)
    if weather_response.status_code != 200:
        raise Exception(f"Failed to fetch weather data: {weather_response.text}")
    
    weather_data = weather_response.json()["hourly"]
    df_weather = pd.DataFrame(weather_data)
    df_weather["time"] = pd.to_datetime(df_weather["time"])
    
    # Avoid aggressive rate limiting
    time.sleep(1)
    
    # 2. Fetch Air Quality Data
    aq_url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    aq_params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start_date,
        "end_date": end_date,
        "hourly": "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone",
        "timezone": timezone
    }
    
    print(f"Fetching Air Quality Data for ({latitude}, {longitude})...")
    aq_response = requests.get(aq_url, params=aq_params)
    if aq_response.status_code != 200:
        raise Exception(f"Failed to fetch air quality data: {aq_response.text}")
        
    aq_data = aq_response.json()["hourly"]
    df_aq = pd.DataFrame(aq_data)
    df_aq["time"] = pd.to_datetime(df_aq["time"])
    
    # 3. Merge Weather and AQI data on timestamp
    df_merged = pd.merge(df_weather, df_aq, on="time", how="inner")
    
    return df_merged

def main():
    # Define date range for the study (Year 2024: complete post-pandemic seasonal cycle)
    start_date = "2024-01-01"
    end_date = "2024-12-31"
    
    # Coordinates
    # Noida Sector 62 (CPCB monitoring station near JIIT Noida campus)
    noida_coords = {"lat": 28.6245, "lon": 77.3578, "name": "noida"}
    # Beijing, China (Central Beijing, proxy for urban rings)
    beijing_coords = {"lat": 39.9042, "lon": 116.4074, "name": "beijing"}
    
    # Ensure raw data folder exists
    os.makedirs("data/raw", exist_ok=True)
    
    for city in [noida_coords, beijing_coords]:
        try:
            print(f"\n--- Starting Data Collection for {city['name'].upper()} ---")
            df = fetch_open_meteo_data(city["lat"], city["lon"], start_date, end_date)
            
            output_path = f"data/raw/{city['name']}_raw.csv"
            df.to_csv(output_path, index=False)
            print(f"Successfully saved raw data to {output_path} (Shape: {df.shape})")
            
        except Exception as e:
            print(f"Error collecting data for {city['name']}: {e}")
            
if __name__ == "__main__":
    main()
