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
