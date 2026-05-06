from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import re

router = APIRouter()


# ─────────────────────────────────────────────
# Request Model
# ─────────────────────────────────────────────

class SummarizeRequest(BaseModel):
    full_text: str
    filename: Optional[str] = "document"


# ─────────────────────────────────────────────
# Utils
# ─────────────────────────────────────────────

def clean(text: str) -> str:
    return re.sub(r'\s+', ' ', text).strip()


def split_sentences(text: str) -> List[str]:
    raw = re.split(r'(?<=[.!?])\s+', clean(text))
    return [s.strip() for s in raw if len(s.strip()) > 25]


# ─────────────────────────────────────────────
# Simplify Legal Language
# ─────────────────────────────────────────────

_JARGON = [
    (r'\bpetitioner\b', 'the applicant'),
    (r'\brespondent\b', 'the other party'),
    (r'\bwrit petition\b', 'petition'),
    (r'\bherein\b', ''),
    (r'\bwhereas\b', ''),
]

def simplify(text: str) -> str:
    for pattern, replacement in _JARGON:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return clean(text)


# ─────────────────────────────────────────────
# STRICT Direction Extraction
# ─────────────────────────────────────────────

def extract_directions(text: str) -> List[str]:
    sentences = split_sentences(text)
    directions = []

    for s in sentences:
        s_lower = s.lower()

        if not any(k in s_lower for k in [
            "directed to", "ordered to", "must", "required to", "shall"
        ]):
            continue

        if any(k in s_lower for k in [
            "observed", "held", "noted", "opinion",
            "considered as", "treated as"
        ]):
            continue

        s_clean = simplify(s)

        if len(s_clean) > 160:
            continue

        directions.append(s_clean)

    if not directions:
        return ["No administrative action required"]

    return directions[:5]


# ─────────────────────────────────────────────
# Case Type Detection
# ─────────────────────────────────────────────

def detect_case_type(text: str, directions: List[str]) -> str:
    lower = text.lower()

    if directions == ["No administrative action required"]:
        if any(k in lower for k in [
            "appeal dismissed", "petition dismissed", "writ dismissed"
        ]):
            return "Appeal Outcome"
        return "Informational"

    return "Compliance"


# ─────────────────────────────────────────────
# FINAL HUMAN SUMMARY
# ─────────────────────────────────────────────

def build_case_summary(text: str, case_type: str, directions: List[str]) -> str:
    sentences = split_sentences(text)

    intro = ""
    issue = ""
    decision = ""

    # INTRO (what case is about)
    for s in sentences[:10]:
        if any(k in s.lower() for k in ["dispute", "case", "appeal", "petition"]):
            intro = simplify(s)
            break

    # ISSUE (problem)
    for s in sentences:
        if any(k in s.lower() for k in ["issue", "whether", "demand", "dispute", "denied"]):
            issue = simplify(s)
            break

    # DECISION (final outcome)
    for s in reversed(sentences):
        if any(k in s.lower() for k in [
            "dismissed", "allowed", "held that", "ruled", "quashed"
        ]):
            decision = simplify(s)
            break

    # Fallbacks
    if not intro:
        intro = sentences[0]

    if not issue and len(sentences) > 1:
        issue = sentences[1]

    if not decision:
        decision = sentences[-1]

    # 🧠 Build natural story
    summary_parts = []

    summary_parts.append(
        f"This case is about {intro.lower().rstrip('.')}."
    )

    summary_parts.append(
        f"The main issue was that {issue.lower().rstrip('.')}."
    )

    summary_parts.append(
        f"The court examined the matter and concluded that {decision.lower().rstrip('.')}."
    )

    if case_type == "Compliance" and directions != ["No administrative action required"]:
        summary_parts.append(
            "The court also issued directions requiring action by the concerned authorities."
        )

    return "\n\n".join(summary_parts)


# ─────────────────────────────────────────────
# API Endpoint
# ─────────────────────────────────────────────

@router.post("/summarize")
async def summarize_judgment(request: SummarizeRequest):
    text = request.full_text.strip()

    if not text or len(text) < 50:
        return {
            "case_summary": "Insufficient text provided.",
            "court_directions": ["No administrative action required"],
            "case_type": "Informational",
            "summary_confidence": 0,
        }

    directions = extract_directions(text)
    case_type = detect_case_type(text, directions)
    case_summary = build_case_summary(text, case_type, directions)

    # Confidence scoring
    score = 50

    if directions != ["No administrative action required"]:
        score += 20

    if case_type != "Informational":
        score += 10

    if len(case_summary) > 120:
        score += 15

    score = min(score, 95)

    return {
        "case_summary": case_summary,
        "court_directions": directions,
        "case_type": case_type,
        "summary_confidence": score,
    }