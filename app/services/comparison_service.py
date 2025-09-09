from typing import Dict, Any, List
from app.models.schemas import ComparisonResult

class ComparisonService:
    def compare(self, cv_data: Dict[str, Any], jd_data: Dict[str, Any]) -> ComparisonResult:
        """Compare CV data with JD data and return match score and recommendations"""
        
        # Calculate skill match
        skill_match = self._calculate_skill_match(
            cv_data.get('skills', []), 
            jd_data.get('required_skills', []),
            jd_data.get('preferred_skills', [])
        )
        
        # Calculate experience match
        experience_match = self._calculate_experience_match(
            cv_data.get('experience_years', 0),
            jd_data.get('experience_required', 0)
        )
        
        # Calculate education match
        education_match = self._calculate_education_match(
            cv_data.get('education', []),
            jd_data.get('education_required', [])
        )
        
        # Calculate overall match score
        match_score = self._calculate_overall_score(
            skill_match['score'],
            experience_match,
            education_match
        )
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            cv_data, jd_data, skill_match, experience_match, education_match
        )
        
        return ComparisonResult(
            match_score=match_score,
            skill_match=skill_match,
            experience_match=experience_match,
            education_match=education_match,
            recommendations=recommendations
        )
    
    def _calculate_skill_match(self, cv_skills: List[str], required_skills: List[str], preferred_skills: List[str]) -> Dict[str, Any]:
        """Calculate skill matching score and details"""
        cv_skills_lower = [skill.lower().strip() for skill in cv_skills]
        required_skills_lower = [skill.lower().strip() for skill in required_skills]
        preferred_skills_lower = [skill.lower().strip() for skill in preferred_skills]
        
        # Match required skills
        required_matches = []
        required_missing = []
        
        for skill in required_skills:
            skill_lower = skill.lower().strip()
            if any(skill_lower in cv_skill or cv_skill in skill_lower for cv_skill in cv_skills_lower):
                required_matches.append(skill)
            else:
                required_missing.append(skill)
        
        # Match preferred skills
        preferred_matches = []
        for skill in preferred_skills:
            skill_lower = skill.lower().strip()
            if any(skill_lower in cv_skill or cv_skill in skill_lower for cv_skill in cv_skills_lower):
                preferred_matches.append(skill)
        
        # Calculate score
        required_score = len(required_matches) / len(required_skills) if required_skills else 1.0
        preferred_score = len(preferred_matches) / len(preferred_skills) if preferred_skills else 0.0
        
        # Overall skill score (70% required, 30% preferred)
        overall_score = (required_score * 0.7) + (preferred_score * 0.3)
        
        return {
            'score': round(overall_score, 2),
            'required_matches': required_matches,
            'required_missing': required_missing,
            'preferred_matches': preferred_matches,
            'required_score': round(required_score, 2),
            'preferred_score': round(preferred_score, 2)
        }
    
    def _calculate_experience_match(self, cv_experience: int, required_experience: int) -> bool:
        """Check if CV experience meets JD requirements"""
        if required_experience is None or required_experience == 0:
            return True
        return cv_experience >= required_experience
    
    def _calculate_education_match(self, cv_education: List[str], required_education: List[str]) -> bool:
        """Check if CV education meets JD requirements"""
        if not required_education:
            return True
        
        cv_education_lower = [edu.lower() for edu in cv_education]
        required_education_lower = [edu.lower() for edu in required_education]
        
        # Check if any required education is found in CV
        for req_edu in required_education_lower:
            if any(req_edu in cv_edu or cv_edu in req_edu for cv_edu in cv_education_lower):
                return True
        
        return False
    
    def _calculate_overall_score(self, skill_score: float, experience_match: bool, education_match: bool) -> float:
        """Calculate overall matching score"""
        # Weights: Skills 60%, Experience 25%, Education 15%
        experience_score = 1.0 if experience_match else 0.0
        education_score = 1.0 if education_match else 0.0
        
        overall_score = (skill_score * 0.6) + (experience_score * 0.25) + (education_score * 0.15)
        return round(overall_score, 2)
    
    def _generate_recommendations(self, cv_data: Dict[str, Any], jd_data: Dict[str, Any], 
                                skill_match: Dict[str, Any], experience_match: bool, education_match: bool) -> List[str]:
        """Generate recommendations based on comparison results"""
        recommendations = []
        
        # Skill recommendations
        if skill_match['required_missing']:
            recommendations.append(f"Cần học thêm các kỹ năng bắt buộc: {', '.join(skill_match['required_missing'])}")
        
        if skill_match['required_score'] < 0.7:
            recommendations.append("Cần cải thiện kỹ năng chuyên môn để đáp ứng yêu cầu công việc")
        
        # Experience recommendations
        if not experience_match:
            cv_exp = cv_data.get('experience_years', 0)
            required_exp = jd_data.get('experience_required', 0)
            recommendations.append(f"Cần thêm {required_exp - cv_exp} năm kinh nghiệm để đáp ứng yêu cầu")
        
        # Education recommendations
        if not education_match:
            recommendations.append("Cần xem xét nâng cao trình độ học vấn theo yêu cầu công việc")
        
        # Positive recommendations
        if skill_match['score'] >= 0.8:
            recommendations.append("Hồ sơ rất phù hợp với vị trí này!")
        elif skill_match['score'] >= 0.6:
            recommendations.append("Hồ sơ khá phù hợp, có thể ứng tuyển")
        
        if not recommendations:
            recommendations.append("Hồ sơ đáp ứng tốt các yêu cầu của công việc")
        
        return recommendations