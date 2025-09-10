import React, { useState, useEffect } from 'react';
import {
  getJDs,
  JDResponse,
  API_BASE_URL,
  findCVsForJD,
  EmbeddingMatchCV,
  compareCvJdWithAI,
  AICompareResponse,
  approveCV,
} from '../services/api';

interface JDDetailModalProps {
  jd: JDResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

const JDDetailModal: React.FC<JDDetailModalProps> = ({ jd, isOpen, onClose }) => {
  const [matches, setMatches] = useState<{ loading: boolean; error?: string; data?: EmbeddingMatchCV[] }>({ loading: false });
  const [aiResults, setAiResults] = useState<Record<string, { loading: boolean; error?: string; data?: AICompareResponse }>>({});
  const [approved, setApproved] = useState<Record<number, boolean>>({});
  const [approving, setApproving] = useState<boolean>(false);

  const handleFindMatches = async () => {
    if (!jd) return;
    setMatches({ loading: true });
    try {
      const res = await findCVsForJD(jd.id, 5, 0.6);
      setMatches({ loading: false, data: res.matched_cvs });
    } catch (err: any) {
      setMatches({ loading: false, error: err.response?.data?.detail || 'Failed to find matches' });
    }
  };

  const handleEvaluateAI = async (cvId: number) => {
    if (!jd) return;
    const key = `${cvId}:${jd.id}`;
    setAiResults((prev) => ({ ...prev, [key]: { loading: true } }));
    try {
      const res = await compareCvJdWithAI(cvId, jd.id);
      setAiResults((prev) => ({ ...prev, [key]: { loading: false, data: res } }));
    } catch (err: any) {
      setAiResults((prev) => ({ ...prev, [key]: { loading: false, error: err.response?.data?.detail || 'AI evaluation failed' } }));
    }
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
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen || !jd) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Chi tiết JD - {jd.job_title || 'Unknown Position'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="cv-detail-grid">
            {/* Basic Information */}
            <div className="detail-section">
              <h3>Thông tin cơ bản</h3>
              <div className="detail-item">
                <strong>Vị trí:</strong> {jd.job_title || 'N/A'}
              </div>
              <div className="detail-item">
                <strong>Công ty:</strong> {jd.company || 'N/A'}
              </div>
              <div className="detail-item">
                <strong>Kinh nghiệm yêu cầu:</strong> {jd.experience_required ? `${jd.experience_required} năm` : 'N/A'}
              </div>
              <div className="detail-item">
                <strong>File:</strong> {jd.filename}
                {jd.file_url && (
                  <a href={`${API_BASE_URL}${jd.file_url}`} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px' }}>
                    Tải xuống
                  </a>
                )}
              </div>
              <div className="detail-item">
                <strong>Ngày upload:</strong> {formatDate(jd.created_at)}
              </div>
            </div>

            {/* Required Skills */}
            {jd.required_skills && jd.required_skills.length > 0 && (
              <div className="detail-section">
                <h3>Kỹ năng bắt buộc ({jd.required_skills.length})</h3>
                <div className="tags-list">
                  {jd.required_skills.map((skill, index) => (
                    <span key={index} className="tag tag-skill required">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Preferred Skills */}
            {jd.preferred_skills && jd.preferred_skills.length > 0 && (
              <div className="detail-section">
                <h3>Kỹ năng ưu tiên ({jd.preferred_skills.length})</h3>
                <div className="tags-list">
                  {jd.preferred_skills.map((skill, index) => (
                    <span key={index} className="tag tag-skill preferred">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Education Required */}
            {jd.education_required && jd.education_required.length > 0 && (
              <div className="detail-section">
                <h3>Học vấn yêu cầu</h3>
                <ul className="list-items">
                  {jd.education_required.map((edu, index) => (
                    <li key={index}>{edu}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Responsibilities */}
            {jd.responsibilities && jd.responsibilities.length > 0 && (
              <div className="detail-section">
                <h3>Trách nhiệm công việc</h3>
                <ul className="list-items">
                  {jd.responsibilities.map((resp, index) => (
                    <li key={index}>{resp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={handleFindMatches} disabled={matches.loading}>
              {matches.loading ? 'Đang tìm CV phù hợp...' : 'Tìm CV phù hợp'}
            </button>
          </div>

          {/* Matches Results */}
          {matches.error && (
            <div className="error-message" style={{ marginTop: '16px' }}>
              {matches.error}
            </div>
          )}

          {matches.data && matches.data.length > 0 && (
            <div className="matches-section" style={{ marginTop: '16px' }}>
              <h3>CV phù hợp ({matches.data.length})</h3>
              <div className="matches-grid">
                {matches.data.map((match) => {
                  const key = `${match.cv_id}:${jd.id}`;
                  const scorePct = Math.round((match.similarity_score || 0) * 100);
                  const ai = aiResults[key];
                  return (
                    <div key={match.cv_id} className="match-card">
                      <div className="match-header">
                        <strong>{match.name || 'Unknown Candidate'}</strong>
                        {match.role && <span> - {match.role}</span>}
                      </div>
                      <div className="match-score">
                        Độ tương đồng: {scorePct}%
                      </div>
                      {match.experience_years && (
                        <div className="match-experience">
                          Kinh nghiệm: {match.experience_years} năm
                        </div>
                      )}
                      <div className="match-actions">
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => handleEvaluateAI(match.cv_id)} 
                          disabled={ai?.loading}
                        >
                          {ai?.loading ? 'Đang đánh giá AI...' : 'Đánh giá bằng AI'}
                        </button>
                        <button
                          className="btn btn-success btn-sm"
                          disabled={approving || approved[match.cv_id]}
                          onClick={() => handleApprove(match.cv_id)}
                        >
                          {approved[match.cv_id] ? 'Đã duyệt' : (approving ? 'Đang duyệt...' : 'Duyệt ứng viên')}
                        </button>
                      </div>
                      {ai?.error && (
                        <div className="error-message">{ai.error}</div>
                      )}
                      {ai?.data && (
                        <div className="ai-result">
                          <div><strong>Điểm AI:</strong> {ai.data.result.match_score}%</div>
                          <div className="ai-reason">{ai.data.result.reason}</div>
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
    </div>
  );
};

const JDListVertical: React.FC = () => {
  const [jds, setJds] = useState<JDResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedJD, setSelectedJD] = useState<JDResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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


  const handleViewDetails = (jd: JDResponse) => {
    setSelectedJD(jd);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedJD(null);
  };

  if (loading) {
    return <div className="loading">Đang tải danh sách JD...</div>;
  }

  return (
    <div className="cv-list-vertical">
      <div className="list-header">
        <h2>Danh sách Job Description ({jds.length})</h2>
        <div className="list-actions">
          <button 
            onClick={fetchJDs} 
            className="btn btn-secondary"
            disabled={loading}
          >
            Làm mới
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
          <h3>Không có JD nào</h3>
          <p>Upload JD đầu tiên để bắt đầu</p>
        </div>
      ) : (
        <div className="cv-list-items">
          {jds.map((jd) => (
            <div key={jd.id} className="cv-item">
              <div className="cv-item-content">
                <div className="cv-main-info">
                  <h3 className="cv-name">{jd.job_title || 'Vị trí không xác định'}</h3>
                  <p className="cv-role">{jd.company || 'Công ty không xác định'}</p>
                  <p className="cv-experience">
                    {jd.experience_required ? `${jd.experience_required} năm kinh nghiệm` : 'Kinh nghiệm không xác định'}
                  </p>
                </div>
                <div className="cv-item-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleViewDetails(jd)}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <JDDetailModal
        jd={selectedJD}
        isOpen={modalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default JDListVertical;