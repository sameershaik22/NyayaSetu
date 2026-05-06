from fastapi import APIRouter, HTTPException
from database import get_db
from datetime import datetime
import json

router = APIRouter()


def determine_completion_status(deadline: str, current_status: str) -> str:
    """Auto-determine if a record is overdue."""
    if current_status == "completed":
        return "completed"
    
    if not deadline or deadline in ["As per court order", "As per court directions", ""]:
        return current_status
    
    try:
        formats = [
            "%Y-%m-%d",
            "%d %B %Y",
            "%d/%m/%Y",
            "%d-%m-%Y",
        ]
        
        deadline_date = None
        for fmt in formats:
            try:
                deadline_date = datetime.strptime(deadline.strip(), fmt)
                break
            except:
                continue
        
        if deadline_date and deadline_date < datetime.now():
            return "overdue"
    except:
        pass
    
    return current_status


@router.get("/dashboard")
async def get_dashboard():
    """Return all approved records for the dashboard."""
    conn = get_db()
    try:
        rows = conn.execute("""
            SELECT id, case_title, date_of_order, parties, directions, timeline, source_text,
                   action_type, action, department, deadline, priority, confidence, justification,
                   status, completion_status, created_at
            FROM records
            WHERE status = 'approved'
            ORDER BY 
                CASE priority 
                    WHEN 'High' THEN 1 
                    WHEN 'Medium' THEN 2 
                    WHEN 'Low' THEN 3 
                END,
                created_at DESC
        """).fetchall()
        
        records = []
        dept_groups = {}
        
        for row in rows:
            directions = []
            try:
                directions = json.loads(row["directions"]) if row["directions"] else []
            except:
                directions = [row["directions"]] if row["directions"] else []
            
            completion_status = determine_completion_status(
                row["deadline"] or "",
                row["completion_status"] or "pending"
            )
            
            record = {
                "id": row["id"],
                "case_title": row["case_title"],
                "date_of_order": row["date_of_order"],
                "parties": row["parties"],
                "directions": directions,
                "timeline": row["timeline"],
                "source_text": row["source_text"],
                "action_type": row["action_type"],
                "action": row["action"],
                "department": row["department"],
                "deadline": row["deadline"],
                "priority": row["priority"],
                "confidence": row["confidence"],
                "justification": row["justification"],
                "status": row["status"],
                "completion_status": completion_status,
                "created_at": row["created_at"]
            }
            
            records.append(record)
            
            dept = row["department"] or "General"
            if dept not in dept_groups:
                dept_groups[dept] = []
            dept_groups[dept].append(record)
        
        total = len(records)
        compliance_tasks = sum(1 for r in records if r["action_type"] in ["Compliance", "Contempt Response"])
        appeal_suggestions = sum(1 for r in records if r["action_type"] == "Consider Appeal")
        overdue = sum(1 for r in records if r["completion_status"] == "overdue")
        
        return {
            "records": records,
            "department_groups": dept_groups,
            "statistics": {
                "total": total,
                "compliance_tasks": compliance_tasks,
                "appeal_suggestions": appeal_suggestions,
                "overdue": overdue,
                "departments": len(dept_groups)
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dashboard error: {str(e)}")
    
    finally:
        conn.close()


@router.get("/dashboard/stats")
async def get_stats():
    """Quick stats endpoint."""
    conn = get_db()
    try:
        total = conn.execute("SELECT COUNT(*) FROM records WHERE status='approved'").fetchone()[0]
        compliance_tasks = conn.execute("SELECT COUNT(*) FROM records WHERE status='approved' AND action_type IN ('Compliance', 'Contempt Response')").fetchone()[0]
        appeal_suggestions = conn.execute("SELECT COUNT(*) FROM records WHERE status='approved' AND action_type='Consider Appeal'").fetchone()[0]
        overdue = conn.execute("SELECT COUNT(*) FROM records WHERE status='approved' AND completion_status='overdue'").fetchone()[0]
        
        return {
            "total_cases": total,
            "compliance_tasks": compliance_tasks,
            "appeal_suggestions": appeal_suggestions,
            "overdue_cases": overdue
        }
    finally:
        conn.close()
