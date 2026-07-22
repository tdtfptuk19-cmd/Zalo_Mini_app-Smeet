import React, { useState, useEffect, useRef } from 'react';
import { Mail, AlertCircle, ArrowRight, ShieldCheck, RefreshCw, UserCheck, Sparkles, Check } from 'lucide-react';
import logo from '../assets/logo.png';
import { TermsModal } from './TermsModal';
import { Storage } from '../utils/storage';

export const Auth = React.memo(({
  loginEmail,
  setLoginEmail,
  zaloTempProfile,
  isRegistering,
  setIsRegistering,
  registerRole,
  setRegisterRole,
  loginError,
  setLoginError,
  handleZaloLogin,
  handleLinkEmailAndLogin,
  resetLoginStates
}) => {
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Email Validation
  const [emailTouch, setEmailTouch] = useState(false);
  const cleanEmail = (loginEmail || '').trim().toLowerCase();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  // Demo accounts for instant selection (chips) in browser environment
  const demoAccounts = [
    { name: 'Nguyễn Văn A (Host)', email: 'nguyenvana@gmail.com', role: 'admin' },
    { name: 'Trần Thị B (Ủy quyền)', email: 'tranthib@gmail.com', role: 'delegated' },
    { name: 'Lê Văn C (Thành viên)', email: 'levanc@gmail.com', role: 'member' }
  ];

  return (
    <div className="login-screen-wrapper">
      <div className="login-card card">
        
        {/* Brand Logo & Header */}
        <div className="login-logo-container">
          <img src={logo} alt="Smeet Logo" className="login-logo-img" />
        </div>
        
        <h2 className="login-title">Smeet</h2>
        <p className="login-subtitle">Hệ thống Đặt lịch họp & Tóm tắt báo cáo AI thông minh</p>

        {/* Global Error Banner */}
        {loginError && (
          <div className="alert-box auth-alert">
            <AlertCircle size={16} />
            <span>{loginError}</span>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* CASE 1: INITIAL STATE - ZALO LOGIN BUTTON */}
        {/* ────────────────────────────────────────────────────────── */}
        {!zaloTempProfile && (
          <div className="auth-form" style={{ marginTop: '20px' }}>
            <p className="auth-helper-banner" style={{ textAlign: 'center', marginBottom: '24px' }}>
              Chào mừng bạn đến với Smeet. Vui lòng xác thực tài khoản qua Zalo để tiếp tục sử dụng dịch vụ.
            </p>

            {/* Fast Zalo Login Button */}
            <button
              type="button"
              onClick={handleZaloLogin}
              className="btn btn-primary auth-zalo-fast-btn"
              style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#0068FF' }}
            >
              <Sparkles size={18} color="#ffffff" />
              <span>Đăng nhập nhanh qua Zalo</span>
            </button>

            {/* Quick Test Demo Chips for Browser Testing */}
            <div className="auth-demo-chips-container" style={{ marginTop: '30px' }}>
              <span className="auth-demo-chips-title">Dùng thử nhanh tài khoản có sẵn (Trình duyệt):</span>
              <div className="auth-demo-chips-list">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    className="auth-demo-chip"
                    onClick={async () => {
                      try {
                        const mockUserMap = {
                          'nguyenvana@gmail.com': { id: 'mock_admin_123', name: 'Nguyễn Văn A (Host)', email: 'nguyenvana@gmail.com', phone: '0912345678', role: 'admin', roles: ['admin'] },
                          'tranthib@gmail.com': { id: 'mock_delegated_456', name: 'Trần Thị B (Ủy quyền)', email: 'tranthib@gmail.com', phone: '0923456789', role: 'delegated', roles: ['delegated'] },
                          'levanc@gmail.com': { id: 'mock_member_789', name: 'Lê Văn C (Thành viên)', email: 'levanc@gmail.com', phone: '0934567890', role: 'member', roles: ['member'] }
                        };
                        const selectedMock = mockUserMap[account.email];
                        if (selectedMock) {
                          await Storage.setLoggedInUser(selectedMock);
                          window.location.reload();
                        }
                      } catch (err) {
                        setLoginError('Lỗi giả lập: ' + err.message);
                      }
                    }}
                  >
                    <span>{account.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* CASE 2: EMAIL LINKING FORM */}
        {/* ────────────────────────────────────────────────────────── */}
        {zaloTempProfile && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLinkEmailAndLogin(cleanEmail, registerRole);
            }}
            className="auth-form"
          >
            {/* User Greeting Card */}
            <div className="auth-user-preview-card">
              <img src={zaloTempProfile.avatar} alt={zaloTempProfile.name} className="preview-avatar" />
              <div className="preview-meta">
                <span className="preview-welcome">Xin chào,</span>
                <span className="preview-name">{zaloTempProfile.name}</span>
              </div>
              <span className="badge badge-primary">Tài khoản Zalo</span>
            </div>

            <div className="auth-helper-banner info" style={{ marginBottom: '18px' }}>
              <UserCheck size={16} />
              <span>Vui lòng điền Email của bạn để hoàn tất liên kết tài khoản Smeet (không cần mã OTP).</span>
            </div>
            
            <div className="form-group">
              <label htmlFor="login-email">Địa chỉ Email của bạn</label>
              <div className="auth-input-wrapper">
                <input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onFocus={() => setEmailTouch(true)}
                  onChange={(e) => {
                    setEmailTouch(true);
                    setLoginEmail(e.target.value);
                  }}
                  placeholder="Nhập email (ví dụ: user@example.com)..."
                  className={`input-text auth-phone-input ${emailTouch && !isEmailValid && loginEmail ? 'input-error' : ''}`}
                  required
                  autoFocus
                />
                <Mail size={18} className="auth-input-icon" />
              </div>
              
              {emailTouch && loginEmail && (
                <span className={`auth-validation-hint ${isEmailValid ? 'text-success' : 'text-danger'}`}>
                  {isEmailValid 
                    ? '✓ Định dạng Email hợp lệ' 
                    : '✗ Email không đúng định dạng (ví dụ: user@example.com)'
                  }
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Vai trò trong cuộc họp (có thể chọn nhiều vai trò)</label>
              <div className="auth-roles-checkboxes">
                {[
                  { value: 'member', label: 'Thành viên tham gia họp (Member)' },
                  { value: 'admin', label: 'Chủ trì cuộc họp (Host / Admin)' },
                  { value: 'delegated', label: 'Ủy quyền tổ chức (Delegated)' },
                ].map(opt => {
                  const checked = Array.isArray(registerRole) ? registerRole.includes(opt.value) : registerRole === opt.value;
                  return (
                    <label key={opt.value} className="auth-role-checkbox-label">
                      <input
                        type="checkbox"
                        value={opt.value}
                        checked={checked}
                        onChange={(e) => {
                          const current = Array.isArray(registerRole) ? registerRole : [registerRole];
                          if (e.target.checked) {
                            setRegisterRole([...current, opt.value]);
                          } else {
                            const next = current.filter(r => r !== opt.value);
                            setRegisterRole(next.length > 0 ? next : ['member']);
                          }
                        }}
                        className="auth-role-checkbox"
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isEmailValid}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '0.95rem' }}
            >
              Liên kết tài khoản & Vào ứng dụng
            </button>
            
            <button 
              type="button" 
              onClick={resetLoginStates} 
              className="btn btn-secondary"
              style={{ marginTop: '10px', width: '100%', padding: '10px', borderRadius: '10px' }}
            >
              Quay lại
            </button>
          </form>
        )}



        {/* Footer Terms Link */}
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
          Bằng việc sử dụng Smeet, bạn đồng ý với{' '}
          <button
            type="button"
            onClick={() => setShowTermsModal(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#0068FF',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
              font: 'inherit'
            }}
          >
            Điều khoản sử dụng & Bảo mật
          </button>
        </div>
      </div>

      <TermsModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
      />
    </div>
  );
});

Auth.displayName = 'Auth';
