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
  searchJDs,
  JDSearchResult,
  updateJDPriority,
} from '../services/api';

interface JDDetailModalProps {
  jd: JDResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdatePriority: (jdId: number, priority: string) => Promise<void>;
}

const JDDetailModal: React.FC<JDDetailModalProps> = ({ jd, isOpen, onClose, onUpdatePriority }) => {
  const [matches, setMatches] = useState<{ loading: boolean; error?: string; data?: EmbeddingMatchCV[] }>({ loading: false });
  const [aiResults, setAiResults] = useState<Record<string, { loading: boolean; error?: string; data?: AICompareResponse }>>({});
  const [approved, setApproved] = useState<Record<number, boolean>>({});
  const [approving, setApproving] = useState<boolean>(false);
  const [updatingPriority, setUpdatingPriority] = useState<boolean>(false);
  
  // Clear matches and AI results when modal is closed or JD changes
  useEffect(() => {
    if (!isOpen) {
      setMatches({ loading: false });
      setAiResults({});
      setApproved({});
    }
  }, [isOpen]);

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
                <strong>Độ ưu tiên:</strong>
                <select
                  value={jd.priority || 'medium'}
                  onChange={(e) => {
                    if (!jd) return;
                    setUpdatingPriority(true);
                    onUpdatePriority(jd.id, e.target.value)
                      .then(() => setUpdatingPriority(false))
                      .catch(() => setUpdatingPriority(false));
                  }}
                  style={{
                    marginLeft: '8px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: jd.priority === 'high' ? '#ff4d4f' : 
                                    jd.priority === 'low' ? '#52c41a' : '#faad14',
                    color: 'white',
                    border: 'none',
                    cursor: updatingPriority ? 'wait' : 'pointer'
                  }}
                  disabled={updatingPriority}
                >
                  <option value="high">Cao</option>
                  <option value="medium">Trung bình</option>
                  <option value="low">Thấp</option>
                </select>
                {updatingPriority && <span style={{ marginLeft: '8px', fontSize: '12px' }}>Đang cập nhật...</span>}
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
                          <div><strong>Tỷ lệ Matching:</strong> {ai.data.result.match_score}%</div>
                          <div 
                            className="ai-reason" 
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
    </div>
  );
};

const JDListVertical: React.FC = () => {
  const [jds, setJds] = useState<JDResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedJD, setSelectedJD] = useState<JDResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  // Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<JDSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    fetchJDs();
  }, []);

  const fetchJDs = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getJDs();
      
      // Sort JDs by priority (high > medium > low)
      const sortedData = [...data].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1; // Default to medium
        const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
        return priorityA - priorityB;
      });
      
      setJds(sortedData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch JDs');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setShowSearchResults(false);
      setSearchResults(null);
      return;
    }

    try {
      setIsSearching(true);
      setError('');
      const results = await searchJDs(searchQuery, 0.6, 10);
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to search JDs');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setShowSearchResults(false);
    setError('');
  };

  const convertSearchResultToJD = (searchResult: any): JDResponse => {
    return {
      id: searchResult.jd_id,
      filename: searchResult.filename,
      file_url: searchResult.file_url,
      job_title: searchResult.job_title,
      company: searchResult.company,
      required_skills: searchResult.required_skills || [],
      preferred_skills: searchResult.preferred_skills || [],
      experience_required: searchResult.experience_required,
      education_required: searchResult.education_required || [],
      responsibilities: searchResult.responsibilities || [],
      created_at: searchResult.created_at,
    };
  };


  const handleViewDetails = (jd: JDResponse) => {
    setSelectedJD(jd);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedJD(null);
  };
  
  const handleUpdatePriority = async (jdId: number, priority: string) => {
    try {
      await updateJDPriority(jdId, priority);
      
      // Update the JD in the local state
      setJds((prevJds) => {
        const updatedJds = prevJds.map((jd) => 
          jd.id === jdId ? { ...jd, priority } : jd
        );
        
        // Re-sort the JDs by priority
        return [...updatedJds].sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
          const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
          return priorityA - priorityB;
        });
      });
      
      // Update the selected JD if it's the one being modified
      if (selectedJD && selectedJD.id === jdId) {
        setSelectedJD({...selectedJD, priority});
      }
      
      return Promise.resolve();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update priority');
      return Promise.reject(err);
    }
  };

  if (loading) {
    return <div className="loading">Đang tải danh sách JD...</div>;
  }

  return (
    <div className="cv-list-vertical">
      <div className="list-header">
        <h2>Danh sách Job Description {showSearchResults ? `(Kết quả tìm kiếm: ${searchResults?.total_matches || 0})` : `(${jds.length})`}</h2>
        <div className="list-actions">
          <div className="filter-section" style={{ marginRight: '15px' }}>
            <label htmlFor="priorityFilter" style={{ marginRight: '8px' }}>Lọc theo độ ưu tiên:</label>
            <select 
              id="priorityFilter"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{ padding: '5px', borderRadius: '4px' }}
            >
              <option value="all">Tất cả</option>
              <option value="high">Cao</option>
              <option value="medium">Trung bình</option>
              <option value="low">Thấp</option>
            </select>
          </div>
          <button 
            onClick={fetchJDs} 
            className="btn btn-secondary"
            disabled={loading}
          >
            Làm mới
          </button>
        </div>
      </div>
      
      {/* Search Box */}
      <div className="search-section" style={{ marginBottom: '20px' }}>
        <div className="search-input-group">
          <input
            type="text"
            placeholder="Tìm kiếm JD (ví dụ: 'developer 3 năm kinh nghiệm', 'React frontend'...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            className="search-input"
            style={{
              width: '70%',
              padding: '10px 15px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
          <button 
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="btn btn-primary"
            style={{ marginLeft: '10px' }}
          >
            {isSearching ? 'Đang tìm...' : 'Tìm kiếm'}
          </button>
          {showSearchResults && (
            <button 
              onClick={handleClearSearch}
              className="btn btn-secondary"
              style={{ marginLeft: '10px' }}
            >
              Xóa tìm kiếm
            </button>
          )}
        </div>
        {showSearchResults && (
          <div className="search-info" style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
            Tìm kiếm: "{searchResults?.query}" - {searchResults?.total_matches || 0} kết quả
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {showSearchResults ? (
        // Search Results
        searchResults?.matched_jds.length === 0 ? (
          <div className="empty-state">
            <h3>Không tìm thấy JD phù hợp</h3>
            <p>Thử thay đổi từ khóa tìm kiếm</p>
          </div>
        ) : (
          <div className="cv-list-items">
            {searchResults?.matched_jds.map((result) => {
              const jd = convertSearchResultToJD(result);
              const similarityPct = Math.round((result.similarity_score || 0) * 100);
              return (
                <div key={jd.id} className="cv-item">
                  <div className="cv-item-content">
                    <div className="cv-main-info">
                      <h3 className="cv-name">{jd.job_title || 'Vị trí không xác định'}</h3>
                      <p className="cv-role">{jd.company || 'Công ty không xác định'}</p>
                      <p className="cv-experience">
                        {jd.experience_required ? `${jd.experience_required} năm kinh nghiệm` : 'Kinh nghiệm không xác định'}
                      </p>
                      <div className="similarity-score" style={{ 
                        color: '#007bff', 
                        fontWeight: 'bold', 
                        fontSize: '14px',
                        marginTop: '5px'
                      }}>
                        Độ tương đồng: {similarityPct}%
                      </div>
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
              );
            })}
          </div>
        )
      ) : (
        // Regular JD List
        jds.length === 0 && !loading ? (
          <div className="empty-state">
            <h3>Không có JD nào</h3>
            <p>Upload JD đầu tiên để bắt đầu</p>
          </div>
        ) : (
          <div className="cv-list-items">
            {jds
              .filter(jd => priorityFilter === 'all' || jd.priority === priorityFilter)
              .map((jd) => (
              <div key={jd.id} className="cv-item">
                <div className="cv-item-content">
                  <div className="cv-main-info">
                    <h3 className="cv-name">{jd.job_title || 'Vị trí không xác định'}</h3>
                    <p className="cv-role">{jd.company || 'Công ty không xác định'}</p>
                    <p className="cv-experience">
                      {jd.experience_required ? `${jd.experience_required} năm kinh nghiệm` : 'Kinh nghiệm không xác định'}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                      <span 
                        className={`priority-badge priority-${jd.priority || 'medium'}`}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: jd.priority === 'high' ? '#ff4d4f' : 
                                        jd.priority === 'low' ? '#52c41a' : '#faad14',
                          color: 'white'
                        }}
                      >
                        Ưu tiên: {jd.priority === 'high' ? 'Cao' : jd.priority === 'low' ? 'Thấp' : 'Trung bình'}
                      </span>
                    </div>
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
        )
      )}

      <JDDetailModal
        jd={selectedJD}
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onUpdatePriority={handleUpdatePriority}
      />
    </div>
  );
};

export default JDListVertical;