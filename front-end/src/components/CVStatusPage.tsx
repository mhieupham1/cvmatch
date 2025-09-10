import React, { useEffect, useState } from 'react';
import { getCVs, CVResponse, API_BASE_URL, EmbeddingMatchJD, compareCvJdWithAI, AICompareResponse, findJDsForCV } from '../services/api';

const CVStatusPage: React.FC = () => {
  const [approvedCVs, setApprovedCVs] = useState<CVResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const [matches, setMatches] = useState<Record<number, { loading: boolean; error?: string; data?: EmbeddingMatchJD[] }>>({});
  const [aiResults, setAiResults] = useState<Record<string, { loading: boolean; error?: string; data?: AICompareResponse }>>({});

  useEffect(() => {
    refreshLists();
  }, []);

  const refreshLists = async () => {
    try {
      setLoading(true);
      setError('');
      const approvedList = await getCVs({ status: 'awaiting_interview' });
      setApprovedCVs(approvedList);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load CVs by status');
    } finally {
      setLoading(false);
    }
  };

  // This page shows only approved CVs; approving is handled on /cvs

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

  const renderCVCard = (cv: CVResponse) => {
    const cvMatches = matches[cv.id];
    return (
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

          {cv.status !== 'awaiting_interview' && (
            <div className="detail-row" style={{ marginTop: '8px' }}>
              <button className="btn btn-primary" onClick={() => handleFindMatches(cv.id)} disabled={cvMatches?.loading}>
                {cvMatches?.loading ? 'Finding matches...' : 'Find Matches'}
              </button>
            </div>
          )}

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

          <div className="detail-row timestamp">
            <strong>Uploaded:</strong> {formatDate(cv.created_at)}
          </div>

          {cvMatches?.error && (
            <div className="error-message" style={{ marginTop: '8px' }}>
              {cvMatches?.error}
            </div>
          )}

          {cvMatches?.data && cvMatches?.data.length > 0 && (
            <div className="matches-section" style={{ marginTop: '12px' }}>
              <strong>Related JDs:</strong>
              <div className="matches-list" style={{ marginTop: '8px' }}>
                {cvMatches.data.map((m) => {
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
                          <div 
                            style={{ marginTop: 4 }} 
                            dangerouslySetInnerHTML={{ 
                              __html: ai.data.result.reason.startsWith('<') 
                                ? ai.data.result.reason 
                                : `<div>${ai.data.result.reason}</div>` 
                            }}
                          ></div>
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
    );
  };

  if (loading) {
    return <div className="loading">Loading CVs by status...</div>;
  }

  return (
    <div className="list-container">
      <div className="list-header">
        <h2>CV chờ phỏng vấn</h2>
        <div className="list-actions">
          <button onClick={refreshLists} className="btn btn-secondary">Refresh</button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <h3 style={{ marginTop: 12 }}>CV chờ phỏng vấn ({approvedCVs.length})</h3>
      <div className="cv-grid">
        {approvedCVs.map((cv) => renderCVCard(cv))}
      </div>
    </div>
  );
};

export default CVStatusPage;
