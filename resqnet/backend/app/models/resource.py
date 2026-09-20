from sqlalchemy import Column, String, Float, Text
from app.database.db import Base


class ResourceType(str):
    AMBULANCE = "ambulance"
    FIRE_UNIT = "fire_unit"
    RESCUE_TEAM = "rescue_team"
    POLICE = "police"


class ResourceStatus(str):
    AVAILABLE = "available"
    DISPATCHED = "dispatched"
    EN_ROUTE = "en_route"
    BUSY = "busy"
    OFFLINE = "offline"


class Resource(Base):
    __tablename__ = "resources"

    id = Column(String, primary_key=True, index=True)
    resource_type = Column(String, nullable=False)   # ambulance, fire_unit, rescue_team, police
    name = Column(String, nullable=False)
    status = Column(String, default="available")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capabilities = Column(Text, nullable=True)       # JSON string
    assigned_incident_id = Column(String, nullable=True)
