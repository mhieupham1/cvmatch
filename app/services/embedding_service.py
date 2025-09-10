import json
import numpy as np
import pickle
from openai import OpenAI
from typing import Dict, Any, List
from sklearn.metrics.pairwise import cosine_similarity
import os

class EmbeddingService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
    def create_text_for_embedding(self, data: Dict[str, Any], data_type: str) -> str:
        """Tạo text tổng hợp từ CV hoặc JD data để embedding"""
        if data_type == "cv":
            text_parts = []
            
            if data.get('name'):
                text_parts.append(f"Name: {data['name']}")
            if data.get('role'):
                text_parts.append(f"Role: {data['role']}")
            if data.get('location'):
                text_parts.append(f"Location: {data['location']}")
            if data.get('experience_years'):
                text_parts.append(f"Experience: {data['experience_years']} years")
            if data.get('languages'):
                text_parts.append(f"Languages: {', '.join(data['languages'])}")
            if data.get('project_scope'):
                text_parts.append(f"Project Types: {', '.join(data['project_scope'])}")
            if data.get('customer'):
                text_parts.append(f"Customer Markets: {', '.join(data['customer'])}")
            if data.get('skills'):
                text_parts.append(f"Skills: {', '.join(data['skills'])}")
            if data.get('education'):
                text_parts.append(f"Education: {', '.join(data['education'])}")
            if data.get('certifications'):
                text_parts.append(f"Certifications: {', '.join(data['certifications'])}")
            if data.get('work_experience'):
                work_exp = []
                for exp in data['work_experience']:
                    if isinstance(exp, dict):
                        exp_text = " ".join([str(v) for v in exp.values() if v])
                    else:
                        exp_text = str(exp)
                    work_exp.append(exp_text)
                text_parts.append(f"Work Experience: {' | '.join(work_exp)}")
                
        elif data_type == "jd":
            text_parts = []
            
            if data.get('job_title'):
                text_parts.append(f"Job Title: {data['job_title']}")
            if data.get('company'):
                text_parts.append(f"Company: {data['company']}")
            if data.get('experience_required'):
                text_parts.append(f"Experience Required: {data['experience_required']} years")
            if data.get('required_skills'):
                text_parts.append(f"Required Skills: {', '.join(data['required_skills'])}")
            if data.get('preferred_skills'):
                text_parts.append(f"Preferred Skills: {', '.join(data['preferred_skills'])}")
            if data.get('education_required'):
                text_parts.append(f"Education Required: {', '.join(data['education_required'])}")
            if data.get('responsibilities'):
                text_parts.append(f"Responsibilities: {', '.join(data['responsibilities'])}")
        
        return " | ".join(text_parts)
    
    def generate_embedding(self, text: str) -> np.ndarray:
        """Tạo embedding vector từ text sử dụng OpenAI API"""
        try:
            response = self.client.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            embedding = np.array(response.data[0].embedding, dtype=np.float32)
            return embedding
        except Exception as e:
            raise Exception(f"Error generating embedding: {str(e)}")
    
    async def get_embedding(self, text: str) -> np.ndarray:
        """Async version of generate_embedding"""
        return self.generate_embedding(text)
    
    def serialize_embedding(self, embedding: np.ndarray) -> bytes:
        """Chuyển embedding thành bytes để lưu vào database"""
        return pickle.dumps(embedding)
    
    def deserialize_embedding(self, embedding_bytes: bytes) -> np.ndarray:
        """Chuyển bytes thành embedding array"""
        return pickle.loads(embedding_bytes)
    
    def calculate_cosine_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Tính cosine similarity giữa 2 embedding vectors"""
        try:
            # Reshape để đảm bảo đúng format cho cosine_similarity
            emb1 = embedding1.reshape(1, -1)
            emb2 = embedding2.reshape(1, -1)
            
            similarity = cosine_similarity(emb1, emb2)[0][0]
            return float(similarity)
        except Exception as e:
            raise Exception(f"Error calculating similarity: {str(e)}")
    
    def find_similar_items(self, target_embedding: np.ndarray, candidate_embeddings: List[tuple], 
                          similarity_threshold: float = 0.7, top_k: int = 10, 
                          target_category: str = None, candidate_categories: Dict[str, str] = None) -> List[tuple]:
        """
        Tìm các items tương đồng dựa trên embedding với job category filtering
        
        Args:
            target_embedding: embedding của item cần tìm tương đồng
            candidate_embeddings: list các tuple (id, embedding) của candidates
            similarity_threshold: ngưỡng similarity tối thiểu
            top_k: số lượng kết quả trả về tối đa
            target_category: category của target item (để filter)
            candidate_categories: dict mapping item_id -> category của candidates
        
        Returns:
            List các tuple (id, similarity_score) được sắp xếp theo similarity giảm dần
        """
        similarities = []
        
        for item_id, embedding in candidate_embeddings:
            try:
                # Lọc theo category trước nếu có
                if target_category and candidate_categories:
                    candidate_category = candidate_categories.get(str(item_id))
                    if candidate_category and candidate_category != target_category:
                        continue
                
                similarity = self.calculate_cosine_similarity(target_embedding, embedding)
                if similarity >= similarity_threshold:
                    similarities.append((item_id, similarity))
            except Exception as e:
                print(f"Error calculating similarity for item {item_id}: {str(e)}")
                continue
        
        # Sắp xếp theo similarity giảm dần và lấy top_k
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]