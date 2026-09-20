from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.database.db import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, nullable=False, index=True)
    resource_id = Column(String, nullable=True)
    hospital_id = Column(String, nullable=True)
    assignment_type = Column(String, nullable=False)  # ambulance, fire_unit, hospital, rescue_team
    status = Column(String, default="assigned")       # assigned, en_route, arrived, completed
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
