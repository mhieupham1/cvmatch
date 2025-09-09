from typing import Dict, Any, List
from app.models.schemas import ComparisonResult

class ComparisonService:
    def compare(self, cv_data: Dict[str, Any], jd_data: Dict[str, Any]) -> ComparisonResult:
        """Compare CV data with JD data and return match score and recommendations"""
        
        # Quick role filter - if roles don't match, give low score
        role_match_score = self._calculate_role_match(
            cv_data.get('role', ''),
            jd_data.get('job_title', '')
        )
        
        # If role match score is very low, return early with low overall score
        if role_match_score < 0.3:
            return ComparisonResult(
                match_score=0.2,
                skill_match={'score': 0.0, 'required_matches': [], 'required_missing': jd_data.get('required_skills', [])},
                experience_match=False,
                education_match=False,
                recommendations=[f"CV role '{cv_data.get('role', 'không xác định')}' không phù hợp với vị trí '{jd_data.get('job_title', '')}'"]
            )
        
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
        
        # Calculate overall match score (now includes role match)
        match_score = self._calculate_overall_score(
            skill_match['score'],
            experience_match,
            education_match,
            role_match_score
        )
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            cv_data, jd_data, skill_match, experience_match, education_match, role_match_score
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
    
    def _calculate_role_match(self, cv_role: str, jd_role: str) -> float:
        """Calculate role matching score"""
        if not cv_role or not jd_role:
            return 0.5  # Neutral score if either role is missing
        
        cv_role_lower = cv_role.lower().strip()
        jd_role_lower = jd_role.lower().strip()
        
        # Exact match
        if cv_role_lower == jd_role_lower:
            return 1.0
        
        # Check if one role is contained in another
        if cv_role_lower in jd_role_lower or jd_role_lower in cv_role_lower:
            return 0.8
        
        # Common keywords matching
        cv_words = set(cv_role_lower.split())
        jd_words = set(jd_role_lower.split())
        
        # Remove common stop words
        stop_words = {'senior', 'junior', 'lead', 'principal', 'staff', 'intern', 'entry', 'level', 'mid'}
        cv_keywords = cv_words - stop_words
        jd_keywords = jd_words - stop_words
        
        if cv_keywords & jd_keywords:  # Has common keywords
            overlap_ratio = len(cv_keywords & jd_keywords) / max(len(cv_keywords), len(jd_keywords), 1)
            return min(0.7, overlap_ratio * 1.2)  # Max 0.7 for keyword match
        
        # Check for related roles (basic matching)
        related_roles = {
            'developer': ['engineer', 'programmer', 'coder'],
            'engineer': ['developer', 'programmer'],
            'analyst': ['specialist', 'consultant'],
            'manager': ['lead', 'director', 'head'],
        }
        
        for role_type, related in related_roles.items():
            if role_type in cv_role_lower:
                if any(related_role in jd_role_lower for related_role in related):
                    return 0.6
            if role_type in jd_role_lower:
                if any(related_role in cv_role_lower for related_role in related):
                    return 0.6
        
        return 0.2  # Very low score for unrelated roles
    
    def _calculate_overall_score(self, skill_score: float, experience_match: bool, education_match: bool, role_match_score: float = 1.0) -> float:
        """Calculate overall matching score"""
        # Weights: Role 20%, Skills 50%, Experience 20%, Education 10%
        experience_score = 1.0 if experience_match else 0.0
        education_score = 1.0 if education_match else 0.0
        
        overall_score = (role_match_score * 0.2) + (skill_score * 0.5) + (experience_score * 0.2) + (education_score * 0.1)
        return round(overall_score, 2)
    
    def _generate_recommendations(self, cv_data: Dict[str, Any], jd_data: Dict[str, Any], 
                                skill_match: Dict[str, Any], experience_match: bool, education_match: bool, role_match_score: float = 1.0) -> List[str]:
        """Generate recommendations based on comparison results"""
        recommendations = []
        
        # Role recommendations
        if role_match_score < 0.3:
            recommendations.append(f"Role không phù hợp: CV role '{cv_data.get('role', 'không xác định')}' vs JD role '{jd_data.get('job_title', '')}'")
        elif role_match_score < 0.6:
            recommendations.append("Role có liên quan nhưng không hoàn toàn phù hợp, cần xem xét kỹ")
        
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