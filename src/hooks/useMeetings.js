import { useState, useCallback, useMemo } from 'react';
import { Storage } from '../utils/storage';

export function useMeetings(currentUser, triggerNotification) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [meetings, setMeetings] = useState([]);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isQuickMeetingModalOpen, setIsQuickMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);

  const refreshMeetings = useCallback(async () => {
    try {
      const loaded = await Storage.getMeetings();
      setMeetings(loaded);
      return loaded;
    } catch (e) {
      console.error("Failed to load meetings:", e);
      return [];
    }
  }, []);

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

  const handleDeleteMeeting = async (meetingId) => {
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
      const meetingToCancel = meetings.find(m => m.id === meetingId);
      if (!meetingToCancel) throw new Error("Không tìm thấy cuộc họp");
      
      const updatedMeeting = {
        ...meetingToCancel,
        status: 'canceled'
      };
      
      await Storage.saveMeeting(updatedMeeting);
      await refreshMeetings();
      
      triggerNotification(
        `[Zalo/SMS] Đã hủy cuộc họp: "${meetingToCancel.title}"`
      );
      return true;
    } catch (err) {
      console.error("Failed to cancel meeting:", err);
      triggerNotification('[Lỗi] ' + (err.message || 'Có lỗi xảy ra khi hủy cuộc họp.'));
      return false;
    }
  };

  const handleSaveMeeting = async (meetingData) => {
    const saved = await Storage.saveMeeting(meetingData);
    await refreshMeetings();
    setIsMeetingModalOpen(false);
    setEditingMeeting(null);
    
    const startDateTime = new Date(meetingData.startTime);
    const startTimeStr = startDateTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = startDateTime.toLocaleDateString('vi-VN');
    triggerNotification(
      `[Zalo/SMS] Đặt lịch thành công: "${saved.title}" lúc ${startTimeStr} ngày ${dateStr}. Link: ${saved.locationDetail}.`
    );
    return saved;
  };

  // Filter meetings for the selected date on calendar (visible to creator/host or invited members)
  const selectedDateMeetings = useMemo(() => {
    return meetings.filter(m => {
      const mDate = new Date(m.startTime).toDateString();
      const isDateMatch = mDate === selectedDate.toDateString();
      if (!isDateMatch) return false;
      
      if (!currentUser) return false;
      const isAdmin = currentUser.role === 'admin';
      const isHost = m.createdBy === currentUser.id || m.hostPhone === currentUser.phone;
      const isInvited = (m.members && m.members.includes(currentUser.id)) || 
                        (m.memberPhones && m.memberPhones.includes(currentUser.phone));
      return isAdmin || isHost || isInvited;
    });
  }, [meetings, selectedDate, currentUser]);

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
    handleSaveMeeting,
    selectedDateMeetings
  };
}
