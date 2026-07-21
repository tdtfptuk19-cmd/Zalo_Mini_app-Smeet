import React, { useState, useEffect, useCallback } from 'react';
import { Users, Calendar, FileText, Clock, CheckCircle, AlertCircle, TrendingUp, BellPlus } from 'lucide-react';
import { Storage } from '../utils/storage';
import { downloadIcsFile } from '../utils/calendarHelper';

const formatTime = (isoStr) => {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (isoStr) => {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const getMeetingStatusInfo = (meeting) => {
  const now = new Date();
  const start = new Date(meeting.startTime);
  const end = new Date(meeting.endTime);
  if (meeting.status === 'canceled') return { label: 'Đã hủy', cls: 'status-canceled' };
  if (meeting.status === 'completed') return { label: 'Đã kết thúc', cls: 'status-completed' };
  if (now >= start && now <= end) return { label: 'Đang diễn ra', cls: 'status-live' };
  if (now < start) return { label: 'Sắp diễn ra', cls: 'status-upcoming' };
  return { label: 'Đã kết thúc', cls: 'status-completed' };
};

export const Dashboard = React.memo(({ currentUser, onEnterMeeting, onOpenCreateMeeting }) => {
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError('');
    try {
      const data = await Storage.getDashboard();
      setDashData(data);
    } catch (err) {
      if (!isBackground) {
        setError(err.message || 'Không thể tải dữ liệu tổng quan.');
      } else {
        console.warn('Background dashboard refresh error:', err.message);
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(false);
    // Tự động làm mới ngầm mỗi 60 giây (không hiển thị spinner nhảy màn hình)
    const interval = setInterval(() => loadDashboard(true), 60000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Đang tải tổng quan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card dashboard-error">
        <AlertCircle size={24} style={{ color: 'var(--danger)' }} />
        <p>{error}</p>
        <button className="btn btn-secondary" onClick={() => loadDashboard(false)}>Thử lại</button>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';
  const isAdminOrDelegated = isAdmin || currentUser?.role === 'delegated';

  return (
    <div className="dashboard-view">
      {/* Stats cards */}
      <div className="dashboard-stats-grid">
        <div className="dashboard-stat-card stat-blue">
          <div className="stat-icon"><Calendar size={22} /></div>
          <div className="stat-info">
            <div className="stat-number">{dashData?.todayMeetingsCount ?? 0}</div>
            <div className="stat-label">Cuộc họp hôm nay</div>
          </div>
        </div>

        <div className="dashboard-stat-card stat-green">
          <div className="stat-icon"><Clock size={22} /></div>
          <div className="stat-info">
            <div className="stat-number">{dashData?.upcomingMeetings?.length ?? 0}</div>
            <div className="stat-label">Sắp diễn ra (7 ngày)</div>
          </div>
        </div>

        <div className="dashboard-stat-card stat-purple">
          <div className="stat-icon"><FileText size={22} /></div>
          <div className="stat-info">
            <div className="stat-number">{dashData?.totalReports ?? 0}</div>
            <div className="stat-label">Báo cáo đã lưu</div>
          </div>
        </div>

        {isAdmin && (
          <div className="dashboard-stat-card stat-orange">
            <div className="stat-icon"><Users size={22} /></div>
            <div className="stat-info">
              <div className="stat-number">{dashData?.totalMembers ?? 0}</div>
              <div className="stat-label">Thành viên</div>
            </div>
          </div>
        )}
      </div>

      {/* Đang diễn ra */}
      {dashData?.activeMeetingNow?.length > 0 && (
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <span className="pulse-dot" />
            <h3>Đang diễn ra ngay bây giờ</h3>
          </div>
          <div className="dashboard-meeting-list">
            {dashData.activeMeetingNow.map(m => (
              <div key={m.id} className="dashboard-meeting-card live-card" onClick={() => onEnterMeeting(m)}>
                <div className="dm-card-top">
                  <span className="dm-badge dm-badge-live">🔴 Live</span>
                  <span className="dm-time">{formatTime(m.startTime)} – {formatTime(m.endTime)}</span>
                </div>
                <div className="dm-title">{m.title}</div>
                <div className="dm-host">👤 {m.hostName}</div>
                <div className="dm-join-hint">Nhấn để vào phòng họp →</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cuộc họp hôm nay */}
      <div className="dashboard-section">
        <div className="dashboard-section-header">
          <Calendar size={18} />
          <h3>Lịch họp hôm nay</h3>
        </div>
        {dashData?.todayMeetings?.length === 0 ? (
          <div className="dashboard-empty-card">
            <span>☕</span>
            <p>Không có cuộc họp nào hôm nay.</p>
            {isAdminOrDelegated && (
              <button className="btn btn-primary btn-sm" onClick={onOpenCreateMeeting}>
                + Tạo cuộc họp
              </button>
            )}
          </div>
        ) : (
          <div className="dashboard-meeting-list">
            {dashData.todayMeetings.map(m => {
              const status = getMeetingStatusInfo(m);
              return (
                <div key={m.id} className="dashboard-meeting-card" onClick={() => onEnterMeeting(m)}>
                  <div className="dm-card-top">
                    <span className={`dm-badge dm-badge-status ${status.cls}`}>{status.label}</span>
                    <span className="dm-time">{formatTime(m.startTime)} – {formatTime(m.endTime)}</span>
                  </div>
                  <div className="dm-title">{m.title}</div>
                  <div className="dm-host">👤 {m.hostName}</div>
                  <div className="dm-bottom-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <div className={`dm-location ${m.locationType === 'online' ? 'dm-online' : 'dm-offline'}`}>
                      {m.locationType === 'online' ? '🌐 Online' : `📍 ${m.locationDetail}`}
                    </div>
                    {m.status === 'active' && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.72rem', padding: '3px 7px', background: 'rgba(0, 104, 255, 0.08)', color: '#0068FF', border: '1px solid rgba(0, 104, 255, 0.2)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadIcsFile(m);
                        }}
                        title="Tải file lịch .ics (Apple/Google/Samsung Calendar) với 2 mốc nhắc nhở (24h & 30m)"
                      >
                        <BellPlus size={12} style={{ marginRight: '2px' }} />
                        Nhắc Lịch
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sắp diễn ra */}
      {dashData?.upcomingMeetings?.length > 0 && (
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <TrendingUp size={18} />
            <h3>Sắp diễn ra (7 ngày tới)</h3>
          </div>
          <div className="dashboard-meeting-list">
            {dashData.upcomingMeetings.map(m => (
              <div key={m.id} className="dashboard-meeting-card" onClick={() => onEnterMeeting(m)}>
                <div className="dm-card-top">
                  <span className="dm-badge dm-badge-upcoming">Sắp diễn ra</span>
                  <span className="dm-time">{formatDate(m.startTime)} • {formatTime(m.startTime)}</span>
                </div>
                <div className="dm-title">{m.title}</div>
                <div className="dm-host">👤 {m.hostName}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meetings hoàn thành chưa có báo cáo – chỉ admin/delegated thấy */}
      {isAdminOrDelegated && dashData?.meetingsWithoutReport?.length > 0 && (
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <AlertCircle size={18} style={{ color: 'var(--warning, #f59e0b)' }} />
            <h3 style={{ color: 'var(--warning, #f59e0b)' }}>Chưa có báo cáo</h3>
          </div>
          <div className="dashboard-meeting-list">
            {dashData.meetingsWithoutReport.map(m => (
              <div key={m.id} className="dashboard-meeting-card warning-card" onClick={() => onEnterMeeting(m)}>
                <div className="dm-card-top">
                  <span className="dm-badge dm-badge-warning">⚠️ Thiếu báo cáo</span>
                  <span className="dm-time">{formatDate(m.startTime)}</span>
                </div>
                <div className="dm-title">{m.title}</div>
                <div className="dm-host">👤 {m.hostName}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trạng thái nếu mọi thứ ổn */}
      {isAdminOrDelegated && dashData?.meetingsWithoutReport?.length === 0 && dashData?.totalReports > 0 && (
        <div className="dashboard-section">
          <div className="card dashboard-all-good-card">
            <CheckCircle size={20} style={{ color: 'var(--success, #10b981)' }} />
            <p>Tất cả cuộc họp đã có báo cáo. Tuyệt vời! 🎉</p>
          </div>
        </div>
      )}
    </div>
  );
});

Dashboard.displayName = 'Dashboard';
