from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, JSON, LargeBinary
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cv_match.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class CV(Base):
    __tablename__ = "cvs"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=True)  # Store the path to the saved file
    name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    role_category = Column(String, nullable=True)  # frontend, backend, fullstack, etc.
    experience_years = Column(Integer, nullable=True)
    skills = Column(JSON, nullable=True)  # List[str]
    education = Column(JSON, nullable=True)  # List[str]
    work_experience = Column(JSON, nullable=True)  # List[str]
    certifications = Column(JSON, nullable=True)  # List[str]
    raw_data = Column(JSON, nullable=True)  # Store original parsed data
    # embedding moved to ChromaDB
    has_embedding = Column(Integer, default=0)  # Flag to track if embedding exists
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="new")  # new, awaiting_interview, interviewed, etc.

class JobDescription(Base):
    __tablename__ = "job_descriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=True)  # Store the path to the saved file
    job_title = Column(String, nullable=False)
    job_category = Column(String, nullable=True)  # frontend, backend, fullstack, etc.
    company = Column(String, nullable=False)
    required_skills = Column(JSON, nullable=True)  # List[str]
    preferred_skills = Column(JSON, nullable=True)  # List[str]
    experience_required = Column(Integer, nullable=True)
    education_required = Column(JSON, nullable=True)  # List[str]
    responsibilities = Column(JSON, nullable=True)  # List[str]
    raw_data = Column(JSON, nullable=True)  # Store original parsed data
    # embedding moved to ChromaDB
    has_embedding = Column(Integer, default=0)  # Flag to track if embedding exists
    created_at = Column(DateTime, default=datetime.utcnow)

class ComparisonHistory(Base):
    __tablename__ = "comparison_history"
    
    id = Column(Integer, primary_key=True, index=True)
    cv_id = Column(Integer, nullable=False)
    jd_id = Column(Integer, nullable=False)
    match_score = Column(Text, nullable=False)  # Store as JSON string
    comparison_result = Column(JSON, nullable=False)  # Full comparison result
    created_at = Column(DateTime, default=datetime.utcnow)

def create_tables():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
