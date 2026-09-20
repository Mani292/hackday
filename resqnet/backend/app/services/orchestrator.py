"""
AI Orchestrator

Runs the full 5-agent pipeline for a given incident.
"""
import json
import uuid
from datetime import datetime
from sqlalchemy.orm import Session

from app.agents import incident_agent, resource_agent, hospital_agent, routing_agent, coordination_agent
from app.models.incident import Incident
from app.models.resource import Resource
from app.models.hospital import Hospital
from app.models.assignment import Assignment
from app.models.response_event import ResponseEvent


def _add_event(db: Session, incident_id: str, event_type: str, description: str):
    db.add(ResponseEvent(
        id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
        incident_id=incident_id,
        event_type=event_type,
        description=description,
        timestamp=datetime.utcnow(),
    ))


async def run_full_pipeline(incident_id: str, db: Session) -> dict:
    """
    Runs the complete AI agent pipeline for an incident.
    Updates the incident record in-place and creates response events.
    Returns the final coordination result.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise ValueError(f"Incident {incident_id} not found")

    # ── 1. Incident Analysis Agent ──────────────────────────────────────────
    incident.status = "analyzing"
    db.flush()

    analysis = await incident_agent.analyze_incident(
        description=incident.description,
        location=incident.location,
        incident_type_hint=incident.incident_type,
        affected_people=incident.affected_people or 1,
    )

    incident.incident_type = analysis["incident_type"]
    incident.severity = analysis["severity"]
    incident.affected_people = analysis["affected_people"]
    incident.ai_summary = analysis["ai_summary"]
    incident.required_resources = json.dumps(analysis["required_resources"])
    db.flush()

    _add_event(db, incident_id, "analyzed",
               f"AI Analysis complete — Severity: {analysis['severity'].upper()}, "
               f"Type: {analysis['incident_type'].replace('_', ' ').title()}")

    # ── 2. Resource Agent ────────────────────────────────────────────────────
    resource_result = resource_agent.match_resources(
        db=db,
        incident_lat=incident.latitude,
        incident_lon=incident.longitude,
        required_resource_types=analysis["required_resources"],
        severity=analysis["severity"],
    )

    _add_event(db, incident_id, "resources_matched",
               f"Resources matched — {resource_result['total_available']} unit(s) identified")

    # ── 3. Hospital Agent ────────────────────────────────────────────────────
    hospital_result = hospital_agent.match_hospital(
        db=db,
        incident_lat=incident.latitude,
        incident_lon=incident.longitude,
        severity=analysis["severity"],
        incident_type=analysis["incident_type"],
    )

    primary_hosp = hospital_result.get("primary_hospital")
    if primary_hosp:
        incident.assigned_hospital_id = primary_hosp["id"]
        _add_event(db, incident_id, "hospital_notified",
                   f"Hospital matched — {primary_hosp['name']} notified and preparing emergency bay")

    # ── 4. Routing Agent ─────────────────────────────────────────────────────
    primary_amb = resource_result.get("primary_ambulance")
    if primary_amb and primary_hosp:
        route_result = routing_agent.calculate_routes(
            origin_lat=primary_amb["latitude"],
            origin_lon=primary_amb["longitude"],
            dest_lat=primary_hosp["latitude"],
            dest_lon=primary_hosp["longitude"],
            incident_lat=incident.latitude,
            incident_lon=incident.longitude,
        )
        incident.estimated_eta = route_result["primary_route"]["eta_minutes"]
    else:
        route_result = {
            "primary_route": {"name": "Direct route", "distance_km": 5.0, "eta_minutes": 10, "traffic": "moderate", "waypoints": [], "recommended": True},
            "alternative_route": {"name": "Alternative route", "distance_km": 6.5, "eta_minutes": 14, "traffic": "heavy", "waypoints": [], "recommended": False},
        }
        incident.estimated_eta = 10

    _add_event(db, incident_id, "route_calculated",
               f"Route calculated — ETA {incident.estimated_eta} min via {route_result['primary_route']['name']}")

    # ── 5. Coordination Agent ────────────────────────────────────────────────
    coord_plan = await coordination_agent.coordinate(
        incident_analysis=analysis,
        resource_result=resource_result,
        hospital_result=hospital_result,
        route_result=route_result,
        incident_description=incident.description,
        location=incident.location,
        severity=analysis["severity"],
    )

    incident.coordination_plan = json.dumps(coord_plan)

    # ── Assign primary ambulance ─────────────────────────────────────────────
    if primary_amb:
        incident.assigned_ambulance_id = primary_amb["id"]
        # Mark resource as dispatched
        res = db.query(Resource).filter(Resource.id == primary_amb["id"]).first()
        if res:
            res.status = "dispatched"
            res.assigned_incident_id = incident_id

        db.add(Assignment(
            id=f"ASN-{uuid.uuid4().hex[:8].upper()}",
            incident_id=incident_id,
            resource_id=primary_amb["id"],
            assignment_type="ambulance",
            status="assigned",
        ))

        _add_event(db, incident_id, "dispatched",
                   f"{primary_amb['name']} dispatched — en route to incident scene")

    # ── Final status ─────────────────────────────────────────────────────────
    incident.status = "dispatched" if primary_amb else "resources_matched"
    db.commit()

    return {
        "incident_id": incident_id,
        "analysis": analysis,
        "resources": resource_result,
        "hospital": hospital_result,
        "routes": route_result,
        "coordination_plan": coord_plan,
    }
