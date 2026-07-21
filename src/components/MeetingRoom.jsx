import React, { useEffect, useState } from 'react';
import { 
  Clock, Video, Sparkles, Download, Settings, CheckCircle, Save, 
  BarChart2, Plus, AlertCircle, Share2, Info, Trash2, Users, ArrowLeft, Maximize2, Minimize2
} from 'lucide-react';

export const MeetingRoom = React.memo(({
  activeMeeting,
  setActiveMeeting,
  currentUser,
  refreshReports,
  setActiveTab,
  triggerNotification,
  
  // Note states & functions
  myNote,
  setMyNote,
  savingNote,
  lastSavedTime,
  hasUnsavedChanges,
  saveNoteNow,
  
  // Poll states & functions
  polls,
  isPollModalOpen,
  setIsPollModalOpen,
  newPollQuestion,
  setNewPollQuestion,
  newPollType,
  setNewPollType,
  newPollOptions,
  setNewPollOptions,
  handleVote,
  handleAddPoll,
  handleDeletePoll,
  syncMeetingData,
  setupRealtimePolls,
  handleCompleteMeeting,
  
  // AI Report states & functions
  generatingAI,
  aiReportOutput,
  setAiReportOutput,
  reportTitle,
  setReportTitle,
  aiStatusText,
  aiError,
  generateAIReport,
  cancelAIReport,
  handleSaveReport,
  
  // Online config states & functions
  onlinePlatform,
  setOnlinePlatform,
  onlineMeetLink,
  setOnlineMeetLink,
  onlineWaitingRoom,
  setOnlineWaitingRoom,
  onlineAutoRecord,
  setOnlineAutoRecord,
  onlineMuteOnEntry,
  setOnlineMuteOnEntry,
  handleSaveOnlineConfig
}) => {
  // State for poll voting custom confirmation modal
  const [confirmVoteData, setConfirmVoteData] = useState(null);
  const [viewMode, setViewMode] = useState('main'); // 'main', 'details', 'fullscreen_notes', 'fullscreen_polls', 'fullscreen_ai'

  // Sync meeting data upon entry
  useEffect(() => {
    if (activeMeeting && currentUser) {
      syncMeetingData(activeMeeting.id, currentUser.id);
    }
  }, [activeMeeting, currentUser, syncMeetingData]);

  // Setup real-time updates simulation
  useEffect(() => {
    if (activeMeeting) {
      const cleanup = setupRealtimePolls(activeMeeting.id, (updatedPolls) => {
        // Optional callback if needed
      });
      return cleanup;
    }
  }, [activeMeeting, setupRealtimePolls]);

  if (!activeMeeting) {
    return (
      <div className="card meeting-room-empty-state">
        <AlertCircle size={40} color="#ff3b30" style={{ margin: '0 auto 12px' }} />
        <h3>Chưa chọn cuộc họp</h3>
        <p>Vui lòng quay lại tab Lịch họp và chọn hoặc tạo một cuộc họp để bắt đầu tương tác phòng họp.</p>
        <button onClick={() => setActiveTab('calendar')} className="btn btn-primary" style={{ marginTop: '16px', width: 'auto' }}>
          Xem lịch họp
        </button>
      </div>
    );
  }

  const isHost = currentUser.phone === activeMeeting.hostPhone || currentUser.name === activeMeeting.hostName;
  const isAuthorizedReportSaver = isHost;

  // Local helper states for creating poll options inside local UI
  const addOptionField = () => setNewPollOptions([...newPollOptions, '']);
  const updateOptionValue = (idx, val) => {
    const next = [...newPollOptions];
    next[idx] = val;
    setNewPollOptions(next);
  };

  const onLocalAddPollSubmit = (e) => {
    e.preventDefault();
    handleAddPoll(newPollQuestion, newPollType, newPollOptions);
  };

  const handleShareMeeting = () => {
    try {
      // Simulate/trigger Zalo SDK Share sheet
      if (window.ZMP_SDK) {
        window.ZMP_SDK.openShareSheet({
          type: 'zmp',
          data: {
            title: `Lời mời họp: ${activeMeeting.title}`,
            description: `Chủ trì: ${activeMeeting.hostName}. Thời gian: ${new Date(activeMeeting.startTime).toLocaleTimeString('vi-VN')} ngày ${new Date(activeMeeting.startTime).toLocaleDateString('vi-VN')}`,
            thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400',
            path: `pages/index?meetingId=${activeMeeting.id}`
          }
        });
      } else {
        navigator.clipboard.writeText(window.location.origin + "?meetingId=" + activeMeeting.id);
        triggerNotification("[Hệ thống] Link cuộc họp đã được sao chép vào bộ nhớ đệm!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="meeting-workspace-container">
      {viewMode === 'main' && (
        <div className="card meeting-quick-info-card">
          <h3 className="workspace-meeting-title">{activeMeeting.title}</h3>
          <p className="workspace-meeting-meta">
            <Clock size={14} />
            <span>
              {new Date(activeMeeting.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(activeMeeting.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} | Chủ trì: {activeMeeting.hostName} ({activeMeeting.hostPhone})
            </span>
          </p>
          
          <div className="workspace-action-row">
            {activeMeeting.locationType === 'online' && (
              <a 
                href={activeMeeting.locationDetail} 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-primary btn-meet-link"
              >
                <Video size={16} />
                <span>Đường dẫn Họp Online</span>
              </a>
            )}
            <button 
              onClick={handleShareMeeting}
              className="btn btn-secondary btn-share-zalo"
            >
              <Share2 size={16} />
              <span>Chia sẻ Zalo</span>
            </button>
          </div>

          {/* Invited Members Display */}
          {activeMeeting.members && activeMeeting.members.length > 0 && (
            <div className="workspace-members-box" style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--bg-secondary, #f0f2f5)', borderRadius: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.88em', color: 'var(--text-secondary, #6c757d)', marginBottom: '8px' }}>
                <Users size={14} />
                Thành viên tham gia ({activeMeeting.members.length})
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {activeMeeting.members.map(memberId => {
                  return (
                    <span key={memberId} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--bg-primary, #fff)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.82em', border: '1px solid var(--border-color, #e0e0e0)' }}>
                      {memberId}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {activeMeeting.preparationContent && (
            <div className="workspace-prep-box">
              <span className="box-title">Nội dung chuẩn bị trước:</span>
              <p className="box-text">{activeMeeting.preparationContent}</p>
            </div>
          )}

          {activeMeeting.files && activeMeeting.files.length > 0 && (
            <div className="workspace-files-box">
              {activeMeeting.files.map((file, i) => (
                <div key={i} className="file-attachment-item">
                  <span className="file-info">
                    <span className={`file-type-icon ${file.type === 'pdf' ? 'red' : ''}`}>
                      {file.type.toUpperCase()}
                    </span>
                    <span className="file-name">{file.name} ({file.size})</span>
                  </span>
                  <a 
                    href={file.url} 
                    download={file.name} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="file-download-btn"
                    title="Tải về tài liệu"
                  >
                    <Download size={14} />
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Host-only Online Meeting Configurations */}
          {isHost && (
            <div className="workspace-host-settings" style={{ marginTop: '20px' }}>
              <h4 className="host-settings-title">
                <Settings size={16} />
                <span>Cấu hình cuộc họp online (Chỉ Host chỉnh sửa)</span>
              </h4>
              <form onSubmit={(e) => { e.preventDefault(); handleSaveOnlineConfig(); }} className="host-settings-form">
                <div className="form-group-row">
                  <div className="form-group">
                    <label>Nền tảng trực tuyến</label>
                    <select 
                      value={onlinePlatform} 
                      onChange={(e) => setOnlinePlatform(e.target.value)} 
                      className="select-input select-platform"
                    >
                      <option value="meet">Google Meet</option>
                      <option value="zoom">Zoom Meeting</option>
                      <option value="zalo">Zalo Video Call</option>
                      <option value="teams">Microsoft Teams</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>Đường dẫn phòng họp (URL)</label>
                    <input 
                      type="text" 
                      value={onlineMeetLink} 
                      onChange={(e) => setOnlineMeetLink(e.target.value)} 
                      className="input-text"
                      placeholder="Dán URL link cuộc họp..."
                      required
                    />
                  </div>
                </div>

                <div className="host-toggles-list">
                  <label className="checkbox-toggle-label">
                    <input 
                      type="checkbox" 
                      checked={onlineWaitingRoom} 
                      onChange={(e) => setOnlineWaitingRoom(e.target.checked)} 
                    />
                    <span>Bật phòng chờ (Host phê duyệt thành viên vào)</span>
                  </label>

                  <label className="checkbox-toggle-label">
                    <input 
                      type="checkbox" 
                      checked={onlineAutoRecord} 
                      onChange={(e) => setOnlineAutoRecord(e.target.checked)} 
                    />
                    <span>Tự động ghi âm cuộc họp</span>
                  </label>

                  <label className="checkbox-toggle-label">
                    <input 
                      type="checkbox" 
                      checked={onlineMuteOnEntry} 
                      onChange={(e) => setOnlineMuteOnEntry(e.target.checked)} 
                    />
                    <span>Tắt micro của người tham gia khi bắt đầu vào</span>
                  </label>
                </div>

                <button type="submit" className="btn btn-primary btn-save-host-settings">
                  Lưu cấu hình họp online
                </button>
              </form>
            </div>
          )}

          {/* Button to navigate to details */}
          <div style={{ marginTop: '20px', borderTop: '1px dashed var(--border-color, #e0e0e0)', paddingTop: '16px' }}>
            <button 
              type="button" 
              onClick={() => setViewMode('details')} 
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '1em', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Sparkles size={18} />
              <span>Chi tiết và tiện ích cuộc họp</span>
            </button>
          </div>
        </div>
      )}

      {viewMode === 'details' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            type="button" 
            onClick={() => setViewMode('main')} 
            className="btn btn-secondary"
            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start' }}
          >
            <ArrowLeft size={16} />
            <span>Quay về</span>
          </button>
          
          {/* Note Box */}
          <div className="card note-taking-editor-card">
            <div className="note-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ margin: 0 }}>Ghi chú cá nhân của bạn</h4>
                <button 
                  type="button" 
                  onClick={() => setViewMode('fullscreen_notes')} 
                  style={{ background: 'none', border: 'none', color: 'var(--primary-color, #0068FF)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85em', padding: 0 }}
                  title="Mở toàn màn hình"
                >
                  <Maximize2 size={14} /> Mở rộng
                </button>
              </div>
              <span className="saving-status-text">
                {savingNote ? (
                  <span className="text-saving">
                    <span className="spinner-mini" /> Đang lưu ghi chú...
                  </span>
                ) : lastSavedTime ? (
                  <span className="text-saved">
                    <CheckCircle size={12} color="#28a745" /> Đã lưu lên Zalo Cloud ({lastSavedTime})
                  </span>
                ) : null}
              </span>
            </div>
            <textarea 
              value={myNote} 
              onChange={(e) => setMyNote(e.target.value)}
              placeholder="Nhập ý kiến đóng góp, ghi chú cuộc họp tại đây. Hệ thống sẽ tự động đồng bộ sau mỗi 3 giây..."
              className="textarea-input note-textarea"
            />
            <div className="note-editor-footer">
              <button 
                type="button" 
                onClick={() => saveNoteNow()} 
                className="btn btn-secondary btn-save-note-manual"
                disabled={savingNote}
              >
                <Save size={16} />
                <span>Lưu ngay (Manual Save)</span>
              </button>
              <span className="note-editor-info-text">
                *Ghi chú của bạn sẽ được kết hợp với cả nhóm để trợ lý AI Gemini tổng hợp biên bản cuối buổi.
              </span>
            </div>
          </div>

          {/* Polls Box */}
          <div className="card workspace-polls-card">
            <div className="polls-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 className="polls-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <BarChart2 size={18} color="#0068FF" />
                <span>Ý kiến & Khảo sát nhóm</span>
                <button 
                  type="button" 
                  onClick={() => setViewMode('fullscreen_polls')} 
                  style={{ background: 'none', border: 'none', color: 'var(--primary-color, #0068FF)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85em', padding: 0, fontWeight: 'normal' }}
                  title="Mở toàn màn hình"
                >
                  <Maximize2 size={14} /> Mở rộng
                </button>
                <span className="sse-indicator-badge">
                  <span className="sse-pulse-dot"></span>
                  <span>Tự cập nhật (10s)</span>
                </span>
              </h4>
              {isAuthorizedReportSaver && (
                <button 
                  onClick={() => setIsPollModalOpen(true)}
                  className="btn btn-secondary btn-create-poll"
                >
                  <Plus size={14} />
                  <span>Tạo khảo sát</span>
                </button>
              )}
            </div>
            {polls.length === 0 ? (
              <p className="polls-empty-text">Chưa có biểu quyết hay khảo sát nào được tạo cho cuộc họp này.</p>
            ) : (
              <div className="polls-list">
                {polls.map(poll => {
                  const totalVotes = poll.answers ? poll.answers.length : 0;
                  return (
                    <div key={poll.id} className="poll-box">
                      <div className="poll-question-header">
                        <span className="poll-question-text">{poll.question}</span>
                        <span className="poll-type-badge">
                          {poll.pollType === 'single' ? 'Chọn 1' : 'Chọn nhiều'}
                        </span>
                      </div>
                      <div className="poll-option-list">
                        {poll.options.map(opt => {
                          const optVotes = poll.answers ? poll.answers.filter(a => a.optionId === opt.id).length : 0;
                          const percentage = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                          const isSelected = poll.answers ? poll.answers.some(a => a.userId === currentUser.id && a.optionId === opt.id) : false;
                          return (
                            <div 
                              key={opt.id} 
                              className={`poll-option-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => setConfirmVoteData({ pollId: poll.id, optionId: opt.id })}
                            >
                              <div className="poll-progress-bg" style={{ width: `${percentage}%` }} />
                              <div className="poll-option-label">
                                <input 
                                  type={poll.pollType === 'single' ? 'radio' : 'checkbox'} 
                                  checked={isSelected}
                                  readOnly
                                  className="poll-option-input-element"
                                />
                                <span>{opt.text}</span>
                              </div>
                              <div className="poll-stats">
                                <span>{percentage}%</span>
                                <span>{optVotes} bình chọn</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="poll-footer-stats" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Tổng số bình chọn: {totalVotes}</span>
                        {isAuthorizedReportSaver && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (handleDeletePoll) {
                                await handleDeletePoll(poll.id);
                              }
                            }}
                            className="btn btn-danger"
                            style={{ padding: '4px 10px', fontSize: '0.78em', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Trash2 size={12} />
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Report Box */}
          <div className="card workspace-ai-report-card">
            <h4 className="ai-report-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px' }}>
              <Sparkles size={18} color="#ff3b30" />
              <span>Tổng kết & Tạo báo cáo AI</span>
              <button 
                type="button" 
                onClick={() => setViewMode('fullscreen_ai')} 
                style={{ background: 'none', border: 'none', color: 'var(--primary-color, #0068FF)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85em', fontWeight: 'normal', padding: 0 }}
                title="Mở toàn màn hình"
              >
                <Maximize2 size={14} /> Mở rộng
              </button>
            </h4>
            <p className="ai-report-intro">
              Trợ lý AI Gemini sẽ phân tích tất cả ghi chú cá nhân của các thành viên gửi về hệ thống, kết hợp với biểu quyết khảo sát để tự động biên soạn biên bản cuộc họp chính thức.
            </p>
            {generatingAI && (
              <div className="ai-generating-loading-box">
                <span className="spinner-medium" />
                <div className="ai-step-status-text">{aiStatusText}</div>
                <button type="button" onClick={cancelAIReport} className="btn btn-danger btn-abort-ai">Hủy tạo báo cáo</button>
              </div>
            )}
            {aiError && (
              <div className="ai-error-box">
                <div className="alert-box error">
                  <AlertCircle size={16} />
                  <span>{aiError}</span>
                </div>
                <button type="button" onClick={() => generateAIReport(0)} className="btn btn-primary btn-retry-ai">Thử lại ngay</button>
              </div>
            )}
            {aiReportOutput && !generatingAI && (
              <div className="ai-output-container">
                <div className="form-group">
                  <label>Tiêu đề biên bản cuộc họp</label>
                  <input type="text" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} className="input-text" />
                </div>
                <div className="ai-output-markdown-editor">
                  <textarea value={aiReportOutput} onChange={(e) => setAiReportOutput(e.target.value)} className="textarea-input ai-report-textarea" />
                </div>
                <div className="ai-report-actions-row">
                  {isAuthorizedReportSaver ? (
                    <>
                      <button onClick={() => handleSaveReport(reportTitle, aiReportOutput, currentUser.name, refreshReports)} className="btn btn-primary">
                        <Save size={16} />
                        <span>Lưu vào kho biên bản</span>
                      </button>
                      <button 
                        onClick={() => {
                          triggerNotification(`[Zalo OA] Biên bản cuộc họp "${activeMeeting.title}" đã được phát hành & gửi tới tất cả thành viên.`);
                          handleSaveReport(reportTitle, aiReportOutput, currentUser.name, refreshReports);
                        }} 
                        className="btn btn-secondary"
                      >
                        <span>Phát hành & Gửi Zalo OA</span>
                      </button>
                    </>
                  ) : (
                    <div className="ai-report-viewer-warning">
                      <Info size={14} />
                      <span>*Bạn có thể xem nội dung AI tổng hợp, nhưng chỉ Chủ trì mới có quyền Lưu/Phát hành báo cáo.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {!generatingAI && !aiReportOutput && (
              <button onClick={() => generateAIReport(0)} className="btn btn-primary btn-generate-ai-start">
                <Sparkles size={16} />
                <span>Tự động tổng hợp biên bản (AI)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* FULLSCREEN VIEWS */}
      {viewMode === 'fullscreen_notes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            type="button" 
            onClick={() => setViewMode('details')} 
            className="btn btn-secondary"
            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start' }}
          >
            <ArrowLeft size={16} />
            <span>Quay về</span>
          </button>
          <div className="card note-taking-editor-card fullscreen-mode" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="note-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ margin: 0 }}>Ghi chú cá nhân của bạn (Toàn màn hình)</h4>
                <button 
                  type="button" 
                  onClick={() => setViewMode('details')} 
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #6c757d)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85em', padding: 0 }}
                  title="Thu nhỏ"
                >
                  <Minimize2 size={14} /> Thu nhỏ
                </button>
              </div>
              <span className="saving-status-text">
                {savingNote ? (
                  <span className="text-saving">
                    <span className="spinner-mini" /> Đang lưu ghi chú...
                  </span>
                ) : lastSavedTime ? (
                  <span className="text-saved">
                    <CheckCircle size={12} color="#28a745" /> Đã lưu lên Zalo Cloud ({lastSavedTime})
                  </span>
                ) : null}
              </span>
            </div>
            <textarea 
              value={myNote} 
              onChange={(e) => setMyNote(e.target.value)}
              placeholder="Nhập ý kiến đóng góp, ghi chú cuộc họp tại đây..."
              className="textarea-input note-textarea"
              style={{ flex: 1, minHeight: '60vh', marginTop: '16px' }}
            />
            <div className="note-editor-footer" style={{ marginTop: '16px' }}>
              <button type="button" onClick={() => saveNoteNow()} className="btn btn-secondary btn-save-note-manual" disabled={savingNote}>
                <Save size={16} />
                <span>Lưu ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'fullscreen_polls' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            type="button" 
            onClick={() => setViewMode('details')} 
            className="btn btn-secondary"
            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start' }}
          >
            <ArrowLeft size={16} />
            <span>Quay về</span>
          </button>
          <div className="card workspace-polls-card fullscreen-mode" style={{ minHeight: '80vh' }}>
            <div className="polls-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 className="polls-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <BarChart2 size={18} color="#0068FF" />
                <span>Ý kiến & Khảo sát nhóm (Toàn màn hình)</span>
                <button 
                  type="button" 
                  onClick={() => setViewMode('details')} 
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #6c757d)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85em', padding: 0, fontWeight: 'normal' }}
                  title="Thu nhỏ"
                >
                  <Minimize2 size={14} /> Thu nhỏ
                </button>
              </h4>
              {isAuthorizedReportSaver && (
                <button onClick={() => setIsPollModalOpen(true)} className="btn btn-secondary btn-create-poll">
                  <Plus size={14} />
                  <span>Tạo khảo sát</span>
                </button>
              )}
            </div>
            {polls.length === 0 ? (
              <p className="polls-empty-text">Chưa có biểu quyết hay khảo sát nào được tạo cho cuộc họp này.</p>
            ) : (
              <div className="polls-list">
                {polls.map(poll => {
                  const totalVotes = poll.answers ? poll.answers.length : 0;
                  return (
                    <div key={poll.id} className="poll-box">
                      <div className="poll-question-header">
                        <span className="poll-question-text">{poll.question}</span>
                        <span className="poll-type-badge">
                          {poll.pollType === 'single' ? 'Chọn 1' : 'Chọn nhiều'}
                        </span>
                      </div>
                      <div className="poll-option-list">
                        {poll.options.map(opt => {
                          const optVotes = poll.answers ? poll.answers.filter(a => a.optionId === opt.id).length : 0;
                          const percentage = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                          const isSelected = poll.answers ? poll.answers.some(a => a.userId === currentUser.id && a.optionId === opt.id) : false;
                          return (
                            <div key={opt.id} className={`poll-option-item ${isSelected ? 'selected' : ''}`} onClick={() => setConfirmVoteData({ pollId: poll.id, optionId: opt.id })}>
                              <div className="poll-progress-bg" style={{ width: `${percentage}%` }} />
                              <div className="poll-option-label">
                                <input type={poll.pollType === 'single' ? 'radio' : 'checkbox'} checked={isSelected} readOnly className="poll-option-input-element" />
                                <span>{opt.text}</span>
                              </div>
                              <div className="poll-stats">
                                <span>{percentage}%</span>
                                <span>{optVotes} bình chọn</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="poll-footer-stats" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Tổng số bình chọn: {totalVotes}</span>
                        {isAuthorizedReportSaver && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (handleDeletePoll) {
                                await handleDeletePoll(poll.id);
                              }
                            }}
                            className="btn btn-danger"
                            style={{ padding: '4px 10px', fontSize: '0.78em', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Trash2 size={12} />
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'fullscreen_ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            type="button" 
            onClick={() => setViewMode('details')} 
            className="btn btn-secondary"
            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start' }}
          >
            <ArrowLeft size={16} />
            <span>Quay về</span>
          </button>
          <div className="card workspace-ai-report-card fullscreen-mode" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <h4 className="ai-report-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
              <Sparkles size={18} color="#ff3b30" />
              <span>Tổng kết & Tạo báo cáo AI (Toàn màn hình)</span>
              <button 
                type="button" 
                onClick={() => setViewMode('details')} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #6c757d)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85em', padding: 0, fontWeight: 'normal' }}
                title="Thu nhỏ"
              >
                <Minimize2 size={14} /> Thu nhỏ
              </button>
            </h4>
            <p className="ai-report-intro">
              Trợ lý AI Gemini sẽ phân tích tất cả ghi chú cá nhân của các thành viên gửi về hệ thống, kết hợp với biểu quyết khảo sát để tự động biên soạn biên bản cuộc họp chính thức.
            </p>
            {generatingAI && (
              <div className="ai-generating-loading-box">
                <span className="spinner-medium" />
                <div className="ai-step-status-text">{aiStatusText}</div>
                <button type="button" onClick={cancelAIReport} className="btn btn-danger btn-abort-ai">Hủy tạo báo cáo</button>
              </div>
            )}
            {aiError && (
              <div className="ai-error-box">
                <div className="alert-box error">
                  <AlertCircle size={16} />
                  <span>{aiError}</span>
                </div>
                <button type="button" onClick={() => generateAIReport(0)} className="btn btn-primary btn-retry-ai">Thử lại ngay</button>
              </div>
            )}
            {aiReportOutput && !generatingAI && (
              <div className="ai-output-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="form-group">
                  <label>Tiêu đề biên bản cuộc họp</label>
                  <input type="text" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} className="input-text" />
                </div>
                <div className="ai-output-markdown-editor" style={{ flex: 1, display: 'flex', minHeight: '40vh' }}>
                  <textarea value={aiReportOutput} onChange={(e) => setAiReportOutput(e.target.value)} className="textarea-input ai-report-textarea" style={{ flex: 1, minHeight: '40vh' }} />
                </div>
                <div className="ai-report-actions-row" style={{ marginTop: '16px' }}>
                  {isAuthorizedReportSaver ? (
                    <>
                      <button onClick={() => handleSaveReport(reportTitle, aiReportOutput, currentUser.name, refreshReports)} className="btn btn-primary">
                        <Save size={16} />
                        <span>Lưu vào kho biên bản</span>
                      </button>
                      <button 
                        onClick={() => {
                          triggerNotification(`[Zalo OA] Biên bản cuộc họp "${activeMeeting.title}" đã được phát hành & gửi tới tất cả thành viên.`);
                          handleSaveReport(reportTitle, aiReportOutput, currentUser.name, refreshReports);
                        }} 
                        className="btn btn-secondary"
                      >
                        <span>Phát hành & Gửi Zalo OA</span>
                      </button>
                    </>
                  ) : (
                    <div className="ai-report-viewer-warning">
                      <Info size={14} />
                      <span>*Bạn có thể xem nội dung AI tổng hợp, nhưng chỉ Chủ trì mới có quyền Lưu/Phát hành báo cáo.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {!generatingAI && !aiReportOutput && (
              <button onClick={() => generateAIReport(0)} className="btn btn-primary btn-generate-ai-start" style={{ marginTop: 'auto' }}>
                <Sparkles size={16} />
                <span>Tự động tổng hợp biên bản (AI)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* LOCAL POLL MODAL IN MEETING ROOM */}
      {isPollModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Tạo khảo sát ý kiến mới</h3>
              <button onClick={() => setIsPollModalOpen(false)} className="modal-close-btn">&times;</button>
            </div>

            <form onSubmit={onLocalAddPollSubmit} className="modal-body">
              <div className="form-group">
                <label>Câu hỏi khảo sát biểu quyết</label>
                <input 
                  type="text" 
                  value={newPollQuestion} 
                  onChange={(e) => setNewPollQuestion(e.target.value)} 
                  className="input-text"
                  placeholder="Ví dụ: Bạn có đồng ý triển khai thiết kế mới không?"
                  required
                />
              </div>

              <div className="form-group">
                <label>Loại biểu quyết</label>
                <select 
                  value={newPollType} 
                  onChange={(e) => setNewPollType(e.target.value)} 
                  className="select-input"
                >
                  <option value="single">Một lựa chọn duy nhất (Single Choice)</option>
                  <option value="multiple">Nhiều lựa chọn (Multiple Choice)</option>
                </select>
              </div>

              <div className="form-group">
                <div className="poll-options-label-row">
                  <label>Các phương án đáp án</label>
                  <button 
                    type="button" 
                    onClick={addOptionField} 
                    className="btn btn-secondary btn-add-poll-option-field"
                  >
                    Thêm đáp án
                  </button>
                </div>
                
                <div className="poll-inputs-list">
                  {newPollOptions.map((opt, idx) => (
                    <input 
                      key={idx}
                      type="text"
                      value={opt}
                      onChange={(e) => updateOptionValue(idx, e.target.value)}
                      className="input-text"
                      placeholder={`Phương án ${idx + 1}...`}
                      required={idx < 2}
                    />
                  ))}
                </div>
              </div>

              <div className="modal-footer-buttons">
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  Phát hành khảo sát
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsPollModalOpen(false)} 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmVoteData && (
        <div className="modal-overlay">
          <div className="modal-content confirmation-modal">
            <div className="modal-header">
              <h3>Xác nhận biểu quyết</h3>
              <button onClick={() => setConfirmVoteData(null)} className="modal-close-btn">&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '16px 0' }}>
              <p>Bạn có chắc chắn muốn bình chọn cho phương án này không?</p>
            </div>
            <div className="modal-footer-buttons" style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={async () => {
                  const { pollId, optionId } = confirmVoteData;
                  await handleVote(pollId, optionId);
                  setConfirmVoteData(null);
                }} 
                className="btn btn-primary"
                style={{ flex: 2 }}
              >
                Chắc chắn
              </button>
              <button 
                onClick={() => setConfirmVoteData(null)} 
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MeetingRoom.displayName = 'MeetingRoom';
