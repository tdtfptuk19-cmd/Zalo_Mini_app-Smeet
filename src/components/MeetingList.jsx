import React, { useState } from 'react';
import { Video, MapPin, Phone, Edit, ArrowRight, Plus, Calendar, X, Zap } from 'lucide-react';

export const MeetingList = React.memo(({
  selectedDate,
  selectedDateMeetings,
  currentUser,
  openEditMeetingForm,
  enterMeetingWorkspace,
  openNewMeetingForm,
  openQuickMeetingForm,
  onDeleteMeeting,
  onCancelMeeting
}) => {
  const [activeTooltipId, setActiveTooltipId] = useState(null);
  const [deletingMeetingId, setDeletingMeetingId] = useState(null);

  const toggleTooltip = (meetingId, e) => {
    e.stopPropagation();
    setActiveTooltipId(activeTooltipId === meetingId ? null : meetingId);
  };

  // Close tooltip on document click
  React.useEffect(() => {
    const closeTooltip = () => setActiveTooltipId(null);
    document.addEventListener('click', closeTooltip);
    return () => document.removeEventListener('click', closeTooltip);
  }, []);

  const hasWriteAccess = currentUser?.role === 'admin' || currentUser?.role === 'delegated';

  const now = new Date();

  // Filter out and categorize meetings
  const liveMeetings = selectedDateMeetings.filter(m => {
    const start = new Date(m.startTime);
    const end = new Date(m.endTime);
    return start <= now && end >= now && m.status !== 'canceled';
  });

  const upcomingMeetings = selectedDateMeetings.filter(m => {
    const start = new Date(m.startTime);
    return start > now && m.status !== 'canceled';
  });

  const pastMeetings = selectedDateMeetings.filter(m => {
    const end = new Date(m.endTime);
    return end < now && m.status !== 'canceled';
  });

  const canceledMeetings = selectedDateMeetings.filter(m => m.status === 'canceled');

  const renderMeetingCard = (meeting, isPast = false, isLive = false) => {
    const isCreator = currentUser?.role === 'admin' || currentUser?.id === meeting.createdBy;
    const startTimeStr = new Date(meeting.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const isCanceled = meeting.status === 'canceled';
    
    return (
      <div 
        key={meeting.id} 
        className={`card meeting-card-item ${meeting.locationType === 'online' ? 'online' : ''} ${isPast ? 'past-meeting-card' : ''} ${isLive ? 'live-meeting-card' : ''} ${isCanceled ? 'canceled-meeting-card' : ''}`}
      >
        {/* Delete/Cancel confirmation overlay */}
        {deletingMeetingId === meeting.id && (
          <div className="meeting-card-delete-confirm-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-overlay-content">
              <p className="confirm-overlay-title">Thao tác cuộc họp</p>
              <p className="confirm-text">Bạn muốn hủy lịch họp hay xóa vĩnh viễn cuộc họp này?</p>
              <div className="confirm-buttons-column">
                {!isCanceled && (
                  <button 
                    type="button"
                    className="btn btn-warning btn-confirm-cancel-meet"
                    onClick={async () => {
                      await onCancelMeeting(meeting.id);
                      setDeletingMeetingId(null);
                    }}
                  >
                    Hủy cuộc họp (Giữ lịch sử)
                  </button>
                )}
                <button 
                  type="button"
                  className="btn btn-danger btn-confirm-delete"
                  onClick={async () => {
                    await onDeleteMeeting(meeting.id);
                    setDeletingMeetingId(null);
                  }}
                >
                  Xóa vĩnh viễn (Khỏi hệ thống)
                </button>
                <button 
                  type="button"
                  className="btn btn-secondary btn-cancel-delete"
                  onClick={() => setDeletingMeetingId(null)}
                >
                  Quay lại
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete X button in top right */}
        {isCreator && (
          <button 
            className="btn-delete-meeting-card-x"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingMeetingId(meeting.id);
            }}
            title="Hủy/Xóa cuộc họp"
          >
            <X size={12} />
          </button>
        )}

        <div className="meeting-meta-row">
          <div className="meeting-time-badge-container">
            <span className="meeting-time-badge">
              {startTimeStr} ({meeting.duration} phút)
            </span>
            {isLive && (
              <span className="meeting-live-badge">
                <span className="pulse-dot"></span>Đang diễn ra
              </span>
            )}
            {isPast && <span className="meeting-past-badge">Đã diễn ra</span>}
            {isCanceled && <span className="meeting-canceled-badge">Đã hủy</span>}
          </div>
          
          <div className="meeting-card-actions" style={{ paddingRight: isCreator ? '18px' : '0' }}>
            {isCreator && !isCanceled && (
              <button 
                onClick={() => openEditMeetingForm(meeting)} 
                className="btn-edit-meeting"
                aria-label="Chỉnh sửa cuộc họp"
              >
                <Edit size={16} />
                <span>Sửa</span>
              </button>
            )}
            <button 
              onClick={() => !isCanceled && enterMeetingWorkspace(meeting)} 
              className={`btn btn-secondary btn-join-room ${isCanceled ? 'btn-disabled' : ''}`}
              disabled={isCanceled}
            >
              <span>{isCanceled ? 'Đã hủy' : isPast ? 'Xem lại' : 'Vào phòng'}</span>
              {!isCanceled && <ArrowRight size={14} />}
            </button>
          </div>
        </div>
        
        <div className="meeting-title" style={{ paddingRight: isCreator ? '24px' : '0', textDecoration: isCanceled ? 'line-through' : 'none', opacity: isCanceled ? 0.6 : 1 }}>
          {meeting.title}
        </div>
        
        <div className="meeting-info-row" style={{ opacity: isCanceled ? 0.6 : 1 }}>
          {/* Location pill with tooltip */}
          <div 
            className="meeting-info-pill tooltip-container" 
            onClick={(e) => !isCanceled && toggleTooltip(meeting.id, e)}
            title={meeting.locationDetail}
          >
            {meeting.locationType === 'online' ? <Video size={14} color={isCanceled || isPast ? "#6c757d" : "#28a745"} /> : <MapPin size={14} color={isCanceled || isPast ? "#6c757d" : "#ff3b30"} />}
            <span className="meeting-location-text">
              {meeting.locationDetail}
            </span>
            
            {activeTooltipId === meeting.id && !isCanceled && (
              <div className="meeting-tooltip-box">
                <div className="tooltip-arrow" />
                <div className="tooltip-title">Chi tiết địa điểm:</div>
                <div className="tooltip-content">{meeting.locationDetail}</div>
              </div>
            )}
          </div>
          
          <div className="meeting-info-pill">
            <Phone size={14} />
            <span>Host: {meeting.hostName}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="meeting-list-section">
      <div className="meeting-list-header">
        <h4 className="meeting-section-title">
          Lịch họp ngày {selectedDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </h4>
        
        {hasWriteAccess && (
          <div className="meeting-list-header-buttons">
            <button 
              onClick={openQuickMeetingForm}
              className="btn btn-secondary btn-create-meeting-quick-action"
            >
              <Zap size={14} />
              <span>Họp nhanh</span>
            </button>
            <button 
              onClick={openNewMeetingForm}
              className="btn btn-primary btn-create-meeting-quick"
            >
              <Plus size={14} />
              <span>Tạo cuộc họp</span>
            </button>
          </div>
        )}
      </div>

      {selectedDateMeetings.length === 0 ? (
        <div className="card meeting-list-empty-state">
          <div className="empty-state-icon-wrapper">
            <Calendar size={48} className="empty-state-icon" />
          </div>
          <h3>Không có cuộc họp nào</h3>
          <p>Không có lịch họp nào được lên lịch cho ngày này.</p>
          {hasWriteAccess && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', width: '100%', justifyContent: 'center' }}>
              <button onClick={openQuickMeetingForm} className="btn btn-secondary" style={{ width: 'auto' }}>
                <Zap size={14} /> Họp nhanh
              </button>
              <button onClick={openNewMeetingForm} className="btn btn-primary" style={{ width: 'auto' }}>
                <Plus size={14} /> Đặt lịch họp
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="meetings-divided-lists">
          
          {/* Live Section */}
          {liveMeetings.length > 0 && (
            <div className="live-meetings-section">
              <h5 className="divided-section-title live-title">Đang diễn ra</h5>
              <div className="meeting-list">
                {liveMeetings.map(m => renderMeetingCard(m, false, true))}
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          <div className="upcoming-meetings-section">
            <h5 className="divided-section-title">Danh sách chờ diễn ra</h5>
            {upcomingMeetings.length === 0 ? (
              <p className="no-divided-meetings-text">Không có cuộc họp nào sắp diễn ra.</p>
            ) : (
              <div className="meeting-list">
                {upcomingMeetings.map(m => renderMeetingCard(m, false, false))}
              </div>
            )}
          </div>

          {/* Past Section */}
          {pastMeetings.length > 0 && (
            <div className="past-meetings-section">
              <h5 className="divided-section-title history-title">Lịch sử cuộc họp</h5>
              <div className="meeting-list">
                {pastMeetings.map(m => renderMeetingCard(m, true, false))}
              </div>
            </div>
          )}

          {/* Canceled Section */}
          {canceledMeetings.length > 0 && (
            <div className="canceled-meetings-section">
              <h5 className="divided-section-title canceled-title">Cuộc họp đã hủy</h5>
              <div className="meeting-list">
                {canceledMeetings.map(m => renderMeetingCard(m, false, false))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
});

MeetingList.displayName = 'MeetingList';
