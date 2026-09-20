"""
Incident Analysis Agent

Classifies incident type, determines severity, extracts key information,
and recommends required resources.

Falls back to a deterministic rule-based engine if no LLM API key is set.
"""
import json
import os
import re
from typing import Any

# ---------------------------------------------------------------------------
# LLM client (optional)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Deterministic fallback
# ---------------------------------------------------------------------------

FIRE_KEYWORDS = ["fire", "flame", "burning", "smoke", "blaze", "explosion", "arson"]
MEDICAL_KEYWORDS = ["heart", "cardiac", "stroke", "unconscious", "collapsed", "breathing", "chest pain", "cpr", "seizure", "fainted", "overdose"]
ACCIDENT_KEYWORDS = ["accident", "collision", "crash", "vehicle", "car", "truck", "motorcycle", "hit"]
DISASTER_KEYWORDS = ["flood", "earthquake", "landslide", "tsunami", "storm", "hurricane", "tornado", "cyclone"]

CRITICAL_KEYWORDS = ["unconscious", "critical", "not breathing", "no pulse", "trapped", "cpr", "cardiac arrest", "major", "multiple", "life-threatening"]
HIGH_KEYWORDS = ["injured", "serious", "severe", "urgent", "broken", "bleeding heavily", "collapsed", "fire", "burning", "crash"]
MEDIUM_KEYWORDS = ["pain", "hurt", "minor injury", "accident", "collision", "smoke"]

def _deterministic_analysis(description: str, incident_type_hint: str | None) -> dict[str, Any]:
    desc_lower = description.lower()

    # Incident type
    if incident_type_hint:
        incident_type = incident_type_hint
    elif any(k in desc_lower for k in FIRE_KEYWORDS):
        incident_type = "fire"
    elif any(k in desc_lower for k in MEDICAL_KEYWORDS):
        incident_type = "medical_emergency"
    elif any(k in desc_lower for k in ACCIDENT_KEYWORDS):
        incident_type = "road_accident"
    elif any(k in desc_lower for k in DISASTER_KEYWORDS):
        incident_type = "natural_disaster"
    else:
        incident_type = "other"

    # Severity
    if any(k in desc_lower for k in CRITICAL_KEYWORDS):
        severity = "critical"
    elif any(k in desc_lower for k in HIGH_KEYWORDS):
        severity = "high"
    elif any(k in desc_lower for k in MEDIUM_KEYWORDS):
        severity = "medium"
    else:
        severity = "low"

    # Affected people — look for numbers
    affected_people = 1
    numbers = re.findall(r'\b(\d+)\b', desc_lower)
    for n in numbers:
        num = int(n)
        if 1 <= num <= 100:
            affected_people = max(affected_people, num)

    # Required resources
    required_resources = []
    if incident_type in ("road_accident", "medical_emergency", "natural_disaster"):
        required_resources.append("ambulance")
    if incident_type == "fire":
        required_resources.extend(["fire_unit", "ambulance"])
    if incident_type in ("road_accident", "natural_disaster") or severity in ("critical", "high"):
        required_resources.append("rescue_team")
    if incident_type in ("road_accident", "fire") or severity in ("critical", "high"):
        required_resources.append("police")
    if severity == "critical":
        required_resources.append("trauma_hospital")
    else:
        required_resources.append("general_hospital")

    # Deduplicate
    required_resources = list(dict.fromkeys(required_resources))

    # Summary
    severity_str = severity.upper()
    summary = (
        f"{severity_str} {incident_type.replace('_', ' ')} incident. "
        f"Approximately {affected_people} person(s) affected. "
        f"Recommended resources: {', '.join(required_resources)}. "
        "This is an AI-generated recommendation. Human operator approval required before dispatch."
    )

    return {
        "incident_type": incident_type,
        "severity": severity,
        "affected_people": affected_people,
        "required_resources": required_resources,
        "ai_summary": summary,
        "analysis_method": "deterministic_fallback",
    }


# ---------------------------------------------------------------------------
# LLM-powered analysis
# ---------------------------------------------------------------------------

ANALYSIS_PROMPT = """You are ResQNet's Incident Analysis Agent — an AI-assisted emergency coordination decision-support system.

Analyze the following emergency incident and respond ONLY with a valid JSON object. Do not include any markdown, code fences, or extra text.

Incident Description: {description}
Location: {location}
Reported Incident Type: {incident_type_hint}
Number of People Reported Affected: {affected_people}

Respond with exactly this JSON structure:
{{
  "incident_type": "<road_accident|medical_emergency|fire|natural_disaster|other>",
  "severity": "<low|medium|high|critical>",
  "affected_people": <integer>,
  "required_resources": ["<resource_type>", ...],
  "ai_summary": "<2-3 sentence human-readable summary of the incident and recommended actions>",
  "key_concerns": ["<concern>", ...],
  "analysis_method": "llm"
}}

Valid resource types: ambulance, fire_unit, rescue_team, police, trauma_hospital, general_hospital

Rules:
- severity CRITICAL = immediate life threat, unconscious victims, or 5+ people severely affected
- severity HIGH = serious injuries, active fire, vehicle accident with injuries
- severity MEDIUM = minor injuries, non-life-threatening situations
- severity LOW = property damage, no injuries, hazard with no victims
- Always include "ambulance" for medical_emergency and road_accident
- Always include "fire_unit" for fire
- For CRITICAL severity, include "trauma_hospital" instead of "general_hospital"
- ai_summary must be factual, not alarmist, and note it is an AI-generated recommendation
"""


async def analyze_incident(
    description: str,
    location: str,
    incident_type_hint: str | None = None,
    affected_people: int = 1,
) -> dict[str, Any]:
    """
    Main entry point. Tries LLM first, falls back to deterministic engine.
    Returns a dict with: incident_type, severity, affected_people,
    required_resources (list), ai_summary, analysis_method.
    """
    client = _get_llm_client()

    if client:
        try:
            prompt = ANALYSIS_PROMPT.format(
                description=description,
                location=location,
                incident_type_hint=incident_type_hint or "unknown",
                affected_people=affected_people,
            )
            response = client.generate_content(prompt)
            raw = response.text.strip()
            # Strip markdown fences if present
            raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()
            result = json.loads(raw)
            # Ensure analysis_method is set
            result.setdefault("analysis_method", "llm")
            return result
        except Exception as e:
            print(f"[IncidentAgent] LLM failed, falling back to deterministic: {e}")

    return _deterministic_analysis(description, incident_type_hint)
