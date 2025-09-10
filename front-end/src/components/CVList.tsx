import React, { useState, useEffect } from 'react';
import {
  getCVs,
  CVResponse,
  API_BASE_URL,
  findJDsForCV,
  EmbeddingMatchJD,
  compareCvJdWithAI,
  AICompareResponse,
} from '../services/api';

const CVList: React.FC = () => {
  const [cvs, setCvs] = useState<CVResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [matches, setMatches] = useState<Record<number, { loading: boolean; error?: string; data?: EmbeddingMatchJD[] }>>({});
  const [aiResults, setAiResults] = useState<Record<string, { loading: boolean; error?: string; data?: AICompareResponse }>>({});
  const [history, setHistory] = useState<Record<number, { loading: boolean; error?: string; data?: any[]; open?: boolean }>>({});

  useEffect(() => {
    fetchCVs();
  }, []);

  const fetchCVs = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getCVs({ status: 'new' });
      setCvs(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch CVs');
    } finally {
      setLoading(false);
    }
  };

  const handleFindMatches = async (cvId: number) => {
    setMatches((prev) => ({ ...prev, [cvId]: { loading: true } }));
    try {
      const res = await findJDsForCV(cvId, 5, 0.6);
      setMatches((prev) => ({ ...prev, [cvId]: { loading: false, data: res.matched_jds } }));
    } catch (err: any) {
      setMatches((prev) => ({ ...prev, [cvId]: { loading: false, error: err.response?.data?.detail || 'Failed to find matches' } }));
    }
  };

  const handleEvaluateAI = async (cvId: number, jdId: number) => {
    const key = `${cvId}:${jdId}`;
    setAiResults((prev) => ({ ...prev, [key]: { loading: true } }));
    try {
      const res = await compareCvJdWithAI(cvId, jdId);
      setAiResults((prev) => ({ ...prev, [key]: { loading: false, data: res } }));
      // refresh history for this CV after saving
      fetchHistory(cvId);
    } catch (err: any) {
      setAiResults((prev) => ({ ...prev, [key]: { loading: false, error: err.response?.data?.detail || 'AI evaluation failed' } }));
    }
  };

  const fetchHistory = async (cvId: number) => {
    setHistory((prev) => ({ ...prev, [cvId]: { ...(prev[cvId] || {}), loading: true, open: true } }));
    try {
      const { getComparisons } = await import('../services/api');
      const items = await getComparisons({ cv_id: cvId });
      setHistory((prev) => ({ ...prev, [cvId]: { loading: false, data: items, open: true } }));
    } catch (err: any) {
      setHistory((prev) => ({ ...prev, [cvId]: { loading: false, error: err.response?.data?.detail || 'Failed to load history', open: true } }));
    }
  };

  const handleApprove = async (cvId: number) => {
    try {
      const { approveCV } = await import('../services/api');
      const updated = await approveCV(cvId);
      // Remove from list after approval (no longer 'new')
      setCvs((prev) => prev.filter((c) => c.id !== cvId));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to approve CV');
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

  const newCVs = cvs; // Already server-filtered by status=new

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
        <>
        <h3 style={{ marginTop: 12 }}>CV mới ({newCVs.length})</h3>
        <div className="cv-grid">
          {newCVs.map((cv) => (
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

                <div className="detail-row" style={{ marginTop: 6 }}>
                  <strong>Status:</strong> {cv.status || 'new'}
                </div>

                <div className="detail-row" style={{ marginTop: '8px' }}>
                  <button className="btn btn-primary" onClick={() => handleFindMatches(cv.id)} disabled={matches[cv.id]?.loading}>
                    {matches[cv.id]?.loading ? 'Finding matches...' : 'Find Matches'}
                  </button>
                  {cv.status !== 'awaiting_interview' && (
                    <button className="btn btn-success" onClick={() => handleApprove(cv.id)}>
                      Duyệt (chờ phỏng vấn)
                    </button>
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

                {matches[cv.id]?.error && (
                  <div className="error-message" style={{ marginTop: '8px' }}>
                    {matches[cv.id]?.error}
                  </div>
                )}

                {matches[cv.id]?.data && matches[cv.id]?.data!.length > 0 && (
                  <div className="matches-section" style={{ marginTop: '12px' }}>
                    <strong>Related JDs:</strong>
                    <div className="matches-list" style={{ marginTop: '8px' }}>
                      {matches[cv.id]!.data!.map((m) => {
                        const key = `${cv.id}:${m.jd_id}`;
                        const scorePct = Math.round((m.similarity_score || 0) * 100);
                        const ai = aiResults[key];
                        return (
                          <div key={m.jd_id} className="match-item" style={{ border: '1px solid #eee', borderRadius: 6, padding: 8, marginBottom: 8 }}>
                            <div><strong>{m.job_title || 'Unknown JD'}</strong> {m.company ? `@ ${m.company}` : ''}</div>
                            <div style={{ fontSize: 12, color: '#555' }}>Similarity: {scorePct}%</div>
                            <div style={{ marginTop: 6 }}>
                              <button className="btn btn-secondary" onClick={() => handleEvaluateAI(cv.id, m.jd_id)} disabled={ai?.loading}>
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
                                {cv.status !== 'awaiting_interview' && (
                                  <div style={{ marginTop: 8 }}>
                                    <button className="btn btn-success" onClick={() => handleApprove(cv.id)}>
                                      Duyệt CV này (chờ phỏng vấn)
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="detail-row" style={{ marginTop: 8 }}>
                  <button className="btn btn-secondary" onClick={() => (history[cv.id]?.open ? setHistory((prev) => ({ ...prev, [cv.id]: { ...(prev[cv.id] || {}), open: false } })) : fetchHistory(cv.id))}>
                    {history[cv.id]?.open ? 'Ẩn lịch sử AI' : 'Xem lịch sử AI'}
                  </button>
                </div>

                {history[cv.id]?.open && (
                  <div className="history-section" style={{ marginTop: 8 }}>
                    {history[cv.id]?.loading && <div>Loading history...</div>}
                    {history[cv.id]?.error && <div className="error-message">{history[cv.id]?.error}</div>}
                    {history[cv.id]?.data && (history[cv.id]?.data as any[]).length === 0 && <div>Chưa có lịch sử đánh giá.</div>}
                    {history[cv.id]?.data && (history[cv.id]?.data as any[]).length > 0 && (
                      <div>
                        <strong>Lịch sử đánh giá AI:</strong>
                        <ul style={{ marginTop: 6 }}>
                          {(history[cv.id]?.data as any[]).map((h: any) => (
                            <li key={h.id} style={{ fontSize: 13 }}>
                              [{formatDate(h.created_at)}] JD #{h.jd_id} — Score: {h.match_score}%
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
};

export default CVList;
