import sqlite3
from datetime import datetime

DB_PATH = "nyayasetu.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_title TEXT NOT NULL,
            date_of_order TEXT,
            parties TEXT,
            directions TEXT,
            timeline TEXT,
            source_text TEXT,
            action_type TEXT,
            action TEXT NOT NULL,
            department TEXT,
            deadline TEXT,
            priority TEXT DEFAULT 'Medium',
            confidence INTEGER DEFAULT 70,
            justification TEXT,
            status TEXT DEFAULT 'approved',
            completion_status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    conn.close()
    print("[NyayaSetu] Database initialized.")
