from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Enum as SAEnum
from sqlalchemy.sql import func
import enum
from app.database.db import Base


class IncidentType(str, enum.Enum):
    ROAD_ACCIDENT = "road_accident"
    MEDICAL_EMERGENCY = "medical_emergency"
    FIRE = "fire"
    NATURAL_DISASTER = "natural_disaster"
    OTHER = "other"


class SeverityLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentStatus(str, enum.Enum):
    REPORTED = "reported"
    ANALYZING = "analyzing"
    RESOURCES_MATCHED = "resources_matched"
    DISPATCHED = "dispatched"
    EN_ROUTE = "en_route"
    ARRIVED = "arrived"
    RESOLVED = "resolved"


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, index=True)
    incident_type = Column(String, nullable=True)
    description = Column(Text, nullable=False)
    severity = Column(String, nullable=True)
    location = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    affected_people = Column(Integer, default=1)
    status = Column(String, default=IncidentStatus.REPORTED)
    reporter_name = Column(String, nullable=True)
    reporter_phone = Column(String, nullable=True)
    ai_summary = Column(Text, nullable=True)
    required_resources = Column(Text, nullable=True)  # JSON string
    coordination_plan = Column(Text, nullable=True)    # JSON string
    assigned_ambulance_id = Column(String, nullable=True)
    assigned_hospital_id = Column(String, nullable=True)
    estimated_eta = Column(Integer, nullable=True)     # minutes
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
