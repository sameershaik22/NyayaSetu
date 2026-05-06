from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import re
from datetime import datetime, timedelta

router = APIRouter()

class ActionPlanRequest(BaseModel):
    case_title: str
    date: Optional[str] = ""
    parties: Optional[str] = ""
    directions: List[str] = []
    timeline: Optional[str] = ""
    confidence: Optional[int] = 70
    source_text: Optional[str] = ""
    case_type: Optional[str] = ""   # Compliance | Appeal Outcome | Informational


DEPARTMENT_KEYWORDS = {
    "Ministry of Home Affairs": ["home", "mha", "home affairs", "police", "security", "nia"],
    "Ministry of Finance": ["finance", "tax", "revenue", "gst", "customs", "income tax"],
    "Ministry of Law & Justice": ["law", "legal", "attorney", "advocate", "justice"],
    "Department of Personnel & Training": ["dopt", "personnel", "training", "rti", "information"],
    "Ministry of Health & Family Welfare": ["health", "hospital", "medical", "doctor", "medicine"],
    "Ministry of Education": ["education", "school", "college", "university", "student"],
    "Ministry of Environment": ["environment", "forest", "pollution", "ecology", "green"],
    "Central Public Information Officer": ["cpio", "information officer", "transparency"],
    "District Administration": ["district", "collector", "tehsildar", "block", "gram"],
    "State Government": ["state", "chief minister", "governor", "vidhan"],
    "Municipal Corporation": ["municipal", "corporation", "civic", "urban local body"],
    "Ministry of Railways": ["railway", "train", "station", "track"],
    "Ministry of Road Transport": ["road", "highway", "nhai", "transport"],
}

ACTION_KEYWORDS = {
    "Consider Appeal": ["petition dismissed", "challenge", "appeal", "challenged", "disputed", "contest", "aggrieved", "set aside", "quash"],
    "Compliance": ["directed to", "comply", "compliance", "ordered", "shall", "must", "implement", "submit", "provide", "conduct", "directed"],
    "Contempt Response": ["contempt", "non-compliance", "willful", "defiance"],
}

PRIORITY_RULES = {
    "High": ["penalty", "contempt", "urgent", "immediate", "forthwith", "emergency", "critical", "30 days", "15 days", "fine", "must", "shall immediately"],
    "Medium": ["45 days", "60 days", "three months", "directed", "shall", "compliance", "submit report"],
    "Low": ["review", "consider", "may", "suggest", "recommend", "optional", "if possible"],
}


def infer_action_type_and_justification(directions: List[str], parties: str) -> tuple[str, str, int]:
    """Determine action type, provide AI reasoning, and a base confidence."""
    combined = " ".join(directions).lower() + " " + parties.lower()
    
    appeal_score = sum(1 for kw in ACTION_KEYWORDS["Consider Appeal"] if kw in combined)
    compliance_score = sum(1 for kw in ACTION_KEYWORDS["Compliance"] if kw in combined)
    contempt_score = sum(1 for kw in ACTION_KEYWORDS["Contempt Response"] if kw in combined)
    
    justification = []
    action_type = "Compliance"
    conf_boost = 0
    
    if contempt_score > 0:
        action_type = "Contempt Response"
        justification.append("Detected terms indicating contempt proceedings or non-compliance.")
        conf_boost = 20
    elif appeal_score > compliance_score:
        action_type = "Consider Appeal"
        justification.append("Detected language suggesting the petition was dismissed or the order is adverse, warranting an appeal review.")
        conf_boost = 15
    elif compliance_score > 0:
        action_type = "Compliance"
        justification.append(f"Found strong directive keywords ('shall', 'directed to', 'must') implying mandatory execution.")
        conf_boost = 20
    else:
        action_type = "Compliance"
        justification.append("No explicit action keywords found. Defaulting to standard compliance review.")
        conf_boost = -10
        
    return action_type, " ".join(justification), conf_boost


def infer_department(directions: List[str], parties: str, case_title: str) -> str:
    """Infer the responsible department from text."""
    combined = " ".join(directions).lower() + " " + parties.lower() + " " + case_title.lower()
    
    scores = {}
    for dept, keywords in DEPARTMENT_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in combined)
        if score > 0:
            scores[dept] = score
    
    if scores:
        return max(scores, key=scores.get)
    
    return "Concerned Government Department"


def infer_priority(directions: List[str], timeline: str) -> str:
    """Determine priority level."""
    combined = " ".join(directions).lower() + " " + timeline.lower()
    
    for priority, keywords in PRIORITY_RULES.items():
        if any(kw in combined for kw in keywords):
            return priority
    
    return "Medium"


def generate_action_text(action_type: str, directions: List[str], department: str) -> str:
    """Generate a clear, actionable task description."""
    if not directions:
        return f"Ensure compliance with court order and submit report to {department}"
    
    if action_type == "Compliance":
        primary = directions[0] if directions else "Comply with court directives"
        return f"Implement court-ordered compliance: {primary[:200]}"
    
    elif action_type == "Consider Appeal":
        return f"File an appeal/review petition challenging the court order; coordinate with legal counsel"
    
    elif action_type == "Contempt Response":
        return f"Respond to contempt allegations and ensure immediate compliance with all court directions"
    
    return f"Review and act upon court order as directed; ensure timely submission of compliance report"


def parse_deadline(timeline: str, date_str: str) -> str:
    """Parse deadline from timeline string."""
    day_match = re.search(r'(\d+)\s+days?', timeline, re.IGNORECASE)
    week_match = re.search(r'(\d+)\s+weeks?', timeline, re.IGNORECASE)
    month_match = re.search(r'(\d+)\s+months?', timeline, re.IGNORECASE)
    
    base_date = datetime.now()
    date_patterns = [
        r'(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})',
        r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})',
        r'(\d{4})-(\d{2})-(\d{2})'
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, date_str, re.IGNORECASE)
        if match:
            try:
                groups = match.groups()
                if len(groups) == 3:
                    if len(groups[0]) == 4: # YYYY-MM-DD
                        parsed = datetime.strptime(f"{groups[0]}-{groups[1]}-{groups[2]}", "%Y-%m-%d")
                    else:
                        parsed = datetime.strptime(f"{groups[0]} {groups[1][:3]} {groups[2]}", "%d %b %Y")
                    base_date = parsed
                    break
            except:
                pass
    
    if day_match:
        days = int(day_match.group(1))
        deadline = base_date + timedelta(days=days)
        return deadline.strftime("%Y-%m-%d")
    elif week_match:
        weeks = int(week_match.group(1))
        deadline = base_date + timedelta(weeks=weeks)
        return deadline.strftime("%Y-%m-%d")
    elif month_match:
        months = int(month_match.group(1))
        deadline = base_date + timedelta(days=months * 30)
        return deadline.strftime("%Y-%m-%d")
    
    for pattern in date_patterns:
        match = re.search(pattern, timeline, re.IGNORECASE)
        if match:
             groups = match.groups()
             if len(groups) == 3:
                  if len(groups[0]) == 4:
                       return f"{groups[0]}-{groups[1]}-{groups[2]}"
                  return f"{groups[2]}-{groups[1]}-{groups[0]}" # naive standardization
             return match.group(0)
    
    return "As per court order"


@router.post("/generate-action-plan")
async def generate_action_plan(request: ActionPlanRequest):
    """
    Generate structured action plan from extracted case data.
    Handles Informational / Appeal Outcome / Compliance cases differently.
    """
    # ── Safe path: Informational / no directions ──────────────────────────
    no_action = (
        not request.directions
        or request.directions == ["No direct compliance required"]
        or (request.case_type or "").lower() in ("informational", "appeal outcome")
    )

    if no_action:
        action_type = request.case_type or "Informational"
        justification = (
            "This judgment is interpretive in nature and does not contain actionable directives. "
            "No government department is required to execute any specific order."
            if action_type == "Informational" else
            "The petition was dismissed. Coordinate with legal counsel to evaluate appeal options."
        )
        return {
            "type": action_type,
            "action": "No administrative action required",
            "department": "Not Applicable",
            "deadline": "Not Applicable",
            "priority": "Low",
            "confidence": 70,
            "justification": justification,
            "source_text": request.source_text or "",
            "sub_actions": [],
            "legal_basis": f"Court Order dated {request.date}" if request.date else "As per judgment",
        }

    # ── Compliance path: real directives found ──────────────────────────────
    
    action_type, justification, conf_boost = infer_action_type_and_justification(request.directions, request.parties)
    department = infer_department(request.directions, request.parties, request.case_title)
    priority = infer_priority(request.directions, request.timeline)
    action = generate_action_text(action_type, request.directions, department)
    deadline = parse_deadline(request.timeline, request.date)
    
    base_confidence = request.confidence or 50
    plan_confidence = base_confidence + conf_boost
    
    # Priority adjustments to confidence
    if priority == "High":
        justification += " Flagged as High Priority due to urgent timelines/penalties."
    
    # Cap confidence
    plan_confidence = max(30, min(95, plan_confidence))
    
    return {
        "type": action_type,
        "action": action,
        "department": department,
        "deadline": deadline,
        "priority": priority,
        "confidence": plan_confidence,
        "justification": justification,
        "source_text": request.source_text,
        "sub_actions": [
            {
                "step": i + 1,
                "task": direction[:200],
                "responsible": department,
                "status": "pending"
            }
            for i, direction in enumerate(request.directions[:5])
        ],
        "legal_basis": f"Court Order dated {request.date}" if request.date else "As per judgment",
    }
