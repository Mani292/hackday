# ResQNet Emergency Response AI

ResQNet Emergency Response AI is an AI-powered emergency response coordination platform built for live incident command and dispatch planning. It combines a FastAPI backend, React front end, and multi-agent routing logic to simulate real-world emergency coordination across incidents, hospitals, and field resources.

## Overview

The system helps a command center answer questions such as:

- Which incidents are most critical right now?
- Which ambulances or resources are available?
- Which hospital has the best capacity and trauma readiness?
- What is the fastest realistic response route?
- Where are the biggest dispatch conflicts or bottlenecks?

ResQNet Emergency Response AI is optimized for hackathon demos and operational concept validation, with a strong emphasis on a polished user experience and fast end-to-end workflow.

## Features

- AI incident analysis and severity classification
- Multi-agent emergency coordination workflow
- Resource matching and dispatch recommendations
- Hospital capacity and emergency readiness scoring
- Shortest-fastest route simulation with realistic road-like pathing
- Live dashboard and analytics views
- Incident timeline and status updates
- Emergency reporting flow
- Command AI chat assistant for response queries
- Demo emergency simulation workflow

## Tech stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, Leaflet, Recharts
- Backend: FastAPI, SQLAlchemy, Pydantic
- Database: SQLite
- AI layer: configurable Gemini / OpenAI-compatible provider flow
- Mapping: Mapbox + Leaflet base tiles

## Project structure

```text
resqnet/
├── backend/
│   ├── app/
│   ├── requirements.txt
│   ├── .env.example
│   └── ...
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
├── README.md
├── start_aegisflow.ps1
└── docker-compose.yml
```

## Local development setup

### 1) Backend

```bash
cd resqnet/backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt
```

### 2) Frontend

```bash
cd ../frontend
npm install
```

### 3) Environment variables

Create a backend env file if needed:

```bash
cp .env.example .env
```

Example values:

```env
AI_PROVIDER=google
AI_API_KEY=your_gemini_api_key_here
AI_MODEL=gemini-1.5-flash
APP_ENV=development
DEBUG=true
SEED_DB=true
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

For the frontend, set the API base if needed:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Run locally

Backend:

```bash
cd resqnet/backend
.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd resqnet/frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

Then open:

- http://localhost:5173
- API docs: http://localhost:8000/docs

## Demo flow

1. Open the dashboard.
2. Review active incidents and resource availability.
3. Click the emergency simulation button.
4. Watch the AI pipeline analyze the scenario.
5. Review route, resource, and hospital recommendations.
6. Update incident status and inspect the timeline.
7. Use the AI assistant to ask operational questions.

## Deployment

This project is prepared for a simple containerized deployment workflow.

### Docker Compose

From the project root:

```bash
docker compose up --build
```

This starts:

- backend on port 8000
- frontend on port 5173

### Production frontend build

```bash
cd resqnet/frontend
npm run build
```

The output goes to the `dist` folder and can be served by a static host or reverse proxy.

### Production backend notes

The FastAPI API is designed to run behind a proxy or platform service and uses `CORS_ORIGINS` for deployment host configuration.

## Notes

This is a demo-grade emergency coordination platform created for showcase and concept validation. It is not a production-grade emergency dispatch system for live 911 or field-critical operations without additional safety controls, data validation, and production network integration.

## License

This project is intended for hackathon/demo use and is distributed as a local prototype unless the repository owner specifies another license.
