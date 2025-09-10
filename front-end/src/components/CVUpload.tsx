import React, { useState } from 'react';
import { uploadCV, bulkUploadCVs, BulkUploadResponse, BulkUploadResult } from '../services/api';

const CVUpload: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkUploadResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [uploadMode, setUploadMode] = useState<'single' | 'multiple'>('single');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      const validFiles: File[] = [];
      const invalidFiles: string[] = [];
      
      fileArray.forEach(file => {
        if (file.name.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().endsWith('.docx')) {
          validFiles.push(file);
        } else {
          invalidFiles.push(file.name);
        }
      });
      
      if (invalidFiles.length > 0) {
        setError(`These files are not supported (only PDF and DOCX): ${invalidFiles.join(', ')}`);
      } else {
        setError('');
      }
      
      setSelectedFiles(validFiles);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      let result: BulkUploadResponse;
      
      if (uploadMode === 'single' && selectedFiles.length === 1) {
        // Single file upload for backward compatibility
        const singleResult = await uploadCV(selectedFiles[0]);
        result = {
          total_files: 1,
          successful_uploads: 1,
          failed_uploads: 0,
          results: [{
            filename: singleResult.filename,
            success: true,
            result: singleResult
          }]
        };
      } else {
        // Bulk upload
        result = await bulkUploadCVs(selectedFiles);
      }
      
      setUploadResult(result);
      setSelectedFiles([]);
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
      
      <div className="upload-mode-selector">
        <label>
          <input
            type="radio"
            value="single"
            checked={uploadMode === 'single'}
            onChange={(e) => setUploadMode(e.target.value as 'single' | 'multiple')}
          />
          Single Upload
        </label>
        <label>
          <input
            type="radio"
            value="multiple"
            checked={uploadMode === 'multiple'}
            onChange={(e) => setUploadMode(e.target.value as 'single' | 'multiple')}
          />
          Multiple Upload
        </label>
      </div>
      
      <div className="upload-form">
        <div className="file-input-container">
          <input
            id="cv-file-input"
            type="file"
            accept=".pdf,.docx"
            multiple={uploadMode === 'multiple'}
            onChange={handleFileChange}
            className="file-input"
          />
          <label htmlFor="cv-file-input" className="file-input-label">
            {selectedFiles.length > 0 
              ? `${selectedFiles.length} file(s) selected: ${selectedFiles.map(f => f.name).join(', ')}`
              : `Choose CV file(s) (PDF or DOCX)`
            }
          </label>
        </div>

        {selectedFiles.length > 0 && (
          <div className="selected-files">
            <h4>Selected Files:</h4>
            <ul>
              {selectedFiles.map((file, index) => (
                <li key={index} className="file-item">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </li>
              ))}
            </ul>
          </div>
        )}

        <button 
          onClick={handleUpload} 
          disabled={selectedFiles.length === 0 || uploading}
          className={`btn ${uploading ? 'btn-loading' : 'btn-primary'}`}
        >
          {uploading 
            ? `Uploading ${selectedFiles.length} file(s)...` 
            : `Upload ${selectedFiles.length} CV(s)`
          }
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {uploadResult && (
        <div className="upload-result">
          <h3>Upload Results</h3>
          
          <div className="upload-summary">
            <p><strong>Total Files:</strong> {uploadResult.total_files}</p>
            <p><strong>Successful:</strong> {uploadResult.successful_uploads}</p>
            {uploadResult.failed_uploads > 0 && (
              <p><strong>Failed:</strong> {uploadResult.failed_uploads}</p>
            )}
          </div>

          <div className="results-list">
            {uploadResult.results.map((result, index) => (
              <div key={index} className={`result-item ${result.success ? 'success' : 'error'}`}>
                <div className="result-header">
                  <h4>{result.filename}</h4>
                  <span className={`status ${result.success ? 'success' : 'error'}`}>
                    {result.success ? '✓ Success' : '✗ Failed'}
                  </span>
                </div>
                
                {result.error && (
                  <div className="error-details">
                    <strong>Error:</strong> {result.error}
                  </div>
                )}
                
                {result.success && result.result && (
                  <div className="result-details">
                    <p><strong>ID:</strong> {result.result.id}</p>
                    
                    {result.result.parsed_data && (
                      <div className="parsed-data">
                        <h5>Parsed Information:</h5>
                        <div className="data-grid">
                          {result.result.parsed_data.name && (
                            <div><strong>Name:</strong> {result.result.parsed_data.name}</div>
                          )}
                          {result.result.parsed_data.email && (
                            <div><strong>Email:</strong> {result.result.parsed_data.email}</div>
                          )}
                          {result.result.parsed_data.phone && (
                            <div><strong>Phone:</strong> {result.result.parsed_data.phone}</div>
                          )}
                          {result.result.parsed_data.role && (
                            <div><strong>Role:</strong> {result.result.parsed_data.role}</div>
                          )}
                          {result.result.parsed_data.experience_years && (
                            <div><strong>Experience:</strong> {result.result.parsed_data.experience_years} years</div>
                          )}
                          {result.result.parsed_data.skills && result.result.parsed_data.skills.length > 0 && (
                            <div className="skills-section">
                              <strong>Skills:</strong>
                              <div className="skills-list">
                                {result.result.parsed_data.skills.map((skill: string, skillIndex: number) => (
                                  <span key={skillIndex} className="skill-tag">{skill}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <button onClick={clearResult} className="btn btn-secondary">
            Upload More CVs
          </button>
        </div>
      )}
    </div>
  );
};

export default CVUpload;