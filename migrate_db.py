"""
Script để migrate database schema - thêm cột embedding
"""
import sqlite3
import os

def migrate_database():
    db_path = "cv_match.db"
    
    if not os.path.exists(db_path):
        print("Database không tồn tại, sẽ được tạo mới khi chạy app")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Kiểm tra xem cột embedding đã tồn tại chưa
        cursor.execute("PRAGMA table_info(cvs)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'embedding' not in columns:
            print("Thêm cột embedding vào bảng cvs...")
            cursor.execute("ALTER TABLE cvs ADD COLUMN embedding BLOB")
        
        cursor.execute("PRAGMA table_info(job_descriptions)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'embedding' not in columns:
            print("Thêm cột embedding vào bảng job_descriptions...")
            cursor.execute("ALTER TABLE job_descriptions ADD COLUMN embedding BLOB")
        
        conn.commit()
        print("Migration hoàn thành!")
        
    except Exception as e:
        print(f"Lỗi migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()