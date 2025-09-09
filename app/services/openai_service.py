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