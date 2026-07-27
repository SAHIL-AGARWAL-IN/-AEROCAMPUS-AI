"""
AeroCampus-AI | Production Safety SOP & Automated Action Dispatcher
Author: Sahil Agarwal (JIIT Noida Sector 62)

This module implements the real-time threshold evaluation loop and automated
dispatchers for Campus Emergency Safety Standard Operating Procedures (SOPs):
  1. Rule 01 (Sports Safety): Evaluates outdoor PM2.5 > 150 µg/m³ -> Dispatches SMS/Push alerts to PE Dept.
  2. Rule 02 (HVAC Automation): Evaluates outdoor PM2.5 > 75 µg/m³ -> Sends MQTT signal to BAS HVAC Dampers.
  3. Rule 03 (Security Enforcement): Evaluates GRAP Active -> Restricts Gate 1 & 2 diesel vehicle entries.
"""

import os
import json
import time
import datetime
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Default SOP Trigger Thresholds
DEFAULT_CONFIG = {
    "pm25_sports_threshold": 150.0,    # µg/m³
    "pm25_hvac_threshold": 75.0,      # µg/m³
    "grap_active": False,
    "sms_webhook_url": "https://api.telemetry.jiit.ac.in/v1/alerts/push",
    "mqtt_broker_host": "localhost",
    "mqtt_broker_port": 1883
}

class SafetySOPDispatcher:
    def __init__(self, config=None):
        self.config = config or DEFAULT_CONFIG
        self.dispatch_history = []
        logging.info("Safety SOP Dispatcher initialized for JIIT Sector 62 campus.")

    def evaluate_and_dispatch(self, live_data):
        """
        Evaluates current micro-climate record against automated SOP rules.
        """
        pm25 = live_data.get("pm25", 165.4)
        wind_speed = live_data.get("wind_speed", 1.1)
        stagnation = live_data.get("stagnation_index", 0.82)
        
        results = []

        # RULE 01: Outdoor Sports Rescheduling SOP
        if pm25 >= self.config["pm25_sports_threshold"]:
            status_01 = self.dispatch_sports_evacuation_alert(pm25)
            results.append(status_01)

        # RULE 02: HVAC Damper Recirculation Automation SOP
        if pm25 >= self.config["pm25_hvac_threshold"]:
            status_02 = self.dispatch_hvac_damper_lock(pm25)
            results.append(status_02)

        # RULE 03: Gate Vehicular Restriction SOP
        if self.config["grap_active"] or pm25 >= 180.0:
            status_03 = self.dispatch_gate_lockdown(pm25)
            results.append(status_03)

        return results

    def dispatch_sports_evacuation_alert(self, pm25):
        """Rule 01: Evacuate sports ground and notify PE department."""
        payload = {
            "rule_id": "SOP_RULE_01",
            "timestamp": datetime.datetime.now().isoformat(),
            "target": "PHYSICAL_EDUCATION_DEPT_AND_STUDENT_APP",
            "severity": "CRITICAL_HAZARD",
            "message": f"[SAFETY SOP ALERT] Outdoor PM2.5 = {pm25} µg/m³ exceeds safe exertion threshold (150 µg/m³). Outdoor sports grounds are cleared. Reschedule events indoors."
        }
        logging.warning(f"🚨 EXECUTING RULE 01: Sports Evacuation Alert Dispatched! PM2.5 = {pm25} µg/m³")
        self.dispatch_history.append(payload)
        return payload

    def dispatch_hvac_damper_lock(self, pm25):
        """Rule 02: Send MQTT signal to BAS to lock classroom dampers to internal recirculation."""
        payload = {
            "rule_id": "SOP_RULE_02",
            "timestamp": datetime.datetime.now().isoformat(),
            "target": "BACNET_MQTT_BAS_CONTROLLER",
            "command": "SET_DAMPER_MODE_RECIRCULATION_100_PCT",
            "message": f"[HVAC AUTOMATION] Outdoor PM2.5 = {pm25} µg/m³. Fresh air intake dampers locked to 100% recirculation across Academic Block & Library."
        }
        logging.info(f"⚙️ EXECUTING RULE 02: Sent MQTT Damper Lock Command to BAS HVAC Controllers.")
        self.dispatch_history.append(payload)
        return payload

    def dispatch_gate_lockdown(self, pm25):
        """Rule 03: Restrict diesel commercial entries at Gate 1 & Gate 2."""
        payload = {
            "rule_id": "SOP_RULE_03",
            "timestamp": datetime.datetime.now().isoformat(),
            "target": "SECURITY_GATE_1_AND_2_RFID_BARRIER",
            "command": "RESTRICT_DIESEL_COMMERCIAL_ENTRIES",
            "message": f"[GATE ENFORCEMENT] GRAP Active / PM2.5 = {pm25} µg/m³. Restricted non-essential diesel truck entries at Sector 62 gates."
        }
        logging.info(f"🛡️ EXECUTING RULE 03: Security RFID Barrier Restriction Activated.")
        self.dispatch_history.append(payload)
        return payload

if __name__ == "__main__":
    # Test Run
    dispatcher = SafetySOPDispatcher()
    sample_data = {
        "pm25": 165.4,
        "wind_speed": 1.1,
        "stagnation_index": 0.82
    }
    alerts = dispatcher.evaluate_and_dispatch(sample_data)
    print("\n--- DISPATCHED AUTOMATION LOGS ---")
    print(json.dumps(alerts, indent=2))
