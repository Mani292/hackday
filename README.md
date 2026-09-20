# AegisFlow

AegisFlow is an AI-powered emergency coordination and resource intelligence platform designed for command centers managing multiple simultaneous incidents under constrained resources. It analyzes incidents, identifies conflicts, evaluates hospital and route pressure, and simulates coordinated response plans with human approval.

## Problem

Emergency response systems often operate in separate silos. A road accident, building fire, or cardiac emergency can overwhelm local responders, hospital capacity, and route planning when several incidents happen at once. Traditional nearest-resource logic cannot capture network-wide tradeoffs.

## Solution

AegisFlow brings together an incident intelligence agent, resource matcher, hospital evaluator, routing model, network optimizer, and risk analysis. The platform recommends a coordinated plan, highlights conflicts, and supports operator approval before dispatch.

## Why existing systems are fragmented

Most tools optimize a single emergency in isolation. They often fail to account for:

- simultaneous incidents competing for the same teams and ambulances
- hospital saturation and trauma-capable capacity constraints
- rising traffic congestion and route degradation
- cascading effects across the network
- the need for reserve capacity and human review

## Core innovation

The platform evaluates the full emergency network. Instead of asking, “Who is closest?”, it asks: “If I assign this resource here, what happens to the rest of the system?”

## Features

- Incident creation and AI classification
- Resource matching and prioritization
- Hospital capacity recommendation
- Route and ETA simulation
- Network optimization and conflict detection
- Cascading risk analysis
- Human approval workflow
- Demo emergency escalation simulation
- Live dashboard and analytics

## Multi-agent architecture

- Incident Agent
- Resource Agent
- Hospital Agent
- Routing Agent
- Optimization Agent
- Risk Agent
- Coordination Agent
- Orchestrator

## Network optimization

The optimizer checks all active incidents together to account for resource shortages, hospital pressure, and route conflicts. It creates a coordinated plan that preserves emergency reserve capacity when needed.

## Cascading risk analysis

The system models how a single event—such as a blocked route or overloaded hospital—affects multiple incidents, increasing delay and reducing available options across the network.

## What-if simulation

A built-in escalation simulator creates realistic high-impact scenarios such as building collapse or mass casualty events and measures the resulting resource, route, hospital, and conflict impact.

## Human-in-the-loop

Every major recommendation is presented as AI-generated guidance requiring operator approval. The command center remains responsible for final decisions.

## Tech stack

- Frontend: React + Vite + TypeScript + Tailwind CSS + Leaflet + Recharts
- Backend: FastAPI + SQLAlchemy + Pydantic
- Database: SQLite
- AI: configurable LLM provider with deterministic fallback
- Maps: OpenStreetMap + Leaflet

## Architecture diagram

```text
Client UI -> FastAPI API -> Orchestrator -> Incident / Resource / Hospital / Routing / Optimization / Risk Agents -> SQLite
```

## Database schema

Core tables include incidents, resources, hospitals, assignments, response_events, response_plans, and conflicts.

## Installation

```bash
cd resqnet/backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

```bash
cd ../frontend
npm install
```

## Environment variables

Copy the backend example file and adjust it if needed:

```bash
cp backend/.env.example backend/.env
```

Available settings:

- AI_PROVIDER=google
- AI_API_KEY=
- AI_MODEL=gemini-1.5-flash
- SEED_DB=true

## Running locally

Backend:

```bash
cd resqnet/backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd resqnet/frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

## Demo instructions

1. Open the dashboard.
2. Review active incidents and live resource status.
3. Click Simulate Emergency.
4. Watch the AI pipeline analyze the new incident.
5. Review resource conflict and hospital warnings.
6. Approve the recommended response plan.
7. Refresh the command center to see the updated state.

## Screenshots

Add screenshots to the project as needed for demo use.

## Future scalability

These are future integrations, not existing ones:

- government emergency systems
- ambulance GPS feeds
- hospital management systems
- traffic APIs
- IoT sensors
- emergency call center integrations
- GIS infrastructure
- SMS/WhatsApp notifications
- drone and satellite feeds

## Notes

This is a demo-grade, synthetic emergency coordination platform for hackathon evaluation and operator training. It is not a real-world emergency dispatch system and should not be relied on for live emergency decisions without human oversight.
