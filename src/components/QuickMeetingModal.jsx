import React, { useState, useEffect } from 'react';
import { AlertCircle, Zap, Video, X } from 'lucide-react';

const generateRandomMeetLink = () => {
  const randStr = (len) => {
    let s = '';
    for (let i = 0; i < len; i++) {
      s += String.fromCharCode(97 + Math.floor(Math.random() * 26));
    }
    return s;
  };
  return `https://meet.google.com/${randStr(3)}-${randStr(4)}-${randStr(3)}`;
};

export const QuickMeetingModal = React.memo(({
  isOpen,
  onClose,
  currentUser,
  users,
  onSaveMeeting,
  onQuickMeetingSuccess
}) => {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(30); // minutes
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Round to nearest 5 minutes
  const getRoundedTime = (minutesToAdd = 0) => {
    const now = new Date();
    const coefficient = 1000 * 60 * 5;
    const rounded = new Date(Math.ceil(now.getTime() / coefficient) * coefficient);
    if (minutesToAdd > 0) {
      rounded.setMinutes(rounded.getMinutes() + minutesToAdd);
    }
    return rounded;
  };

  // Generate default title and clear error on open
  useEffect(() => {
    if (isOpen) {
      const nowStr = getRoundedTime().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setTitle(`Họp nhanh - ${nowStr}`);
      setDuration(30);
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề cuộc họp!');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const startTime = getRoundedTime();
    const endTime = getRoundedTime(duration);
    
    // Generate a unique, randomized Google Meet link for this quick meeting
    const defaultMeetLink = generateRandomMeetLink();

    const meetingData = {
      title: title.trim(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      locationType: 'online',
      locationDetail: defaultMeetLink,
      hostName: currentUser?.name || 'Host',
      hostPhone: currentUser?.phone || '09xxxxxxxx',
      note: 'Cuộc họp nhanh được khởi tạo lập tức.',
      preparationContent: '',
      files: [],
      members: [],
      memberPhones: [],
      createdBy: currentUser?.id,
      isQuick: true,
      status: 'active'
    };

    try {
      const saved = await onSaveMeeting(meetingData);
      if (saved) {
        onQuickMeetingSuccess(saved);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Không thể tạo cuộc họp nhanh.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const durationOptions = [15, 30, 45, 60];

  return (
    <div className="modal-overlay">
      <div className="modal-content quick-meeting-modal">
        <div className="modal-header">
          <div className="modal-header-title-row">
            <Zap size={20} className="quick-meet-icon-zap" />
            <h3>Tạo cuộc họp nhanh</h3>
          </div>
          <button type="button" onClick={onClose} className="modal-close-btn" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="alert-box wizard-alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-body quick-meet-form">
          <div className="form-group">
            <label htmlFor="quick-meet-title">Tiêu đề cuộc họp</label>
            <input
              id="quick-meet-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-text"
              placeholder="Nhập tiêu đề cuộc họp..."
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label>Thời lượng cuộc họp</label>
            <div className="duration-grid-options">
              {durationOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`duration-option-card ${duration === opt ? 'active' : ''}`}
                  onClick={() => setDuration(opt)}
                  disabled={isSubmitting}
                >
                  <span className="duration-number">{opt}</span>
                  <span className="duration-label">Phút</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick meeting summary preview */}
          <div className="quick-meet-preview-card">
            <div className="preview-item">
              <span className="preview-label">Bắt đầu:</span>
              <span className="preview-value">Ngay bây giờ ({getRoundedTime().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Kết thúc:</span>
              <span className="preview-value">{getRoundedTime(duration).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({duration} phút)</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Hình thức:</span>
              <span className="preview-value online-value">Trực tuyến (Google Meet)</span>
            </div>
          </div>

          <div className="quick-meet-buttons-row">
            <button
              type="submit"
              className="btn btn-primary btn-quick-meet-submit"
              disabled={isSubmitting}
            >
              <Video size={18} />
              <span>{isSubmitting ? 'Đang tạo phòng...' : 'Bắt đầu họp ngay'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

QuickMeetingModal.displayName = 'QuickMeetingModal';
