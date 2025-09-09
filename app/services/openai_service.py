from openai import OpenAI
import json
import os
from typing import Dict, Any

class OpenAIService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    async def parse_cv(self, cv_text: str) -> Dict[str, Any]:
        """Parse CV text and extract structured information"""
        prompt = f"""
        Analyze the following CV text and extract information in JSON format:

        CV Text:
        {cv_text}

        Please extract and return a JSON object with the following structure:
        {{
            "name": "Full name of the person",
            "email": "Email address",
            "phone": "Phone number",
            "experience_years": "Total years of experience (as integer)",
            "skills": ["list", "of", "technical", "skills"],
            "education": ["list", "of", "education", "degrees"],
            "work_experience": ["list", "of", "work", "experiences"],
            "certifications": ["list", "of", "certifications"]
        }}

        Return only valid JSON without any additional text or formatting.
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
            return json.loads(result)
        except Exception as e:
            raise Exception(f"Error parsing CV with OpenAI: {str(e)}")
    
    async def parse_jd(self, jd_text: str) -> Dict[str, Any]:
        """Parse Job Description text and extract structured information"""
        prompt = f"""
        Analyze the following Job Description text and extract information in JSON format:

        JD Text:
        {jd_text}

        Please extract and return a JSON object with the following structure:
        {{
            "job_title": "Job title",
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
            return json.loads(result)
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
        
        Please provide a detailed comparison analysis in JSON format with the following structure:
        {{
            "match_score": "Overall matching percentage (0-100)",
            "summary": "Brief summary of the match quality",
            "strengths": ["List of candidate's strengths for this position"],
            "weaknesses": ["List of areas where candidate doesn't meet requirements"],
            "skill_analysis": {{
                "matching_skills": ["Skills that match between CV and JD"],
                "missing_skills": ["Required skills missing from CV"],
                "additional_skills": ["Extra skills candidate has that aren't required"]
            }},
            "experience_analysis": {{
                "meets_requirement": "true/false",
                "cv_experience": "Candidate's experience level",
                "required_experience": "Required experience level",
                "analysis": "Detailed analysis of experience match"
            }},
            "education_analysis": {{
                "meets_requirement": "true/false", 
                "cv_education": "Candidate's education background",
                "required_education": "Required education level",
                "analysis": "Detailed analysis of education match"
            }},
            "recommendations": ["Specific recommendations for the candidate"],
            "hiring_recommendation": "strong_recommend/recommend/consider/not_recommend",
            "detailed_feedback": "Comprehensive feedback about the candidate's fit for this role"
        }}
        
        Provide detailed, constructive analysis in Vietnamese where appropriate. Return only valid JSON.
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