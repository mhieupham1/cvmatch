import chromadb
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import os
from .embedding_service import EmbeddingService

class VectorService:
    def __init__(self):
        self.embedding_service = EmbeddingService()
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(path="./chroma_db")
        
        # Create collections for CVs and JDs
        self.cv_collection = self.client.get_or_create_collection(
            name="cv_embeddings",
            metadata={"description": "CV embeddings for similarity search"}
        )
        self.jd_collection = self.client.get_or_create_collection(
            name="jd_embeddings", 
            metadata={"description": "JD embeddings for similarity search"}
        )
    
    def store_cv_embedding(self, cv_id: int, embedding: np.ndarray, metadata: Dict[str, Any] = None) -> None:
        """Store CV embedding in ChromaDB"""
        try:
            self.cv_collection.add(
                ids=[str(cv_id)],
                embeddings=[embedding.tolist()],
                metadatas=[metadata or {}]
            )
        except Exception as e:
            raise Exception(f"Error storing CV embedding: {str(e)}")
    
    def store_jd_embedding(self, jd_id: int, embedding: np.ndarray, metadata: Dict[str, Any] = None) -> None:
        """Store JD embedding in ChromaDB"""
        try:
            self.jd_collection.add(
                ids=[str(jd_id)],
                embeddings=[embedding.tolist()],
                metadatas=[metadata or {}]
            )
        except Exception as e:
            raise Exception(f"Error storing JD embedding: {str(e)}")
    
    def find_similar_jds_for_cv(self, cv_id: int, n_results: int = 10, 
                               similarity_threshold: float = 0.7, filter_by_category: bool = True) -> List[Tuple[int, float]]:
        """Find similar JDs for a given CV"""
        try:
            # Get CV embedding and metadata
            cv_result = self.cv_collection.get(ids=[str(cv_id)], include=["embeddings", "metadatas"])
            if not cv_result['embeddings']:
                raise ValueError(f"CV {cv_id} embedding not found")
            
            cv_embedding = cv_result['embeddings'][0]
            cv_category = cv_result['metadatas'][0].get('role_category') if cv_result['metadatas'] else None
            
            # Prepare where filter for category matching
            where_filter = None
            if filter_by_category and cv_category:
                where_filter = {"job_category": cv_category}
            
            # Search for similar JDs
            results = self.jd_collection.query(
                query_embeddings=[cv_embedding],
                n_results=n_results,
                include=["distances"],
                where=where_filter
            )
            
            # Convert ChromaDB distances to similarity scores and filter by threshold
            similar_jds = []
            for jd_id, distance in zip(results['ids'][0], results['distances'][0]):
                # ChromaDB uses L2 distance, convert to cosine similarity
                similarity = 1 - (distance / 2)  # Approximate conversion
                if similarity >= similarity_threshold:
                    similar_jds.append((int(jd_id), similarity))
            
            return similar_jds
            
        except Exception as e:
            raise Exception(f"Error finding similar JDs: {str(e)}")
    
    def find_similar_cvs_for_jd(self, jd_id: int, n_results: int = 10,
                               similarity_threshold: float = 0.7, filter_by_category: bool = True) -> List[Tuple[int, float]]:
        """Find similar CVs for a given JD"""
        try:
            # Get JD embedding and metadata
            jd_result = self.jd_collection.get(ids=[str(jd_id)], include=["embeddings", "metadatas"])
            if not jd_result['embeddings']:
                raise ValueError(f"JD {jd_id} embedding not found")
            
            jd_embedding = jd_result['embeddings'][0]
            jd_category = jd_result['metadatas'][0].get('job_category') if jd_result['metadatas'] else None
            
            # Prepare where filter for category matching
            where_filter = None
            if filter_by_category and jd_category:
                where_filter = {"role_category": jd_category}
            
            # Search for similar CVs
            results = self.cv_collection.query(
                query_embeddings=[jd_embedding],
                n_results=n_results,
                include=["distances"],
                where=where_filter
            )
            
            # Convert distances to similarity scores and filter by threshold
            similar_cvs = []
            for cv_id, distance in zip(results['ids'][0], results['distances'][0]):
                similarity = 1 - (distance / 2)  # Approximate conversion
                if similarity >= similarity_threshold:
                    similar_cvs.append((int(cv_id), similarity))
            
            return similar_cvs
            
        except Exception as e:
            raise Exception(f"Error finding similar CVs: {str(e)}")
    
    def delete_cv_embedding(self, cv_id: int) -> None:
        """Delete CV embedding from ChromaDB"""
        try:
            self.cv_collection.delete(ids=[str(cv_id)])
        except Exception as e:
            print(f"Warning: Could not delete CV embedding {cv_id}: {str(e)}")
    
    def delete_jd_embedding(self, jd_id: int) -> None:
        """Delete JD embedding from ChromaDB"""
        try:
            self.jd_collection.delete(ids=[str(jd_id)])
        except Exception as e:
            print(f"Warning: Could not delete JD embedding {jd_id}: {str(e)}")
    
    def update_cv_embedding(self, cv_id: int, embedding: np.ndarray, metadata: Dict[str, Any] = None) -> None:
        """Update CV embedding in ChromaDB"""
        try:
            self.cv_collection.upsert(
                ids=[str(cv_id)],
                embeddings=[embedding.tolist()],
                metadatas=[metadata or {}]
            )
        except Exception as e:
            raise Exception(f"Error updating CV embedding: {str(e)}")
    
    def update_jd_embedding(self, jd_id: int, embedding: np.ndarray, metadata: Dict[str, Any] = None) -> None:
        """Update JD embedding in ChromaDB"""
        try:
            self.jd_collection.upsert(
                ids=[str(jd_id)],
                embeddings=[embedding.tolist()],
                metadatas=[metadata or {}]
            )
        except Exception as e:
            raise Exception(f"Error updating JD embedding: {str(e)}")
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the collections"""
        return {
            "cv_count": self.cv_collection.count(),
            "jd_count": self.jd_collection.count(),
            "collections": {
                "cv_collection": self.cv_collection.name,
                "jd_collection": self.jd_collection.name
            }
        }
    
    def clear_all_embeddings(self) -> None:
        """Clear all embeddings from ChromaDB"""
        try:
            # Delete all documents in collections
            cv_all = self.cv_collection.get()
            if cv_all['ids']:
                self.cv_collection.delete(ids=cv_all['ids'])
            
            jd_all = self.jd_collection.get()
            if jd_all['ids']:
                self.jd_collection.delete(ids=jd_all['ids'])
                
        except Exception as e:
            raise Exception(f"Error clearing embeddings: {str(e)}")