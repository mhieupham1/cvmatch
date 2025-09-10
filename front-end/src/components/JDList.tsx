import React, { useState, useEffect } from 'react';
import { getJDs, JDResponse, API_BASE_URL, findCVsForJD, EmbeddingMatchCV, compareCvJdWithAI, AICompareResponse, approveCV } from '../services/api';

const JDList: React.FC = () => {
  const [jds, setJds] = useState<JDResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [matches, setMatches] = useState<Record<number, { loading: boolean; error?: string; data?: EmbeddingMatchCV[] }>>({});
  const [aiResults, setAiResults] = useState<Record<string, { loading: boolean; error?: string; data?: AICompareResponse }>>({});
  const [selected, setSelected] = useState<{ jdId: number; cv: EmbeddingMatchCV } | null>(null);
  const [approving, setApproving] = useState<boolean>(false);
  const [approved, setApproved] = useState<Record<number, boolean>>({});

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

  const openCandidate = (cv: EmbeddingMatchCV, jdId: number) => {
    setSelected({ jdId, cv });
  };

  const closeCandidate = () => {
    setSelected(null);
  };

  const handleApprove = async (cvId: number) => {
    try {
      setApproving(true);
      await approveCV(cvId);
      setApproved((prev) => ({ ...prev, [cvId]: true }));
      alert('Đã duyệt ứng viên chờ phỏng vấn');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to approve CV');
    } finally {
      setApproving(false);
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
                            <div>
                              <button
                                className="link-as-button"
                                style={{ background: 'none', border: 'none', padding: 0, color: '#1976d2', cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => openCandidate(m, jd.id)}
                                title="Xem chi tiết ứng viên"
                              >
                                {m.name || 'Unknown Candidate'}
                              </button>
                              {m.role ? ` — ${m.role}` : ''}
                            </div>
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
      {selected && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={closeCandidate}
        >
          <div
            className="modal-content"
            style={{ background: '#fff', borderRadius: 8, width: 'min(720px, 96vw)', maxHeight: '90vh', overflow: 'auto', padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{selected.cv.name || 'Ứng viên'}</h3>
              <button className="btn btn-secondary" onClick={closeCandidate}>Đóng</button>
            </div>
            <div style={{ marginTop: 8, fontSize: 14, color: '#555' }}>
              <div><strong>ID:</strong> {selected.cv.cv_id}</div>
              {selected.cv.role && <div><strong>Role:</strong> {selected.cv.role}</div>}
              {typeof (selected.cv as any).email !== 'undefined' && (selected.cv as any).email && (
                <div><strong>Email:</strong> {(selected.cv as any).email}</div>
              )}
              {typeof (selected.cv as any).experience_years !== 'undefined' && selected.cv.experience_years !== undefined && (
                <div><strong>Kinh nghiệm:</strong> {selected.cv.experience_years} năm</div>
              )}
            </div>
            <div style={{ marginTop: 12 }}>
              <strong>Kỹ năng ({selected.cv.skills?.length || 0}):</strong>
              <div className="skills-list" style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(selected.cv.skills || []).map((s, idx) => (
                  <span key={idx} className="skill-tag" style={{ background: '#f3f3f3', padding: '4px 8px', borderRadius: 4 }}>{s}</span>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <em>Similarity score:</em> {Math.round((selected.cv.similarity_score || 0) * 100)}%
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                className="btn btn-success"
                disabled={approving || approved[selected.cv.cv_id]}
                onClick={() => handleApprove(selected.cv.cv_id)}
              >
                {approved[selected.cv.cv_id] ? 'Đã duyệt' : (approving ? 'Đang duyệt...' : 'Duyệt ứng viên phỏng vấn')}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleEvaluateAI(selected.cv.cv_id, selected.jdId)}
                disabled={aiResults[`${selected.cv.cv_id}:${selected.jdId}`]?.loading}
              >
                {aiResults[`${selected.cv.cv_id}:${selected.jdId}`]?.loading ? 'Đang đánh giá...' : 'Đánh giá với AI'}
              </button>
            </div>
            {aiResults[`${selected.cv.cv_id}:${selected.jdId}`]?.error && (
              <div className="error-message" style={{ marginTop: 8 }}>
                {aiResults[`${selected.cv.cv_id}:${selected.jdId}`]?.error}
              </div>
            )}
            {aiResults[`${selected.cv.cv_id}:${selected.jdId}`]?.data && (
              <div className="ai-result" style={{ marginTop: 12 }}>
                <div><strong>AI Match Score:</strong> {aiResults[`${selected.cv.cv_id}:${selected.jdId}`]!.data!.result.match_score}%</div>
                <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{aiResults[`${selected.cv.cv_id}:${selected.jdId}`]!.data!.result.reason}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JDList;
