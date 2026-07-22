import React, { useState, useEffect, useRef } from 'react';
import { Mail, AlertCircle, ArrowRight, ShieldCheck, RefreshCw, UserCheck, Sparkles, Check } from 'lucide-react';
import logo from '../assets/logo.png';
import { TermsModal } from './TermsModal';
import { authorize, getUserInfo } from 'zmp-sdk/apis';
import { Storage } from '../utils/storage';
import { getRoleLabel } from '../hooks/useAuth';

export const Auth = React.memo(({
  users,
  loginEmail,
  setLoginEmail,
  loginPhone,
  setLoginPhone,
  otpSent,
  setOtpSent,
  loginOtp,
  setLoginOtp,
  isRegistering,
  setIsRegistering,
  registerName,
  setRegisterName,
  registerRole,
  setRegisterRole,
  loginError,
  setLoginError,
  loginEmailMatchedUsers,
  loginPhoneMatchedUsers,
  isSelectingAccount,
  setIsSelectingAccount,
  matchedUserPreview,
  isCheckingEmail,
  handleCheckEmailAndSendOtp,
  handleSendOtp,
  handleVerifyOtp,
  handleSelectAccount,
  handleRegister,
  resetLoginStates
}) => {
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Email Validation
  const [emailTouch, setEmailTouch] = useState(false);
  const cleanEmail = (loginEmail || '').trim().toLowerCase();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  // OTP Countdown timer states (300 seconds = 5 minutes)
  const [countdown, setCountdown] = useState(300);
  const timerRef = useRef(null);

  // OTP Inputs refs (6 boxes)
  const otpLength = 6;
  const [otpBoxes, setOtpBoxes] = useState(Array(otpLength).fill(''));
  const inputRefs = useRef([]);

  // Demo accounts for instant selection (chips)
  const demoAccounts = [
    { name: 'Nguyễn Văn A (Host)', email: 'nguyenvana@gmail.com', role: 'admin' },
    { name: 'Trần Thị B (Ủy quyền)', email: 'tranthib@gmail.com', role: 'delegated' },
    { name: 'Lê Văn C (Thành viên)', email: 'levanc@gmail.com', role: 'member' }
  ];

  // Sync state loginOtp when boxes change
  useEffect(() => {
    setLoginOtp(otpBoxes.join(''));
  }, [otpBoxes, setLoginOtp]);

  // Start countdown when OTP is sent
  useEffect(() => {
    if (otpSent && !isSelectingAccount && !isRegistering) {
      setCountdown(300);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [otpSent, isSelectingAccount, isRegistering]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleOtpBoxChange = (value, idx) => {
    const cleanValue = value.replace(/\D/g, '');
    const nextBoxes = [...otpBoxes];
    
    if (cleanValue.length > 1) {
      const chars = cleanValue.split('').slice(0, otpLength - idx);
      chars.forEach((char, i) => {
        nextBoxes[idx + i] = char;
      });
      setOtpBoxes(nextBoxes);
      const targetIdx = Math.min(idx + chars.length, otpLength - 1);
      inputRefs.current[targetIdx]?.focus();
    } else {
      nextBoxes[idx] = cleanValue;
      setOtpBoxes(nextBoxes);
      if (cleanValue && idx < otpLength - 1) {
        inputRefs.current[idx + 1]?.focus();
      }
    }
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otpBoxes[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleResendOtpClick = () => {
    if (countdown === 0) {
      setOtpBoxes(Array(otpLength).fill(''));
      handleSendOtp(loginEmail);
    }
  };

  const onSubmitEmailStep = (e) => {
    e.preventDefault();
    setEmailTouch(true);
    if (isEmailValid) {
      handleCheckEmailAndSendOtp(cleanEmail);
    } else {
      setLoginError('Email không đúng định dạng. Vui lòng kiểm tra lại!');
    }
  };

  const onSubmitOtp = (e) => {
    e.preventDefault();
    if (loginOtp.length !== otpLength) {
      setLoginError('Vui lòng nhập đủ 6 chữ số OTP.');
      return;
    }
    handleVerifyOtp(loginOtp);
  };

  const onSubmitRegisterForm = (e) => {
    e.preventDefault();
    if (!registerName.trim()) {
      setLoginError('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    // Automatically send OTP for email verification
    handleSendOtp(cleanEmail);
  };

  const handleZaloFastLogin = async () => {
    try {
      await authorize({ scopes: ['scope.userInfo'] });
      const res = await getUserInfo({});
      if (res?.userInfo) {
        const zaloUser = res.userInfo;
        const authUser = await Storage.authenticateZalo({
          id: zaloUser.id,
          name: zaloUser.name,
          avatar: zaloUser.avatar
        });
        await Storage.setLoggedInUser(authUser);
        window.location.reload();
      }
    } catch (err) {
      // Fallback for browser testing: log in as Demo Admin
      const demoUser = users.find(u => u.email === 'nguyenvana@gmail.com') || users[0];
      if (demoUser) {
        await handleSelectAccount(demoUser);
      }
    }
  };

  const matchedUsers = (loginEmailMatchedUsers && loginEmailMatchedUsers.length > 0)
    ? loginEmailMatchedUsers
    : (loginPhoneMatchedUsers || []);

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
        {/* CASE 2: STEP 1 - EMAIL INPUT (SMART LOOKUP) */}
        {/* ────────────────────────────────────────────────────────── */}
        {!otpSent && !isRegistering && !isSelectingAccount && (
          <form onSubmit={onSubmitEmailStep} className="auth-form">
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
                  placeholder="Nhập email (ví dụ: nguyenvana@gmail.com)..."
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
            
            <button 
              type="submit" 
              className="btn btn-primary btn-auth-submit"
              disabled={!isEmailValid || isCheckingEmail}
            >
              {isCheckingEmail ? (
                <>
                  <RefreshCw size={16} className="spin-once" />
                  <span>Đang kiểm tra tài khoản...</span>
                </>
              ) : (
                <>
                  <span>Tiếp tục</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="auth-divider">
              <span>hoặc</span>
            </div>

            {/* Fast Zalo Login Button */}
            <button
              type="button"
              onClick={handleZaloFastLogin}
              className="btn btn-secondary auth-zalo-fast-btn"
            >
              <Sparkles size={16} color="#0068FF" />
              <span>Đăng nhập nhanh qua Zalo</span>
            </button>

            {/* Quick Test Demo Chips */}
            <div className="auth-demo-chips-container">
              <span className="auth-demo-chips-title">Dùng thử nhanh tài khoản có sẵn:</span>
              <div className="auth-demo-chips-list">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    className="auth-demo-chip"
                    onClick={() => {
                      setLoginEmail(account.email);
                      setEmailTouch(true);
                      handleCheckEmailAndSendOtp(account.email);
                    }}
                  >
                    <span>{account.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        {/* ──────────────────────────────────────────────────────────── */}
        {/* CASE 3: STEP 2 - ENTER OTP (EXISTING USER or MULTI-ACCOUNT) */}
        {/* ──────────────────────────────────────────────────────────── */}
        {otpSent && !isRegistering && (
          <form onSubmit={onSubmitOtp} className="auth-form">
            
            {/* User Greeting Card */}
            {matchedUserPreview && (
              <div className="auth-user-preview-card">
                <img src={matchedUserPreview.avatar} alt={matchedUserPreview.name} className="preview-avatar" />
                <div className="preview-meta">
                  <span className="preview-welcome">Chào mừng bạn quay lại!</span>
                  <span className="preview-name">{matchedUserPreview.name}</span>
                </div>
                <span className="badge badge-primary">
                  {getRoleLabel(matchedUserPreview)}
                </span>
              </div>
            )}

            {/* Banner thông tin — phân biệt single-account và multi-account */}
            {matchedUserPreview ? (
              <div className="auth-helper-banner">
                Mã xác thực OTP 6 số đã được gửi tới <strong>{loginEmail}</strong>.
                <button 
                  type="button" 
                  onClick={resetLoginStates} 
                  className="auth-change-phone-btn"
                >
                  Đổi Email
                </button>
              </div>
            ) : loginEmailMatchedUsers && loginEmailMatchedUsers.length > 1 ? (
              <div className="auth-helper-banner info">
                Email <strong>{loginEmail}</strong> liên kết với <strong>{loginEmailMatchedUsers.length} tài khoản</strong>. Nhập mã OTP để xác thực rồi chọn tài khoản.
                <button 
                  type="button" 
                  onClick={resetLoginStates} 
                  className="auth-change-phone-btn"
                >
                  Đổi Email
                </button>
              </div>
            ) : (
              <div className="auth-helper-banner">
                Mã xác thực OTP 6 số đã được gửi tới <strong>{loginEmail}</strong>.
                <button 
                  type="button" 
                  onClick={resetLoginStates} 
                  className="auth-change-phone-btn"
                >
                  Đổi Email
                </button>
              </div>
            )}
            
            <div className="form-group">
              <label className="auth-otp-label">Nhập mã xác thực (OTP)</label>
              
              <div className="auth-otp-boxes-grid">
                {Array(otpLength).fill(0).map((_, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={1}
                    value={otpBoxes[idx]}
                    onChange={(e) => handleOtpBoxChange(e.target.value, idx)}
                    onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                    className="auth-otp-box"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
            </div>

            {/* Countdown timer & Resend button */}
            <div className="auth-otp-timer-container">
              {countdown > 0 ? (
                <span className="auth-otp-timer">Mã xác thực hết hạn sau: <strong>{formatTime(countdown)}</strong></span>
              ) : (
                <span className="auth-otp-expired">Mã xác thực đã hết hiệu lực.</span>
              )}
              
              <button
                type="button"
                onClick={handleResendOtpClick}
                className={`btn btn-secondary auth-resend-btn ${countdown > 0 ? 'btn-disabled' : ''}`}
                disabled={countdown > 0}
              >
                <RefreshCw size={14} className={countdown > 0 ? '' : 'spin-once'} />
                <span>Gửi lại mã OTP</span>
              </button>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loginOtp.length !== otpLength}
            >
              Xác nhận & Đăng nhập
            </button>
          </form>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* CASE 4: STEP 2 - NEW USER REGISTRATION */}
        {/* ────────────────────────────────────────────────────────── */}
        {isRegistering && !otpSent && (
          <form onSubmit={onSubmitRegisterForm} className="auth-form">
            <div className="auth-helper-banner info">
              <UserCheck size={16} />
              <span>Email <strong>{loginEmail}</strong> chưa có tài khoản. Đăng ký tài khoản Smeet mới chỉ trong 5 giây!</span>
            </div>
            
            <div className="form-group">
              <label htmlFor="register-name">Họ và tên của bạn</label>
              <input
                id="register-name"
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="Nhập họ và tên đầy đủ (ví dụ: Nguyễn Văn A)..."
                className="input-text"
                required
                autoFocus
              />
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
            
            <button type="submit" className="btn btn-primary">
              Nhận mã OTP & Tạo tài khoản
            </button>
            
            <button 
              type="button" 
              onClick={resetLoginStates} 
              className="btn btn-secondary"
              style={{ marginTop: '8px' }}
            >
              Quay lại
            </button>
          </form>
        )}

        {/* STEP 2B - OTP VERIFY FOR NEW USER */}
        {isRegistering && otpSent && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (loginOtp.length !== otpLength) {
              setLoginError('Vui lòng nhập đủ 6 chữ số OTP.');
              return;
            }
            // Dùng handleVerifyOtp để xác thực — hỗ trợ cả chế độ real (server verify) lẫn simulated (local)
            // Sau khi OTP hợp lệ, handleVerifyOtp sẽ tự route sang isRegistering=true → gọi handleRegister
            const otpOk = await handleVerifyOtp(loginOtp);
            if (!otpOk) return; // handleVerifyOtp đã set loginError rồi
            await handleRegister(registerName, registerRole);
          }} className="auth-form">
            <div className="auth-helper-banner info">
              <ShieldCheck size={16} />
              <span>Nhập mã OTP vừa gửi tới <strong>{loginEmail}</strong> để hoàn tất đăng ký cho <strong>{registerName}</strong>.</span>
            </div>

            <div className="form-group">
              <label className="auth-otp-label">Nhập mã xác thực (OTP)</label>
              <div className="auth-otp-boxes-grid">
                {Array(otpLength).fill(0).map((_, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={1}
                    value={otpBoxes[idx]}
                    onChange={(e) => handleOtpBoxChange(e.target.value, idx)}
                    onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                    className="auth-otp-box"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loginOtp.length !== otpLength}
            >
              Hoàn tất đăng ký & Đăng nhập
            </button>

            <button 
              type="button" 
              onClick={resetLoginStates} 
              className="btn btn-secondary"
              style={{ marginTop: '8px' }}
            >
              Hủy bỏ
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
