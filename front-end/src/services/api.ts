import axios from 'axios';

export const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface CVResponse {
  id: number;
  filename: string;
  file_url?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  experience_years?: number;
  skills: string[];
  education: string[];
  work_experience: any[];
  certifications: string[];
  created_at: string;
}

export interface JDResponse {
  id: number;
  filename: string;
  file_url?: string;
  job_title: string;
  company: string;
  required_skills: string[];
  preferred_skills: string[];
  experience_required?: number;
  education_required: string[];
  responsibilities: string[];
  created_at: string;
}

export interface FileUploadResponse {
  id: number;
  filename: string;
  file_type: string;
  status: string;
  parsed_data: any;
  created_at: string;
}

// Embedding match types
export interface EmbeddingMatchJD {
  jd_id: number;
  similarity_score: number;
  job_title?: string;
  company?: string;
  required_skills: string[];
  experience_required?: number;
  created_at: string;
}

export interface EmbeddingComparisonResult {
  cv_id: number;
  matched_jds: EmbeddingMatchJD[];
  total_matches: number;
}

export interface EmbeddingMatchCV {
  cv_id: number;
  similarity_score: number;
  name?: string;
  email?: string;
  role?: string;
  skills: string[];
  experience_years?: number;
  created_at: string;
}

export interface JDEmbeddingComparisonResult {
  jd_id: number;
  matched_cvs: EmbeddingMatchCV[];
  total_matches: number;
}

// AI comparison
export interface AICompareResponse {
  comparison_type: string;
  cv_id: number;
  jd_id: number;
  result: {
    match_score: number;
    reason: string;
  };
}

export const uploadCV = async (file: File): Promise<FileUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/upload/cv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const uploadJD = async (file: File): Promise<FileUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/upload/jd', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const getCVs = async (): Promise<CVResponse[]> => {
  const response = await api.get('/cvs');
  return response.data;
};

export const getJDs = async (): Promise<JDResponse[]> => {
  const response = await api.get('/jds');
  return response.data;
};

export const deleteAllCVs = async (): Promise<{ message: string }> => {
  const response = await api.delete('/cvs');
  return response.data;
};

export const deleteAllJDs = async (): Promise<{ message: string }> => {
  const response = await api.delete('/jds');
  return response.data;
};

export const findJDsForCV = async (
  cvId: number,
  topK: number = 5,
  similarityThreshold: number = 0.7
): Promise<EmbeddingComparisonResult> => {
  const response = await api.post('/compare/cv_embedding', {
    cv_id: cvId,
    top_k: topK,
    similarity_threshold: similarityThreshold,
  });
  return response.data;
};

export const findCVsForJD = async (
  jdId: number,
  topK: number = 5,
  similarityThreshold: number = 0.7
): Promise<JDEmbeddingComparisonResult> => {
  const response = await api.post('/compare/jd_embedding', {
    jd_id: jdId,
    top_k: topK,
    similarity_threshold: similarityThreshold,
  });
  return response.data;
};

export const compareCvJdWithAI = async (
  cvId: number,
  jdId: number
): Promise<AICompareResponse> => {
  const response = await api.post('/compare/openai', {
    cv_id: cvId,
    jd_id: jdId,
  });
  return response.data;
};
