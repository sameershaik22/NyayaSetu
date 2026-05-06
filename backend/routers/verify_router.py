from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from database import get_db
from datetime import datetime
import json

router = APIRouter()

class SubAction(BaseModel):
    step: int
    task: str
    responsible: str
    status: str = "pending"

class CaseData(BaseModel):
    case_title: str
    date: Optional[str] = ""
    parties: Optional[str] = ""
    directions: Optional[List[str]] = []
    timeline: Optional[str] = ""
    confidence: Optional[int] = 70
    source_text: Optional[str] = ""

class ActionPlan(BaseModel):
    type: Optional[str] = "Compliance"
    action: str
    department: Optional[str] = ""
    deadline: Optional[str] = ""
    priority: Optional[str] = "Medium"
    confidence: Optional[int] = 70
    justification: Optional[str] = ""
    source_text: Optional[str] = ""
    sub_actions: Optional[List[Dict[str, Any]]] = []
    legal_basis: Optional[str] = ""
    notes: Optional[str] = ""

class VerifyRequest(BaseModel):
    case_data: CaseData
    action_plan: ActionPlan
    status: str  # "approved", "rejected", "edited"
    reviewer_notes: Optional[str] = ""


@router.post("/verify")
async def verify_record(request: VerifyRequest):
    """Human verification endpoint — only approved records are saved."""
    
    if request.status not in ["approved", "rejected", "edited"]:
        raise HTTPException(
            status_code=400,
            detail="Status must be 'approved', 'rejected', or 'edited'"
        )
    
    if request.status == "rejected":
        return {
            "message": "Record rejected. Not stored in dashboard.",
            "status": "rejected",
            "stored": False
        }
    
    conn = get_db()
    try:
        directions_str = json.dumps(request.case_data.directions) if request.case_data.directions else "[]"
        
        cursor = conn.execute("""
            INSERT INTO records (
                case_title, date_of_order, parties, directions, timeline, source_text,
                action_type, action, department, deadline, priority, confidence, justification,
                status, completion_status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            request.case_data.case_title,
            request.case_data.date,
            request.case_data.parties,
            directions_str,
            request.case_data.timeline,
            request.action_plan.source_text or request.case_data.source_text,
            request.action_plan.type,
            request.action_plan.action,
            request.action_plan.department,
            request.action_plan.deadline,
            request.action_plan.priority,
            request.action_plan.confidence,
            request.action_plan.justification,
            "approved",
            "pending",
            datetime.now().isoformat()
        ))
        
        record_id = cursor.lastrowid
        conn.commit()
        
        return {
            "message": f"Record {'approved' if request.status == 'approved' else 'edited and approved'} and stored in dashboard.",
            "status": "approved",
            "stored": True,
            "record_id": record_id,
            "reviewer_notes": request.reviewer_notes
        }
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    finally:
        conn.close()


@router.put("/records/{record_id}/status")
async def update_record_status(record_id: int, completion_status: str):
    """Update the completion status of a record (pending/completed/overdue)."""
    
    if completion_status not in ["pending", "completed", "overdue"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    conn = get_db()
    try:
        conn.execute(
            "UPDATE records SET completion_status = ? WHERE id = ?",
            (completion_status, record_id)
        )
        conn.commit()
        return {"message": "Status updated", "record_id": record_id, "completion_status": completion_status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/records/{record_id}")
async def delete_record(record_id: int):
    """Delete a record from the dashboard."""
    conn = get_db()
    try:
        result = conn.execute("DELETE FROM records WHERE id = ?", (record_id,))
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Record not found")
        return {"message": "Record deleted", "record_id": record_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
