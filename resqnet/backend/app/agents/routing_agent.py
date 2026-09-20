"""
Routing Agent

Simulates route calculation between emergency resource and destination
(hospital or incident). Provides primary and alternative route recommendations
with traffic simulation.
"""
import math
import random
from typing import Any


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# Simulated named waypoints for KL area routes
WAYPOINTS = {
    "Jalan Ampang": (3.1570, 101.7120),
    "KLCC": (3.1578, 101.7116),
    "Jalan Tun Razak": (3.1466, 101.6956),
    "Federal Highway": (3.1209, 101.6559),
    "Middle Ring Road II": (3.1650, 101.6800),
    "Jalan Duta Interchange": (3.1631, 101.6873),
    "Bukit Bintang": (3.1462, 101.7100),
}

TRAFFIC_LEVELS = ["light", "moderate", "heavy"]

# Traffic multipliers for speed (city baseline = 40 km/h for emergency vehicle)
TRAFFIC_SPEED = {
    "light": 50,      # km/h with lights/sirens
    "moderate": 35,
    "heavy": 25,
}


def _pick_traffic() -> str:
    """Deterministic-ish traffic based on pseudo-random seed from current minute."""
    import time
    seed = int(time.time()) // 60
    r = random.Random(seed)
    weights = [0.3, 0.5, 0.2]  # light, moderate, heavy
    return r.choices(TRAFFIC_LEVELS, weights=weights, k=1)[0]


def calculate_routes(
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    incident_lat: float | None = None,
    incident_lon: float | None = None,
) -> dict[str, Any]:
    """
    Returns primary and alternative route recommendations.
    
    origin = ambulance/resource location
    dest = hospital
    incident = incident location (resource drives here first, then to hospital)
    """
    # If resource must go to incident first, calculate that leg
    if incident_lat and incident_lon:
        leg1_dist = _haversine(origin_lat, origin_lon, incident_lat, incident_lon)
        leg2_dist = _haversine(incident_lat, incident_lon, dest_lat, dest_lon)
        total_dist = leg1_dist + leg2_dist
    else:
        total_dist = _haversine(origin_lat, origin_lon, dest_lat, dest_lon)
        leg1_dist = total_dist
        leg2_dist = 0.0

    # Add some realistic road-distance factor (straight line * 1.3 approx)
    road_dist_primary = round(total_dist * 1.3, 1)
    road_dist_alt = round(total_dist * 1.55, 1)

    traffic_primary = _pick_traffic()
    traffic_alt_options = [t for t in TRAFFIC_LEVELS if t != traffic_primary]
    # Alternative usually has worse traffic
    traffic_alt = traffic_alt_options[-1] if traffic_primary == "light" else traffic_alt_options[0]

    speed_primary = TRAFFIC_SPEED[traffic_primary]
    speed_alt = TRAFFIC_SPEED[traffic_alt]

    eta_primary = round((road_dist_primary / speed_primary) * 60)  # minutes
    eta_alt = round((road_dist_alt / speed_alt) * 60)

    # Route name simulation
    def _route_name(dist: float, is_alt: bool) -> str:
        if dist < 3:
            return "Via Jalan Ampang → KL City Centre" if not is_alt else "Via Middle Ring Road II"
        elif dist < 7:
            return "Via Jalan Tun Razak → Federal Highway" if not is_alt else "Via Jalan Duta Interchange"
        else:
            return "Via DUKE Highway → KL-Selangor Expressway" if not is_alt else "Via Karak Highway"

    waypoints_primary = [
        {"name": "Origin", "lat": origin_lat, "lng": origin_lon},
    ]
    if incident_lat and incident_lon:
        waypoints_primary.append({"name": "Incident Scene", "lat": incident_lat, "lng": incident_lon})
    waypoints_primary.append({"name": "Hospital", "lat": dest_lat, "lng": dest_lon})

    return {
        "primary_route": {
            "name": _route_name(road_dist_primary, False),
            "distance_km": road_dist_primary,
            "eta_minutes": max(3, eta_primary),
            "traffic": traffic_primary,
            "waypoints": waypoints_primary,
            "recommended": True,
        },
        "alternative_route": {
            "name": _route_name(road_dist_alt, True),
            "distance_km": road_dist_alt,
            "eta_minutes": max(5, eta_alt),
            "traffic": traffic_alt,
            "waypoints": waypoints_primary,  # Same waypoints, different path name
            "recommended": False,
        },
        "leg_to_incident_km": round(leg1_dist * 1.3, 1),
        "leg_to_hospital_km": round(leg2_dist * 1.3, 1),
    }
