import { useState, useEffect, useCallback } from 'react';
import { authorize, getUserInfo } from 'zmp-sdk/apis';
import { Download, FileText, Trash2 } from 'lucide-react';

import { Storage } from './utils/storage';
import { useAuth } from './hooks/useAuth';
import { useMeetings } from './hooks/useMeetings';
import { useMeetingRoom } from './hooks/useMeetingRoom';

// Sub-components
import { NotificationSim } from './components/NotificationSim';
import { Auth } from './components/Auth';
import { CalendarView } from './components/CalendarView';
import { MeetingList } from './components/MeetingList';
import { MeetingFormModal } from './components/MeetingFormModal';
import { QuickMeetingModal } from './components/QuickMeetingModal';
import { MeetingRoom } from './components/MeetingRoom';
import { SettingsDrawer } from './components/SettingsDrawer';

const logo = './assets/logo.png';

function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('calendar'); // calendar, meeting, reports, settings
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [reports, setReports] = useState([]);

  // Theme, scale & translation states
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [appFontSize, setAppFontSize] = useState('medium'); // small, medium, large
  const [appLanguage, setAppLanguage] = useState('vi'); // vi, en

  // 1. Notification trigger state
  const [simulatedNotif, setSimulatedNotif] = useState(null);
  const triggerNotification = useCallback((message) => {
    setSimulatedNotif(message);
    const timeout = setTimeout(() => {
      setSimulatedNotif(null);
    }, 6000);
    return () => clearTimeout(timeout);
  }, []);

  // 2. Initialize Custom Hooks
  const auth = useAuth(triggerNotification);
  const meetings = useMeetings(auth.currentUser, triggerNotification);
  const meetingRoom = useMeetingRoom(
    auth.currentUser, 
    activeMeeting, 
    setActiveMeeting, 
    triggerNotification
  );

  // Sync translation helper
  const t = useCallback((vi, en) => {
    return appLanguage === 'vi' ? vi : en;
  }, [appLanguage]);

  // Load report archive
  const refreshReports = useCallback(async () => {
    try {
      const loaded = await Storage.getReports();
      setReports(loaded);
      return loaded;
    } catch (e) {
      console.error(e);
      return [];
    }
  }, []);

  // Sync HTML elements class list for theme changes
  useEffect(() => {
    const root = document.getElementById('app') || document.body;
    if (isDarkMode) {
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
    }
  }, [isDarkMode]);

  // Sync HTML element class list for font scaling changes
  useEffect(() => {
    const root = document.getElementById('app') || document.body;
    root.classList.remove('font-small', 'font-medium', 'font-large');
    root.classList.add(`font-${appFontSize}`);
  }, [appFontSize]);

  // 3. Initial load sync (including Zalo SDK login checks and deep-linking)
  useEffect(() => {
    const initData = async () => {
      // Load user list
      await auth.initUsers();
      
      let sessionUser = await Storage.getLoggedInUser();
      const ZALO_DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI0U2RjBGRiIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE4IiBmaWxsPSIjMDA2OEZGIi8+PHBhdGggZD0iTTUwIDYwYy0xOCAwLTMwIDgtMzAgMTh2NGg2MHYtNGMwLTEwLTEyLTE4LTMwLTE4eiIgZmlsbD0iIzAwNjhGRiIvPjwvc3ZnPg==';
      
      if (sessionUser && sessionUser.avatar && sessionUser.avatar.includes('unsplash.com')) {
        sessionUser.avatar = ZALO_DEFAULT_AVATAR;
        await Storage.setLoggedInUser(sessionUser);
      }
      
      // Auto Zalo login attempt
      try {
        await authorize({ scopes: ["scope.userInfo"] });
        const res = await getUserInfo({});
        if (res && res.userInfo) {
          const zaloUser = res.userInfo;
          const authenticatedUser = await Storage.authenticateZalo({
            id: zaloUser.id,
            name: zaloUser.name,
            avatar: zaloUser.avatar || ZALO_DEFAULT_AVATAR
          });
          
          if (!sessionUser) {
            sessionUser = authenticatedUser;
            await Storage.setLoggedInUser(authenticatedUser);
          }
          await auth.initUsers();
        }
      } catch (err) {
        console.warn("Failed to fetch Zalo user info, using mock fallback:", err);
      }
      
      if (sessionUser) {
        auth.setCurrentUser(sessionUser);
      } else {
        auth.setCurrentUser(null);
      }
      
      // Load meetings list
      const loadedMeetings = await meetings.refreshMeetings();
      
      // Load reports archive
      await refreshReports();
      
      // Deep-linking checks
      const params = new URLSearchParams(window.location.search);
      const meetingIdParam = params.get('meetingId');
      if (meetingIdParam && sessionUser) {
        const matchedMeeting = loadedMeetings.find(m => m.id === meetingIdParam);
        if (matchedMeeting) {
          setActiveMeeting(matchedMeeting);
          setActiveTab('meeting');
        }
      }
    };
    
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Intercept tab changes to save note if unsaved
  const switchTab = async (newTab) => {
    if (activeTab === 'meeting' && meetingRoom.hasUnsavedChanges) {
      await meetingRoom.saveNoteNow();
    }

    if (newTab === 'meeting') {
      if (!activeMeeting && meetings.meetings.length > 0) {
        // Auto-select first meeting if none is selected
        const first = meetings.meetings[0];
        setActiveMeeting(first);
        setActiveTab('meeting');
      } else if (!activeMeeting) {
        alert(t('Vui lòng chọn hoặc tạo một cuộc họp trước!', 'Please select or create a meeting first!'));
        setActiveTab('calendar');
      } else {
        setActiveTab('meeting');
      }
    } else {
      setActiveTab(newTab);
    }
  };

  const onEnterMeetingRoomFromList = async (meeting) => {
    if (activeTab === 'meeting' && meetingRoom.hasUnsavedChanges) {
      await meetingRoom.saveNoteNow();
    }
    setActiveMeeting(meeting);
    setActiveTab('meeting');
  };

  return (
    <div className={`app-container font-${appFontSize} ${isDarkMode ? 'dark-theme' : ''}`}>
      {/* Toast Notification Simulation */}
      <NotificationSim message={simulatedNotif} />

      {auth.currentUser === null ? (
        <Auth
          users={auth.users}
          loginPhone={auth.loginPhone}
          setLoginPhone={auth.setLoginPhone}
          otpSent={auth.otpSent}
          setOtpSent={auth.setOtpSent}
          loginOtp={auth.loginOtp}
          setLoginOtp={auth.setLoginOtp}
          isRegistering={auth.isRegistering}
          setIsRegistering={auth.setIsRegistering}
          registerName={auth.registerName}
          setRegisterName={auth.setRegisterName}
          registerRole={auth.registerRole}
          setRegisterRole={auth.setRegisterRole}
          loginError={auth.loginError}
          setLoginError={auth.setLoginError}
          loginPhoneMatchedUsers={auth.loginPhoneMatchedUsers}
          isSelectingAccount={auth.isSelectingAccount}
          setIsSelectingAccount={auth.setIsSelectingAccount}
          handleSendOtp={auth.handleSendOtp}
          handleVerifyOtp={auth.handleVerifyOtp}
          handleSelectAccount={auth.handleSelectAccount}
          handleRegister={auth.handleRegister}
          resetLoginStates={auth.resetLoginStates}
        />
      ) : (
        <>
          {/* Header Layout */}
          <header className="app-header">
            <div className="header-top">
              <h1 className="app-title app-title-clickable" onClick={() => switchTab('calendar')}>
                <img src={logo} alt="Logo" className="app-logo" />
                <span>{t('Smeet', 'Smeet')}</span>
              </h1>
              
              {/* Profile click opens Drawer */}
              <div 
                onClick={() => auth.setIsAvatarModalOpen(true)}
                className="header-avatar-container header-profile-trigger"
              >
                <div className="header-profile-meta">
                  <span className="header-profile-name">{auth.currentUser.name}</span>
                  <span className="header-profile-role">
                    {auth.currentUser.role === 'admin' ? t('Quản lý', 'Admin') : auth.currentUser.role === 'delegated' ? t('Ủy quyền', 'Delegated') : t('Thành viên', 'Member')}
                  </span>
                </div>
                <img 
                  src={auth.currentUser.avatar} 
                  alt={auth.currentUser.name} 
                  className="header-profile-avatar" 
                />
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="nav-tabs">
              <button 
                className={`nav-tab ${activeTab === 'calendar' ? 'active' : ''}`}
                onClick={() => switchTab('calendar')}
              >
                {t('Lịch Họp', 'Calendar')}
              </button>
              <button 
                className={`nav-tab ${activeTab === 'meeting' ? 'active' : ''}`}
                onClick={() => switchTab('meeting')}
              >
                {t('Phòng Họp', 'Meeting Room')}
              </button>
              <button 
                className={`nav-tab ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => switchTab('reports')}
              >
                {t(`Báo Cáo (${reports.length})`, `Reports (${reports.length})`)}
              </button>
            </div>
          </header>

          {/* Main workspace scroll view */}
          <main className="app-content">
            
            {/* Tab 1: Calendar Scheduling view */}
            {activeTab === 'calendar' && (
              <>
                <CalendarView
                  currentDate={meetings.currentDate}
                  setCurrentDate={meetings.setCurrentDate}
                  selectedDate={meetings.selectedDate}
                  setSelectedDate={meetings.setSelectedDate}
                  meetings={meetings.meetings}
                  currentUser={auth.currentUser}
                />
                
                <MeetingList
                  selectedDate={meetings.selectedDate}
                  selectedDateMeetings={meetings.selectedDateMeetings}
                  currentUser={auth.currentUser}
                  openEditMeetingForm={meetings.openEditMeetingForm || meetings.setEditingMeeting}
                  enterMeetingWorkspace={onEnterMeetingRoomFromList}
                  openNewMeetingForm={() => meetings.setIsMeetingModalOpen(true)}
                  openQuickMeetingForm={() => meetings.setIsQuickMeetingModalOpen(true)}
                  onDeleteMeeting={meetings.handleDeleteMeeting}
                  onCancelMeeting={meetings.handleCancelMeeting}
                />
              </>
            )}

            {/* Tab 2: Meeting Room Workspace (Autosave, Polls, AI minutes generator) */}
            {activeTab === 'meeting' && (
              <MeetingRoom
                activeMeeting={activeMeeting}
                setActiveMeeting={setActiveMeeting}
                currentUser={auth.currentUser}
                refreshReports={refreshReports}
                setActiveTab={switchTab}
                triggerNotification={triggerNotification}
                
                myNote={meetingRoom.myNote}
                setMyNote={meetingRoom.setMyNote}
                savingNote={meetingRoom.savingNote}
                lastSavedTime={meetingRoom.lastSavedTime}
                hasUnsavedChanges={meetingRoom.hasUnsavedChanges}
                saveNoteNow={meetingRoom.saveNoteNow}
                
                polls={meetingRoom.polls}
                isPollModalOpen={meetingRoom.isPollModalOpen}
                setIsPollModalOpen={meetingRoom.setIsPollModalOpen}
                newPollQuestion={meetingRoom.newPollQuestion}
                setNewPollQuestion={meetingRoom.setNewPollQuestion}
                newPollType={meetingRoom.newPollType}
                setNewPollType={meetingRoom.setNewPollType}
                newPollOptions={meetingRoom.newPollOptions}
                setNewPollOptions={meetingRoom.setNewPollOptions}
                handleVote={meetingRoom.handleVote}
                handleAddPoll={meetingRoom.handleAddPoll}
                syncMeetingData={meetingRoom.syncMeetingData}
                setupRealtimePolls={meetingRoom.setupRealtimePolls}
                
                generatingAI={meetingRoom.generatingAI}
                aiReportOutput={meetingRoom.aiReportOutput}
                setAiReportOutput={meetingRoom.setAiReportOutput}
                reportTitle={meetingRoom.reportTitle}
                setReportTitle={meetingRoom.setReportTitle}
                aiStatusText={meetingRoom.aiStatusText}
                aiError={meetingRoom.aiError}
                generateAIReport={meetingRoom.generateAIReport}
                cancelAIReport={meetingRoom.cancelAIReport}
                handleSaveReport={meetingRoom.handleSaveReport}
                
                onlinePlatform={meetingRoom.onlinePlatform}
                setOnlinePlatform={meetingRoom.setOnlinePlatform}
                onlineMeetLink={meetingRoom.onlineMeetLink}
                setOnlineMeetLink={meetingRoom.setOnlineMeetLink}
                onlineWaitingRoom={meetingRoom.onlineWaitingRoom}
                setOnlineWaitingRoom={meetingRoom.setOnlineWaitingRoom}
                onlineAutoRecord={meetingRoom.onlineAutoRecord}
                setOnlineAutoRecord={meetingRoom.setOnlineAutoRecord}
                onlineMuteOnEntry={meetingRoom.onlineMuteOnEntry}
                setOnlineMuteOnEntry={meetingRoom.setOnlineMuteOnEntry}
                handleSaveOnlineConfig={meetingRoom.handleSaveOnlineConfig}
              />
            )}

            {/* Tab 3: Report Archives view */}
            {activeTab === 'reports' && (
              <div className="reports-view">
                <h3 className="reports-title">Kho lưu trữ báo cáo cuộc họp</h3>
                
                {reports.length === 0 ? (
                  <div className="card reports-empty-card">
                    Chưa có báo cáo cuộc họp nào được lưu lại.
                  </div>
                ) : (
                  <div className="reports-list">
                    {reports.map(report => (
                      <div key={report.id} className="card report-card">
                        <div className="report-card-topline">
                          <span className="report-status-badge">
                            Đã phát hành
                          </span>
                          <span className="report-date">
                            {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        
                        <h4 className="report-title">{report.title}</h4>
                        <p className="report-author">Tạo bởi: {report.createdBy}</p>
                        
                        <div className="report-summary-box">
                          {report.summaryContent}
                        </div>

                        <div className="report-actions-row">
                          <button 
                            onClick={() => {
                              const blob = new Blob([report.summaryContent], { type: 'text/plain;charset=utf-8' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${report.title.replace(/\s+/g, '_')}.txt`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            }}
                            className="btn btn-secondary report-action-btn"
                          >
                            <Download size={14} />
                            Tải tệp (.txt)
                          </button>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(report.summaryContent);
                              triggerNotification(`Đã sao chép nội dung biên bản: "${report.title}"`);
                            }}
                            className="btn btn-secondary report-action-btn"
                          >
                            <FileText size={14} />
                            Sao chép
                          </button>
                          <button 
                            onClick={async () => {
                              if (window.confirm(`Bạn có chắc chắn muốn xóa báo cáo "${report.title}"?`)) {
                                try {
                                  await fetch(`/api/reports/${report.id}`, { method: 'DELETE' });
                                  await refreshReports();
                                  triggerNotification('[Hệ thống] Đã xóa báo cáo thành công.');
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }}
                            className="btn btn-danger report-action-btn"
                            style={{ fontSize: '0.85em' }}
                          >
                            <Trash2 size={14} />
                            Xóa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Form Modal for Creating/Editing Meetings */}
          <MeetingFormModal
            isOpen={meetings.isMeetingModalOpen}
            onClose={() => {
              meetings.setIsMeetingModalOpen(false);
              meetings.setEditingMeeting(null);
            }}
            editingMeeting={meetings.editingMeeting}
            currentUser={auth.currentUser}
            users={auth.users}
            onSaveMeeting={meetings.handleSaveMeeting}
            onDeleteMeeting={meetings.handleDeleteMeeting}
          />

          {/* Quick Meeting Modal */}
          <QuickMeetingModal
            isOpen={meetings.isQuickMeetingModalOpen}
            onClose={() => meetings.setIsQuickMeetingModalOpen(false)}
            currentUser={auth.currentUser}
            users={auth.users}
            onSaveMeeting={meetings.handleSaveMeeting}
            onQuickMeetingSuccess={(savedMeeting) => {
              setActiveMeeting(savedMeeting);
              setActiveTab('meeting');
            }}
          />

          {/* Sidebar Drawer Settings Control */}
          <SettingsDrawer
            isOpen={auth.isAvatarModalOpen}
            onClose={() => auth.setIsAvatarModalOpen(false)}
            currentUser={auth.currentUser}
            users={auth.users}
            handleLogout={auth.handleLogout}
            handleSavePersonalPhone={auth.handleSavePersonalPhone}
            handleAddMember={auth.handleAddMember}
            handleDeleteMember={auth.handleDeleteMember}
            handleUserChange={auth.handleUserChange}
            handleAvatarChange={auth.handleAvatarChange}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            appFontSize={appFontSize}
            setAppFontSize={setAppFontSize}
            appLanguage={appLanguage}
            setAppLanguage={setAppLanguage}
            triggerNotification={triggerNotification}
          />
        </>
      )}
    </div>
  );
}

export default App;
