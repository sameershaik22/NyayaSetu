from fastapi import APIRouter
from pydantic import BaseModel
import re
from typing import List, Optional
from datetime import datetime

router = APIRouter()

class ExtractRequest(BaseModel):
    full_text: str
    filename: Optional[str] = "unknown.pdf"


# -----------------------------
# CASE TITLE
# -----------------------------
def extract_case_title(text: str) -> str:
    patterns = [
        r'(?:WRIT PETITION|W\.P\.|CRL\.|CIVIL APPEAL|CRIMINAL APPEAL|SLP)[\s\S]{0,30}(?:NO|\.)\s*[\d/]+\s*(?:OF|of)\s*\d{4}',
        r'(?:IN THE MATTER OF|BETWEEN):\s*\n\s*([^\n]+)',
        r'(?:Petitioner|Appellant)[\s\S]{0,5}\n([^\n]+)',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            title = match.group(0).strip()
            if len(title) > 10:
                return title[:120]

    case_num = re.search(r'(?:W\.?P\.?|CRL|SLP|CA)[\s\.]*(?:NO\.?\s*)?(\d+\s*/\s*\d{4})', text, re.IGNORECASE)
    if case_num:
        return f"Case No. {case_num.group(1)}"

    return ""


# -----------------------------
# DATE
# -----------------------------
def extract_date(text: str) -> str:
    patterns = [
        r'Date\s*of\s*Order[:\s]+(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})',
        r'Dated[:\s]+(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})',
        r'(\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})',
        r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
        r'Date[:\s]+(\d{4}-\d{2}-\d{2})',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()

    return ""


# -----------------------------
# PARTIES
# -----------------------------
def extract_parties(text: str) -> str:
    petitioner = ""
    respondent = ""

    pet_patterns = [
        r'([^\n]+)\s+\.{3,}\s*Petitioner',
        r'([^\n]+)\s+\.{3,}\s*Appellant',
        r'Petitioner[:\s]+([^\n]+)',
    ]

    resp_patterns = [
        r'([^\n]+)\s+\.{3,}\s*Respondent',
        r'Respondent[:\s]+([^\n]+)',
        r'vs?\.\s*\n\s*([^\n]+)',
    ]

    for pattern in pet_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            petitioner = match.group(1).strip()[:80]
            break

    for pattern in resp_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            respondent = match.group(1).strip()[:80]
            break

    if petitioner and respondent:
        return f"Petitioner: {petitioner} | Respondent: {respondent}"
    elif petitioner:
        return f"Petitioner: {petitioner}"
    elif respondent:
        return f"Respondent: {respondent}"

    return ""


# -----------------------------
# 🔥 FIXED DIRECTIONS (IMPORTANT)
# -----------------------------
def extract_directions(text: str) -> tuple[List[str], str]:
    """Extract ONLY real enforceable court directions"""

    sentences = re.split(r'(?<=[.!?])\s+', text)
    directions = []
    source_text = ""

    for s in sentences:
        s_clean = s.strip()
        s_lower = s_clean.lower()

        # ✅ STRICT inclusion rules
        if any(kw in s_lower for kw in [
            "is directed to",
            "are directed to",
            "is hereby directed to",
            "shall provide",
            "shall submit",
            "shall pay",
            "must comply",
            "is ordered to"
        ]):

            # ❌ Remove reasoning lines
            if any(bad in s_lower for bad in [
                "court noted",
                "it is observed",
                "it is submitted",
                "learned counsel",
                "we are of the opinion",
                "background",
                "discussion",
                "issue in this case"
            ]):
                continue

            if s_clean not in directions:
                directions.append(s_clean)

                if not source_text:
                    source_text = s_clean

        if len(directions) >= 4:
            break

    # ✅ Fallback (important)
    if not directions:
        return ["No administrative action required"], ""

    return directions, source_text[:500]


# -----------------------------
# TIMELINE
# -----------------------------
def extract_timeline(text: str) -> str:
    patterns = [
        r'(?:within|by|before)\s+(\d+\s+(?:days?|weeks?|months?)(?:\s+from[^.]{0,50})?)',
        r'(?:deadline|timeline|by)\s*[:\-]?\s*([^\n.]{5,80})',
        r'(?:next date|next hearing)[:\s]+([^\n]{5,50})',
        r'compliance\s+(?:report)?\s*(?:by|before|on)\s+([^\n.]{5,60})',
    ]

    timelines = []
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches:
            t = m.strip()
            if len(t) > 3 and t not in timelines:
                timelines.append(t)

    if timelines:
        return " | ".join(timelines[:3])

    return ""


# -----------------------------
# MAIN API
# -----------------------------
@router.post("/extract-data")
async def extract_data(request: ExtractRequest):
    text = request.full_text

    case_title = extract_case_title(text)
    date = extract_date(text)
    parties = extract_parties(text)
    directions, source_text = extract_directions(text)
    timeline = extract_timeline(text)

    is_failed = not case_title and not directions

    if is_failed:
        return {
            "error": "Manual review required",
            "confidence": 30,
            "case_title": "Court Judgment – Title Not Extracted",
            "date": "Date not specified",
            "parties": "Parties not clearly identified",
            "directions": ["No administrative action required"],
            "timeline": "As per court directions",
            "source_text": text[:500] if text else "",
            "filename": request.filename
        }

    fields_found = sum(1 for f in [case_title, date, parties, directions, timeline] if f)
    confidence = min(100, 40 + (fields_found * 12))

    if len(text) < 500:
        confidence -= 20

    confidence = max(30, min(95, confidence))

    return {
        "case_title": case_title or "Court Judgment – Title Not Extracted",
        "date": date or "Date not specified",
        "parties": parties or "Parties not clearly identified",
        "directions": directions,
        "timeline": timeline or "As per court directions",
        "source_text": source_text or text[:500],
        "confidence": confidence,
        "filename": request.filename
    }