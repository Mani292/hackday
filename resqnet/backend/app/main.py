"""
ResQNet Backend — FastAPI Application Entry Point
"""
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database.db import engine, SessionLocal, Base

# Import all models so SQLAlchemy knows about them before create_all
from app.models import incident, resource, hospital, assignment, response_event  # noqa: F401

from app.api.incidents import router as incidents_router
from app.api.other_routers import (
    resources_router,
    hospitals_router,
    dashboard_router,
    analytics_router,
    assistant_router,
    demo_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Seed demo data
    if os.getenv("SEED_DB", "true").lower() == "true":
        db = SessionLocal()
        try:
            from app.database.seed import seed_database
            seed_database(db)
        finally:
            db.close()

    yield


app = FastAPI(
    title="ResQNet API",
    description="AI-Powered Multi-Agent Emergency Response Coordination Network",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow local dev and deployment hosts
allowed_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:4173",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins.split(',') if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(incidents_router)
app.include_router(resources_router)
app.include_router(hospitals_router)
app.include_router(dashboard_router)
app.include_router(analytics_router)
app.include_router(assistant_router)
app.include_router(demo_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "ResQNet API", "version": "1.0.0"}


@app.get("/")
def root():
    return {"message": "ResQNet API is running. Visit /docs for Swagger UI."}
