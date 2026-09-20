from sqlalchemy import Column, String, Float, Integer, Boolean
from app.database.db import Base


class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity = Column(Integer, default=100)
    available_capacity = Column(Integer, default=50)
    trauma_capable = Column(Boolean, default=False)
    icu_available = Column(Boolean, default=False)
    emergency_dept = Column(Boolean, default=True)
    status = Column(String, default="operational")   # operational, limited, full
