"""
Seed the database with realistic demo data for ResQNet.
Coordinates are centred around New Delhi, India.
"""
import json
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.resource import Resource
from app.models.hospital import Hospital
from app.models.assignment import Assignment
from app.models.response_event import ResponseEvent


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:6].upper()}"


# ---------------------------------------------------------------------------
# Static demo data
# ---------------------------------------------------------------------------

HOSPITALS = [
    {
        "id": "HOSP-001",
        "name": "AIIMS Trauma Centre",
        "latitude": 28.5668,
        "longitude": 77.2068,
        "capacity": 500,
        "available_capacity": 120,
        "trauma_capable": True,
        "icu_available": True,
        "emergency_dept": True,
        "status": "operational",
    },
    {
        "id": "HOSP-002",
        "name": "Safdarjung Hospital",
        "latitude": 28.5881,
        "longitude": 77.2054,
        "capacity": 300,
        "available_capacity": 65,
        "trauma_capable": True,
        "icu_available": True,
        "emergency_dept": True,
        "status": "operational",
    },
    {
        "id": "HOSP-003",
        "name": "Fortis Escorts Heart Institute",
        "latitude": 28.5612,
        "longitude": 77.2204,
        "capacity": 200,
        "available_capacity": 45,
        "trauma_capable": False,
        "icu_available": True,
        "emergency_dept": True,
        "status": "operational",
    },
    {
        "id": "HOSP-004",
        "name": "Max Super Speciality Hospital",
        "latitude": 28.5601,
        "longitude": 77.2298,
        "capacity": 250,
        "available_capacity": 30,
        "trauma_capable": True,
        "icu_available": False,
        "emergency_dept": True,
        "status": "limited",
    },
    {
        "id": "HOSP-005",
        "name": "Sir Ganga Ram Hospital",
        "latitude": 28.6391,
        "longitude": 77.1970,
        "capacity": 800,
        "available_capacity": 200,
        "trauma_capable": True,
        "icu_available": True,
        "emergency_dept": True,
        "status": "operational",
    },
]

RESOURCES = [
    # Ambulances
    {"id": "AMB-001", "resource_type": "ambulance", "name": "Ambulance A-01", "status": "available", "latitude": 28.6274, "longitude": 77.2170, "capabilities": json.dumps(["ALS", "trauma"])},
    {"id": "AMB-002", "resource_type": "ambulance", "name": "Ambulance A-02", "status": "available", "latitude": 28.6100, "longitude": 77.1900, "capabilities": json.dumps(["BLS"])},
    {"id": "AMB-003", "resource_type": "ambulance", "name": "Ambulance A-03", "status": "available", "latitude": 28.6510, "longitude": 77.2240, "capabilities": json.dumps(["ALS", "pediatric"])},
    {"id": "AMB-004", "resource_type": "ambulance", "name": "Ambulance A-04", "status": "dispatched", "latitude": 28.6000, "longitude": 77.1700, "capabilities": json.dumps(["ALS"])},
    {"id": "AMB-005", "resource_type": "ambulance", "name": "Ambulance A-05", "status": "available", "latitude": 28.5850, "longitude": 77.2370, "capabilities": json.dumps(["BLS"])},
    {"id": "AMB-006", "resource_type": "ambulance", "name": "Ambulance A-06", "status": "available", "latitude": 28.6640, "longitude": 77.2040, "capabilities": json.dumps(["ALS", "trauma"])},
    # Fire Units
    {"id": "FIRE-001", "resource_type": "fire_unit", "name": "Fire Unit F-01", "status": "available", "latitude": 28.6230, "longitude": 77.2140, "capabilities": json.dumps(["firefighting", "rescue", "hazmat"])},
    {"id": "FIRE-002", "resource_type": "fire_unit", "name": "Fire Unit F-02", "status": "available", "latitude": 28.6080, "longitude": 77.1850, "capabilities": json.dumps(["firefighting", "rescue"])},
    # Rescue Teams
    {"id": "RES-001", "resource_type": "rescue_team", "name": "Rescue Team R-01", "status": "available", "latitude": 28.6400, "longitude": 77.2320, "capabilities": json.dumps(["extraction", "search", "medical_assist"])},
    {"id": "RES-002", "resource_type": "rescue_team", "name": "Rescue Team R-02", "status": "available", "latitude": 28.5950, "longitude": 77.1800, "capabilities": json.dumps(["extraction", "search"])},
    # Police
    {"id": "POL-001", "resource_type": "police", "name": "Police Unit P-01", "status": "available", "latitude": 28.6150, "longitude": 77.1980, "capabilities": json.dumps(["crowd_control", "traffic"])},
    {"id": "POL-002", "resource_type": "police", "name": "Police Unit P-02", "status": "available", "latitude": 28.6460, "longitude": 77.2260, "capabilities": json.dumps(["crowd_control", "traffic"])},
]


def _make_incident_id() -> str:
    year = datetime.now().year
    num = str(uuid.uuid4().int)[:5].zfill(5)
    return f"RSQ-{year}-{num}"


DEMO_INCIDENTS = [
    {
        "id": _make_incident_id(),
        "incident_type": "road_accident",
        "description": "Major road accident near Connaught Place. Three people injured. One person appears unconscious.",
        "severity": "critical",
        "location": "Connaught Place, New Delhi",
        "latitude": 28.6315,
        "longitude": 77.2167,
        "affected_people": 3,
        "status": "en_route",
        "ai_summary": "Critical road accident with 3 victims, 1 unconscious. Immediate trauma care and ALS ambulance required. Road may be partially blocked — traffic redirection recommended.",
        "required_resources": json.dumps(["ambulance", "rescue_team", "police"]),
        "assigned_ambulance_id": "AMB-001",
        "assigned_hospital_id": "HOSP-001",
        "estimated_eta": 7,
        "coordination_plan": json.dumps({
            "actions": [
                "Dispatch Ambulance A-01 (ALS capable)",
                "Notify AIIMS Trauma Centre",
                "Dispatch Rescue Team R-01 for extraction",
                "Deploy Police Unit P-01 for traffic control",
                "Use Alternative Route via Ring Road"
            ],
            "eta_minutes": 7,
            "primary_route": "Via Connaught Place → Rajpath",
            "alt_route": "Via Ring Road / Ashram Route"
        }),
    },
    {
        "id": _make_incident_id(),
        "incident_type": "fire",
        "description": "Building fire reported on 4th floor of commercial complex. Smoke visible from street. Occupants evacuating.",
        "severity": "high",
        "location": "Karol Bagh Market, New Delhi",
        "latitude": 28.6530,
        "longitude": 77.2020,
        "affected_people": 12,
        "status": "dispatched",
        "ai_summary": "High-severity building fire with possible multiple occupants. Fire suppression, evacuation assistance and medical standby required.",
        "required_resources": json.dumps(["fire_unit", "ambulance", "rescue_team"]),
        "assigned_ambulance_id": "AMB-003",
        "assigned_hospital_id": "HOSP-002",
        "estimated_eta": 10,
        "coordination_plan": json.dumps({
            "actions": [
                "Dispatch Fire Unit F-01 (hazmat capable)",
                "Standby Ambulance A-03 for injured",
                "Notify Safdarjung Hospital Emergency Dept",
                "Dispatch Rescue Team R-01 for evacuation"
            ],
            "eta_minutes": 10,
            "primary_route": "Direct via Karol Bagh Road"
        }),
    },
    {
        "id": _make_incident_id(),
        "incident_type": "medical_emergency",
        "description": "Elderly man collapsed at shopping mall food court. Bystanders report he is unresponsive. CPR in progress.",
        "severity": "high",
        "location": "Select City Walk, Saket, New Delhi",
        "latitude": 28.5200,
        "longitude": 77.2060,
        "affected_people": 1,
        "status": "resources_matched",
        "ai_summary": "Cardiac emergency — patient unresponsive with CPR in progress. ALS ambulance with defibrillator required immediately.",
        "required_resources": json.dumps(["ambulance"]),
        "assigned_ambulance_id": "AMB-006",
        "assigned_hospital_id": "HOSP-005",
        "estimated_eta": 5,
        "coordination_plan": json.dumps({
            "actions": [
                "Dispatch Ambulance A-06 (ALS)",
                "Alert Sir Ganga Ram Emergency for cardiac case",
                "Prepare ICU on arrival"
            ],
            "eta_minutes": 5,
            "primary_route": "Via NH-48"
        }),
    },
    {
        "id": _make_incident_id(),
        "incident_type": "road_accident",
        "description": "Minor fender-bender on ring road slip lane. One driver reports neck pain. No visible injuries.",
        "severity": "medium",
        "location": "Ring Road, South Delhi",
        "latitude": 28.5695,
        "longitude": 77.2430,
        "affected_people": 2,
        "status": "reported",
        "ai_summary": "Minor vehicle collision. Precautionary ambulance recommended for neck pain assessment.",
        "required_resources": json.dumps(["ambulance", "police"]),
        "assigned_ambulance_id": None,
        "assigned_hospital_id": None,
        "estimated_eta": None,
        "coordination_plan": None,
    },
    {
        "id": _make_incident_id(),
        "incident_type": "other",
        "description": "Fallen tree blocking road after heavy rain. No injuries reported. Traffic building up.",
        "severity": "low",
        "location": "Rajiv Chowk, Central Delhi",
        "latitude": 28.6328,
        "longitude": 77.2197,
        "affected_people": 0,
        "status": "reported",
        "ai_summary": "Fallen tree hazard — no medical emergency. Police traffic control and removal crew recommended.",
        "required_resources": json.dumps(["police", "rescue_team"]),
        "assigned_ambulance_id": None,
        "assigned_hospital_id": None,
        "estimated_eta": None,
        "coordination_plan": None,
    },
]


def seed_database(db: Session) -> None:
    """Reset and reseed demo data so the app always reflects the current scenario."""
    db.query(ResponseEvent).delete()
    db.query(Assignment).delete()
    db.query(Incident).delete()
    db.query(Resource).delete()
    db.query(Hospital).delete()
    db.commit()

    print("🌱 Seeding database with demo data...")

    # Hospitals
    for h in HOSPITALS:
        db.add(Hospital(**h))

    # Resources
    for r in RESOURCES:
        db.add(Resource(**r))

    db.flush()

    # Incidents + their response events
    now = datetime.utcnow()
    for i, inc_data in enumerate(DEMO_INCIDENTS):
        incident = Incident(**inc_data)
        db.add(incident)
        db.flush()

        # Build timeline events based on status
        status = inc_data["status"]
        offset = timedelta(minutes=i * 5)
        base = now - timedelta(hours=1) + offset

        events = []
        events.append(("reported", "Incident reported via ResQNet portal", base))

        if status not in ("reported",):
            events.append(("analyzed", "AI analysis completed — severity and resources determined", base + timedelta(minutes=1)))

        if status in ("resources_matched", "dispatched", "en_route", "arrived", "resolved"):
            events.append(("resources_matched", "Resources identified and matched to incident", base + timedelta(minutes=2)))

        if status in ("dispatched", "en_route", "arrived", "resolved"):
            events.append(("dispatched", "Emergency units dispatched from their stations", base + timedelta(minutes=3)))
            if inc_data["assigned_hospital_id"]:
                events.append(("hospital_notified", "Assigned hospital notified and preparing for arrival", base + timedelta(minutes=3, seconds=30)))

        if status in ("en_route", "arrived", "resolved"):
            events.append(("en_route", "Ambulance en route — estimated arrival in progress", base + timedelta(minutes=4)))

        if status in ("arrived", "resolved"):
            events.append(("arrived", "Emergency units arrived on scene", base + timedelta(minutes=4 + (inc_data.get("estimated_eta") or 8))))

        if status == "resolved":
            events.append(("resolved", "Incident resolved. Patient transferred. Units returning.", base + timedelta(minutes=30)))

        for ev_type, ev_desc, ev_time in events:
            db.add(ResponseEvent(
                id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
                incident_id=incident.id,
                event_type=ev_type,
                description=ev_desc,
                timestamp=ev_time,
            ))

    db.commit()
    print(f"✅ Seeded {len(HOSPITALS)} hospitals, {len(RESOURCES)} resources, {len(DEMO_INCIDENTS)} incidents.")
