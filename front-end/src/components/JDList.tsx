import React, { useState, useEffect } from 'react';
import { getJDs, deleteAllJDs, JDResponse, API_BASE_URL } from '../services/api';

const JDList: React.FC = () => {
  const [jds, setJds] = useState<JDResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchJDs();
  }, []);

  const fetchJDs = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getJDs();
      setJds(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch JDs');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete all Job Descriptions? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      await deleteAllJDs();
      setJds([]);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete JDs');
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
    return <div className="loading">Loading Job Descriptions...</div>;
  }

  return (
    <div className="list-container">
      <div className="list-header">
        <h2>Job Description List ({jds.length})</h2>
        <div className="list-actions">
          <button 
            onClick={fetchJDs} 
            className="btn btn-secondary"
            disabled={loading}
          >
            Refresh
          </button>
          {jds.length > 0 && (
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

      {jds.length === 0 && !loading ? (
        <div className="empty-state">
          <h3>No Job Descriptions found</h3>
          <p>Upload your first JD to get started</p>
        </div>
      ) : (
        <div className="jd-grid">
          {jds.map((jd) => (
            <div key={jd.id} className="jd-card">
              <div className="jd-header">
                <h3>{jd.job_title || 'Unknown Position'}</h3>
                <span className="jd-id">ID: {jd.id}</span>
              </div>
              
              <div className="jd-details">
                <div className="detail-row">
                  <strong>File:</strong> {jd.filename}
                  {jd.file_url && (
                    <span style={{ marginLeft: '8px' }}>
                      <a href={`${API_BASE_URL}${jd.file_url}`} target="_blank" rel="noopener noreferrer">Download</a>
                    </span>
                  )}
                </div>
                
                {jd.company && (
                  <div className="detail-row">
                    <strong>Company:</strong> {jd.company}
                  </div>
                )}
                
                {jd.experience_required && (
                  <div className="detail-row">
                    <strong>Experience Required:</strong> {jd.experience_required} years
                  </div>
                )}
                
                {jd.required_skills && jd.required_skills.length > 0 && (
                  <div className="skills-section">
                    <strong>Required Skills ({jd.required_skills.length}):</strong>
                    <div className="skills-list">
                      {jd.required_skills.slice(0, 5).map((skill, index) => (
                        <span key={index} className="skill-tag required">{skill}</span>
                      ))}
                      {jd.required_skills.length > 5 && (
                        <span className="skill-tag more">+{jd.required_skills.length - 5} more</span>
                      )}
                    </div>
                  </div>
                )}
                
                {jd.preferred_skills && jd.preferred_skills.length > 0 && (
                  <div className="skills-section">
                    <strong>Preferred Skills ({jd.preferred_skills.length}):</strong>
                    <div className="skills-list">
                      {jd.preferred_skills.slice(0, 3).map((skill, index) => (
                        <span key={index} className="skill-tag preferred">{skill}</span>
                      ))}
                      {jd.preferred_skills.length > 3 && (
                        <span className="skill-tag more">+{jd.preferred_skills.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}
                
                {jd.education_required && jd.education_required.length > 0 && (
                  <div className="education-section">
                    <strong>Education Required:</strong>
                    <ul className="education-list">
                      {jd.education_required.slice(0, 2).map((edu, index) => (
                        <li key={index}>{edu}</li>
                      ))}
                      {jd.education_required.length > 2 && (
                        <li>+{jd.education_required.length - 2} more</li>
                      )}
                    </ul>
                  </div>
                )}
                
                {jd.responsibilities && jd.responsibilities.length > 0 && (
                  <div className="responsibilities-section">
                    <strong>Responsibilities ({jd.responsibilities.length}):</strong>
                    <ul className="responsibilities-list">
                      {jd.responsibilities.slice(0, 3).map((resp, index) => (
                        <li key={index}>{resp}</li>
                      ))}
                      {jd.responsibilities.length > 3 && (
                        <li>+{jd.responsibilities.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}
                
                <div className="detail-row timestamp">
                  <strong>Uploaded:</strong> {formatDate(jd.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JDList;
