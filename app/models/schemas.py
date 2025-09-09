from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class CVSchema(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    experience_years: Optional[int] = None
    skills: List[str] = []
    education: List[str] = []
    work_experience: List[Dict[str, Any]] = []
    certifications: List[str] = []

class JDSchema(BaseModel):
    job_title: str
    company: str
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    experience_required: Optional[int] = None
    education_required: List[str] = []
    responsibilities: List[str] = []

class ComparisonResult(BaseModel):
    match_score: float
    skill_match: dict
    experience_match: bool
    education_match: bool
    recommendations: List[str] = []
    
class FileUploadResponse(BaseModel):
    id: int
    filename: str
    file_type: str
    status: str
    parsed_data: dict
    created_at: datetime

class CVResponse(BaseModel):
    id: int
    filename: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    experience_years: Optional[int] = None
    skills: List[str] = []
    education: List[str] = []
    work_experience: List[Dict[str, Any]] = []
    certifications: List[str] = []
    created_at: datetime

class JDResponse(BaseModel):
    id: int
    filename: str
    job_title: str
    company: str
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    experience_required: Optional[int] = None
    education_required: List[str] = []
    responsibilities: List[str] = []
    created_at: datetime

class ComparisonRequest(BaseModel):
    cv_id: int
    jd_id: int

class ComparisonHistoryResponse(BaseModel):
    id: int
    cv_id: int
    jd_id: int
    match_score: float
    comparison_result: dict
    created_at: datetime