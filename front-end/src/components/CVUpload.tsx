import React, { useState } from 'react';
import { uploadCV } from '../services/api';

const CVUpload: React.FC = () => {
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
      const result = await uploadCV(selectedFile);
      setUploadResult(result);
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('cv-file-input') as HTMLInputElement;
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
      <h2>Upload CV</h2>
      
      <div className="upload-form">
        <div className="file-input-container">
          <input
            id="cv-file-input"
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            className="file-input"
          />
          <label htmlFor="cv-file-input" className="file-input-label">
            {selectedFile ? selectedFile.name : 'Choose CV file (PDF or DOCX)'}
          </label>
        </div>

        <button 
          onClick={handleUpload} 
          disabled={!selectedFile || uploading}
          className={`btn ${uploading ? 'btn-loading' : 'btn-primary'}`}
        >
          {uploading ? 'Uploading...' : 'Upload CV'}
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
                  {uploadResult.parsed_data.name && (
                    <div><strong>Name:</strong> {uploadResult.parsed_data.name}</div>
                  )}
                  {uploadResult.parsed_data.email && (
                    <div><strong>Email:</strong> {uploadResult.parsed_data.email}</div>
                  )}
                  {uploadResult.parsed_data.phone && (
                    <div><strong>Phone:</strong> {uploadResult.parsed_data.phone}</div>
                  )}
                  {uploadResult.parsed_data.role && (
                    <div><strong>Role:</strong> {uploadResult.parsed_data.role}</div>
                  )}
                  {uploadResult.parsed_data.experience_years && (
                    <div><strong>Experience:</strong> {uploadResult.parsed_data.experience_years} years</div>
                  )}
                  {uploadResult.parsed_data.skills && uploadResult.parsed_data.skills.length > 0 && (
                    <div className="skills-section">
                      <strong>Skills:</strong>
                      <div className="skills-list">
                        {uploadResult.parsed_data.skills.map((skill: string, index: number) => (
                          <span key={index} className="skill-tag">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <button onClick={clearResult} className="btn btn-secondary">
            Upload Another CV
          </button>
        </div>
      )}
    </div>
  );
};

export default CVUpload;