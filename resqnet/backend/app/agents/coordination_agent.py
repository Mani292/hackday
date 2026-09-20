"""
Coordination Agent

Aggregates outputs from all other agents and produces a unified,
human-readable coordination plan with numbered action steps.
Optionally uses LLM for final narrative summary.
"""
import json
import os
import re
from typing import Any


def _get_llm_client():
    api_key = os.getenv("AI_API_KEY", "")
    if not api_key or api_key == "your_gemini_api_key_here":
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model_name = os.getenv("AI_MODEL", "gemini-1.5-flash")
        return genai.GenerativeModel(model_name)
    except Exception:
        return None


COORDINATION_PROMPT = """You are ResQNet's Coordination Agent.

You have received the following analysis from specialized emergency response agents.
Produce a concise, numbered coordination plan for the human operator.

Incident: {incident_description}
Severity: {severity}
Location: {location}

AI Incident Analysis:
{incident_analysis}

Matched Resources:
{matched_resources}

Recommended Hospital:
{hospital}

Route Information:
{route}

Produce exactly this JSON structure:
{{
  "actions": [
    "1. <action>",
    "2. <action>",
    ...
  ],
  "narrative": "<2-3 sentence summary of the coordinated response plan>",
  "priority_level": "<immediate|urgent|standard>",
  "estimated_scene_arrival_min": <integer>,
  "coordination_method": "llm"
}}

Keep actions clear, numbered, and actionable by a human dispatcher.
"""


def _deterministic_plan(
    incident_analysis: dict,
    resource_result: dict,
    hospital_result: dict,
    route_result: dict,
    incident_description: str,
    location: str,
) -> dict[str, Any]:
    severity = incident_analysis.get("severity", "medium")
    incident_type = incident_analysis.get("incident_type", "other")

    actions = []
    step = 1

    # Ambulance
    primary_amb = resource_result.get("primary_ambulance")
    if primary_amb:
        actions.append(f"{step}. Dispatch {primary_amb['name']} to scene (ETA ~{primary_amb['estimated_travel_min']} min)")
        step += 1

    # Other resources
    matched = resource_result.get("matched_resources", {})
    for rtype, resources in matched.items():
        if rtype == "ambulance":
            continue
        if resources:
            r = resources[0]
            actions.append(f"{step}. Dispatch {r['name']} to incident scene")
            step += 1

    # Hospital
    primary_hosp = hospital_result.get("primary_hospital")
    if primary_hosp:
        actions.append(f"{step}. Notify {primary_hosp['name']} — prepare emergency bay")
        step += 1

    # Route
    primary_route = route_result.get("primary_route", {})
    if primary_route:
        traffic = primary_route.get("traffic", "moderate")
        route_name = primary_route.get("name", "recommended route")
        if traffic == "heavy":
            alt_route = route_result.get("alternative_route", {})
            actions.append(f"{step}. TRAFFIC ALERT: Use alternative route — {alt_route.get('name', 'alt route')} (saves time)")
        else:
            actions.append(f"{step}. Use recommended route: {route_name}")
        step += 1

    # Special instructions by type
    if incident_type == "fire":
        actions.append(f"{step}. Establish safety perimeter — evacuate 50m radius")
        step += 1
    elif incident_type == "road_accident":
        actions.append(f"{step}. Police to secure accident site and manage traffic flow")
        step += 1
    elif incident_type == "medical_emergency":
        actions.append(f"{step}. Ensure CPR-capable personnel on site until ambulance arrives")
        step += 1

    # Priority level
    priority = "immediate" if severity == "critical" else "urgent" if severity == "high" else "standard"

    # ETA
    eta = primary_route.get("eta_minutes", 10)

    # Narrative
    hosp_name = primary_hosp["name"] if primary_hosp else "nearest hospital"
    amb_name = primary_amb["name"] if primary_amb else "available ambulance"
    narrative = (
        f"Coordinated {severity.upper()} response initiated for {incident_type.replace('_', ' ')} at {location}. "
        f"{amb_name} dispatched with estimated scene arrival in {eta} minutes. "
        f"{hosp_name} has been notified and is preparing to receive patient(s). "
        "Awaiting human operator confirmation before final dispatch."
    )

    return {
        "actions": actions,
        "narrative": narrative,
        "priority_level": priority,
        "estimated_scene_arrival_min": eta,
        "coordination_method": "deterministic_fallback",
    }


async def coordinate(
    incident_analysis: dict,
    resource_result: dict,
    hospital_result: dict,
    route_result: dict,
    incident_description: str,
    location: str,
    severity: str,
) -> dict[str, Any]:
    """
    Produce a final coordination plan by aggregating all agent outputs.
    """
    client = _get_llm_client()

    if client:
        try:
            prompt = COORDINATION_PROMPT.format(
                incident_description=incident_description,
                severity=severity,
                location=location,
                incident_analysis=json.dumps(incident_analysis, indent=2),
                matched_resources=json.dumps(resource_result, indent=2),
                hospital=json.dumps(hospital_result.get("primary_hospital"), indent=2),
                route=json.dumps(route_result.get("primary_route"), indent=2),
            )
            response = client.generate_content(prompt)
            raw = response.text.strip()
            raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()
            result = json.loads(raw)
            result.setdefault("coordination_method", "llm")
            return result
        except Exception as e:
            print(f"[CoordinationAgent] LLM failed, falling back: {e}")

    return _deterministic_plan(
        incident_analysis, resource_result, hospital_result, route_result,
        incident_description, location
    )
