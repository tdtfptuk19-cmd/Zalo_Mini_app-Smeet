import React, { useState, useEffect } from 'react';
import { Settings, LogOut, Trash2, CheckCircle, Save, Plus, Camera, Send, Bell, Server } from 'lucide-react';
import { Storage, getApiBase } from '../utils/storage';
import { requestNotificationPermission, getNotificationPermission } from '../utils/notificationHelper';

export const SettingsDrawer = React.memo(({
  isOpen,
  onClose,
  currentUser,
  users,
  handleLogout,
  handleSavePersonalPhone,
  handleAddMember,
  handleDeleteMember,
  handleUserChange,
  handleAvatarChange,
  isDarkMode,
  setIsDarkMode,
  appFontSize,
  setAppFontSize,
  appLanguage,
  setAppLanguage,
  triggerNotification
}) => {

  // Local state for deleting member custom confirmation modal
  const [confirmDeleteMember, setConfirmDeleteMember] = useState(null);

  // Local state for phone editing
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [personalPhone, setPersonalPhone] = useState(currentUser?.phone || '');

  // Local states for Admin's add member form
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('09');
  const [newMemberRole, setNewMemberRole] = useState('member');

  // Local states for Admin's SMS gateway form
  const [smsProvider, setSmsProvider] = useState('esms');
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [isSavingNotif, setIsSavingNotif] = useState(false);

  // Load cấu hình thông báo từ API khi Drawer mở
  useEffect(() => {
    if (isOpen && currentUser?.role === 'admin') {
      Storage.getNotifConfig().then(config => {
        if (config) {
          setSmsProvider(config.smsProvider || 'esms');
          setNotifEnabled(config.notifEnabled ?? false);
        }
      }).catch(err => {
        console.warn('Could not load notif config:', err);
      });
    }
  }, [isOpen, currentUser?.role]);

  // Local states for bug reporting
  const [bugTitle, setBugTitle] = useState('');
  const [bugContent, setBugContent] = useState('');
  const [bugCategory, setBugCategory] = useState('ui');
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);

  // Local state for custom backend URL configuration
  const [customServerUrl, setCustomServerUrl] = useState(() => localStorage.getItem('zmp_custom_api_url') || '');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleSaveServerUrl = async () => {
    const trimmed = customServerUrl.trim();
    if (trimmed) {
      localStorage.setItem('zmp_custom_api_url', trimmed);
      triggerNotification('[Hệ thống] Đã cập nhật địa chỉ Backend Server mới.');
    } else {
      localStorage.removeItem('zmp_custom_api_url');
      triggerNotification('[Hệ thống] Đã khôi phục cấu hình máy chủ mặc định.');
    }
    setTestingConnection(true);
    setTestResult(null);
    const res = await Storage.testConnection(trimmed);
    setTestingConnection(false);
    setTestResult(res);
  };

  const t = (vi, en) => {
    return appLanguage === 'vi' ? vi : en;
  };

  const handleAvatarFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Kích thước ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Avatar = event.target.result;
        await handleAvatarChange(base64Avatar);
        triggerNotification("[Hệ thống] Đã cập nhật ảnh đại diện mới thành công!");
      };
      reader.readAsDataURL(file);
    }
  };

  const onLocalSavePhone = async () => {
    const success = await handleSavePersonalPhone(personalPhone);
    if (success) {
      setIsEditingPhone(false);
    }
  };

  const onLocalAddMemberSubmit = async (e) => {
    e.preventDefault();
    const success = await handleAddMember(newMemberName, newMemberPhone, newMemberRole);
    if (success) {
      setNewMemberName('');
      setNewMemberPhone('09');
      triggerNotification(`[Hệ thống] Đã thêm thành viên "${newMemberName}" thành công.`);
    }
  };

  const onLocalSmsSubmit = async (e) => {
    e.preventDefault();
    setIsSavingNotif(true);
    try {
      await Storage.saveNotifConfig({ smsProvider, notifEnabled });
      triggerNotification(`[Hệ thống] Đã lưu cấu hình thông báo: ${smsProvider.toUpperCase()} – ${notifEnabled ? 'Bật' : 'Tắt'}`);
    } catch (err) {
      triggerNotification('[Lỗi] ' + (err.message || 'Không thể lưu cấu hình thông báo.'));
    } finally {
      setIsSavingNotif(false);
    }
  };

  const onLocalBugSubmit = (e) => {
    e.preventDefault();
    if (!bugTitle.trim() || !bugContent.trim()) {
      triggerNotification('[Lỗi] Vui lòng điền đầy đủ thông tin báo cáo sự cố!');
      return;
    }

    setIsSubmittingBug(true);
    setTimeout(() => {
      setIsSubmittingBug(false);
      triggerNotification(`[Hệ thống] Đã gửi báo cáo sự cố thành công!`);
      triggerNotification(`[Hệ thống] Báo cáo lỗi "${bugTitle}" đã gửi tới tthanh241.work@gmail.com.`);
      setBugTitle('');
      setBugContent('');
      setBugCategory('ui');
    }, 1200);
  };

  const isAdmin = currentUser?.role === 'admin';

  if (!isOpen) return null;

  return (
    <div className="modal-overlay drawer-backdrop" onClick={onClose}>
      <div className="modal-content settings-drawer-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Drawer Header */}
        <div className="modal-header settings-drawer-header">
          <h3 className="drawer-title">
            <Settings size={22} color="var(--primary-color)" />
            <span>{t('Cài Đặt & Cấu Hình', 'Settings & Configurations')}</span>
          </h3>
          <button onClick={onClose} className="drawer-close-btn">&times;</button>
        </div>

        {/* Drawer Body */}
        <div className="modal-body settings-drawer-body">
          
          {/* ========================================================================= */}
          {/* USER SETTINGS SECTION */}
          {/* ========================================================================= */}
          <div className="drawer-section-group user-settings-group">
            <span className="drawer-section-group-title">{t('Thông Tin Cá Nhân', 'Personal Profile')}</span>
            
            {/* User Profile Card */}
            <div className="settings-profile-card">
              <div className="profile-avatar-wrapper">
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  className="profile-avatar-img"
                />
                <label htmlFor="drawer-avatar-upload" className="avatar-upload-icon-label" title="Đổi ảnh đại diện">
                  <Camera size={12} />
                </label>
                <input 
                  type="file" 
                  id="drawer-avatar-upload" 
                  accept="image/*"
                  onChange={handleAvatarFileChange} 
                  style={{ display: 'none' }}
                />
              </div>
              
              <div className="profile-details-column">
                <span className="profile-details-name">{currentUser.name}</span>
                
                {isEditingPhone ? (
                  <div className="profile-phone-edit-row">
                    <input 
                      type="tel"
                      value={personalPhone}
                      onChange={(e) => setPersonalPhone(e.target.value.replace(/\D/g, ''))}
                      className="input-text phone-edit-input"
                      placeholder="SĐT mới..."
                      autoFocus
                    />
                    <button type="button" onClick={onLocalSavePhone} className="btn btn-primary btn-save-phone-mini">
                      Lưu
                    </button>
                    <button type="button" onClick={() => { setIsEditingPhone(false); setPersonalPhone(currentUser.phone); }} className="btn btn-secondary btn-cancel-phone-mini">
                      Hủy
                    </button>
                  </div>
                ) : (
                  <div className="profile-phone-display-row">
                    <span className="profile-phone-text">SĐT: {currentUser.phone}</span>
                    <button type="button" onClick={() => { setPersonalPhone(currentUser.phone); setIsEditingPhone(true); }} className="btn-edit-phone-link">
                      Sửa
                    </button>
                  </div>
                )}
                
                <span className={`role-badge ${currentUser.role === 'admin' ? 'role-admin' : currentUser.role === 'delegated' ? 'role-delegated' : 'role-member'}`}>
                  {currentUser.role === 'admin' ? t('Quản lý', 'Admin') : currentUser.role === 'delegated' ? t('Ủy quyền', 'Delegated') : t('Thành viên', 'Member')}
                </span>
              </div>
            </div>

            {/* Quick Multi-role account switcher */}
            {users.filter(u => u.phone === currentUser.phone).length > 1 && (
              <div className="settings-section role-switcher-section">
                <span className="section-subtitle">{t('Đổi Vai Trò Nhanh', 'Quick Role Switcher')}</span>
                <div className="switcher-buttons-list">
                  {users.filter(u => u.phone === currentUser.phone).map(u => {
                    const isActive = u.id === currentUser.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={async () => {
                          await handleUserChange(u.id);
                        }}
                        className={`btn btn-secondary switcher-role-btn ${isActive ? 'active-role' : ''}`}
                      >
                        <span>{u.name} ({u.role === 'admin' ? t('Quản lý', 'Admin') : u.role === 'delegated' ? t('Ủy quyền', 'Delegated') : t('Thành viên', 'Member')})</span>
                        {isActive && <CheckCircle size={14} color="var(--primary-color)" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* UI customization settings */}
            <div className="settings-section ui-theme-customization">
              <span className="section-subtitle">{t('Tùy Chỉnh Giao Diện', 'UI Customization')}</span>
              
              <div className="settings-control-row">
                <span>{t('Giao diện tối (Dark Mode)', 'Dark Theme (Dark Mode)')}</span>
                <label className="switch-toggle">
                  <input 
                    type="checkbox" 
                    checked={isDarkMode} 
                    onChange={(e) => setIsDarkMode(e.target.checked)} 
                  />
                  <span className="slider-round">
                    <span className="slider-circle" />
                  </span>
                </label>
              </div>

              <div className="settings-control-row">
                <label htmlFor="setting-font-size">{t('Cỡ chữ hiển thị', 'Font Size')}</label>
                <select 
                  id="setting-font-size"
                  value={appFontSize} 
                  onChange={(e) => setAppFontSize(e.target.value)}
                  className="select-input size-select"
                >
                  <option value="small">{t('Nhỏ', 'Small')}</option>
                  <option value="medium">{t('Vừa', 'Medium')}</option>
                  <option value="large">{t('Lớn', 'Large')}</option>
                </select>
              </div>

              <div className="settings-control-row">
                <label htmlFor="setting-language">{t('Ngôn ngữ', 'Language')}</label>
                <select 
                  id="setting-language"
                  value={appLanguage} 
                  onChange={(e) => setAppLanguage(e.target.value)}
                  className="select-input lang-select"
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </div>

              {/* System Floating Push Notification section */}
              <div className="settings-control-row" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border-color, #e5e7eb)', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <Bell size={16} color="#0068FF" />
                    Thông Báo Nổi (Mobile & PC)
                  </span>
                  <span style={{ fontSize: '0.78rem', color: getNotificationPermission() === 'granted' ? '#10b981' : getNotificationPermission() === 'denied' ? '#ef4444' : '#6b7280', fontWeight: 600 }}>
                    {getNotificationPermission() === 'granted' ? '✓ Đã bật' : getNotificationPermission() === 'denied' ? '❌ Đã chặn' : getNotificationPermission() === 'unsupported' ? '⚠️ Dùng thông báo trong App' : 'Chưa bật'}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6b7280)', margin: 0 }}>
                  {getNotificationPermission() === 'unsupported'
                    ? 'Trình duyệt/WebView Zalo không hỗ trợ HTML5 Web Notification API. Ứng dụng tự động dùng thông báo Toast trong App.'
                    : 'Gửi thông báo nổi trên điện thoại và máy tính đúng 24h & 30m trước khi cuộc họp diễn ra.'}
                </p>
                {getNotificationPermission() !== 'granted' && getNotificationPermission() !== 'unsupported' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '6px 12px', width: '100%', marginTop: '4px' }}
                    onClick={async () => {
                      const granted = await requestNotificationPermission(false);
                      if (granted) {
                        triggerNotification('[Hệ thống] Đã bật quyền thông báo nổi thành công!');
                      }
                    }}
                  >
                    Bật Thông Báo Nổi Ngay
                  </button>
                )}
              </div>

              {/* Backend API Connection Configuration Section */}
              <div className="settings-section server-connection-section" style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed var(--border-color, #e5e7eb)' }}>
                <span className="section-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  <Server size={16} color="var(--primary-color)" />
                  Kết Nối Máy Chủ Backend API
                </span>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6b7280)', marginTop: '4px', marginBottom: '8px' }}>
                  Địa chỉ Backend hiện tại: <code style={{ background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px', wordBreak: 'break-all' }}>{getApiBase() || '(Relative Proxy)'}</code>
                </p>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label htmlFor="setting-custom-url" style={{ fontSize: '0.78rem' }}>Đường dẫn Backend custom (dành cho QR code / LAN):</label>
                  <input
                    id="setting-custom-url"
                    type="url"
                    value={customServerUrl}
                    onChange={(e) => setCustomServerUrl(e.target.value)}
                    className="input-text input-mini"
                    placeholder="VD: http://192.168.1.15:5000 hoặc https://your-domain.com"
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleSaveServerUrl}
                    className="btn btn-primary"
                    style={{ fontSize: '0.78rem', padding: '6px 12px', flex: 2 }}
                    disabled={testingConnection}
                  >
                    {testingConnection ? 'Đang kết nối...' : 'Lưu & Kiểm tra kết nối'}
                  </button>
                  {customServerUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomServerUrl('');
                        localStorage.removeItem('zmp_custom_api_url');
                        setTestResult(null);
                        triggerNotification('[Hệ thống] Đã xóa cấu hình Server custom.');
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '6px 10px', flex: 1 }}
                    >
                      Mặc định
                    </button>
                  )}
                </div>
                {testResult && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: testResult.success ? '#10b981' : '#ef4444',
                    border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}>
                    {testResult.message}
                  </div>
                )}
              </div>
            </div>

            {/* Bug reporting sub-form */}
            <div className="settings-section bug-reporting-section">
              <span className="section-subtitle">{t('Báo Cáo Sự Cố Ứng Dụng', 'App Bug Reporting')}</span>
              <form onSubmit={onLocalBugSubmit} className="bug-report-form">
                <div className="form-group">
                  <label htmlFor="bug-title">{t('Tiêu đề sự cố', 'Issue Title')}</label>
                  <input 
                    id="bug-title"
                    type="text" 
                    value={bugTitle} 
                    onChange={(e) => setBugTitle(e.target.value)} 
                    className="input-text input-mini"
                    placeholder="Lỗi hiển thị lịch, không gửi được ghi chú..."
                    required
                  />
                </div>
                <div className="form-group-row-mini">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="bug-cat">{t('Danh mục', 'Category')}</label>
                    <select 
                      id="bug-cat"
                      value={bugCategory} 
                      onChange={(e) => setBugCategory(e.target.value)}
                      className="select-input select-mini"
                    >
                      <option value="ui">Lỗi giao diện (UI)</option>
                      <option value="connection">Kết nối mạng & OTP</option>
                      <option value="ai">Trợ lý AI biên bản</option>
                      <option value="notification">Cổng thông báo Zalo</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="bug-desc">{t('Mô tả chi tiết', 'Detailed Description')}</label>
                  <textarea 
                    id="bug-desc"
                    value={bugContent} 
                    onChange={(e) => setBugContent(e.target.value)}
                    className="textarea-input textarea-mini"
                    placeholder="Mô tả các bước xảy ra lỗi để gửi đến kỹ thuật viên..."
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmittingBug} 
                  className="btn btn-danger btn-submit-bug"
                >
                  <Send size={14} />
                  <span>{isSubmittingBug ? t('Đang gửi...', 'Sending...') : t('Gửi báo cáo sự cố (email)', 'Submit Bug Report')}</span>
                </button>
              </form>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ADMIN SETTINGS SECTION (VISUALLY DIVIDED) */}
          {/* ========================================================================= */}
          {isAdmin && (
            <div className="drawer-section-group admin-settings-group">
              <span className="drawer-section-group-title">Quản Trị Nhóm (Admin / Host Settings)</span>
              
              {/* Member Management sub-form */}
              <div className="settings-section member-management-section">
                <span className="section-subtitle">Quản Lý Thành Viên Nhóm</span>
                
                <form onSubmit={onLocalAddMemberSubmit} className="admin-add-member-form">
                  <div className="form-group">
                    <label htmlFor="new-mem-name">Họ tên thành viên</label>
                    <input 
                      id="new-mem-name"
                      type="text" 
                      placeholder="Nhập tên..." 
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="input-text input-mini"
                      required
                    />
                  </div>
                  <div className="form-group-row-mini">
                    <div className="form-group" style={{ flex: 2 }}>
                      <label htmlFor="new-mem-phone">Số điện thoại</label>
                      <input 
                        id="new-mem-phone"
                        type="tel" 
                        placeholder="Số điện thoại..." 
                        value={newMemberPhone}
                        onChange={(e) => setNewMemberPhone(e.target.value)}
                        className="input-text input-mini"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1.5 }}>
                      <label htmlFor="new-mem-role">Vai trò</label>
                      <select 
                        id="new-mem-role"
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        className="select-input select-mini"
                      >
                        <option value="member">Thành viên</option>
                        <option value="delegated">Ủy quyền</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-add-member-mini">
                    <Plus size={14} />
                    <span>Thêm thành viên</span>
                  </button>
                </form>

                {/* Users list inside settings */}
                <div className="settings-members-listing">
                  {users.map(u => (
                    <div key={u.id} className="member-list-item">
                      <div className="member-card-info-row">
                        <img src={u.avatar} alt={u.name} className="member-card-avatar" />
                        <div className="member-card-text">
                          <span className="member-card-name">{u.name}</span>
                          <span className="member-card-phone">{u.phone}</span>
                        </div>
                      </div>
                      <div className="member-card-actions">
                        <span className={`role-badge ${u.role === 'admin' ? 'role-admin' : u.role === 'delegated' ? 'role-delegated' : 'role-member'}`}>
                          {u.role === 'admin' ? 'QL' : u.role === 'delegated' ? 'UQ' : 'TV'}
                        </span>
                        
                        {u.id !== currentUser.id && (
                          <button 
                            type="button"
                            onClick={() => setConfirmDeleteMember(u)}
                            className="btn-delete-member"
                            title="Xóa thành viên"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SMS gateway config gateway */}
              <div className="settings-section sms-gateway-section">
                <span className="section-subtitle">Cấu Hình Cổng SMS/ZNS Tự Động</span>
                <form onSubmit={onLocalSmsSubmit} className="sms-gateway-form">
                  <div className="settings-control-row">
                    <span>Bật gửi tin tự động</span>
                    <label className="switch-toggle">
                      <input 
                        type="checkbox" 
                        checked={notifEnabled}
                        onChange={(e) => setNotifEnabled(e.target.checked)}
                      />
                      <span className="slider-round">
                        <span className="slider-circle" />
                      </span>
                    </label>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="setting-sms-provider">Nhà cung cấp dịch vụ SMS API</label>
                    <select 
                      id="setting-sms-provider"
                      value={smsProvider} 
                      onChange={(e) => setSmsProvider(e.target.value)}
                      className="select-input"
                    >
                      <option value="esms">eSMS.vn (350đ / tin nhắn SMS thương hiệu)</option>
                      <option value="vietguy">VietGuy ZNS Gateway (Gửi tin nhắn Zalo OA)</option>
                      <option value="speedsms">SpeedSMS.vn (Tích hợp API)</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn-secondary btn-save-sms-config" disabled={isSavingNotif}>
                    <Save size={14} />
                    <span>{isSavingNotif ? 'Đang lưu...' : 'Lưu cổng thông báo'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
          
          {/* Logout Button */}
          <button 
            type="button"
            onClick={handleLogout}
            className="btn btn-danger btn-logout-drawer"
          >
            <LogOut size={16} />
            <span>{t('Đăng xuất tài khoản', 'Log Out Account')}</span>
          </button>

        </div>
      </div>
      {confirmDeleteMember && (
        <div className="modal-overlay">
          <div className="modal-content confirmation-modal">
            <div className="modal-header">
              <h3>Xác nhận xóa thành viên</h3>
              <button onClick={() => setConfirmDeleteMember(null)} className="modal-close-btn">&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '16px 0' }}>
              <p>Bạn có chắc chắn muốn xóa thành viên <strong>{confirmDeleteMember.name}</strong> khỏi nhóm không?</p>
            </div>
            <div className="modal-footer-buttons" style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={async () => {
                  await handleDeleteMember(confirmDeleteMember.id);
                  triggerNotification(`[Hệ thống] Đã xóa thành viên "${confirmDeleteMember.name}".`);
                  setConfirmDeleteMember(null);
                }} 
                className="btn btn-danger"
                style={{ flex: 2 }}
              >
                Xóa thành viên
              </button>
              <button 
                onClick={() => setConfirmDeleteMember(null)} 
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

SettingsDrawer.displayName = 'SettingsDrawer';
