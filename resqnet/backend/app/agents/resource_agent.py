"""
Resource Agent

Finds the nearest available emergency resources for a given incident.
Uses the Haversine formula for distance calculation.
"""
import json
import math
from typing import Any
from sqlalchemy.orm import Session
from app.models.resource import Resource


# ---------------------------------------------------------------------------
# Haversine distance (km)
# ---------------------------------------------------------------------------

def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---------------------------------------------------------------------------
# Resource matching
# ---------------------------------------------------------------------------

RESOURCE_TYPE_MAP = {
    "ambulance": "ambulance",
    "fire_unit": "fire_unit",
    "rescue_team": "rescue_team",
    "police": "police",
    # trauma_hospital and general_hospital are handled by HospitalAgent
    "trauma_hospital": None,
    "general_hospital": None,
}


def _resource_to_dict(r: Resource, distance_km: float) -> dict[str, Any]:
    return {
        "id": r.id,
        "resource_type": r.resource_type,
        "name": r.name,
        "status": r.status,
        "latitude": r.latitude,
        "longitude": r.longitude,
        "capabilities": json.loads(r.capabilities) if r.capabilities else [],
        "distance_km": round(distance_km, 2),
        "estimated_travel_min": round(distance_km / 0.5),  # ~30 km/h in city traffic
    }


def match_resources(
    db: Session,
    incident_lat: float,
    incident_lon: float,
    required_resource_types: list[str],
    severity: str,
    max_results_per_type: int = 3,
) -> dict[str, Any]:
    """
    Returns a dict of matched resources grouped by type.
    Picks the closest AVAILABLE resource for each required type.
    """
    matched: dict[str, list] = {}
    primary_resource: dict | None = None

    for req_type in required_resource_types:
        db_type = RESOURCE_TYPE_MAP.get(req_type)
        if db_type is None:
            continue  # Handled by HospitalAgent

        # Query available resources of this type
        candidates = (
            db.query(Resource)
            .filter(Resource.resource_type == db_type)
            .filter(Resource.status == "available")
            .all()
        )

        # Sort by distance
        ranked = sorted(
            candidates,
            key=lambda r: _haversine(incident_lat, incident_lon, r.latitude, r.longitude),
        )[:max_results_per_type]

        if ranked:
            enriched = [
                _resource_to_dict(r, _haversine(incident_lat, incident_lon, r.latitude, r.longitude))
                for r in ranked
            ]
            matched[req_type] = enriched

            # The primary dispatch is the first ambulance found
            if db_type == "ambulance" and primary_resource is None:
                primary_resource = enriched[0]

    # If no ambulance in required but we have a critical incident, suggest anyway
    if severity == "critical" and "ambulance" not in matched:
        fallback_ambs = (
            db.query(Resource)
            .filter(Resource.resource_type == "ambulance")
            .filter(Resource.status == "available")
            .all()
        )
        if fallback_ambs:
            best = min(fallback_ambs, key=lambda r: _haversine(incident_lat, incident_lon, r.latitude, r.longitude))
            dist = _haversine(incident_lat, incident_lon, best.latitude, best.longitude)
            matched["ambulance"] = [_resource_to_dict(best, dist)]
            primary_resource = matched["ambulance"][0]

    return {
        "matched_resources": matched,
        "primary_ambulance": primary_resource,
        "total_available": sum(len(v) for v in matched.values()),
    }
