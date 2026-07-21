import { useState, useEffect, useRef, useCallback } from 'react';
import { Storage } from '../utils/storage';

export function useMeetingRoom(currentUser, activeMeeting, setActiveMeeting, triggerNotification) {
  // Personal note states
  const [myNote, setMyNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Poll states
  const [polls, setPolls] = useState([]);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollType, setNewPollType] = useState('single');
  const [newPollOptions, setNewPollOptions] = useState(['', '']);

  // AI report states
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiReportOutput, setAiReportOutput] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [aiStatusText, setAiStatusText] = useState('');
  const [aiError, setAiError] = useState('');
  
  // Abort controller ref
  const abortControllerRef = useRef(null);

  // Ref to track last saved or loaded note content to prevent unwanted autosave on entry
  const lastSavedNoteRef = useRef('');

  // Online meeting configurations (Host only)
  const [onlinePlatform, setOnlinePlatform] = useState('meet');
  const [onlineMeetLink, setOnlineMeetLink] = useState('');
  const [onlineWaitingRoom, setOnlineWaitingRoom] = useState(false);
  const [onlineAutoRecord, setOnlineAutoRecord] = useState(false);
  const [onlineMuteOnEntry, setOnlineMuteOnEntry] = useState(false);

  // Load/sync notes and polls when active meeting or user changes
  const syncMeetingData = useCallback(async (meetingId, userId) => {
    if (!meetingId || !userId) return;
    try {
      const allNotes = await Storage.getNotes(meetingId);
      const userNoteObj = allNotes.find(n => n.userId === userId);
      const content = userNoteObj ? userNoteObj.content : '';
      
      // Update ref and note content, mark unsaved changes as false
      lastSavedNoteRef.current = content;
      setMyNote(content);
      setLastSavedTime(userNoteObj ? new Date(userNoteObj.updatedAt).toLocaleTimeString('vi-VN') : null);
      setHasUnsavedChanges(false);

      const loadedPolls = await Storage.getPolls(meetingId);
      setPolls(loadedPolls);

      // Setup online configs
      const meetingsList = await Storage.getMeetings();
      const meeting = meetingsList.find(m => m.id === meetingId);
      if (meeting) {
        const meetConfig = meeting.onlineConfig || {
          platform: meeting.locationType === 'online' ? 'meet' : 'meet',
          link: meeting.locationDetail,
          waitingRoom: false,
          autoRecord: false,
          muteOnEntry: false
        };
        setOnlinePlatform(meetConfig.platform || 'meet');
        setOnlineMeetLink(meetConfig.link || meeting.locationDetail || '');
        setOnlineWaitingRoom(meetConfig.waitingRoom || false);
        setOnlineAutoRecord(meetConfig.autoRecord || false);
        setOnlineMuteOnEntry(meetConfig.muteOnEntry || false);
      }
    } catch (err) {
      console.error("Failed to sync meeting data:", err);
    }
  }, []);

  // Save note action
  const saveNoteNow = useCallback(async (noteContent = myNote) => {
    if (!activeMeeting || !currentUser) return;
    setSavingNote(true);
    try {
      await Storage.saveNote(activeMeeting.id, currentUser.id, noteContent);
      lastSavedNoteRef.current = noteContent; // Update ref!
      setLastSavedTime(new Date().toLocaleTimeString('vi-VN'));
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Failed to save note:", err);
    } finally {
      setSavingNote(false);
    }
  }, [activeMeeting, currentUser, myNote]);

  // Debounced auto-save (triggered 3s after user stops typing)
  useEffect(() => {
    if (!activeMeeting || !currentUser) return;
    
    // Only set unsaved changes if content actually changed
    if (myNote !== lastSavedNoteRef.current) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      saveNoteNow(myNote);
    }, 3000);

    return () => clearTimeout(delayDebounceFn);
  }, [myNote, activeMeeting, currentUser, saveNoteNow]);

  // prevent unload event listener
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        const message = 'Bạn có ghi chú chưa lưu. Bạn có chắc chắn muốn rời khỏi trang?';
        e.returnValue = message;
        return message;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Save online configs
  const handleSaveOnlineConfig = async () => {
    if (!activeMeeting) return false;
    try {
      const updatedMeeting = {
        ...activeMeeting,
        locationDetail: onlineMeetLink.trim(),
        onlineConfig: {
          platform: onlinePlatform,
          link: onlineMeetLink.trim(),
          waitingRoom: onlineWaitingRoom,
          autoRecord: onlineAutoRecord,
          muteOnEntry: onlineMuteOnEntry
        }
      };

      await Storage.saveMeeting(updatedMeeting);
      setActiveMeeting(updatedMeeting);
      triggerNotification('[Hệ thống] Đã lưu cấu hình cuộc họp online thành công!');
      triggerNotification(`[Hệ thống] Cấu hình họp online "${activeMeeting.title}" được cập nhật bởi Host.`);
      return true;
    } catch (err) {
      triggerNotification(`[Lỗi] Lỗi khi lưu cấu hình: ${err.message}`);
      return false;
    }
  };

  // Poll voting – truyền meetingId để đường dẫn API đúng
  const handleVote = async (pollId, optionId) => {
    if (!activeMeeting) return false;
    try {
      await Storage.submitAnswer(activeMeeting.id, pollId, currentUser.id, optionId);
      const loadedPolls = await Storage.getPolls(activeMeeting.id);
      setPolls(loadedPolls);
      triggerNotification("[Khảo sát] Cảm ơn bạn đã tham gia biểu quyết thành công!");
      return true;
    } catch (err) {
      console.error("Failed to vote:", err);
      triggerNotification('[Lỗi] ' + (err.message || 'Không thể ghi nhận bình chọn.'));
      return false;
    }
  };

  // Xóa poll qua Storage (không raw fetch trực tiếp)
  const handleDeletePoll = async (pollId) => {
    if (!activeMeeting) return false;
    try {
      await Storage.deletePoll(activeMeeting.id, pollId);
      const loadedPolls = await Storage.getPolls(activeMeeting.id);
      setPolls(loadedPolls);
      triggerNotification('[Hệ thống] Đã xóa khảo sát.');
      return true;
    } catch (err) {
      console.error("Failed to delete poll:", err);
      triggerNotification('[Lỗi] ' + (err.message || 'Không thể xóa khảo sát.'));
      return false;
    }
  };

  // Creating Poll
  const handleAddPoll = async (question, type, options) => {
    if (!activeMeeting) return false;
    const filteredOptions = options.filter(o => o.trim() !== '');
    if (filteredOptions.length < 2) {
      triggerNotification('[Lỗi] Cần tối thiểu 2 đáp án khảo sát!');
      return false;
    }

    const pollData = {
      meetingId: activeMeeting.id,
      question: question.trim(),
      pollType: type,
      options: filteredOptions.map((text, i) => ({ id: `o_${Date.now()}_${i}`, text }))
    };

    try {
      await Storage.savePoll(pollData);
      const loadedPolls = await Storage.getPolls(activeMeeting.id);
      setPolls(loadedPolls);
      setIsPollModalOpen(false);
      setNewPollQuestion('');
      setNewPollOptions(['', '']);
      triggerNotification(`[Khảo sát] Khảo sát mới "${question}" đã được tạo.`);
      return true;
    } catch (err) {
      console.error("Failed to add poll:", err);
      return false;
    }
  };

  // Real-time Poll placeholder interface
  const setupRealtimePolls = useCallback((meetingId, onUpdate) => {
    // This is a placeholder hook for future WebSockets / SSE integrations.
    // It currently polls every 10 seconds to simulate real-time updates.
    const interval = setInterval(async () => {
      try {
        const loadedPolls = await Storage.getPolls(meetingId);
        setPolls(loadedPolls);
        if (onUpdate) onUpdate(loadedPolls);
      } catch (err) {
        console.warn("SSE/WS simulation polling error:", err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // AI Report Generation (with Retry and AbortController)
  const generateAIReport = async (retryCount = 0) => {
    if (!activeMeeting) return;
    setGeneratingAI(true);
    setAiError('');
    setAiReportOutput('');
    setReportTitle(`Báo Cáo: ${activeMeeting.title}`);

    // Create abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setAiStatusText("Đang chuẩn bị dữ liệu ghi chú...");

    try {
      // Step 1 status transition simulation delay
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 800);
        controller.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });

      setAiStatusText("Đang gửi yêu cầu và phân tích qua Gemini API...");

      // Call API
      const report = await Storage.generateReport(activeMeeting.id, { signal: controller.signal });
      
      setAiStatusText("Đang định dạng và lưu trữ biên bản cuộc họp...");
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 600);
        controller.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });

      setAiReportOutput(report.summaryContent);
      setGeneratingAI(false);
      setAiStatusText('');
    } catch (err) {
      if (err.name === 'AbortError' || err.message === 'Aborted') {
        console.log("AI report generation aborted by user.");
        setGeneratingAI(false);
        setAiStatusText('');
        return;
      }

      console.error("AI Report error:", err);

      // Retry mechanism: auto retry up to 2 times
      if (retryCount < 2) {
        const nextRetry = retryCount + 1;
        setAiStatusText(`Lỗi kết nối. Đang tự động thử lại lần ${nextRetry}/2...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        generateAIReport(nextRetry);
      } else {
        setAiError(err.message || 'Không thể tổng hợp báo cáo bằng AI. Vui lòng kiểm tra lại ghi chú cuộc họp.');
        setGeneratingAI(false);
        setAiStatusText('');
      }
    }
  };

  const cancelAIReport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleSaveReport = async (title, content, creatorName, refreshReports) => {
    try {
      await Storage.saveReport({
        meetingId: activeMeeting.id,
        title: title,
        summaryContent: content,
        status: 'published',
        createdBy: creatorName
      });
      if (refreshReports) await refreshReports();
      triggerNotification('[Hệ thống] Đã lưu báo cáo thành công vào kho lưu trữ!');
      setAiReportOutput('');
      return true;
    } catch (err) {
      triggerNotification(`[Lỗi] Lỗi khi lưu báo cáo: ${err.message}`);
      return false;
    }
  };

  return {
    myNote,
    setMyNote,
    savingNote,
    lastSavedTime,
    hasUnsavedChanges,
    saveNoteNow,
    polls,
    isPollModalOpen,
    setIsPollModalOpen,
    newPollQuestion,
    setNewPollQuestion,
    newPollType,
    setNewPollType,
    newPollOptions,
    setNewPollOptions,
    generatingAI,
    aiReportOutput,
    setAiReportOutput,
    reportTitle,
    setReportTitle,
    aiStatusText,
    aiError,
    setAiError,
    generateAIReport,
    cancelAIReport,
    handleSaveReport,
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
    handleSaveOnlineConfig,
    handleVote,
    handleAddPoll,
    handleDeletePoll,
    syncMeetingData,
    setupRealtimePolls
  };
}
