"""Resources, Hospitals, Dashboard, Assistant, and Demo API Routers"""
import json
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.resource import Resource
from app.models.hospital import Hospital
from app.models.incident import Incident
from app.models.response_event import ResponseEvent

# ──────────────────────────────────────────────────────────────────────────────
# Resources
# ──────────────────────────────────────────────────────────────────────────────

resources_router = APIRouter(prefix="/api/resources", tags=["resources"])


@resources_router.get("")
def list_resources(
    resource_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Resource)
    if resource_type:
        query = query.filter(Resource.resource_type == resource_type)
    if status:
        query = query.filter(Resource.status == status)
    resources = query.all()
    return [
        {
            "id": r.id,
            "resource_type": r.resource_type,
            "name": r.name,
            "status": r.status,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "capabilities": json.loads(r.capabilities) if r.capabilities else [],
            "assigned_incident_id": r.assigned_incident_id,
        }
        for r in resources
    ]


# ──────────────────────────────────────────────────────────────────────────────
# Hospitals
# ──────────────────────────────────────────────────────────────────────────────

hospitals_router = APIRouter(prefix="/api/hospitals", tags=["hospitals"])


@hospitals_router.get("")
def list_hospitals(db: Session = Depends(get_db)):
    hospitals = db.query(Hospital).all()
    return [
        {
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
        }
        for h in hospitals
    ]


# ──────────────────────────────────────────────────────────────────────────────
# Dashboard
# ──────────────────────────────────────────────────────────────────────────────

dashboard_router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@dashboard_router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_incidents = db.query(Incident).count()
    active_incidents = db.query(Incident).filter(
        Incident.status.notin_(["resolved"])
    ).count()
    critical_incidents = db.query(Incident).filter(
        Incident.severity == "critical",
        Incident.status.notin_(["resolved"]),
    ).count()
    available_ambulances = db.query(Resource).filter(
        Resource.resource_type == "ambulance",
        Resource.status == "available",
    ).count()
    available_hospitals = db.query(Hospital).filter(
        Hospital.status == "operational",
    ).count()
    active_responders = db.query(Resource).filter(
        Resource.status.in_(["dispatched", "en_route", "busy"]),
    ).count()
    resolved_incidents = db.query(Incident).filter(Incident.status == "resolved").count()

    return {
        "total_incidents": total_incidents,
        "active_incidents": active_incidents,
        "critical_incidents": critical_incidents,
        "available_ambulances": available_ambulances,
        "available_hospitals": available_hospitals,
        "active_responders": active_responders,
        "resolved_incidents": resolved_incidents,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Analytics
# ──────────────────────────────────────────────────────────────────────────────

analytics_router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@analytics_router.get("")
def get_analytics(db: Session = Depends(get_db)):
    incidents = db.query(Incident).all()

    by_type: dict[str, int] = {}
    by_severity: dict[str, int] = {}
    by_status: dict[str, int] = {}

    for inc in incidents:
        t = inc.incident_type or "other"
        by_type[t] = by_type.get(t, 0) + 1

        s = inc.severity or "unknown"
        by_severity[s] = by_severity.get(s, 0) + 1

        st = inc.status or "unknown"
        by_status[st] = by_status.get(st, 0) + 1

    # Simulated average response time (minutes)
    avg_response_time = 8.4

    # Resource utilization
    total_resources = db.query(Resource).count()
    busy_resources = db.query(Resource).filter(
        Resource.status.in_(["dispatched", "en_route", "busy"])
    ).count()
    utilization_pct = round(busy_resources / total_resources * 100, 1) if total_resources else 0

    return {
        "incidents_by_type": [{"type": k, "count": v} for k, v in by_type.items()],
        "incidents_by_severity": [{"severity": k, "count": v} for k, v in by_severity.items()],
        "incidents_by_status": [{"status": k, "count": v} for k, v in by_status.items()],
        "avg_response_time_min": avg_response_time,
        "resource_utilization_pct": utilization_pct,
        "total_resources": total_resources,
        "busy_resources": busy_resources,
    }


# ──────────────────────────────────────────────────────────────────────────────
# AI Assistant
# ──────────────────────────────────────────────────────────────────────────────

assistant_router = APIRouter(prefix="/api/assistant", tags=["assistant"])


class AssistantQuery(BaseModel):
    query: str
    incident_id: Optional[str] = None


def _build_context(db: Session) -> str:
    incidents = db.query(Incident).filter(Incident.status != "resolved").all()
    resources = db.query(Resource).all()
    hospitals = db.query(Hospital).all()

    inc_summary = "\n".join([
        f"- {i.id}: {i.incident_type or 'unknown'} at {i.location}, severity={i.severity or 'unknown'}, status={i.status}"
        for i in incidents[:10]
    ])
    avail_amb = [r for r in resources if r.resource_type == "ambulance" and r.status == "available"]
    hosp_summary = "\n".join([f"- {h.name}: capacity={h.available_capacity}, trauma={h.trauma_capable}" for h in hospitals])

    return f"""Active Incidents:
{inc_summary or 'No active incidents'}

Available Ambulances: {len(avail_amb)}
{chr(10).join(r.name for r in avail_amb[:5])}

Hospitals:
{hosp_summary}
"""


def _deterministic_assistant(query: str, db: Session, incident_id: Optional[str]) -> str:
    q = query.lower()
    incidents = db.query(Incident).all()
    resources = db.query(Resource).all()

    if "critical" in q:
        crits = [i for i in incidents if i.severity == "critical" and i.status != "resolved"]
        if crits:
            return f"There are {len(crits)} critical incident(s): " + ", ".join(f"{i.id} at {i.location}" for i in crits)
        return "No critical incidents currently active."

    if "ambulance" in q and ("closest" in q or "nearest" in q or "available" in q):
        avail = [r for r in resources if r.resource_type == "ambulance" and r.status == "available"]
        if avail:
            return f"Available ambulances: {', '.join(r.name for r in avail)}."
        return "No ambulances currently available."

    if "hospital" in q and ("suitable" in q or "recommend" in q):
        if incident_id:
            inc = db.query(Incident).filter(Incident.id == incident_id).first()
            if inc and inc.assigned_hospital_id:
                hosp = db.query(Hospital).filter(Hospital.id == inc.assigned_hospital_id).first()
                if hosp:
                    return f"Recommended hospital for {incident_id}: {hosp.name} (trauma_capable={hosp.trauma_capable})."
        return "Please provide an incident ID to get hospital recommendations."

    if "summary" in q or "situation" in q or "overview" in q:
        active = [i for i in incidents if i.status != "resolved"]
        critical = [i for i in active if i.severity == "critical"]
        avail_amb = [r for r in resources if r.resource_type == "ambulance" and r.status == "available"]
        return (
            f"Current situation: {len(active)} active incident(s), {len(critical)} critical. "
            f"{len(avail_amb)} ambulance(s) available. System status: operational."
        )

    if "waiting" in q or "unassigned" in q:
        waiting = [i for i in incidents if i.status in ("reported", "analyzing")]
        if waiting:
            return f"{len(waiting)} incident(s) awaiting resources: " + ", ".join(i.id for i in waiting)
        return "All incidents have been assigned resources."

    return (
        "I can help you with: critical incidents, available ambulances, hospital recommendations, "
        "situation summaries, and incidents waiting for resources. Please ask a more specific question."
    )


@assistant_router.post("/query")
async def assistant_query(payload: AssistantQuery, db: Session = Depends(get_db)):
    context = _build_context(db)
    query = payload.query
    incident_id = payload.incident_id

    import os
    api_key = os.getenv("AI_API_KEY", "")
    if api_key and api_key != "your_gemini_api_key_here":
        try:
            import google.generativeai as genai
            import re
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(os.getenv("AI_MODEL", "gemini-1.5-flash"))
            prompt = f"""You are ResQNet's command-center AI assistant.
Answer the operator's query using the live system data below.
Keep responses concise and actionable (2-4 sentences max).
Do not make up data not shown below.

LIVE SYSTEM DATA:
{context}

Operator Query: {query}
"""
            response = model.generate_content(prompt)
            return {"response": response.text.strip(), "method": "llm"}
        except Exception as e:
            print(f"[Assistant] LLM failed: {e}")

    answer = _deterministic_assistant(query, db, incident_id)
    return {"response": answer, "method": "deterministic"}


# ──────────────────────────────────────────────────────────────────────────────
# Demo Mode
# ──────────────────────────────────────────────────────────────────────────────

demo_router = APIRouter(prefix="/api/demo", tags=["demo"])


@demo_router.post("/simulate")
async def simulate_emergency(db: Session = Depends(get_db)):
    """
    Creates a realistic demo emergency incident and runs the full pipeline.
    """
    from app.services.orchestrator import run_full_pipeline

    year = datetime.now().year
    incident_id = f"RSQ-{year}-DEMO1"

    # Remove previous demo incident if exists
    old = db.query(Incident).filter(Incident.id == incident_id).first()
    if old:
        db.query(ResponseEvent).filter(ResponseEvent.incident_id == incident_id).delete()
        db.delete(old)
        db.flush()

    incident = Incident(
        id=incident_id,
        incident_type="road_accident",
        description="Major road accident near Connaught Place. Three people injured. One person appears unconscious. Vehicle overturned blocking two lanes.",
        location="Connaught Place, New Delhi",
        latitude=28.6315,
        longitude=77.2167,
        affected_people=3,
        status="reported",
        reporter_name="Demo Reporter",
    )
    db.add(incident)

    db.add(ResponseEvent(
        id=f"EVT-DEMO-{uuid.uuid4().hex[:6].upper()}",
        incident_id=incident_id,
        event_type="reported",
        description="DEMO: Incident reported via ResQNet portal",
        timestamp=datetime.utcnow(),
    ))

    db.commit()

    # Run the full pipeline
    result = await run_full_pipeline(incident_id, db)

    return {
        "incident_id": incident_id,
        "message": "Demo emergency created and coordinated.",
        "result": result,
    }
