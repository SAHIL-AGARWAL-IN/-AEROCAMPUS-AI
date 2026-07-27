import numpy as np

# Tree Species Absorption Coefficients (k, in m^-1)
SPECIES_COEFFICIENTS = {
    "neem": {"name": "Neem (Azadirachta indica)", "k": 0.080, "type": "Evergreen"},
    "pilkan": {"name": "Pilkan (Ficus infectoria)", "k": 0.070, "type": "Evergreen"},
    "amaltas_summer": {"name": "Amaltas (Cassia fistula) - Summer", "k": 0.045, "type": "Deciduous"},
    "amaltas_winter": {"name": "Amaltas (Cassia fistula) - Winter Leaf-Drop", "k": 0.020, "type": "Deciduous"},
    "mixed_native_ncr": {"name": "Mixed Native NCR Shield (Neem + Pilkan)", "k": 0.075, "type": "Evergreen Blend"}
}

DEFAULT_NE_PERIMETER_LENGTH_M = 75.0  # Length of JIIT Sector 62 Northeast perimeter fence facing NH-24

def calculate_canopy_interception(width_m, species_key="mixed_native_ncr", wind_alignment_nh24=1.0, is_winter=True):
    """
    Calculates physical particulate dry deposition filtration efficiency (eta) using:
    eta = 1 - exp(-k * W)
    """
    if species_key == "amaltas":
        species_key = "amaltas_winter" if is_winter else "amaltas_summer"
        
    species_info = SPECIES_COEFFICIENTS.get(species_key, SPECIES_COEFFICIENTS["mixed_native_ncr"])
    k_val = species_info["k"]
    
    # Raw physical filtration efficiency of the canopy (0.0 to 1.0)
    raw_eta = 1.0 - np.exp(-k_val * width_m)
    
    # Effective mitigation coupled with spatial highway wind vector
    effective_eta = raw_eta * wind_alignment_nh24
    
    # Calculate ESG Metric E2: Native Canopy Cover Area (m^2)
    canopy_area_m2 = width_m * DEFAULT_NE_PERIMETER_LENGTH_M
    
    return {
        "barrier_width_m": width_m,
        "species_name": species_info["name"],
        "species_type": species_info["type"],
        "k_coefficient": k_val,
        "raw_filtration_efficiency_pct": round(float(raw_eta * 100), 2),
        "effective_mitigation_efficiency_pct": round(float(effective_eta * 100), 2),
        "canopy_cover_area_m2": round(float(canopy_area_m2), 1),
        "spatial_wind_coupling_nh24": round(float(wind_alignment_nh24), 4)
    }

def simulate_mitigation_effect(raw_pm25, barrier_width_m=20.0, species_key="mixed_native_ncr", wind_alignment_nh24=1.0):
    """
    Simulates the campus PM2.5 reduction delta resulting from the Green Shield vegetative barrier.
    """
    res = calculate_canopy_interception(barrier_width_m, species_key, wind_alignment_nh24)
    eff_fraction = res["effective_mitigation_efficiency_pct"] / 100.0
    
    filtered_pm25 = max(5.0, raw_pm25 * (1.0 - eff_fraction))
    pm25_reduction_delta = raw_pm25 - filtered_pm25
    
    return {
        "raw_incoming_pm25": round(float(raw_pm25), 2),
        "filtered_campus_pm25": round(float(filtered_pm25), 2),
        "pm25_reduction_delta": round(float(pm25_reduction_delta), 2),
        "percentage_mitigated": round(float(eff_fraction * 100), 2),
        "canopy_details": res
    }

if __name__ == "__main__":
    test_sim = simulate_mitigation_effect(raw_pm25=160.0, barrier_width_m=20.0, species_key="neem", wind_alignment_nh24=0.85)
    print("--- Green Shield Simulation Test ---")
    print(f"Raw Highway PM2.5: {test_sim['raw_incoming_pm25']} ug/m3")
    print(f"Filtered Campus PM2.5: {test_sim['filtered_campus_pm25']} ug/m3")
    print(f"Reduction Delta: -{test_sim['pm25_reduction_delta']} ug/m3 ({test_sim['percentage_mitigated']}%)")
    print(f"Native Canopy Area (E2): {test_sim['canopy_details']['canopy_cover_area_m2']} m2")
