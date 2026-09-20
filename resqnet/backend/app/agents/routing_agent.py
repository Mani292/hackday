"""
Routing Agent

Simulates route calculation between emergency resource and destination
(hospital or incident). Provides primary and alternative route recommendations
with traffic simulation.
"""
import math
import random
from typing import Any

import numpy as np


class TrafficLSTM:
    """Lightweight LSTM used to estimate likely traffic congestion from recent route signals."""

    def __init__(self) -> None:
        self.hidden_size = 6
        self.Wf = np.array([0.7, 0.9, -0.5, 0.2, 0.8, 0.4], dtype=float)
        self.Wi = np.array([0.4, 0.7, 0.2, -0.4, 0.5, 0.3], dtype=float)
        self.Wo = np.array([0.5, 0.8, 0.1, 0.3, 0.6, 0.2], dtype=float)
        self.Wg = np.array([0.9, 0.6, 0.5, 0.7, 0.8, 0.4], dtype=float)
        self.Uf = np.array([0.5, 0.4, 0.7, 0.2, 0.6, 0.3], dtype=float)
        self.Ui = np.array([0.6, 0.8, 0.3, -0.2, 0.7, 0.5], dtype=float)
        self.Uo = np.array([0.8, 0.7, 0.6, 0.4, 0.9, 0.5], dtype=float)
        self.Ug = np.array([0.5, 0.9, 0.7, 0.3, 0.8, 0.4], dtype=float)
        self.bf = np.array([0.3, 0.1, 0.2, 0.4, 0.2, 0.3], dtype=float)
        self.bi = np.array([-0.3, -0.2, -0.1, -0.3, -0.2, -0.1], dtype=float)
        self.bo = np.array([-0.2, -0.1, -0.3, -0.2, -0.1, -0.2], dtype=float)
        self.bg = np.array([0.0, 0.1, 0.2, 0.1, 0.2, 0.1], dtype=float)

    @staticmethod
    def _sigmoid(x: np.ndarray) -> np.ndarray:
        return 1.0 / (1.0 + np.exp(-x))

    def predict(self, sequence: list[float]) -> float:
        h = np.zeros(self.hidden_size, dtype=float)
        c = np.zeros(self.hidden_size, dtype=float)

        for value in sequence:
            x = np.asarray([value, 1.0 - value, value ** 2, 0.5 + value / 2, 1.0 / (1.0 + abs(value - 0.6)), 1.0], dtype=float)
            f = self._sigmoid(x * self.Wf + h * self.Uf + self.bf)
            i = self._sigmoid(x * self.Wi + h * self.Ui + self.bi)
            o = self._sigmoid(x * self.Wo + h * self.Uo + self.bo)
            g = np.tanh(x * self.Wg + h * self.Ug + self.bg)
            c = f * c + i * g
            h = o * np.tanh(c)

        score = float(np.clip((h.mean() + c.mean()) / 2.0, 0.0, 1.0))
        return score


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# Simulated named waypoints for Delhi NCR routes
WAYPOINTS = {
    "Connaught Place": (28.6315, 77.2167),
    "Rajpath": (28.6129, 77.2295),
    "Ring Road": (28.5695, 77.2430),
    "NH-48": (28.5200, 77.2060),
    "Outer Ring Road": (28.6530, 77.2020),
    "Saket Junction": (28.5200, 77.2073),
    "Karol Bagh": (28.6530, 77.2020),
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


def _lstm_traffic_score(
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    incident_lat: float | None = None,
    incident_lon: float | None = None,
) -> tuple[str, float]:
    """Estimate congestion using a compact LSTM-style sequential signal model."""
    model = TrafficLSTM()
    distance = _haversine(origin_lat, origin_lon, dest_lat, dest_lon)
    incident_bonus = 0.0
    if incident_lat is not None and incident_lon is not None:
        incident_bonus = _haversine(origin_lat, origin_lon, incident_lat, incident_lon) / max(distance + 1e-6, 1.0)

    urban_pressure = 0.35 + min(distance / 25.0, 0.65)
    road_signal = max(0.15, min(0.95, urban_pressure + incident_bonus * 0.25))

    sequence = [
        0.25,
        0.38,
        max(0.2, road_signal - 0.18),
        road_signal,
        min(0.95, road_signal + 0.18),
        min(0.97, road_signal + 0.22),
    ]
    score = model.predict(sequence)

    if score < 0.42:
        return "light", score
    if score < 0.72:
        return "moderate", score
    return "heavy", score


def _road_like_waypoints(
    origin_lat: float,
    origin_lon: float,
    incident_lat: float | None,
    incident_lon: float | None,
    dest_lat: float,
    dest_lon: float,
    alt_route: bool = False,
) -> list[dict[str, float | str]]:
    """Generate a road-like waypoint chain with small, realistic lateral offsets.

    The previous version introduced large detours that made routes look artificially long.
    This version keeps the route anchored to the real road corridor while preserving a normal
    "street-like" polyline instead of a straight aerial line.
    """
    def bend_point(start_lat: float, start_lon: float, end_lat: float, end_lon: float, lat_shift: float, lon_shift: float):
        return {
            "lat": (start_lat + end_lat) / 2 + lat_shift,
            "lng": (start_lon + end_lon) / 2 + lon_shift,
        }

    waypoints: list[dict[str, float | str]] = [
        {"name": "Origin", "lat": origin_lat, "lng": origin_lon},
    ]

    if incident_lat is not None and incident_lon is not None:
        # Keep the route close to the direct line; only a tiny road-like offset is added.
        road_shift = 0.0015 if not alt_route else 0.0025
        mid_to_incident = bend_point(origin_lat, origin_lon, incident_lat, incident_lon, road_shift, 0.0015)
        mid_to_hospital = bend_point(incident_lat, incident_lon, dest_lat, dest_lon, -road_shift * 0.7, 0.0012)
        waypoints.extend([
            {"name": "Road Connector", "lat": mid_to_incident["lat"], "lng": mid_to_incident["lng"]},
            {"name": "Incident Scene", "lat": incident_lat, "lng": incident_lon},
            {"name": "Access Road", "lat": mid_to_hospital["lat"], "lng": mid_to_hospital["lng"]},
        ])
    else:
        bend = bend_point(origin_lat, origin_lon, dest_lat, dest_lon, 0.001, 0.0015)
        waypoints.extend([
            {"name": "Road Connector", "lat": bend["lat"], "lng": bend["lng"]},
        ])

    waypoints.append({"name": "Hospital", "lat": dest_lat, "lng": dest_lon})
    return waypoints

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

    traffic_primary, traffic_score = _lstm_traffic_score(origin_lat, origin_lon, dest_lat, dest_lon, incident_lat, incident_lon)
    traffic_alt = {"light": "moderate", "moderate": "heavy", "heavy": "heavy"}.get(traffic_primary, "heavy")

    # Prefer the shortest and fastest realistic route: road distance should stay very close to
    # the straight-line distance, only nudged slightly for traffic and geometry.
    road_dist_primary = round(total_dist * (1.01 + traffic_score * 0.05), 1)
    road_dist_alt = round(total_dist * (1.04 + traffic_score * 0.07), 1)

    speed_primary = TRAFFIC_SPEED[traffic_primary]
    speed_alt = TRAFFIC_SPEED[traffic_alt]

    eta_primary = round((road_dist_primary / speed_primary) * 60)  # minutes
    eta_alt = round((road_dist_alt / speed_alt) * 60)

    # Route name simulation
    def _route_name(dist: float, is_alt: bool) -> str:
        if dist < 3:
            return "Via Connaught Place → Rajpath" if not is_alt else "Via Ring Road"
        elif dist < 7:
            return "Via NH-48 → Saket Corridor" if not is_alt else "Via Outer Ring Road"
        else:
            return "Via Delhi Ring Road → Gurgaon Expressway" if not is_alt else "Via NH-10 Diversion"

    primary_waypoints = _road_like_waypoints(origin_lat, origin_lon, incident_lat, incident_lon, dest_lat, dest_lon, alt_route=False)
    alternative_waypoints = _road_like_waypoints(origin_lat, origin_lon, incident_lat, incident_lon, dest_lat, dest_lon, alt_route=True)

    primary_route = {
        "name": _route_name(road_dist_primary, False),
        "distance_km": road_dist_primary,
        "eta_minutes": max(3, eta_primary),
        "traffic": traffic_primary,
        "waypoints": primary_waypoints,
        "recommended": True,
    }
    alternative_route = {
        "name": _route_name(road_dist_alt, True),
        "distance_km": road_dist_alt,
        "eta_minutes": max(5, eta_alt),
        "traffic": traffic_alt,
        "waypoints": alternative_waypoints,
        "recommended": False,
    }

    if alternative_route["eta_minutes"] < primary_route["eta_minutes"]:
        primary_route, alternative_route = alternative_route, primary_route
        primary_route["recommended"] = True
        alternative_route["recommended"] = False

    return {
        "primary_route": primary_route,
        "alternative_route": alternative_route,
        "leg_to_incident_km": round(leg1_dist * 1.02, 1),
        "leg_to_hospital_km": round(leg2_dist * 1.02, 1),
    }
