import React, { useState, useEffect } from 'react';
import { getCVs, deleteAllCVs, CVResponse, API_BASE_URL } from '../services/api';

const CVList: React.FC = () => {
  const [cvs, setCvs] = useState<CVResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCVs();
  }, []);

  const fetchCVs = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getCVs();
      setCvs(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch CVs');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete all CVs? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      await deleteAllCVs();
      setCvs([]);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete CVs');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="loading">Loading CVs...</div>;
  }

  return (
    <div className="list-container">
      <div className="list-header">
        <h2>CV List ({cvs.length})</h2>
        <div className="list-actions">
          <button 
            onClick={fetchCVs} 
            className="btn btn-secondary"
            disabled={loading}
          >
            Refresh
          </button>
          {cvs.length > 0 && (
            <button 
              onClick={handleDeleteAll} 
              className="btn btn-danger"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete All'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {cvs.length === 0 && !loading ? (
        <div className="empty-state">
          <h3>No CVs found</h3>
          <p>Upload your first CV to get started</p>
        </div>
      ) : (
        <div className="cv-grid">
          {cvs.map((cv) => (
            <div key={cv.id} className="cv-card">
              <div className="cv-header">
                <h3>{cv.name || 'Unknown Name'}</h3>
                <span className="cv-id">ID: {cv.id}</span>
              </div>
              
              <div className="cv-details">
                <div className="detail-row">
                  <strong>File:</strong> {cv.filename}
                  {cv.file_url && (
                    <span style={{ marginLeft: '8px' }}>
                      <a href={`${API_BASE_URL}${cv.file_url}`} target="_blank" rel="noopener noreferrer">Download</a>
                    </span>
                  )}
                </div>
                
                {cv.email && (
                  <div className="detail-row">
                    <strong>Email:</strong> {cv.email}
                  </div>
                )}
                
                {cv.phone && (
                  <div className="detail-row">
                    <strong>Phone:</strong> {cv.phone}
                  </div>
                )}
                
                {cv.role && (
                  <div className="detail-row">
                    <strong>Role:</strong> {cv.role}
                  </div>
                )}
                
                {cv.experience_years && (
                  <div className="detail-row">
                    <strong>Experience:</strong> {cv.experience_years} years
                  </div>
                )}
                
                {cv.skills && cv.skills.length > 0 && (
                  <div className="skills-section">
                    <strong>Skills ({cv.skills.length}):</strong>
                    <div className="skills-list">
                      {cv.skills.slice(0, 5).map((skill, index) => (
                        <span key={index} className="skill-tag">{skill}</span>
                      ))}
                      {cv.skills.length > 5 && (
                        <span className="skill-tag more">+{cv.skills.length - 5} more</span>
                      )}
                    </div>
                  </div>
                )}
                
                {cv.education && cv.education.length > 0 && (
                  <div className="education-section">
                    <strong>Education:</strong>
                    <ul className="education-list">
                      {cv.education.slice(0, 2).map((edu, index) => (
                        <li key={index}>{edu}</li>
                      ))}
                      {cv.education.length > 2 && (
                        <li>+{cv.education.length - 2} more</li>
                      )}
                    </ul>
                  </div>
                )}
                
                <div className="detail-row timestamp">
                  <strong>Uploaded:</strong> {formatDate(cv.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CVList;
