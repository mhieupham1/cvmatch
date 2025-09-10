from openai import OpenAI
import json
import os
from typing import Dict, Any
from .embedding_service import EmbeddingService
from .vector_service import VectorService

class OpenAIService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.embedding_service = EmbeddingService()
        self.vector_service = VectorService()
    
    async def parse_cv(self, cv_text: str, filename: str = None) -> Dict[str, Any]:
        """Parse CV text and extract structured information"""
        filename_hint = f"\n\nCV Filename: {filename}" if filename else ""
        prompt = f"""
        Analyze the following CV text and extract information in JSON format:

        CV Text:
        {cv_text}{filename_hint}

        Please extract and return a JSON object with the following structure:
        {{
            "name": "Full name of the person (if not found in CV text, try to extract from filename)",
            "email": "Email address",
            "phone": "Phone number",
            "role": "Current role or target position (e.g. 'Software Developer', 'Senior Engineer')",
            "role_category": "Classify role into one of these categories: frontend, backend, fullstack, mobile, qa, devops, comtor, data, ai, design, pm, other",
            "experience_years": "Total years of experience (as integer)",
            "birth_year": "Birth year of the person (as integer), if not available return null",
            "languages": ["list", "of", "HUMAN", "LANGUAGES", "only", "NOT", "programming", "languages", "including", "native", "and", "foreign", "languages", "like", "English", "Japanese", "Chinese", "Vietnamese", "Korean", "French", "German"],
            "project_scope": ["list", "of", "project", "types", "like", "outsource", "product", "blockchain", "AI", "fintech", "ecommerce"],
            "customer": ["list", "of", "customer", "markets", "like", "JP", "VN", "USA", "EU", "SG"],
            "location": "Current location or preferred work location, if not available return null",
            "skills": ["list", "of", "technical", "skills"],
            "education": [
                "Each item MUST be a single human-readable string describing one education entry (institution, degree, major, years).",
                "Do NOT return objects/dictionaries for education entries."
            ],
            "work_experience": [
                "Each item MUST be a single human-readable string describing one work experience entry (company, title, responsibilities, dates).",
                "Do NOT return objects/dictionaries for work_experience entries."
            ],
            "certifications": ["list", "of", "certifications"]
        }}

        Strict formatting rules:
        - Return only valid JSON without any additional text or formatting.
        - The field "education" MUST be an array of strings only. No nested objects.
        - The field "work_experience" MUST be an array of strings only. No nested objects.
        - If dates are available, include them inside the string, e.g. "BSc in Computer Science @ ABC University (2016 - 2020)".
        - If only partial info is available, still produce a reasonable string.
        - For birth_year, languages, project_scope, customer, location: if information is not available or cannot be inferred, return null for single values or empty arrays for lists.
        - For name extraction: First try to find name in CV text. If not found, extract from filename (e.g., "Nguyen_Van_An_CV.pdf" → "Nguyen Van An", "john-smith-resume.docx" → "John Smith").
        - For languages: ONLY extract HUMAN/NATURAL languages (English, Vietnamese, Japanese, Chinese, Korean, French, etc.). DO NOT include programming languages (Python, Java, JavaScript, etc.). Extract from language certifications (TOEIC, IELTS, JLPT, HSK, etc.), language skills sections, native language mentioned, and languages used in work experience. If no languages are explicitly mentioned, infer the native language from the person's name (Vietnamese names → Vietnamese, Western names → English, Japanese names → Japanese, Chinese names → Chinese, Korean names → Korean, etc.). Include proficiency level if available.
        - Try to infer project_scope and customer from work experience descriptions when possible.
        
        IMPORTANT EXAMPLES for languages field:
        ✓ CORRECT: ["English", "Vietnamese", "Japanese", "Chinese", "Korean"]
        ✗ WRONG: ["Python", "JavaScript", "Java", "C++", "React"]
        
        Programming languages should go in the "skills" field, NOT in "languages".
        
        EXAMPLES of extracting name from filename:
        - "Nguyen_Van_An_CV.pdf" → "Nguyen Van An"
        - "john-smith-resume.docx" → "John Smith"
        - "TranThiMai_CV_2024.pdf" → "Tran Thi Mai"
        - "CV_Michael_Johnson.pdf" → "Michael Johnson"
        - "resume-sarah-wilson.doc" → "Sarah Wilson"
        
        EXAMPLES of inferring native language from names:
        - "Nguyễn Văn An" → Vietnamese (native language)
        - "Trần Thị Hoa" → Vietnamese (native language)  
        - "John Smith" → English (native language)
        - "Michael Johnson" → English (native language)
        - "田中太郎" or "Tanaka Taro" → Japanese (native language)
        - "李小明" or "Li Xiaoming" → Chinese (native language)
        - "김민수" or "Kim Minsu" → Korean (native language)
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert CV parser. Extract information accurately and return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1
            )
            
            result = response.choices[0].message.content.strip()
            parsed_data = json.loads(result)
            
            return parsed_data
        except Exception as e:
            raise Exception(f"Error parsing CV with OpenAI: {str(e)}")
    
    async def parse_and_store_cv_embedding(self, cv_id: int, cv_text: str, parsed_data: Dict[str, Any], filename: str = None) -> Dict[str, Any]:
        """Parse CV and store its embedding in vector database"""
        try:
            # Create text for embedding from parsed data
            embedding_text = self._create_cv_embedding_text(parsed_data)
            
            # Generate embedding
            embedding = await self.embedding_service.get_embedding(embedding_text)
            
            # Prepare metadata for vector storage
            metadata = {
                "name": parsed_data.get("name", ""),
                "role": parsed_data.get("role", ""),
                "role_category": parsed_data.get("role_category", ""),
                "experience_years": parsed_data.get("experience_years", 0),
                "location": parsed_data.get("location", ""),
                "languages": parsed_data.get("languages", []),
                "project_scope": parsed_data.get("project_scope", []),
                "customer": parsed_data.get("customer", [])
            }
            
            # Store embedding in ChromaDB
            self.vector_service.store_cv_embedding(cv_id, embedding, metadata)
            
            return parsed_data
        except Exception as e:
            raise Exception(f"Error parsing CV and storing embedding: {str(e)}")
    
    def _create_cv_embedding_text(self, parsed_data: Dict[str, Any]) -> str:
        """Create text representation of CV for embedding"""
        parts = []
        
        # Add basic info
        if parsed_data.get("name"):
            parts.append(f"Name: {parsed_data['name']}")
        if parsed_data.get("role"):
            parts.append(f"Role: {parsed_data['role']}")
        if parsed_data.get("location"):
            parts.append(f"Location: {parsed_data['location']}")
        
        # Add experience
        if parsed_data.get("experience_years"):
            parts.append(f"Experience: {parsed_data['experience_years']} years")
        
        # Add skills
        if parsed_data.get("skills"):
            parts.append(f"Skills: {', '.join(parsed_data['skills'])}")
        
        # Add languages
        if parsed_data.get("languages"):
            parts.append(f"Languages: {', '.join(parsed_data['languages'])}")
        
        # Add project scope
        if parsed_data.get("project_scope"):
            parts.append(f"Project Types: {', '.join(parsed_data['project_scope'])}")
        
        # Add customer markets
        if parsed_data.get("customer"):
            parts.append(f"Customer Markets: {', '.join(parsed_data['customer'])}")
        
        # Add education
        if parsed_data.get("education"):
            parts.append(f"Education: {' | '.join(parsed_data['education'])}")
        
        # Add work experience
        if parsed_data.get("work_experience"):
            parts.append(f"Work Experience: {' | '.join(parsed_data['work_experience'])}")
        
        # Add certifications
        if parsed_data.get("certifications"):
            parts.append(f"Certifications: {', '.join(parsed_data['certifications'])}")
        
        return "\n".join(parts)
    
    async def parse_jd(self, jd_text: str) -> Dict[str, Any]:
        """Parse Job Description text and extract structured information"""
        prompt = f"""
        Analyze the following Job Description text and extract information in JSON format:

        JD Text:
        {jd_text}

        Please extract and return a JSON object with the following structure:
        {{
            "job_title": "Job title",
            "job_category": "Classify job into one of these categories: frontend, backend, fullstack, mobile, qa, devops, comtor, data, ai, design, pm, other",
            "company": "Company name",
            "required_skills": ["list", "of", "required", "skills"],
            "preferred_skills": ["list", "of", "preferred", "skills"],
            "experience_required": "Required years of experience (as integer)",
            "education_required": ["list", "of", "required", "education"],
            "responsibilities": ["list", "of", "job", "responsibilities"],
        }}

        Return only valid JSON without any additional text or formatting.
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert Job Description parser. Extract information accurately and return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1
            )
            
            result = response.choices[0].message.content.strip()
            parsed_data = json.loads(result)
            
            # Embedding will be handled separately in VectorService
            
            return parsed_data
        except Exception as e:
            raise Exception(f"Error parsing JD with OpenAI: {str(e)}")
    
    async def compare_cv_jd(self, cv_data: Dict[str, Any], jd_data: Dict[str, Any]) -> Dict[str, Any]:
        """Compare CV and JD using OpenAI and return detailed analysis"""
        prompt = f"""
        You are an expert HR recruiter. Please analyze and compare the following CV and Job Description.
        
        CV Data:
        {json.dumps(cv_data, indent=2, ensure_ascii=False)}
        
        Job Description Data:
        {json.dumps(jd_data, indent=2, ensure_ascii=False)}
        
        Please provide a simple comparison analysis in JSON format with the following structure:
        {{
            "match_score": "Overall matching percentage (0-100 as number)",
            "reason": "Detailed explanation of why this score was given, including strengths, weaknesses, and specific reasons for the match percentage"
        }}
        
        Provide detailed, constructive analysis in Vietnamese. Return only valid JSON without any markdown formatting or extra text.
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert HR recruiter with deep experience in CV analysis and job matching. Provide detailed, accurate, and constructive feedback."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            
            result = response.choices[0].message.content.strip()
            return json.loads(result)
        except Exception as e:
            raise Exception(f"Error comparing CV and JD with OpenAI: {str(e)}")
