"""
backend/app/services/weather_provider.py

Phase 16 — Weather Provider Abstraction Layer.
Implements Open-Meteo REST API provider and optional MockWeatherProvider (for tests/demo).
STRICT INTEGRITY GUARANTEE: In production, network errors or provider outages return None,
resulting in environmental_data_status = "UNAVAILABLE" with ZERO fake data fabrication.
"""

from abc import ABC, abstractmethod
import os
import json
import logging
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

logger = logging.getLogger("nirman.weather_provider")

# WMO Weather Interpretation Codes (WW) mapping
WMO_CODE_MAP = {
    0: ("Clear sky", "NORMAL"),
    1: ("Mainly clear", "NORMAL"),
    2: ("Partly cloudy", "NORMAL"),
    3: ("Overcast", "WATCH"),
    45: ("Fog", "WATCH"),
    48: ("Depositing rime fog", "WATCH"),
    51: ("Light drizzle", "WATCH"),
    53: ("Moderate drizzle", "WATCH"),
    55: ("Dense drizzle", "ELEVATED"),
    56: ("Light freezing drizzle", "ELEVATED"),
    57: ("Dense freezing drizzle", "HIGH"),
    61: ("Slight rain", "WATCH"),
    63: ("Moderate rain", "ELEVATED"),
    65: ("Heavy rain", "HIGH"),
    66: ("Light freezing rain", "ELEVATED"),
    67: ("Heavy freezing rain", "HIGH"),
    71: ("Slight snow fall", "WATCH"),
    73: ("Moderate snow fall", "ELEVATED"),
    75: ("Heavy snow fall", "HIGH"),
    77: ("Snow grains", "WATCH"),
    80: ("Slight rain showers", "WATCH"),
    81: ("Moderate rain showers", "ELEVATED"),
    82: ("Violent rain showers", "SEVERE"),
    85: ("Slight snow showers", "WATCH"),
    86: ("Heavy snow showers", "HIGH"),
    95: ("Thunderstorm", "HIGH"),
    96: ("Thunderstorm with slight hail", "HIGH"),
    99: ("Thunderstorm with heavy hail", "SEVERE")
}


class BaseWeatherProvider(ABC):
    @abstractmethod
    def get_current_weather(self, latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_forecast(self, latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
        pass


class OpenMeteoWeatherProvider(BaseWeatherProvider):
    """
    Production Open-Meteo API provider. Uses free Open-Meteo REST API without API key.
    Enforces a strict 3.0 second timeout to protect FastAPI request loop.
    Returns None if unreachable, ensuring status = "UNAVAILABLE" without fake fallback.
    """
    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    def get_current_weather(self, latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
        url = (
            f"{self.BASE_URL}?latitude={latitude:.4f}&longitude={longitude:.4f}"
            "&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code"
            "&timezone=auto"
        )
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "NirmanAI-Infrastructure-Monitor/1.0"})
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode('utf-8'))
                    current = data.get("current", {})
                    wcode = int(current.get("weather_code", 0))
                    condition_label, base_sev = WMO_CODE_MAP.get(wcode, ("Unknown weather", "NORMAL"))
                    
                    temp_c = float(current.get("temperature_2m", 0.0))
                    humidity = float(current.get("relative_humidity_2m", 0.0))
                    precip_mm = float(current.get("precipitation", 0.0))
                    wind_kmh = float(current.get("wind_speed_10m", 0.0))

                    return {
                        "temperature_c": round(temp_c, 1),
                        "humidity_pct": round(humidity, 1),
                        "precipitation_mm": round(precip_mm, 1),
                        "wind_speed_kmh": round(wind_kmh, 1),
                        "condition": condition_label,
                        "weather_code": wcode,
                        "observed_at": current.get("time", datetime.now(timezone.utc).isoformat()),
                        "source": "Open-Meteo API"
                    }
        except Exception as e:
            logger.warning(f"Open-Meteo current weather API call failed for ({latitude}, {longitude}): {e}")
            return None

    def get_forecast(self, latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
        url = (
            f"{self.BASE_URL}?latitude={latitude:.4f}&longitude={longitude:.4f}"
            "&hourly=temperature_2m,precipitation,wind_speed_10m,weather_code"
            "&forecast_days=3&timezone=auto"
        )
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "NirmanAI-Infrastructure-Monitor/1.0"})
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode('utf-8'))
                    hourly = data.get("hourly", {})
                    times = hourly.get("time", [])
                    temps = hourly.get("temperature_2m", [])
                    precips = hourly.get("precipitation", [])
                    winds = hourly.get("wind_speed_10m", [])
                    codes = hourly.get("weather_code", [])

                    forecast_items = []
                    for i in range(min(72, len(times))):
                        wcode = int(codes[i]) if i < len(codes) else 0
                        cond_label, _ = WMO_CODE_MAP.get(wcode, ("Clear", "NORMAL"))
                        forecast_items.append({
                            "time": times[i],
                            "temperature_c": round(float(temps[i]), 1) if i < len(temps) else 0.0,
                            "precipitation_mm": round(float(precips[i]), 1) if i < len(precips) else 0.0,
                            "wind_speed_kmh": round(float(winds[i]), 1) if i < len(winds) else 0.0,
                            "condition": cond_label
                        })

                    return {
                        "hourly_forecast": forecast_items,
                        "forecast_days": 3,
                        "source": "Open-Meteo API"
                    }
        except Exception as e:
            logger.warning(f"Open-Meteo forecast API call failed for ({latitude}, {longitude}): {e}")
            return None


class MockWeatherProvider(BaseWeatherProvider):
    """
    Mock Weather Provider for Automated Tests & Development Demo Mode ONLY.
    Must never be silently used in production unless ENVIRONMENT_DEMO_MODE=true.
    """
    def __init__(self, mode: str = "NORMAL"):
        self.mode = mode

    def get_current_weather(self, latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
        if self.mode == "UNAVAILABLE":
            return None
        elif self.mode == "RAIN":
            return {
                "temperature_c": 26.5,
                "humidity_pct": 88.0,
                "precipitation_mm": 24.5,
                "wind_speed_kmh": 32.0,
                "condition": "Heavy Rain",
                "weather_code": 65,
                "observed_at": datetime.now(timezone.utc).isoformat(),
                "source": "MockWeatherProvider (Test Mode)"
            }
        elif self.mode == "WIND":
            return {
                "temperature_c": 29.0,
                "humidity_pct": 55.0,
                "precipitation_mm": 0.0,
                "wind_speed_kmh": 48.5,
                "condition": "Strong Winds",
                "weather_code": 82,
                "observed_at": datetime.now(timezone.utc).isoformat(),
                "source": "MockWeatherProvider (Test Mode)"
            }
        elif self.mode == "HEAT":
            return {
                "temperature_c": 43.5,
                "humidity_pct": 30.0,
                "precipitation_mm": 0.0,
                "wind_speed_kmh": 12.0,
                "condition": "Extreme Heat",
                "weather_code": 0,
                "observed_at": datetime.now(timezone.utc).isoformat(),
                "source": "MockWeatherProvider (Test Mode)"
            }
        else:
            return {
                "temperature_c": 29.4,
                "humidity_pct": 65.0,
                "precipitation_mm": 0.0,
                "wind_speed_kmh": 14.2,
                "condition": "Mainly clear",
                "weather_code": 1,
                "observed_at": datetime.now(timezone.utc).isoformat(),
                "source": "MockWeatherProvider (Test Mode)"
            }

    def get_forecast(self, latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
        if self.mode == "UNAVAILABLE":
            return None
        
        items = []
        is_heavy = self.mode in ("RAIN", "WIND")
        for i in range(24):
            items.append({
                "time": f"2026-09-20T{i:02d}:00",
                "temperature_c": 28.0 if not self.mode == "HEAT" else 42.0,
                "precipitation_mm": 18.5 if (is_heavy and 12 <= i <= 18) else 0.0,
                "wind_speed_kmh": 42.0 if (self.mode == "WIND" and 10 <= i <= 16) else 15.0,
                "condition": "Heavy Rain" if (is_heavy and 12 <= i <= 18) else "Partly Cloudy"
            })
        return {
            "hourly_forecast": items,
            "forecast_days": 1,
            "source": "MockWeatherProvider (Test Mode)"
        }


def get_weather_provider() -> BaseWeatherProvider:
    """
    Factory function returning the active weather provider.
    Defaults to OpenMeteoWeatherProvider for live production.
    """
    demo_mode = os.getenv("ENVIRONMENT_DEMO_MODE", "false").lower() in ("true", "1", "yes")
    if demo_mode:
        mock_type = os.getenv("ENVIRONMENT_MOCK_TYPE", "NORMAL")
        logger.info(f"ℹ️ DEMO MODE ACTIVE: Using MockWeatherProvider({mock_type})")
        return MockWeatherProvider(mode=mock_type)
    return OpenMeteoWeatherProvider()
