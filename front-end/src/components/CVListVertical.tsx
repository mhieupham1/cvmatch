import React, { useState, useEffect } from 'react';
import {
  getCVs,
  deleteAllCVs,
  CVResponse,
  API_BASE_URL,
  findJDsForCV,
  EmbeddingMatchJD,
  compareCvJdWithAI,
  AICompareResponse,
  approveCV,
} from '../services/api';

interface CVDetailModalProps {
  cv: CVResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (cvId: number) => void;
}

const CVDetailModal: React.FC<CVDetailModalProps> = ({ cv, isOpen, onClose, onApprove }) => {
  const [matches, setMatches] = useState<{ loading: boolean; error?: string; data?: EmbeddingMatchJD[] }>({ loading: false });
  const [aiResults, setAiResults] = useState<Record<string, { loading: boolean; error?: string; data?: AICompareResponse }>>({});

  const handleFindMatches = async () => {
    if (!cv) return;
    setMatches({ loading: true });
    try {
      const res = await findJDsForCV(cv.id, 5, 0.6);
      setMatches({ loading: false, data: res.matched_jds });
    } catch (err: any) {
      setMatches({ loading: false, error: err.response?.data?.detail || 'Failed to find matches' });
    }
  };

  const handleEvaluateAI = async (jdId: number) => {
    if (!cv) return;
    const key = `${cv.id}:${jdId}`;
    setAiResults((prev) => ({ ...prev, [key]: { loading: true } }));
    try {
      const res = await compareCvJdWithAI(cv.id, jdId);
      setAiResults((prev) => ({ ...prev, [key]: { loading: false, data: res } }));
    } catch (err: any) {
      setAiResults((prev) => ({ ...prev, [key]: { loading: false, error: err.response?.data?.detail || 'AI evaluation failed' } }));
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

  if (!isOpen || !cv) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Chi tiết CV - {cv.name || 'Unknown Name'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="cv-detail-grid">
            {/* Basic Information */}
            <div className="detail-section">
              <h3>Thông tin cơ bản</h3>
              <div className="detail-item">
                <strong>Tên:</strong> {cv.name || 'N/A'}
              </div>
              <div className="detail-item">
                <strong>Email:</strong> {cv.email || 'N/A'}
              </div>
              <div className="detail-item">
                <strong>Phone:</strong> {cv.phone || 'N/A'}
              </div>
              <div className="detail-item">
                <strong>Vị trí:</strong> {cv.role || 'N/A'}
              </div>
              <div className="detail-item">
                <strong>Kinh nghiệm:</strong> {cv.experience_years ? `${cv.experience_years} năm` : 'N/A'}
              </div>
              <div className="detail-item">
                <strong>Năm sinh:</strong> {cv.birth_year || 'N/A'}
              </div>
              <div className="detail-item">
                <strong>Địa điểm:</strong> {cv.location || 'N/A'}
              </div>
              <div className="detail-item">
                <strong>File:</strong> {cv.filename}
                {cv.file_url && (
                  <a href={`${API_BASE_URL}${cv.file_url}`} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px' }}>
                    Tải xuống
                  </a>
                )}
              </div>
              <div className="detail-item">
                <strong>Ngày upload:</strong> {formatDate(cv.created_at)}
              </div>
              <div className="detail-item">
                <strong>Trạng thái:</strong> {cv.status || 'new'}
              </div>
            </div>

            {/* Languages */}
            {cv.languages && cv.languages.length > 0 && (
              <div className="detail-section">
                <h3>Ngôn ngữ</h3>
                <div className="tags-list">
                  {cv.languages.map((lang, index) => (
                    <span key={index} className="tag tag-language">{lang}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Project Scope */}
            {cv.project_scope && cv.project_scope.length > 0 && (
              <div className="detail-section">
                <h3>Loại dự án</h3>
                <div className="tags-list">
                  {cv.project_scope.map((scope, index) => (
                    <span key={index} className="tag tag-project">{scope}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Markets */}
            {cv.customer && cv.customer.length > 0 && (
              <div className="detail-section">
                <h3>Thị trường khách hàng</h3>
                <div className="tags-list">
                  {cv.customer.map((market, index) => (
                    <span key={index} className="tag tag-customer">{market}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {cv.skills && cv.skills.length > 0 && (
              <div className="detail-section">
                <h3>Kỹ năng ({cv.skills.length})</h3>
                <div className="tags-list">
                  {cv.skills.map((skill, index) => (
                    <span key={index} className="tag tag-skill">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {cv.education && cv.education.length > 0 && (
              <div className="detail-section">
                <h3>Học vấn</h3>
                <ul className="list-items">
                  {cv.education.map((edu, index) => (
                    <li key={index}>{edu}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Work Experience */}
            {cv.work_experience && cv.work_experience.length > 0 && (
              <div className="detail-section">
                <h3>Kinh nghiệm làm việc</h3>
                <ul className="list-items">
                  {cv.work_experience.map((exp, index) => (
                    <li key={index}>{exp}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Certifications */}
            {cv.certifications && cv.certifications.length > 0 && (
              <div className="detail-section">
                <h3>Chứng chỉ</h3>
                <ul className="list-items">
                  {cv.certifications.map((cert, index) => (
                    <li key={index}>{cert}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={handleFindMatches} disabled={matches.loading}>
              {matches.loading ? 'Đang tìm JD phù hợp...' : 'Tìm JD phù hợp'}
            </button>
            {onApprove && cv.status !== 'awaiting_interview' && (
              <button className="btn btn-success" onClick={() => onApprove(cv.id)}>
                Duyệt CV (chờ phỏng vấn)
              </button>
            )}
          </div>

          {/* Matches Results */}
          {matches.error && (
            <div className="error-message" style={{ marginTop: '16px' }}>
              {matches.error}
            </div>
          )}

          {matches.data && matches.data.length > 0 && (
            <div className="matches-section" style={{ marginTop: '16px' }}>
              <h3>JD phù hợp ({matches.data.length})</h3>
              <div className="matches-grid">
                {matches.data.map((match) => {
                  const key = `${cv.id}:${match.jd_id}`;
                  const scorePct = Math.round((match.similarity_score || 0) * 100);
                  const ai = aiResults[key];
                  return (
                    <div key={match.jd_id} className="match-card">
                      <div className="match-header">
                        <strong>{match.job_title || 'Unknown JD'}</strong>
                        {match.company && <span> @ {match.company}</span>}
                      </div>
                      <div className="match-score">
                        Độ tương đồng: {scorePct}%
                      </div>
                      <div className="match-actions">
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => handleEvaluateAI(match.jd_id)} 
                          disabled={ai?.loading}
                        >
                          {ai?.loading ? 'Đang đánh giá AI...' : 'Đánh giá bằng AI'}
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

const CVListVertical: React.FC = () => {
  const [cvs, setCvs] = useState<CVResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [deleting, setDeleting] = useState(false);
  const [selectedCV, setSelectedCV] = useState<CVResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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

  const handleDeleteAll = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tất cả CV? Hành động này không thể hoàn tác.')) {
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

  const handleViewDetails = (cv: CVResponse) => {
    setSelectedCV(cv);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedCV(null);
  };

  const handleApprove = async (cvId: number) => {
    try {
      await approveCV(cvId);
      // Remove from list after approval (no longer 'new')
      setCvs((prev) => prev.filter((c) => c.id !== cvId));
      handleCloseModal();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to approve CV');
    }
  };

  if (loading) {
    return <div className="loading">Đang tải danh sách CV...</div>;
  }

  return (
    <div className="cv-list-vertical">
      <div className="list-header">
        <h2>Danh sách CV ({cvs.length})</h2>
        <div className="list-actions">
          <button 
            onClick={fetchCVs} 
            className="btn btn-secondary"
            disabled={loading}
          >
            Làm mới
          </button>
          {cvs.length > 0 && (
            <button 
              onClick={handleDeleteAll} 
              className="btn btn-danger"
              disabled={deleting}
            >
              {deleting ? 'Đang xóa...' : 'Xóa tất cả'}
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
          <h3>Không có CV nào</h3>
          <p>Upload CV đầu tiên để bắt đầu</p>
        </div>
      ) : (
        <div className="cv-list-items">
          {cvs.map((cv) => (
            <div key={cv.id} className="cv-item">
              <div className="cv-item-content">
                <div className="cv-main-info">
                  <h3 className="cv-name">{cv.name || 'Tên không xác định'}</h3>
                  <p className="cv-role">{cv.role || 'Vị trí không xác định'}</p>
                  <p className="cv-experience">
                    {cv.experience_years ? `${cv.experience_years} năm kinh nghiệm` : 'Kinh nghiệm không xác định'}
                  </p>
                </div>
                <div className="cv-item-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleViewDetails(cv)}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CVDetailModal
        cv={selectedCV}
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onApprove={handleApprove}
      />
    </div>
  );
};

export default CVListVertical;