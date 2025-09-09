import React, { useState } from 'react';
import { uploadJD } from '../services/api';

const JDUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().endsWith('.docx')) {
        setSelectedFile(file);
        setError('');
      } else {
        setError('Only PDF and DOCX files are supported');
        setSelectedFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const result = await uploadJD(selectedFile);
      setUploadResult(result);
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('jd-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const clearResult = () => {
    setUploadResult(null);
    setError('');
  };

  return (
    <div className="upload-container">
      <h2>Upload Job Description</h2>
      
      <div className="upload-form">
        <div className="file-input-container">
          <input
            id="jd-file-input"
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            className="file-input"
          />
          <label htmlFor="jd-file-input" className="file-input-label">
            {selectedFile ? selectedFile.name : 'Choose JD file (PDF or DOCX)'}
          </label>
        </div>

        <button 
          onClick={handleUpload} 
          disabled={!selectedFile || uploading}
          className={`btn ${uploading ? 'btn-loading' : 'btn-primary'}`}
        >
          {uploading ? 'Uploading...' : 'Upload JD'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {uploadResult && (
        <div className="upload-result">
          <h3>Upload Successful!</h3>
          <div className="result-details">
            <p><strong>File:</strong> {uploadResult.filename}</p>
            <p><strong>Status:</strong> {uploadResult.status}</p>
            <p><strong>ID:</strong> {uploadResult.id}</p>
            
            {uploadResult.parsed_data && (
              <div className="parsed-data">
                <h4>Parsed Information:</h4>
                <div className="data-grid">
                  {uploadResult.parsed_data.job_title && (
                    <div><strong>Job Title:</strong> {uploadResult.parsed_data.job_title}</div>
                  )}
                  {uploadResult.parsed_data.company && (
                    <div><strong>Company:</strong> {uploadResult.parsed_data.company}</div>
                  )}
                  {uploadResult.parsed_data.job_category && (
                    <div><strong>Category:</strong> {uploadResult.parsed_data.job_category}</div>
                  )}
                  {uploadResult.parsed_data.experience_required && (
                    <div><strong>Experience Required:</strong> {uploadResult.parsed_data.experience_required} years</div>
                  )}
                  {uploadResult.parsed_data.required_skills && uploadResult.parsed_data.required_skills.length > 0 && (
                    <div className="skills-section">
                      <strong>Required Skills:</strong>
                      <div className="skills-list">
                        {uploadResult.parsed_data.required_skills.map((skill: string, index: number) => (
                          <span key={index} className="skill-tag required">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {uploadResult.parsed_data.preferred_skills && uploadResult.parsed_data.preferred_skills.length > 0 && (
                    <div className="skills-section">
                      <strong>Preferred Skills:</strong>
                      <div className="skills-list">
                        {uploadResult.parsed_data.preferred_skills.map((skill: string, index: number) => (
                          <span key={index} className="skill-tag preferred">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {uploadResult.parsed_data.responsibilities && uploadResult.parsed_data.responsibilities.length > 0 && (
                    <div className="responsibilities-section">
                      <strong>Responsibilities:</strong>
                      <ul className="responsibilities-list">
                        {uploadResult.parsed_data.responsibilities.map((resp: string, index: number) => (
                          <li key={index}>{resp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <button onClick={clearResult} className="btn btn-secondary">
            Upload Another JD
          </button>
        </div>
      )}
    </div>
  );
};

export default JDUpload;