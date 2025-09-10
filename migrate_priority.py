import sqlite3
import os

# Database file path
db_path = 'cv_match.db'

def migrate_add_priority():
    """Add priority column to job_descriptions table and set default value to 'medium'"""
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found.")
        return
    
    conn = None
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if priority column already exists
        cursor.execute("PRAGMA table_info(job_descriptions)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        if 'priority' not in column_names:
            print("Adding 'priority' column to job_descriptions table...")
            cursor.execute("ALTER TABLE job_descriptions ADD COLUMN priority TEXT DEFAULT 'medium'")
            conn.commit()
            print("Migration completed successfully.")
        else:
            print("Column 'priority' already exists in job_descriptions table.")
        
    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    migrate_add_priority()