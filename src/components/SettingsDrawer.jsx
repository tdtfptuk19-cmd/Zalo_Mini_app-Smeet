import React, { useState, useEffect } from 'react';
import { Settings, LogOut, Trash2, CheckCircle, Plus, Camera, Send, ShieldCheck, FileText } from 'lucide-react';
import { Storage } from '../utils/storage';
import { TermsModal } from './TermsModal';
import { hasRole, getRoleLabel } from '../hooks/useAuth';

export const SettingsDrawer = React.memo(({
  isOpen,
  onClose,
  currentUser,
  users,
  handleLogout,
  handleSavePersonalPhone,
  handleSavePersonalName,
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

  // Local state for Terms Modal
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Local state for deleting member custom confirmation modal
  const [confirmDeleteMember, setConfirmDeleteMember] = useState(null);

  // Local state for name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [personalName, setPersonalName] = useState(currentUser?.name || '');

  // Sync local states if currentUser changes
  useEffect(() => {
    if (currentUser) {
      setPersonalName(currentUser.name || '');
    }
  }, [currentUser]);

  // Local states for Admin's smart user search & invite
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedInviteRole, setSelectedInviteRole] = useState('member');
  const [inviteStatusMsg, setInviteStatusMsg] = useState('');

  // Debounced search against DB
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await Storage.searchUsers(searchQuery.trim());
        setSearchResults(Array.isArray(results) ? results : []);
      } catch (err) {
        console.error('Search users error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [searchQuery]);

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

  const onLocalSaveName = async () => {
    const success = await handleSavePersonalName(personalName);
    if (success) {
      setIsEditingName(false);
    }
  };

  const onLocalSendInvite = async (targetEmail) => {
    if (!targetEmail || !targetEmail.trim()) return;
    setInviteStatusMsg('Đang gửi lời mời...');
    try {
      const res = await Storage.sendMemberInvite({
        targetEmail: targetEmail.trim().toLowerCase(),
        role: selectedInviteRole
      });
      if (res && res.success) {
        setInviteStatusMsg(res.message);
        triggerNotification(`[Hệ thống] ${res.message}`);
        setSearchQuery('');
        setSearchResults([]);
        setTimeout(() => setInviteStatusMsg(''), 4000);
      } else {
        setInviteStatusMsg(res.error || 'Không thể gửi lời mời.');
      }
    } catch (err) {
      setInviteStatusMsg('Lỗi gửi lời mời: ' + err.message);
    }
  };

  const isAdmin = hasRole(currentUser, 'admin');

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
                {isEditingName ? (
                  <div className="profile-name-edit-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <input 
                      type="text"
                      value={personalName}
                      onChange={(e) => setPersonalName(e.target.value)}
                      className="input-text name-edit-input"
                      placeholder="Họ và tên mới..."
                      style={{ padding: '6px 10px', fontSize: '0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)', width: '130px' }}
                      autoFocus
                    />
                    <button type="button" onClick={onLocalSaveName} className="btn btn-primary btn-save-phone-mini" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}>
                      Lưu
                    </button>
                    <button type="button" onClick={() => { setIsEditingName(false); setPersonalName(currentUser.name); }} className="btn btn-secondary btn-cancel-phone-mini" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}>
                      Hủy
                    </button>
                  </div>
                ) : (
                  <div className="profile-name-display-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="profile-details-name" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{currentUser.name}</span>
                    <button type="button" onClick={() => { setPersonalName(currentUser.name); setIsEditingName(true); }} className="btn-edit-phone-link" style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>
                      Sửa
                    </button>
                  </div>
                )}
                
                  <div className="profile-phone-display-row" style={{ marginBottom: '6px' }}>
                    <span className="profile-phone-text" style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>Email: {currentUser.email || 'Chưa cập nhật'}</span>
                  </div>
                
                {/* Hiển thị tất cả roles của user (hỗ trợ đa vai trò) */}
                {(() => {
                  const roleList = (Array.isArray(currentUser.roles) && currentUser.roles.length > 0)
                    ? currentUser.roles
                    : [currentUser.role || 'member'];
                  const roleClass = {
                    admin: 'role-admin', delegated: 'role-delegated', member: 'role-member'
                  };
                  return roleList.map(r => (
                    <span key={r} className={`role-badge ${roleClass[r] || 'role-member'}`}
                      style={{ marginRight: '4px' }}>
                      {r === 'admin' ? t('Quản lý', 'Admin') : r === 'delegated' ? t('Ủy quyền', 'Delegated') : t('Thành viên', 'Member')}
                    </span>
                  ));
                })()}
              </div>
            </div>


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

              <div className="settings-control-row" style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--border-color, #e2e8f0)' }}>
                <button 
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="btn btn-secondary"
                  style={{ 
                    width: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justify: 'center', 
                    gap: '8px',
                    fontSize: '0.85rem',
                    padding: '8px 12px'
                  }}
                >
                  <ShieldCheck size={16} color="var(--primary-color, #0068FF)" />
                  <span>{t('Điều khoản sử dụng & Bảo mật', 'Terms & Privacy Policy')}</span>
                </button>
              </div>
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
                <span className="section-subtitle">Mời & Quản Lý Thành Viên Nhóm</span>
                
                {inviteStatusMsg && (
                  <div className="alert-box" style={{ padding: '8px 12px', fontSize: '0.82rem', marginBottom: '12px', background: '#f0f7ff', borderColor: '#bae6fd', color: '#0369a1' }}>
                    <span>{inviteStatusMsg}</span>
                  </div>
                )}

                <div className="admin-add-member-form">
                  <div className="form-group">
                    <label htmlFor="invite-role">Vai trò khi gia nhập</label>
                    <select 
                      id="invite-role"
                      value={selectedInviteRole}
                      onChange={(e) => setSelectedInviteRole(e.target.value)}
                      className="select-input select-mini"
                    >
                      <option value="member">Thành viên (Member)</option>
                      <option value="delegated">Ủy quyền tổ chức (Delegated)</option>
                      <option value="admin">Quản lý (Admin Host)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ position: 'relative' }}>
                    <label htmlFor="search-user-input">Tìm kiếm Tên hoặc Email trong Database</label>
                    <input 
                      id="search-user-input"
                      type="text" 
                      placeholder="Nhập tên hoặc email (ví dụ: user@example.com)..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input-text input-mini"
                    />

                    {isSearching && (
                      <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                        Đang tra cứu từ Database...
                      </span>
                    )}

                    {/* Autocomplete Dropdown Search Results */}
                    {searchResults.length > 0 && (
                      <div className="search-user-dropdown" style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', marginTop: '6px', maxHeight: '180px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        {searchResults.map(u => (
                          <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <img src={u.avatar} alt={u.name} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                              <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{u.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.email}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onLocalSendInvite(u.email)}
                              className="btn btn-primary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                            >
                              + Mời vào nhóm
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Direct email invite trigger if not found in DB search results */}
                    {searchQuery.includes('@') && !isSearching && searchResults.length === 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0' }}>
                          Email <strong>{searchQuery}</strong> chưa có tài khoản trong hệ thống.
                        </p>
                        <button
                          type="button"
                          onClick={() => onLocalSendInvite(searchQuery)}
                          className="btn btn-primary"
                          style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <Send size={14} />
                          <span>Gửi Email thư mời tham gia SMeet</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Users list inside settings */}
                <div className="settings-members-listing">
                  {users.map(u => (
                    <div key={u.id} className="member-list-item">
                      <div className="member-card-info-row">
                        <img src={u.avatar} alt={u.name} className="member-card-avatar" />
                        <div className="member-card-text">
                          <span className="member-card-name">{u.name}</span>
                          <span className="member-card-phone">
                            {u.email || 'Chưa có email'}
                          </span>
                        </div>
                      </div>
                      <div className="member-card-actions">
                        <span className={`role-badge ${hasRole(u, 'admin') ? 'role-admin' : hasRole(u, 'delegated') ? 'role-delegated' : 'role-member'}`}>
                          {hasRole(u, 'admin') ? 'QL' : hasRole(u, 'delegated') ? 'UQ' : 'TV'}
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

      {/* Terms of Use & Privacy Policy Modal */}
      <TermsModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
        appLanguage={appLanguage} 
      />
    </div>
  );
});

SettingsDrawer.displayName = 'SettingsDrawer';
