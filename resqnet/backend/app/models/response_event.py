from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.sql import func
from app.database.db import Base


class ResponseEvent(Base):
    __tablename__ = "response_events"

    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, nullable=False, index=True)
    event_type = Column(String, nullable=False)  # reported, analyzed, resource_matched, dispatched, etc.
    description = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
