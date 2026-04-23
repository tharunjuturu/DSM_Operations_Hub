import sqlite3
import json

def export_db(db_path, out_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    tables = ['tasks', 'work_days', 'daily_work', 'notes', 'task_types', 'task_statuses', 'holidays']
    data = {}
    
    for table in tables:
        try:
            cursor.execute(f"SELECT * FROM {table}")
            rows = cursor.fetchall()
            data[table] = [dict(row) for row in rows]
        except Exception as e:
            print(f"Error reading {table}: {e}")
            data[table] = []
            
    with open(out_path, 'w') as f:
        json.dump(data, f, indent=2)
        
export_db(r"c:\New PYTHON\Golden lion work tracker\work_tracker.db", r"c:\New PYTHON\DSM_Operations_Hub\gl_legacy_data.json")
