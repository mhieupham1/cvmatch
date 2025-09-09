from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

from app.services.file_processor import FileProcessor
from app.services.openai_service import OpenAIService
from app.services.comparison_service import ComparisonService
from app.services.embedding_service import EmbeddingService
from app.services.vector_service import VectorService
from app.models.schemas import (
    FileUploadResponse, ComparisonResult, CVResponse, JDResponse,
    ComparisonRequest, ComparisonHistoryResponse, EmbeddingComparisonRequest,
    EmbeddingComparisonResult, JDEmbeddingComparisonRequest, JDEmbeddingComparisonResult
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

# Serve uploaded files statically at /uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

file_processor = FileProcessor()
openai_service = OpenAIService()
comparison_service = ComparisonService()
embedding_service = EmbeddingService()
vector_service = VectorService()

@app.get("/")
async def root():
    return {"message": "CV-JD Matching API is running!"}

@app.post("/upload/cv", response_model=FileUploadResponse)
async def upload_cv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith(('.pdf', '.docx')):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
    
    try:
        # Ensure upload directory exists
        os.makedirs("uploads/cvs", exist_ok=True)
        # Create unique filename to avoid conflicts
        import uuid
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{timestamp}_{unique_id}_{file.filename}"
        file_path = f"uploads/cvs/{unique_filename}"
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        text_content = file_processor.extract_text(file_path)
        parsed_cv = await openai_service.parse_cv(text_content)
        
        # Keep the file - don't remove it
        # os.remove(file_path)
        
        # Save to database (without embedding)
        cv_record = CV(
            filename=file.filename,
            file_path=file_path,
            name=parsed_cv.get('name'),
            email=parsed_cv.get('email'),
            phone=parsed_cv.get('phone'),
            role_category=parsed_cv.get('role_category'),
            experience_years=parsed_cv.get('experience_years'),
            skills=parsed_cv.get('skills', []),
            education=parsed_cv.get('education', []),
            work_experience=parsed_cv.get('work_experience', []),
            certifications=parsed_cv.get('certifications', []),
            raw_data=parsed_cv,
            has_embedding=0
        )
        db.add(cv_record)
        db.commit()
        db.refresh(cv_record)
        
        # Generate and store embedding in ChromaDB
        try:
            cv_text_for_embedding = embedding_service.create_text_for_embedding(parsed_cv, "cv")
            embedding = embedding_service.generate_embedding(cv_text_for_embedding)
            
            # Store in ChromaDB with metadata
            metadata = {
                "name": parsed_cv.get('name', ''),
                "role": parsed_cv.get('role', ''),
                "role_category": parsed_cv.get('role_category', ''),
                "skills_count": len(parsed_cv.get('skills', [])),
                "experience_years": parsed_cv.get('experience_years', 0)
            }
            vector_service.store_cv_embedding(cv_record.id, embedding, metadata)
            
            # Update flag in SQLite
            cv_record.has_embedding = 1
            db.commit()
            
        except Exception as e:
            print(f"Warning: Could not create embedding for CV {cv_record.id}: {str(e)}")
            # Continue without embedding - not critical
        
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
        # Ensure upload directory exists
        os.makedirs("uploads/jds", exist_ok=True)

        # Create unique filename similar to CV flow
        import uuid
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{timestamp}_{unique_id}_{file.filename}"
        file_path = f"uploads/jds/{unique_filename}"
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        text_content = file_processor.extract_text(file_path)
        parsed_jd = await openai_service.parse_jd(text_content)
        
        # Keep the file - don't remove it
        
        # Save to database (without embedding)
        jd_record = JobDescription(
            filename=file.filename,
            file_path=file_path,
            job_title=parsed_jd.get('job_title', ''),
            job_category=parsed_jd.get('job_category'),
            company=parsed_jd.get('company', ''),
            required_skills=parsed_jd.get('required_skills', []),
            preferred_skills=parsed_jd.get('preferred_skills', []),
            experience_required=parsed_jd.get('experience_required'),
            education_required=parsed_jd.get('education_required', []),
            responsibilities=parsed_jd.get('responsibilities', []),
            raw_data=parsed_jd,
            has_embedding=0
        )
        db.add(jd_record)
        db.commit()
        db.refresh(jd_record)
        
        # Generate and store embedding in ChromaDB
        try:
            jd_text_for_embedding = embedding_service.create_text_for_embedding(parsed_jd, "jd")
            embedding = embedding_service.generate_embedding(jd_text_for_embedding)
            
            # Store in ChromaDB with metadata
            metadata = {
                "job_title": parsed_jd.get('job_title', ''),
                "job_category": parsed_jd.get('job_category', ''),
                "company": parsed_jd.get('company', ''),
                "required_skills_count": len(parsed_jd.get('required_skills', [])),
                "experience_required": parsed_jd.get('experience_required', 0)
            }
            vector_service.store_jd_embedding(jd_record.id, embedding, metadata)
            
            # Update flag in SQLite
            jd_record.has_embedding = 1
            db.commit()
            
        except Exception as e:
            print(f"Warning: Could not create embedding for JD {jd_record.id}: {str(e)}")
            # Continue without embedding - not critical
        
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
async def list_cvs(status: str | None = None, db: Session = Depends(get_db)):
    query = db.query(CV)
    if status:
        query = query.filter(CV.status == status)
    cvs = query.order_by(CV.created_at.desc()).all()
    print(cvs)
    return [
        CVResponse(
            id=cv.id,
            filename=cv.filename,
            file_url=(f"/uploads/{cv.file_path.split('uploads/')[1]}" if cv.file_path and 'uploads/' in cv.file_path else None),
            name=cv.name,
            email=cv.email,
            phone=cv.phone,
            experience_years=cv.experience_years,
            skills=cv.skills or [],
            education=cv.education or [],
            work_experience=cv.work_experience or [],
            certifications=cv.certifications or [],
            created_at=cv.created_at,
            status=getattr(cv, 'status', 'new')
        ) for cv in cvs
    ]

@app.get("/jds", response_model=list[JDResponse])
async def list_jds(db: Session = Depends(get_db)):
    jds = db.query(JobDescription).order_by(JobDescription.created_at.desc()).all()
    return [
        JDResponse(
            id=jd.id,
            filename=jd.filename,
            file_url=(f"/uploads/{jd.file_path.split('uploads/')[1]}" if getattr(jd, 'file_path', None) and 'uploads/' in jd.file_path else None),
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
async def list_comparisons(cv_id: int | None = None, jd_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(ComparisonHistory)
    if cv_id is not None:
        query = query.filter(ComparisonHistory.cv_id == cv_id)
    if jd_id is not None:
        query = query.filter(ComparisonHistory.jd_id == jd_id)
    comparisons = query.order_by(ComparisonHistory.created_at.desc()).all()
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

@app.post("/cvs/{cv_id}/approve", response_model=CVResponse)
async def approve_cv(cv_id: int, db: Session = Depends(get_db)):
    cv_record = db.query(CV).filter(CV.id == cv_id).first()
    if not cv_record:
        raise HTTPException(status_code=404, detail=f"CV with id {cv_id} not found")
    try:
        cv_record.status = "awaiting_interview"
        db.commit()
        db.refresh(cv_record)
        return CVResponse(
            id=cv_record.id,
            filename=cv_record.filename,
            file_url=(f"/uploads/{cv_record.file_path.split('uploads/')[1]}" if cv_record.file_path and 'uploads/' in cv_record.file_path else None),
            name=cv_record.name,
            email=cv_record.email,
            phone=cv_record.phone,
            experience_years=cv_record.experience_years,
            skills=cv_record.skills or [],
            education=cv_record.education or [],
            work_experience=cv_record.work_experience or [],
            certifications=cv_record.certifications or [],
            created_at=cv_record.created_at,
            status=getattr(cv_record, 'status', 'new')
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error approving CV: {str(e)}")

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

@app.post("/compare/cv_embedding", response_model=EmbeddingComparisonResult)
async def find_matching_jds_by_cv_embedding(request: EmbeddingComparisonRequest, db: Session = Depends(get_db)):
    """Tìm các JD phù hợp với CV dựa trên embedding similarity using ChromaDB"""
    try:
        # Lấy CV từ database
        cv_record = db.query(CV).filter(CV.id == request.cv_id).first()
        if not cv_record:
            raise HTTPException(status_code=404, detail=f"CV with id {request.cv_id} not found")
        
        if not cv_record.has_embedding:
            raise HTTPException(status_code=400, detail="CV embedding not found. Please re-upload the CV.")
        
        # Sử dụng VectorService để tìm JDs tương tự (nhanh hơn rất nhiều!)
        similar_jds = vector_service.find_similar_jds_for_cv(
            request.cv_id, 
            request.top_k, 
            request.similarity_threshold
        )
        
        # Lấy chi tiết JDs từ SQLite
        matched_jds = []
        for jd_id, similarity_score in similar_jds:
            jd_record = db.query(JobDescription).filter(JobDescription.id == jd_id).first()
            if jd_record:
                matched_jds.append({
                    "jd_id": jd_id,
                    "similarity_score": similarity_score,
                    "job_title": jd_record.job_title,
                    "company": jd_record.company,
                    "required_skills": jd_record.required_skills or [],
                    "experience_required": jd_record.experience_required,
                    "created_at": jd_record.created_at.isoformat()
                })
        
        return EmbeddingComparisonResult(
            cv_id=request.cv_id,
            matched_jds=matched_jds,
            total_matches=len(matched_jds)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding matching JDs: {str(e)}")

@app.post("/compare/jd_embedding", response_model=JDEmbeddingComparisonResult)
async def find_matching_cvs_by_jd_embedding(request: JDEmbeddingComparisonRequest, db: Session = Depends(get_db)):
    """Tìm các CV phù hợp với JD dựa trên embedding similarity using ChromaDB"""
    try:
        # Lấy JD từ database
        jd_record = db.query(JobDescription).filter(JobDescription.id == request.jd_id).first()
        if not jd_record:
            raise HTTPException(status_code=404, detail=f"JD with id {request.jd_id} not found")
        
        if not jd_record.has_embedding:
            raise HTTPException(status_code=400, detail="JD embedding not found. Please re-upload the JD.")
        
        # Sử dụng VectorService để tìm CVs tương tự (nhanh hơn rất nhiều!)
        similar_cvs = vector_service.find_similar_cvs_for_jd(
            request.jd_id, 
            request.top_k, 
            request.similarity_threshold
        )
        
        # Lấy chi tiết CVs từ SQLite
        matched_cvs = []
        for cv_id, similarity_score in similar_cvs:
            cv_record = db.query(CV).filter(CV.id == cv_id).first()
            if cv_record:
                matched_cvs.append({
                    "cv_id": cv_id,
                    "similarity_score": similarity_score,
                    "name": cv_record.name,
                    "email": cv_record.email,
                    "role": cv_record.raw_data.get('role') if cv_record.raw_data else None,
                    "skills": cv_record.skills or [],
                    "experience_years": cv_record.experience_years,
                    "created_at": cv_record.created_at.isoformat()
                })
        
        return JDEmbeddingComparisonResult(
            jd_id=request.jd_id,
            matched_cvs=matched_cvs,
            total_matches=len(matched_cvs)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding matching CVs: {str(e)}")

@app.delete("/database/clear-all")
async def clear_all_database(db: Session = Depends(get_db)):
    """Xóa hết tất cả dữ liệu trong database và ChromaDB"""
    try:
        # Delete all comparison histories first (foreign key references)
        comparison_count = db.query(ComparisonHistory).count()
        db.query(ComparisonHistory).delete()
        
        # Delete all CVs
        cv_count = db.query(CV).count()
        db.query(CV).delete()
        
        # Delete all Job Descriptions
        jd_count = db.query(JobDescription).count()
        db.query(JobDescription).delete()
        
        # Clear ChromaDB embeddings
        vector_service.clear_all_embeddings()
        
        db.commit()
        
        return {
            "message": "Successfully cleared all data from database and ChromaDB",
            "deleted_counts": {
                "cvs": cv_count,
                "job_descriptions": jd_count,
                "comparison_histories": comparison_count,
                "total": cv_count + jd_count + comparison_count
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error clearing database: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
