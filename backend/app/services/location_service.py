"""
backend/app/services/location_service.py

Phase 16 — Location Precision Resolution Service.
Provides 3-tier location resolution:
1. PROJECT_COORDINATES (Precision: HIGH) - Exact latitude/longitude if present in dataset
2. DISTRICT_COORDINATES (Precision: MEDIUM) - Centroid of project district if known
3. STATE_CENTROID (Precision: LOW) - Centroid of project state as baseline location
"""

from typing import Dict, Any, Optional, Tuple

# Comprehensive State Centroid Coordinates in India (Latitude, Longitude)
STATE_CENTROIDS: Dict[str, Tuple[float, float]] = {
    "TAMIL NADU": (11.1271, 78.6569),
    "MAHARASHTRA": (19.7515, 75.7139),
    "DELHI": (28.7041, 77.1025),
    "NATIONAL CAPITAL TERRITORY OF DELHI": (28.7041, 77.1025),
    "UTTAR PRADESH": (26.8467, 80.9462),
    "KARNATAKA": (15.3173, 75.7139),
    "GUJARAT": (22.2587, 71.1924),
    "WEST BENGAL": (22.9868, 87.8550),
    "RAJASTHAN": (27.0238, 74.2179),
    "MADHYA PRADESH": (22.9734, 78.6569),
    "BIHAR": (25.0961, 85.3131),
    "KERALA": (10.8505, 76.2711),
    "ANDHRA PRADESH": (15.9129, 79.7400),
    "TELANGANA": (18.1124, 79.0193),
    "ODISHA": (20.9517, 85.0985),
    "ASSAM": (26.2006, 92.9376),
    "PUNJAB": (31.1471, 75.3412),
    "HARYANA": (29.0588, 76.0856),
    "JHARKHAND": (23.6102, 85.2799),
    "CHHATTISGARH": (21.2787, 81.8661),
    "HIMACHAL PRADESH": (31.1048, 77.1734),
    "UTTARAKHAND": (30.0668, 79.0193),
    "JAMMU AND KASHMIR": (33.7782, 76.5762),
    "LADAKH": (34.1526, 77.5771),
    "GOA": (15.2993, 74.1240),
    "ARUNACHAL PRADESH": (28.2180, 94.7278),
    "MANIPUR": (24.6637, 93.9063),
    "MEGHALAYA": (25.4670, 91.3662),
    "MIZORAM": (23.1645, 92.9376),
    "NAGALAND": (26.1584, 94.5624),
    "TRIPURA": (23.8438, 91.2868),
    "SIKKIM": (27.5330, 88.5122),
    "PUDUCHERRY": (11.9416, 79.8083),
    "CHANDIGARH": (30.7333, 76.7794),
    "ANDAMAN AND NICOBAR ISLANDS": (11.7401, 92.6586),
    "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": (20.3974, 72.8328)
}

# Major District Centroid Coordinates
DISTRICT_CENTROIDS: Dict[str, Tuple[float, float]] = {
    "MUMBAI": (19.0760, 72.8777),
    "PUNE": (18.5204, 73.8567),
    "CHENNAI": (13.0827, 80.2707),
    "BENGALURU": (12.9716, 77.5946),
    "HYDERABAD": (17.3850, 78.4867),
    "KOLKATA": (22.5726, 88.3639),
    "AHMEDABAD": (23.0225, 72.5714),
    "NEW DELHI": (28.6139, 77.2090),
    "JAIPUR": (26.9124, 75.7873),
    "LUCKNOW": (26.8467, 80.9462),
    "PATNA": (25.5941, 85.1376),
    "BHOPAL": (23.2599, 77.4126),
    "GUWAHATI": (26.1445, 91.7362),
    "THIRUVANANTHAPURAM": (8.5241, 76.9366),
    "BHUBANESWAR": (20.2961, 85.8245),
    "RANCHI": (23.3441, 85.3096),
    "RAIPUR": (21.2514, 81.6296),
    "CHANDIGARH": (30.7333, 76.7794),
    "DEHRADUN": (30.3165, 78.0322),
    "SHIMLA": (31.1048, 77.1734)
}

def resolve_project_location(project: Dict[str, Any]) -> Dict[str, Any]:
    """
    Resolves location coordinates and metadata for a project using the 3-tier hierarchy:
    1. Exact Project Coordinates (PROJECT_COORDINATES / HIGH)
    2. District Coordinates (DISTRICT_COORDINATES / MEDIUM)
    3. State Centroid (STATE_CENTROID / LOW)
    """
    lat = project.get("latitude")
    lng = project.get("longitude")
    
    # 1. Check for exact project coordinates
    if lat is not None and lng is not None:
        try:
            lat_f = float(lat)
            lng_f = float(lng)
            if -90 <= lat_f <= 90 and -180 <= lng_f <= 180 and (lat_f != 0 or lng_f != 0):
                return {
                    "latitude": lat_f,
                    "longitude": lng_f,
                    "location_source": "PROJECT_COORDINATES",
                    "location_precision": "HIGH",
                    "state": project.get("state"),
                    "district": project.get("district"),
                    "display_location": f"{project.get('district', '') or project.get('state', '')} (Exact Site)"
                }
        except (ValueError, TypeError):
            pass

    # 2. Check for district coordinates
    district_raw = project.get("district") or project.get("location") or ""
    if district_raw:
        dist_key = district_raw.strip().upper()
        if dist_key in DISTRICT_CENTROIDS:
            d_lat, d_lng = DISTRICT_CENTROIDS[dist_key]
            return {
                "latitude": d_lat,
                "longitude": d_lng,
                "location_source": "DISTRICT_COORDINATES",
                "location_precision": "MEDIUM",
                "state": project.get("state"),
                "district": district_raw,
                "display_location": f"{district_raw}, {project.get('state', '')} (District Centroid)"
            }

    # 3. Fallback to State Centroid
    state_raw = project.get("state") or ""
    state_key = state_raw.strip().upper() if state_raw else ""
    
    if state_key in STATE_CENTROIDS:
        s_lat, s_lng = STATE_CENTROIDS[state_key]
        return {
            "latitude": s_lat,
            "longitude": s_lng,
            "location_source": "STATE_CENTROID",
            "location_precision": "LOW",
            "state": state_raw,
            "district": None,
            "display_location": f"{state_raw} (State Centroid)"
        }
    
    # Default fallback to India geographic center (Nagpur area) if state unknown
    return {
        "latitude": 21.1458,
        "longitude": 79.0882,
        "location_source": "STATE_CENTROID",
        "location_precision": "LOW",
        "state": state_raw or "India",
        "district": None,
        "display_location": "National Centroid (India)"
    }
