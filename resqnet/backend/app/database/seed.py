"""
Seed the database with realistic demo data for ResQNet.
Coordinates are centred around Kuala Lumpur, Malaysia.
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
        "name": "KL General Hospital",
        "latitude": 3.1466,
        "longitude": 101.6956,
        "capacity": 500,
        "available_capacity": 120,
        "trauma_capable": True,
        "icu_available": True,
        "emergency_dept": True,
        "status": "operational",
    },
    {
        "id": "HOSP-002",
        "name": "Pantai Medical Centre",
        "latitude": 3.1116,
        "longitude": 101.6717,
        "capacity": 300,
        "available_capacity": 65,
        "trauma_capable": True,
        "icu_available": True,
        "emergency_dept": True,
        "status": "operational",
    },
    {
        "id": "HOSP-003",
        "name": "Damansara Specialist Hospital",
        "latitude": 3.1488,
        "longitude": 101.6203,
        "capacity": 200,
        "available_capacity": 45,
        "trauma_capable": False,
        "icu_available": True,
        "emergency_dept": True,
        "status": "operational",
    },
    {
        "id": "HOSP-004",
        "name": "Ampang Puteri Specialist Hospital",
        "latitude": 3.1581,
        "longitude": 101.7651,
        "capacity": 250,
        "available_capacity": 30,
        "trauma_capable": True,
        "icu_available": False,
        "emergency_dept": True,
        "status": "limited",
    },
    {
        "id": "HOSP-005",
        "name": "Universiti Malaya Medical Centre",
        "latitude": 3.1209,
        "longitude": 101.6559,
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
    {"id": "AMB-001", "resource_type": "ambulance", "name": "Ambulance A-01", "status": "available", "latitude": 3.1478, "longitude": 101.6953, "capabilities": json.dumps(["ALS", "trauma"])},
    {"id": "AMB-002", "resource_type": "ambulance", "name": "Ambulance A-02", "status": "available", "latitude": 3.1200, "longitude": 101.6800, "capabilities": json.dumps(["BLS"])},
    {"id": "AMB-003", "resource_type": "ambulance", "name": "Ambulance A-03", "status": "available", "latitude": 3.1650, "longitude": 101.7100, "capabilities": json.dumps(["ALS", "pediatric"])},
    {"id": "AMB-004", "resource_type": "ambulance", "name": "Ambulance A-04", "status": "dispatched", "latitude": 3.1350, "longitude": 101.6600, "capabilities": json.dumps(["ALS"])},
    {"id": "AMB-005", "resource_type": "ambulance", "name": "Ambulance A-05", "status": "available", "latitude": 3.1050, "longitude": 101.7050, "capabilities": json.dumps(["BLS"])},
    {"id": "AMB-006", "resource_type": "ambulance", "name": "Ambulance A-06", "status": "available", "latitude": 3.1730, "longitude": 101.6850, "capabilities": json.dumps(["ALS", "trauma"])},
    # Fire Units
    {"id": "FIRE-001", "resource_type": "fire_unit", "name": "Fire Unit F-01", "status": "available", "latitude": 3.1400, "longitude": 101.7000, "capabilities": json.dumps(["firefighting", "rescue", "hazmat"])},
    {"id": "FIRE-002", "resource_type": "fire_unit", "name": "Fire Unit F-02", "status": "available", "latitude": 3.1250, "longitude": 101.6750, "capabilities": json.dumps(["firefighting", "rescue"])},
    # Rescue Teams
    {"id": "RES-001", "resource_type": "rescue_team", "name": "Rescue Team R-01", "status": "available", "latitude": 3.1550, "longitude": 101.7200, "capabilities": json.dumps(["extraction", "search", "medical_assist"])},
    {"id": "RES-002", "resource_type": "rescue_team", "name": "Rescue Team R-02", "status": "available", "latitude": 3.1100, "longitude": 101.6900, "capabilities": json.dumps(["extraction", "search"])},
    # Police
    {"id": "POL-001", "resource_type": "police", "name": "Police Unit P-01", "status": "available", "latitude": 3.1320, "longitude": 101.6880, "capabilities": json.dumps(["crowd_control", "traffic"])},
    {"id": "POL-002", "resource_type": "police", "name": "Police Unit P-02", "status": "available", "latitude": 3.1600, "longitude": 101.7100, "capabilities": json.dumps(["crowd_control", "traffic"])},
]


def _make_incident_id() -> str:
    year = datetime.now().year
    num = str(uuid.uuid4().int)[:5].zfill(5)
    return f"RSQ-{year}-{num}"


DEMO_INCIDENTS = [
    {
        "id": _make_incident_id(),
        "incident_type": "road_accident",
        "description": "Major road accident near Central Junction. Three people injured. One person appears unconscious.",
        "severity": "critical",
        "location": "Central Junction, Jalan Ampang, Kuala Lumpur",
        "latitude": 3.1570,
        "longitude": 101.7120,
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
                "Notify KL General Hospital Trauma Unit",
                "Dispatch Rescue Team R-01 for extraction",
                "Deploy Police Unit P-01 for traffic control",
                "Use Alternative Route via Jalan Tun Razak"
            ],
            "eta_minutes": 7,
            "primary_route": "Via Jalan Ampang → Jalan Tun Razak",
            "alt_route": "Via Middle Ring Road II"
        }),
    },
    {
        "id": _make_incident_id(),
        "incident_type": "fire",
        "description": "Building fire reported on 4th floor of commercial complex. Smoke visible from street. Occupants evacuating.",
        "severity": "high",
        "location": "Bangunan Kompleks Pertama, Jalan Bukit Bintang, KL",
        "latitude": 3.1462,
        "longitude": 101.7100,
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
                "Notify Pantai Medical Centre Emergency Dept",
                "Dispatch Rescue Team R-01 for evacuation"
            ],
            "eta_minutes": 10,
            "primary_route": "Direct via Jalan Bukit Bintang"
        }),
    },
    {
        "id": _make_incident_id(),
        "incident_type": "medical_emergency",
        "description": "Elderly man collapsed at shopping mall food court. Bystanders report he is unresponsive. CPR in progress.",
        "severity": "high",
        "location": "Mid Valley Megamall Food Court, KL",
        "latitude": 3.1173,
        "longitude": 101.6773,
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
                "Alert UMMC Emergency for cardiac case",
                "Prepare CCU on arrival"
            ],
            "eta_minutes": 5,
            "primary_route": "Via Federal Highway"
        }),
    },
    {
        "id": _make_incident_id(),
        "incident_type": "road_accident",
        "description": "Minor fender-bender on highway slip road. One driver reports neck pain. No visible injuries.",
        "severity": "medium",
        "location": "KL-Selangor Highway Slip Road, Damansara",
        "latitude": 3.1503,
        "longitude": 101.6289,
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
        "location": "Jalan Duta, Near Istana Negara, KL",
        "latitude": 3.1631,
        "longitude": 101.6873,
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
    """Seed all demo data if DB is empty."""
    if db.query(Hospital).count() > 0:
        return  # Already seeded

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
