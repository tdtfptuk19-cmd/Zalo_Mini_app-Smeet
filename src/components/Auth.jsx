import React, { useState, useEffect } from 'react';
import { Mail, AlertCircle, ArrowRight, Sparkles, Lock } from 'lucide-react';
import logo from '../assets/logo.png';
import { TermsModal } from './TermsModal';

export const Auth = React.memo(({
  loginEmail,
  setLoginEmail,
  registerRole,
  setRegisterRole,
  loginError,
  setLoginError,
  handleSendEmailOtp,
  handleVerifyEmailOtp,
  resetLoginStates
}) => {
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [otpCode, setOtpCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [timer, setTimer] = useState(0);

  // Email Validation
  const [emailTouch, setEmailTouch] = useState(false);
  const cleanEmail = (loginEmail || '').trim().toLowerCase();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  const [isReturningUser, setIsReturningUser] = useState(false);
  const [returningUserName, setReturningUserName] = useState('');

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const onSubmitEmailStep = async (e) => {
    e.preventDefault();
    if (!isEmailValid) return;

    setIsLoading(true);
    setSimulatedOtp('');
    const res = await handleSendEmailOtp(cleanEmail);
    setIsLoading(false);

    if (res?.success) {
      setStep('otp');
      setTimer(60);
      setIsReturningUser(!!res.isReturningUser);
      setReturningUserName(res.userName || '');
      if (res.mode === 'simulated' && res.code) {
        setSimulatedOtp(res.code);
      }
    }
  };

  const onSubmitOtpStep = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setLoginError('Vui lòng nhập đúng 6 chữ số mã OTP.');
      return;
    }

    setIsLoading(true);
    const rolesArray = isReturningUser ? undefined : (Array.isArray(registerRole) ? registerRole : [registerRole]);
    const success = await handleVerifyEmailOtp(cleanEmail, otpCode.trim(), displayName.trim(), rolesArray);
    setIsLoading(false);

    if (!success && !loginError) {
      setLoginError('Mã OTP không chính xác hoặc đã hết hạn.');
    }
  };

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
        {/* STEP 1: EMAIL INPUT FORM */}
        {/* ────────────────────────────────────────────────────────── */}
        {step === 'email' && (
          <form onSubmit={onSubmitEmailStep} className="auth-form" style={{ marginTop: '16px' }}>
            <div className="auth-helper-banner info" style={{ marginBottom: '18px' }}>
              <Mail size={16} />
              <span>Đăng nhập hoặc Đăng ký bằng địa chỉ Email của bạn.</span>
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

            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isEmailValid || isLoading}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '0.95rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              <span>{isLoading ? 'Đang gửi OTP...' : 'Tiếp tục bằng Email (Gửi OTP)'}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* STEP 2: OTP VERIFICATION */}
        {/* ────────────────────────────────────────────────────────── */}
        {step === 'otp' && (
          <form onSubmit={onSubmitOtpStep} className="auth-form" style={{ marginTop: '16px' }}>
            <div className="auth-helper-banner info" style={{ marginBottom: '16px' }}>
              <Lock size={16} />
              {isReturningUser ? (
                <span>Xin chào <strong>{returningUserName || cleanEmail}</strong>! Nhập mã OTP 6 số đã gửi tới <strong>{cleanEmail}</strong> để đăng nhập.</span>
              ) : (
                <span>Mã xác thực 6 số đã được gửi đến: <strong>{cleanEmail}</strong></span>
              )}
            </div>

            {/* Simulated OTP Display Helper for Easy Local Testing */}
            {simulatedOtp && (
              <div className="alert-box" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} />
                <span>[Thử nghiệm] Mã OTP của bạn là: <strong style={{ letterSpacing: '2px', fontSize: '1rem' }}>{simulatedOtp}</strong></span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="otp-code">Nhập mã OTP 6 chữ số</label>
              <div className="auth-input-wrapper">
                <input
                  id="otp-code"
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  className="input-text auth-phone-input"
                  style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '4px', fontWeight: 'bold' }}
                  required
                  autoFocus
                />
                <Lock size={18} className="auth-input-icon" />
              </div>
            </div>

            {/* Chỉ hiển thị Tên & Vai trò cho tài khoản MỚI đăng ký */}
            {!isReturningUser && (
              <>
                <div className="form-group">
                  <label htmlFor="display-name">Họ và tên (Hiển thị trong phòng họp)</label>
                  <input
                    id="display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nhập tên hiển thị..."
                    className="input-text"
                    style={{ width: '100%', padding: '10px' }}
                  />
                </div>

                <div className="form-group">
                  <label>Vai trò chính của bạn</label>
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
              </>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={otpCode.length !== 6 || isLoading}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '0.95rem' }}
            >
              {isLoading ? 'Đang xác thực...' : 'Xác thực OTP & Đăng nhập'}
            </button>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button 
                type="button" 
                disabled={timer > 0 || isLoading}
                onClick={onSubmitEmailStep}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
              >
                {timer > 0 ? `Gửi lại OTP (${timer}s)` : 'Gửi lại mã OTP'}
              </button>
              
              <button 
                type="button" 
                onClick={() => {
                  setStep('email');
                  setOtpCode('');
                  resetLoginStates();
                }} 
                className="btn btn-secondary"
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
              >
                Đổi Email khác
              </button>
            </div>
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
