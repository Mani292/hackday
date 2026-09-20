"""
Incidents API Router
"""
import json
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.incident import Incident
from app.models.response_event import ResponseEvent
from app.models.resource import Resource
from app.models.hospital import Hospital
from app.agents import routing_agent
from app.services.orchestrator import run_full_pipeline

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class IncidentCreate(BaseModel):
    incident_type: Optional[str] = None
    description: str = Field(..., min_length=10)
    location: str = Field(..., min_length=3)
    latitude: float
    longitude: float
    affected_people: int = Field(default=1, ge=0)
    reporter_name: Optional[str] = None
    reporter_phone: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str


# ---------------------------------------------------------------------------
# ID generator
# ---------------------------------------------------------------------------

def _make_id() -> str:
    year = datetime.now().year
    num = str(uuid.uuid4().int)[:5].zfill(5)
    return f"RSQ-{year}-{num}"


def _incident_to_dict(inc: Incident, db: Session) -> dict:
    result = {
        "id": inc.id,
        "incident_type": inc.incident_type,
        "description": inc.description,
        "severity": inc.severity,
        "location": inc.location,
        "latitude": inc.latitude,
        "longitude": inc.longitude,
        "affected_people": inc.affected_people,
        "status": inc.status,
        "reporter_name": inc.reporter_name,
        "reporter_phone": inc.reporter_phone,
        "ai_summary": inc.ai_summary,
        "required_resources": json.loads(inc.required_resources) if inc.required_resources else [],
        "coordination_plan": json.loads(inc.coordination_plan) if inc.coordination_plan else None,
        "assigned_ambulance_id": inc.assigned_ambulance_id,
        "assigned_hospital_id": inc.assigned_hospital_id,
        "estimated_eta": inc.estimated_eta,
        "created_at": inc.created_at.isoformat() if inc.created_at else None,
        "updated_at": inc.updated_at.isoformat() if inc.updated_at else None,
    }

    # Enrich with assigned ambulance details
    if inc.assigned_ambulance_id:
        amb = db.query(Resource).filter(Resource.id == inc.assigned_ambulance_id).first()
        if amb:
            result["assigned_ambulance"] = {
                "id": amb.id,
                "name": amb.name,
                "status": amb.status,
                "latitude": amb.latitude,
                "longitude": amb.longitude,
            }

    # Enrich with assigned hospital details
    if inc.assigned_hospital_id:
        hosp = db.query(Hospital).filter(Hospital.id == inc.assigned_hospital_id).first()
        if hosp:
            result["assigned_hospital"] = {
                "id": hosp.id,
                "name": hosp.name,
                "latitude": hosp.latitude,
                "longitude": hosp.longitude,
                "trauma_capable": hosp.trauma_capable,
            }

    return result


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", status_code=201)
async def create_incident(
    payload: IncidentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    incident_id = _make_id()
    incident = Incident(
        id=incident_id,
        incident_type=payload.incident_type,
        description=payload.description,
        location=payload.location,
        latitude=payload.latitude,
        longitude=payload.longitude,
        affected_people=payload.affected_people,
        reporter_name=payload.reporter_name,
        reporter_phone=payload.reporter_phone,
        status="reported",
    )
    db.add(incident)

    # Initial timeline event
    db.add(ResponseEvent(
        id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
        incident_id=incident_id,
        event_type="reported",
        description="Incident reported via ResQNet portal",
        timestamp=datetime.utcnow(),
    ))

    db.commit()

    # Auto-trigger analysis in background
    background_tasks.add_task(run_full_pipeline, incident_id, db)

    return {"id": incident_id, "status": "reported", "message": "Incident created. AI analysis starting."}


@router.get("")
def list_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    if severity:
        query = query.filter(Incident.severity == severity)
    incidents = query.order_by(Incident.created_at.desc()).all()
    return [_incident_to_dict(inc, db) for inc in incidents]


@router.get("/{incident_id}")
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return _incident_to_dict(inc, db)


@router.patch("/{incident_id}/status")
def update_status(
    incident_id: str,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
):
    valid_statuses = ["reported", "analyzing", "resources_matched", "dispatched", "en_route", "arrived", "resolved"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {valid_statuses}")

    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    inc.status = payload.status
    inc.updated_at = datetime.utcnow()

    # Add timeline event
    status_messages = {
        "en_route": "Emergency units confirmed en route to scene",
        "arrived": "Emergency units arrived on scene",
        "resolved": "Incident resolved. Units returning to base.",
    }
    if payload.status in status_messages:
        db.add(ResponseEvent(
            id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
            incident_id=incident_id,
            event_type=payload.status,
            description=status_messages[payload.status],
            timestamp=datetime.utcnow(),
        ))

    db.commit()
    return {"id": incident_id, "status": payload.status}


@router.post("/{incident_id}/analyze")
async def analyze_incident_endpoint(incident_id: str, db: Session = Depends(get_db)):
    """Trigger AI analysis only (no dispatch)."""
    from app.agents import incident_agent
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    analysis = await incident_agent.analyze_incident(
        description=inc.description,
        location=inc.location,
        incident_type_hint=inc.incident_type,
        affected_people=inc.affected_people or 1,
    )

    inc.incident_type = analysis["incident_type"]
    inc.severity = analysis["severity"]
    inc.affected_people = analysis["affected_people"]
    inc.ai_summary = analysis["ai_summary"]
    inc.required_resources = json.dumps(analysis["required_resources"])
    if inc.status == "reported":
        inc.status = "analyzing"
    db.commit()

    return analysis


@router.post("/{incident_id}/coordinate")
async def coordinate_incident(incident_id: str, db: Session = Depends(get_db)):
    """Run the full 5-agent coordination pipeline."""
    try:
        result = await run_full_pipeline(incident_id, db)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Coordination failed: {str(e)}")


@router.get("/{incident_id}/routes")
def get_routes(incident_id: str, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    amb = None
    if inc.assigned_ambulance_id:
        amb = db.query(Resource).filter(Resource.id == inc.assigned_ambulance_id).first()

    hosp = None
    if inc.assigned_hospital_id:
        hosp = db.query(Hospital).filter(Hospital.id == inc.assigned_hospital_id).first()

    if not amb or not hosp:
        # Default: route from city centre to nearest hospital
        return routing_agent.calculate_routes(
            origin_lat=3.1478, origin_lon=101.6953,
            dest_lat=3.1466, dest_lon=101.6956,
            incident_lat=inc.latitude,
            incident_lon=inc.longitude,
        )

    return routing_agent.calculate_routes(
        origin_lat=amb.latitude,
        origin_lon=amb.longitude,
        dest_lat=hosp.latitude,
        dest_lon=hosp.longitude,
        incident_lat=inc.latitude,
        incident_lon=inc.longitude,
    )


@router.get("/{incident_id}/timeline")
def get_timeline(incident_id: str, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    events = (
        db.query(ResponseEvent)
        .filter(ResponseEvent.incident_id == incident_id)
        .order_by(ResponseEvent.timestamp.asc())
        .all()
    )

    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "description": e.description,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
        }
        for e in events
    ]
