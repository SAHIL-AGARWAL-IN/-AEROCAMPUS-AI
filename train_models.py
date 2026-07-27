import os
import json
import pickle
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, ExtraTreesRegressor, HistGradientBoostingRegressor
from sklearn.linear_model import Ridge

try:
    from xgboost import XGBRegressor
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

from feature_pipeline import transform_features

PROCESSED_DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "processed", "noida_processed.csv")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
OUTPUT_BENCHMARK_PATH = os.path.join(os.path.dirname(__file__), "data", "processed", "model_benchmark_results.json")

def load_training_data():
    """
    Loads dataset and constructs high-precision temporal lag, rolling momentum,
    and micro-local spatial features for PM2.5 forecasting.
    """
    if os.path.exists(PROCESSED_DATA_PATH):
        df = pd.read_csv(PROCESSED_DATA_PATH)
    else:
        from realtime_pipeline import load_offline_fallback_data
        df = load_offline_fallback_data()

    # Map raw Open-Meteo column names to standard names
    rename_dict = {
        "temperature_2m": "temperature", "Temperature": "temperature", "temp": "temperature",
        "relative_humidity_2m": "relative_humidity", "Humidity": "relative_humidity", "humidity": "relative_humidity",
        "wind_speed_10m": "wind_speed", "Wind_Speed": "wind_speed", "windspeed": "wind_speed",
        "wind_direction_10m": "wind_direction", "Wind_Direction": "wind_direction", "winddir": "wind_direction",
        "pm2_5": "pm25", "PM2.5": "pm25",
        "pm10": "pm10", "PM10": "pm10",
        "nitrogen_dioxide": "no2", "NO2": "no2",
        "carbon_monoxide": "co", "CO": "co"
    }
    df = df.rename(columns=rename_dict)
    
    # Fill missing values
    df = df.bfill().ffill()

    # Ensure engineered spatial features exist
    if "wind_alignment_nh24" not in df.columns or "stagnation_index" not in df.columns:
        df = transform_features(df)

    if "traffic_proxy" not in df.columns:
        df["traffic_proxy"] = np.where(df["hour"].isin([8, 9, 10, 17, 18, 19, 20]), 1.0, 0.4)

    # High-Impact Feature Engineering: Lags & Rolling Statistics
    df["pm25_lag_1"] = df["pm25"].shift(1)
    df["pm25_lag_2"] = df["pm25"].shift(2)
    df["pm25_lag_3"] = df["pm25"].shift(3)
    df["pm25_lag_4"] = df["pm25"].shift(4)
    
    df["pm25_rolling_3h"] = df["pm25"].rolling(window=3, min_periods=1).mean()
    df["pm25_rolling_6h"] = df["pm25"].rolling(window=6, min_periods=1).mean()
    df["pm25_rolling_12h"] = df["pm25"].rolling(window=12, min_periods=1).mean()
    
    df["temp_diff_3h"] = df["temperature"].diff(3)
    df["humidity_diff_3h"] = df["relative_humidity"].diff(3)

    # 4-hour forward target for multi-step forecasting
    df["target_pm25_4h"] = df["pm25"].shift(-4)
    
    # Drop NaNs created by lag/shift operations
    df = df.dropna()
    return df

def train_and_evaluate_models():
    """
    Trains multiple regression models with lag features, compares metrics,
    saves benchmark JSON, and serializes the top-performing model artifact.
    """
    os.makedirs(MODELS_DIR, exist_ok=True)
    df = load_training_data()

    feature_cols = [
        "pm25", "pm25_lag_1", "pm25_lag_2", "pm25_lag_3", "pm25_lag_4",
        "pm25_rolling_3h", "pm25_rolling_6h", "pm25_rolling_12h",
        "temperature", "relative_humidity", "temp_diff_3h", "humidity_diff_3h",
        "wind_speed", "wind_direction", "wind_alignment_nh24", "wind_alignment_industrial",
        "stagnation_index", "traffic_proxy", "hour", "day_of_week", "is_weekend", "is_rush_hour", "grap_active"
    ]
    
    for col in feature_cols:
        if col not in df.columns:
            df[col] = 0.0

    X = df[feature_cols]
    y_4h = df["target_pm25_4h"]

    X_train, X_test, y_train, y_test = train_test_split(X, y_4h, test_size=0.2, random_state=42)

    # Optimized Model Benchmark Suite
    models = {
        "Extra Trees Regressor (Optimized)": ExtraTreesRegressor(n_estimators=200, max_depth=16, min_samples_split=3, random_state=42),
        "Random Forest Regressor (Optimized)": RandomForestRegressor(n_estimators=200, max_depth=16, min_samples_split=3, random_state=42),
        "Gradient Boosting Regressor": GradientBoostingRegressor(n_estimators=200, learning_rate=0.05, max_depth=8, random_state=42),
        "HistGradientBoosting Regressor": HistGradientBoostingRegressor(max_iter=200, learning_rate=0.05, max_depth=10, random_state=42),
        "Ridge Regressor": Ridge(alpha=10.0)
    }

    if HAS_XGBOOST:
        models["XGBoost Regressor"] = XGBRegressor(n_estimators=200, learning_rate=0.05, max_depth=8, random_state=42)

    benchmark_results = {}
    best_r2 = -float("inf")
    best_model_name = None
    best_model_obj = None

    print("\n==================================================")
    print("   Phase 2: High-Precision ML Benchmark Suite    ")
    print("==================================================")

    for name, model in models.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)

        mae = float(mean_absolute_error(y_test, preds))
        rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
        r2 = float(r2_score(y_test, preds))

        benchmark_results[name] = {
            "MAE": round(mae, 4),
            "RMSE": round(rmse, 4),
            "R2_Score": round(r2, 4),
            "Status": "Evaluated"
        }

        print(f"[{name}] -> MAE: {mae:.2f} | RMSE: {rmse:.2f} | R2 Score: {r2:.4f}")

        if r2 > best_r2:
            best_r2 = r2
            best_model_name = name
            best_model_obj = model

    print(f"\n[TOP MODEL SELECTED]: '{best_model_name}' (R2 Score: {best_r2:.4f})")

    # Feature importances
    feature_importance_dict = {}
    if hasattr(best_model_obj, "feature_importances_"):
        importances = best_model_obj.feature_importances_
        feature_importance_dict = {
            col: round(float(imp), 4) for col, imp in zip(feature_cols, importances)
        }

    benchmark_meta = {
        "timestamp": pd.Timestamp.now().isoformat(),
        "dataset_size": len(df),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "target": "target_pm25_4h (4-Hour Forecast)",
        "best_model": best_model_name,
        "best_r2_score": round(best_r2, 4),
        "feature_importances": feature_importance_dict,
        "model_benchmarks": benchmark_results
    }

    with open(OUTPUT_BENCHMARK_PATH, "w", encoding="utf-8") as f:
        json.dump(benchmark_meta, f, indent=2)

    best_model_path = os.path.join(MODELS_DIR, "best_pm25_forecaster.pkl")
    model_payload = {
        "model_name": best_model_name,
        "model": best_model_obj,
        "feature_cols": feature_cols,
        "r2_score": best_r2
    }
    with open(best_model_path, "wb") as f:
        pickle.dump(model_payload, f)

    print(f"-> Saved benchmark report to: {OUTPUT_BENCHMARK_PATH}")
    print(f"-> Saved trained model artifact to: {best_model_path}")
    return benchmark_meta

if __name__ == "__main__":
    train_and_evaluate_models()
