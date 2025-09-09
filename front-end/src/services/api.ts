import axios from 'axios';

// Use env var in production, relative path in dev to leverage CRA proxy
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

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
  status?: string;
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

export interface ComparisonHistoryItem {
  id: number;
  cv_id: number;
  jd_id: number;
  match_score: number;
  comparison_result: any;
  created_at: string;
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

export const getCVs = async (params?: { status?: string }): Promise<CVResponse[]> => {
  const response = await api.get('/cvs', { params });
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

export const getComparisons = async (
  params?: { cv_id?: number; jd_id?: number }
): Promise<ComparisonHistoryItem[]> => {
  const response = await api.get('/comparisons', { params });
  return response.data;
};

export const approveCV = async (cvId: number): Promise<CVResponse> => {
  const response = await api.post(`/cvs/${cvId}/approve`);
  return response.data;
};
