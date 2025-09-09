from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

from app.services.file_processor import FileProcessor
from app.services.openai_service import OpenAIService
from app.services.comparison_service import ComparisonService
from app.models.schemas import (
    FileUploadResponse, ComparisonResult, CVResponse, JDResponse,
    ComparisonRequest, ComparisonHistoryResponse
)
from app.database import get_db, create_tables, CV, JobDescription, ComparisonHistory
import json

load_dotenv()

# Create tables on startup
create_tables()

app = FastAPI(
    title="CV-JD Matching API",
    description="API để so sánh CV và Job Description",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

file_processor = FileProcessor()
openai_service = OpenAIService()
comparison_service = ComparisonService()

@app.get("/")
async def root():
    return {"message": "CV-JD Matching API is running!"}

@app.post("/upload/cv", response_model=FileUploadResponse)
async def upload_cv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith(('.pdf', '.docx')):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
    
    try:
        file_path = f"uploads/cv_{file.filename}"
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        text_content = file_processor.extract_text(file_path)
        parsed_cv = await openai_service.parse_cv(text_content)
        
        os.remove(file_path)
        
        # Save to database
        cv_record = CV(
            filename=file.filename,
            name=parsed_cv.get('name'),
            email=parsed_cv.get('email'),
            phone=parsed_cv.get('phone'),
            experience_years=parsed_cv.get('experience_years'),
            skills=parsed_cv.get('skills', []),
            education=parsed_cv.get('education', []),
            work_experience=parsed_cv.get('work_experience', []),
            certifications=parsed_cv.get('certifications', []),
            raw_data=parsed_cv
        )
        db.add(cv_record)
        db.commit()
        db.refresh(cv_record)
        
        return FileUploadResponse(
            id=cv_record.id,
            filename=file.filename,
            file_type="CV",
            status="success",
            parsed_data=parsed_cv,
            created_at=cv_record.created_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@app.post("/upload/jd", response_model=FileUploadResponse)
async def upload_jd(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith(('.pdf', '.docx')):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
    
    try:
        file_path = f"uploads/jd_{file.filename}"
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        text_content = file_processor.extract_text(file_path)
        parsed_jd = await openai_service.parse_jd(text_content)
        
        os.remove(file_path)
        
        # Save to database
        jd_record = JobDescription(
            filename=file.filename,
            job_title=parsed_jd.get('job_title', ''),
            company=parsed_jd.get('company', ''),
            required_skills=parsed_jd.get('required_skills', []),
            preferred_skills=parsed_jd.get('preferred_skills', []),
            experience_required=parsed_jd.get('experience_required'),
            education_required=parsed_jd.get('education_required', []),
            responsibilities=parsed_jd.get('responsibilities', []),
            raw_data=parsed_jd
        )
        db.add(jd_record)
        db.commit()
        db.refresh(jd_record)
        
        return FileUploadResponse(
            id=jd_record.id,
            filename=file.filename,
            file_type="JD",
            status="success",
            parsed_data=parsed_jd,
            created_at=jd_record.created_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

# New endpoints for listing stored data
@app.get("/cvs", response_model=list[CVResponse])
async def list_cvs(db: Session = Depends(get_db)):
    cvs = db.query(CV).order_by(CV.created_at.desc()).all()
    print(cvs)
    return [
        CVResponse(
            id=cv.id,
            filename=cv.filename,
            name=cv.name,
            email=cv.email,
            phone=cv.phone,
            experience_years=cv.experience_years,
            skills=cv.skills or [],
            education=cv.education or [],
            work_experience=cv.work_experience or [],
            certifications=cv.certifications or [],
            created_at=cv.created_at
        ) for cv in cvs
    ]

@app.get("/jds", response_model=list[JDResponse])
async def list_jds(db: Session = Depends(get_db)):
    jds = db.query(JobDescription).order_by(JobDescription.created_at.desc()).all()
    return [
        JDResponse(
            id=jd.id,
            filename=jd.filename,
            job_title=jd.job_title,
            company=jd.company,
            required_skills=jd.required_skills or [],
            preferred_skills=jd.preferred_skills or [],
            experience_required=jd.experience_required,
            education_required=jd.education_required or [],
            responsibilities=jd.responsibilities or [],
            created_at=jd.created_at
        ) for jd in jds
    ]

@app.get("/comparisons", response_model=list[ComparisonHistoryResponse])
async def list_comparisons(db: Session = Depends(get_db)):
    comparisons = db.query(ComparisonHistory).order_by(ComparisonHistory.created_at.desc()).all()
    return [
        ComparisonHistoryResponse(
            id=comp.id,
            cv_id=comp.cv_id,
            jd_id=comp.jd_id,
            match_score=float(comp.match_score),
            comparison_result=comp.comparison_result,
            created_at=comp.created_at
        ) for comp in comparisons
    ]

@app.delete("/cvs")
async def delete_all_cvs(db: Session = Depends(get_db)):
    try:
        # Delete all comparison histories related to CVs first
        db.query(ComparisonHistory).delete()
        
        # Delete all CVs
        deleted_count = db.query(CV).count()
        db.query(CV).delete()
        
        db.commit()
        
        return {"message": f"Successfully deleted {deleted_count} CVs and related comparison histories"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting CVs: {str(e)}")

@app.delete("/jds")
async def delete_all_jds(db: Session = Depends(get_db)):
    try:
        # Delete all comparison histories related to JDs first
        db.query(ComparisonHistory).delete()
        
        # Delete all JDs
        deleted_count = db.query(JobDescription).count()
        db.query(JobDescription).delete()
        
        db.commit()
        
        return {"message": f"Successfully deleted {deleted_count} Job Descriptions and related comparison histories"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting Job Descriptions: {str(e)}")

@app.post("/compare", response_model=ComparisonResult)
async def compare_cv_jd(request: ComparisonRequest, db: Session = Depends(get_db)):
    try:
        # Get CV and JD from database
        cv_record = db.query(CV).filter(CV.id == request.cv_id).first()
        jd_record = db.query(JobDescription).filter(JobDescription.id == request.jd_id).first()
        
        if not cv_record:
            raise HTTPException(status_code=404, detail=f"CV with id {request.cv_id} not found")
        if not jd_record:
            raise HTTPException(status_code=404, detail=f"JD with id {request.jd_id} not found")
        
        # Compare using stored data
        result = comparison_service.compare(cv_record.raw_data, jd_record.raw_data)
        
        # Save comparison history
        history_record = ComparisonHistory(
            cv_id=request.cv_id,
            jd_id=request.jd_id,
            match_score=str(result.match_score),
            comparison_result=result.dict()
        )
        db.add(history_record)
        db.commit()
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error comparing CV and JD: {str(e)}")

@app.post("/compare/openai")
async def compare_cv_jd_with_openai(request: ComparisonRequest, db: Session = Depends(get_db)):
    try:
        # Get CV and JD from database
        cv_record = db.query(CV).filter(CV.id == request.cv_id).first()
        jd_record = db.query(JobDescription).filter(JobDescription.id == request.jd_id).first()
        
        if not cv_record:
            raise HTTPException(status_code=404, detail=f"CV with id {request.cv_id} not found")
        if not jd_record:
            raise HTTPException(status_code=404, detail=f"JD with id {request.jd_id} not found")
        
        # Compare using OpenAI
        openai_result = await openai_service.compare_cv_jd(cv_record.raw_data, jd_record.raw_data)
        
        # Save comparison history with OpenAI results
        history_record = ComparisonHistory(
            cv_id=request.cv_id,
            jd_id=request.jd_id,
            match_score=str(openai_result.get('match_score', 0)),
            comparison_result=openai_result
        )
        db.add(history_record)
        db.commit()
        
        return {
            "comparison_type": "openai",
            "cv_id": request.cv_id,
            "jd_id": request.jd_id,
            "result": openai_result
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error comparing CV and JD with OpenAI: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)