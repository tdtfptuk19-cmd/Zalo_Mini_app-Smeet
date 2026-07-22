import { useState, useCallback, useMemo, useEffect } from 'react';
import { Storage } from '../utils/storage';
import { checkAndSendMeetingNotifications, sendMeetingCreatedNotification } from '../utils/notificationHelper';
import { hasRole } from './useAuth';

export function useMeetings(currentUser, triggerNotification) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [meetings, setMeetings] = useState([]);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isQuickMeetingModalOpen, setIsQuickMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); // tìm kiếm cuộc họp

  const refreshMeetings = useCallback(async () => {
    try {
      const loaded = await Storage.getMeetings();
      setMeetings(loaded);
      // Tự động kiểm tra và bắn thông báo nổi nếu có họp 24h & 30m
      checkAndSendMeetingNotifications(loaded);
      return loaded;
    } catch (e) {
      console.error("Failed to load meetings:", e);
      return [];
    }
  }, []);

  // Chạy ngầm kiểm tra thông báo mỗi 60 giây khi ứng dụng mở
  useEffect(() => {
    if (meetings.length > 0) {
      checkAndSendMeetingNotifications(meetings);
    }
    const interval = setInterval(() => {
      if (meetings.length > 0) {
        checkAndSendMeetingNotifications(meetings);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [meetings]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const openEditMeetingForm = useCallback((meeting) => {
    setEditingMeeting(meeting);
    setIsMeetingModalOpen(true);
  }, []);

  const handleDeleteMeeting = async (meetingId, skipConfirm = false) => {
    // Yêu cầu xác nhận trước khi xóa (trừ khi skipConfirm = true từ component tự xử lý)
    if (!skipConfirm) {
      const meetingToDelete = meetings.find(m => m.id === meetingId);
      const meetingTitle = meetingToDelete ? `"${meetingToDelete.title}"` : 'này';
      if (!window.confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN cuộc họp ${meetingTitle}?\n\nHành động này không thể hoàn tác!`)) {
        return false;
      }
    }

    try {
      await Storage.deleteMeeting(meetingId);
      setIsMeetingModalOpen(false);
      setEditingMeeting(null);
      await refreshMeetings();
      triggerNotification('[Hệ thống] Đã xóa cuộc họp thành công!');
      return true;
    } catch (err) {
      console.error("Failed to delete meeting:", err);
      triggerNotification('[Lỗi] ' + (err.message || 'Có lỗi xảy ra khi xóa cuộc họp.'));
      return false;
    }
  };

  const handleCancelMeeting = async (meetingId) => {
    try {
      // Dùng PATCH status thay vì save toàn bộ object
      await Storage.updateMeetingStatus(meetingId, 'canceled');
      await refreshMeetings();

      const meetingToCancel = meetings.find(m => m.id === meetingId);
      triggerNotification(
        `[Hệ thống] Đã hủy cuộc họp: "${meetingToCancel?.title || ''}"`
      );
      return true;
    } catch (err) {
      console.error("Failed to cancel meeting:", err);
      triggerNotification('[Lỗi] ' + (err.message || 'Có lỗi xảy ra khi hủy cuộc họp.'));
      return false;
    }
  };

  const handleCompleteMeeting = async (meetingId) => {
    try {
      await Storage.updateMeetingStatus(meetingId, 'completed');
      await refreshMeetings();

      const m = meetings.find(m => m.id === meetingId);
      triggerNotification(`[Hệ thống] Đã kết thúc cuộc họp: "${m?.title || ''}"`);
      return true;
    } catch (err) {
      console.error("Failed to complete meeting:", err);
      triggerNotification('[Lỗi] ' + (err.message || 'Có lỗi xảy ra khi kết thúc cuộc họp.'));
      return false;
    }
  };

  const handleSaveMeeting = async (meetingData) => {
    try {
      const isEdit = !!meetingData.id;
      const saved = await Storage.saveMeeting(meetingData);
      await refreshMeetings();
      setIsMeetingModalOpen(false);
      setEditingMeeting(null);
      
      const isQuick = meetingData.note?.includes('Cuộc họp nhanh') || meetingData.isQuick;

      // Gửi thông báo nổi native hệ thống ngay lập tức khi tạo cuộc họp mới
      if (!isEdit) {
        sendMeetingCreatedNotification(saved, isQuick);
      }

      const startDateTime = new Date(meetingData.startTime);
      const startTimeStr = startDateTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = startDateTime.toLocaleDateString('vi-VN');
      triggerNotification(
        `[Hệ thống] ${isQuick ? 'Khởi tạo họp nhanh' : 'Đặt lịch'} thành công: "${saved.title}" lúc ${startTimeStr} (${dateStr}).`
      );
      return saved;
    } catch (err) {
      triggerNotification('[Lỗi] ' + (err.message || 'Không thể lưu cuộc họp.'));
      throw err; // ném lại để component hiển thị lỗi inline
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Filter meetings cho ngày được chọn trên calendar
  // - Loại trừ meeting bị hủy khỏi calendar (vẫn hiện trong danh sách)
  // - Admin thấy tất cả; host và thành viên được mời thấy meeting của họ
  // ─────────────────────────────────────────────────────────────────────
  const selectedDateMeetings = useMemo(() => {
    return meetings.filter(m => {
      // Ẩn meeting đã hủy khỏi calendar
      if (m.status === 'canceled') return false;

      const mDate = new Date(m.startTime).toDateString();
      const isDateMatch = mDate === selectedDate.toDateString();
      if (!isDateMatch) return false;
      
      if (!currentUser) return false;
      const isAdmin = hasRole(currentUser, 'admin');
      const isHost = m.createdBy === currentUser.id || m.hostPhone === currentUser.phone;
      const isInvited = (m.members && m.members.includes(currentUser.id)) || 
                        (m.memberPhones && m.memberPhones.includes(currentUser.phone));
      return isAdmin || isHost || isInvited;
    });
  }, [meetings, selectedDate, currentUser]);

  // ─────────────────────────────────────────────────────────────────────
  // Tìm kiếm cuộc họp (theo tiêu đề, host, hoặc địa điểm)
  // ─────────────────────────────────────────────────────────────────────
  const searchedMeetings = useMemo(() => {
    if (!searchQuery.trim()) return meetings;
    const q = searchQuery.toLowerCase().trim();
    return meetings.filter(m =>
      m.title?.toLowerCase().includes(q) ||
      m.hostName?.toLowerCase().includes(q) ||
      m.locationDetail?.toLowerCase().includes(q) ||
      m.note?.toLowerCase().includes(q)
    );
  }, [meetings, searchQuery]);

  return {
    currentDate,
    setCurrentDate,
    selectedDate,
    setSelectedDate,
    meetings,
    setMeetings,
    isMeetingModalOpen,
    setIsMeetingModalOpen,
    isQuickMeetingModalOpen,
    setIsQuickMeetingModalOpen,
    editingMeeting,
    setEditingMeeting,
    openEditMeetingForm,
    refreshMeetings,
    handlePrevMonth,
    handleNextMonth,
    handleJumpToToday,
    handleDeleteMeeting,
    handleCancelMeeting,
    handleCompleteMeeting,
    handleSaveMeeting,
    selectedDateMeetings,
    searchQuery,
    setSearchQuery,
    searchedMeetings
  };
}
