import React, { useState, useEffect } from 'react';
import { getJDs, deleteAllJDs, JDResponse, API_BASE_URL, findCVsForJD, EmbeddingMatchCV, compareCvJdWithAI, AICompareResponse } from '../services/api';

const JDList: React.FC = () => {
  const [jds, setJds] = useState<JDResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [deleting, setDeleting] = useState(false);
  const [matches, setMatches] = useState<Record<number, { loading: boolean; error?: string; data?: EmbeddingMatchCV[] }>>({});
  const [aiResults, setAiResults] = useState<Record<string, { loading: boolean; error?: string; data?: AICompareResponse }>>({});

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

  const handleFindMatches = async (jdId: number) => {
    setMatches((prev) => ({ ...prev, [jdId]: { loading: true } }));
    try {
      const res = await findCVsForJD(jdId, 5, 0.6);
      setMatches((prev) => ({ ...prev, [jdId]: { loading: false, data: res.matched_cvs } }));
    } catch (err: any) {
      setMatches((prev) => ({ ...prev, [jdId]: { loading: false, error: err.response?.data?.detail || 'Failed to find matches' } }));
    }
  };

  const handleEvaluateAI = async (cvId: number, jdId: number) => {
    const key = `${cvId}:${jdId}`;
    setAiResults((prev) => ({ ...prev, [key]: { loading: true } }));
    try {
      const res = await compareCvJdWithAI(cvId, jdId);
      setAiResults((prev) => ({ ...prev, [key]: { loading: false, data: res } }));
    } catch (err: any) {
      setAiResults((prev) => ({ ...prev, [key]: { loading: false, error: err.response?.data?.detail || 'AI evaluation failed' } }));
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
                <div className="detail-row" style={{ marginTop: '8px' }}>
                  <button className="btn btn-primary" onClick={() => handleFindMatches(jd.id)} disabled={matches[jd.id]?.loading}>
                    {matches[jd.id]?.loading ? 'Finding matches...' : 'Find Matches'}
                  </button>
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
                {matches[jd.id]?.error && (
                  <div className="error-message" style={{ marginTop: '8px' }}>
                    {matches[jd.id]?.error}
                  </div>
                )}
                {matches[jd.id]?.data && matches[jd.id]?.data!.length > 0 && (
                  <div className="matches-section" style={{ marginTop: '12px' }}>
                    <strong>Related CVs:</strong>
                    <div className="matches-list" style={{ marginTop: '8px' }}>
                      {matches[jd.id]!.data!.map((m) => {
                        const key = `${m.cv_id}:${jd.id}`;
                        const scorePct = Math.round((m.similarity_score || 0) * 100);
                        const ai = aiResults[key];
                        return (
                          <div key={m.cv_id} className="match-item" style={{ border: '1px solid #eee', borderRadius: 6, padding: 8, marginBottom: 8 }}>
                            <div><strong>{m.name || 'Unknown Candidate'}</strong>{m.role ? ` — ${m.role}` : ''}</div>
                            <div style={{ fontSize: 12, color: '#555' }}>Similarity: {scorePct}%</div>
                            <div style={{ marginTop: 6 }}>
                              <button className="btn btn-secondary" onClick={() => handleEvaluateAI(m.cv_id, jd.id)} disabled={ai?.loading}>
                                {ai?.loading ? 'Evaluating...' : 'Evaluate with AI'}
                              </button>
                            </div>
                            {ai?.error && (
                              <div className="error-message" style={{ marginTop: 6 }}>{ai.error}</div>
                            )}
                            {ai?.data && (
                              <div className="ai-result" style={{ marginTop: 8 }}>
                                <div><strong>AI Match Score:</strong> {ai.data.result.match_score}%</div>
                                <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{ai.data.result.reason}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JDList;
