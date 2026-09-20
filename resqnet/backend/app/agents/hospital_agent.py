"""
Hospital Agent

Finds the most suitable hospital for a given incident.
Considers severity, trauma capability, ICU availability, and proximity.
"""
import math
from typing import Any
from sqlalchemy.orm import Session
from app.models.hospital import Hospital


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _hospital_to_dict(h: Hospital, distance_km: float) -> dict[str, Any]:
    return {
        "id": h.id,
        "name": h.name,
        "latitude": h.latitude,
        "longitude": h.longitude,
        "capacity": h.capacity,
        "available_capacity": h.available_capacity,
        "trauma_capable": h.trauma_capable,
        "icu_available": h.icu_available,
        "emergency_dept": h.emergency_dept,
        "status": h.status,
        "distance_km": round(distance_km, 2),
        "estimated_travel_min": round(distance_km / 0.5),
    }


def match_hospital(
    db: Session,
    incident_lat: float,
    incident_lon: float,
    severity: str,
    incident_type: str,
) -> dict[str, Any]:
    """
    Returns the best hospital and a list of alternatives.
    """
    hospitals = db.query(Hospital).filter(Hospital.status != "full").all()

    # Score each hospital
    scored = []
    for h in hospitals:
        dist = _haversine(incident_lat, incident_lon, h.latitude, h.longitude)
        score = 0

        # Capacity score (higher = better)
        if h.available_capacity > 0:
            score += min(h.available_capacity / 50, 5)

        # Trauma bonus for critical/high
        if severity in ("critical", "high") and h.trauma_capable:
            score += 10

        # ICU bonus for critical
        if severity == "critical" and h.icu_available:
            score += 5

        # Emergency department required
        if not h.emergency_dept:
            score -= 20

        # Distance penalty (closer = better)
        score -= dist * 0.5

        # Status penalty for limited
        if h.status == "limited":
            score -= 3

        scored.append((score, dist, h))

    scored.sort(key=lambda x: -x[0])

    if not scored:
        return {"primary_hospital": None, "alternatives": []}

    best_score, best_dist, best_h = scored[0]
    alternatives = [
        _hospital_to_dict(h, d) for _, d, h in scored[1:4]
    ]

    return {
        "primary_hospital": _hospital_to_dict(best_h, best_dist),
        "alternatives": alternatives,
    }
