import React, { useState, useEffect, useRef } from 'react';
import { Phone, AlertCircle, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';

import logo from '../assets/logo.png';

export const Auth = React.memo(({
  loginPhone,
  setLoginPhone,
  otpSent,
  loginOtp,
  setLoginOtp,
  isRegistering,
  registerName,
  setRegisterName,
  registerRole,
  setRegisterRole,
  loginError,
  setLoginError,
  loginPhoneMatchedUsers,
  isSelectingAccount,
  handleSendOtp,
  handleVerifyOtp,
  handleSelectAccount,
  handleRegister,
  resetLoginStates
}) => {
  // Real-time SĐT validation
  const [phoneTouch, setPhoneTouch] = useState(false);
  const isPhoneValid = /^(03|05|07|08|09)\d{8}$/.test(loginPhone);

  // OTP Countdown timer states (300 seconds = 5 minutes)
  const [countdown, setCountdown] = useState(300);
  const timerRef = useRef(null);

  // OTP Inputs refs (6 boxes)
  const otpLength = 6;
  const [otpBoxes, setOtpBoxes] = useState(Array(otpLength).fill(''));
  const inputRefs = useRef([]);

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

  // Format timer MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleOtpBoxChange = (value, idx) => {
    const cleanValue = value.replace(/\D/g, '');
    const nextBoxes = [...otpBoxes];
    
    // Support paste or single char input
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
      handleSendOtp(loginPhone);
    }
  };

  const onSubmitPhone = (e) => {
    e.preventDefault();
    setPhoneTouch(true);
    if (isPhoneValid) {
      handleSendOtp(loginPhone);
    } else {
      setLoginError('Số điện thoại không hợp lệ! Vui lòng kiểm tra lại đầu số VN.');
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

  const onSubmitRegister = (e) => {
    e.preventDefault();
    handleRegister(registerName, registerRole);
  };

  return (
    <div className="login-screen-wrapper">
      <div className="login-card card">
        <div className="login-logo-container">
          <img src={logo} alt="Logo" className="login-logo-img" />
        </div>
        
        <h2 className="login-title">Smeet</h2>
        <p className="login-subtitle">Quản lý, đặt lịch họp & tóm tắt báo cáo AI chuyên nghiệp</p>
        
        {loginError && (
          <div className="alert-box auth-alert">
            <AlertCircle size={16} />
            <span>{loginError}</span>
          </div>
        )}
        
        {/* CASE 1: MULTI-ACCOUNT ACCOUNT SELECTION */}
        {isSelectingAccount && (
          <div className="auth-account-select-container">
            <div className="auth-helper-banner">
              Số điện thoại này liên kết với nhiều tài khoản. Vui lòng chọn tài khoản muốn đăng nhập:
            </div>
            
            <div className="auth-accounts-list">
              {loginPhoneMatchedUsers.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectAccount(u)}
                  className="btn btn-secondary auth-account-btn"
                >
                  <div className="auth-account-info">
                    <img src={u.avatar} alt={u.name} className="auth-account-avatar" />
                    <div className="auth-account-details">
                      <span className="auth-account-name">{u.name}</span>
                      <span className="auth-account-role">
                        Vai trò: {u.role === 'admin' ? 'Quản lý (Host)' : u.role === 'delegated' ? 'Ủy quyền' : 'Thành viên'}
                      </span>
                    </div>
                  </div>
                  <ArrowRight size={16} color="var(--primary-color)" />
                </button>
              ))}
            </div>

            <button 
              type="button" 
              onClick={resetLoginStates} 
              className="btn btn-secondary"
              style={{ marginTop: '12px' }}
            >
              Quay lại
            </button>
          </div>
        )}

        {/* CASE 2: PHONE NUMBER ENTRY */}
        {!otpSent && !isRegistering && !isSelectingAccount && (
          <form onSubmit={onSubmitPhone} className="auth-form">
            <div className="form-group">
              <label htmlFor="login-phone">Số điện thoại thành viên</label>
              <div className="auth-input-wrapper">
                <input
                  id="login-phone"
                  type="tel"
                  maxLength={10}
                  value={loginPhone}
                  onFocus={() => setPhoneTouch(true)}
                  onChange={(e) => {
                    setPhoneTouch(true);
                    setLoginPhone(e.target.value.replace(/\D/g, ''));
                  }}
                  placeholder="Nhập số điện thoại (ví dụ: 0912345678)..."
                  className={`input-text auth-phone-input ${phoneTouch && !isPhoneValid && loginPhone ? 'input-error' : ''}`}
                  required
                />
                <Phone size={18} className="auth-input-icon" />
              </div>
              
              {phoneTouch && loginPhone && (
                <span className={`auth-validation-hint ${isPhoneValid ? 'text-success' : 'text-danger'}`}>
                  {isPhoneValid 
                    ? '✓ Số điện thoại đúng định dạng Việt Nam' 
                    : '✗ Phải bắt đầu bằng 03, 05, 07, 08, 09 và đủ 10 số'
                  }
                </span>
              )}
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary btn-auth-submit"
              disabled={!isPhoneValid}
            >
              Nhận mã xác thực OTP
            </button>
          </form>
        )}

        {/* CASE 3: SPECIALIZED OTP INPUT VIEW */}
        {otpSent && !isRegistering && !isSelectingAccount && (
          <form onSubmit={onSubmitOtp} className="auth-form">
            <div className="auth-helper-banner">
              Mã xác thực đã được gửi đến số điện thoại <strong>{loginPhone}</strong>.
              <button 
                type="button" 
                onClick={resetLoginStates} 
                className="auth-change-phone-btn"
              >
                Thay đổi
              </button>
            </div>
            
            <div className="form-group">
              <label className="auth-otp-label">Nhập mã xác thực (OTP)</label>
              
              {/* 6 separate boxes */}
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
              Xác nhận đăng nhập
            </button>
          </form>
        )}

        {/* CASE 4: REGISTRATION */}
        {isRegistering && !isSelectingAccount && (
          <form onSubmit={onSubmitRegister} className="auth-form">
            <div className="auth-helper-banner info">
              <ShieldCheck size={16} />
              <span>Số điện thoại <strong>{loginPhone}</strong> chưa tồn tại trong hệ thống. Hãy hoàn tất đăng ký thông tin của bạn.</span>
            </div>
            
            <div className="form-group">
              <label htmlFor="register-name">Họ và tên thành viên</label>
              <input
                id="register-name"
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="Nhập họ tên đầy đủ (ví dụ: Nguyễn Văn A)..."
                className="input-text"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-role">Vai trò mong muốn</label>
              <select
                id="register-role"
                value={registerRole}
                onChange={(e) => setRegisterRole(e.target.value)}
                className="select-input"
              >
                <option value="member">Thành viên cuộc họp (Member)</option>
                <option value="admin">Chủ trì cuộc họp (Host / Admin)</option>
              </select>
            </div>
            
            <button type="submit" className="btn btn-primary">
              Hoàn tất đăng ký & Đăng nhập
            </button>
            
            <button 
              type="button" 
              onClick={resetLoginStates} 
              className="btn btn-secondary"
            >
              Quay lại
            </button>
          </form>
        )}
      </div>
    </div>
  );
});

Auth.displayName = 'Auth';
