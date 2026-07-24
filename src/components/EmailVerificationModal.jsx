import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, ShieldCheck, AlertCircle, X, RefreshCw, ArrowRight } from 'lucide-react';
import { Storage } from '../utils/storage';

export const EmailVerificationModal = React.memo(({
  isOpen,
  onClose,
  currentUser,
  setCurrentUser,
  onSuccess
}) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const timerRef = useRef(null);

  // Reset states when opening
  useEffect(() => {
    if (isOpen) {
      setEmail(currentUser?.email || '');
      setOtp('');
      setStep('email');
      setError('');
      setSimulatedOtp('');
      setTimer(0);
    }
  }, [isOpen, currentUser]);

  // Handle countdown timer for resending OTP
  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setTimeout(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [timer]);

  if (!isOpen) return null;

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email || !email.trim()) {
      setError('Vui lòng nhập địa chỉ email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim().toLowerCase())) {
      setError('Địa chỉ email không đúng định dạng.');
      return;
    }

    setLoading(true);
    setError('');
    setSimulatedOtp('');

    try {
      const res = await Storage.sendOtp(email.trim().toLowerCase(), currentUser.id);
      if (res.success) {
        setStep('otp');
        setTimer(60); // 60 seconds cooldown
        if (res.mode === 'simulated' && res.code) {
          setSimulatedOtp(res.code);
        }
      } else {
        setError(res.error || 'Không thể gửi mã OTP. Vui lòng thử lại.');
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối máy chủ khi gửi OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError('Mã OTP phải chứa đúng 6 chữ số.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const profile = {
        name: currentUser?.name || 'Người dùng Zalo',
        avatar: currentUser?.avatar || '',
        phone: currentUser?.phone || ''
      };
      
      const res = await Storage.verifyOtp(email.trim().toLowerCase(), currentUser.id, otp.trim(), profile);
      
      if (res.success && res.user) {
        // Cập nhật session đã verify trong App
        const updatedUser = { ...res.user, token: res.token };
        await Storage.setLoggedInUser(updatedUser);
        setCurrentUser(updatedUser);
        
        // Gọi callback hành động ban đầu và đóng modal
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } else {
        setError(res.error || 'Mã OTP không chính xác hoặc đã hết hạn.');
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối máy chủ khi xác nhận OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content email-verification-modal">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-title-row">
            <ShieldCheck size={22} className="text-primary" />
            <h3>Xác thực tài khoản Smeet</h3>
          </div>
          <button type="button" onClick={onClose} className="modal-close-btn" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="alert-box wizard-alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="modal-body">
            <p className="auth-helper-banner info" style={{ marginBottom: '18px' }}>
              Bạn cần liên kết và xác thực Gmail trước khi có thể đặt lịch hoặc tham gia phòng họp trên Smeet.
            </p>

            <div className="form-group">
              <label htmlFor="verify-email-input">Địa chỉ Gmail của bạn</label>
              <div className="auth-input-wrapper">
                <input
                  id="verify-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email (ví dụ: user@gmail.com)..."
                  className="input-text auth-phone-input"
                  required
                  disabled={loading}
                  autoFocus
                />
                <Mail size={18} className="auth-input-icon" />
              </div>
            </div>

            <div className="quick-meet-buttons-row" style={{ marginTop: '24px' }}>
              <button
                type="submit"
                className="btn btn-primary btn-quick-meet-submit"
                disabled={loading || !email}
                style={{ width: '100%' }}
              >
                {loading ? (
                  <RefreshCw size={18} className="spin" />
                ) : (
                  <>
                    <span>Gửi mã xác thực OTP</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="modal-body">
            <p className="auth-helper-banner info" style={{ marginBottom: '18px' }}>
              Mã xác thực đã được gửi đến email: <strong>{email}</strong>. Vui lòng kiểm tra hộp thư đến hoặc thư rác.
            </p>

            {simulatedOtp && (
              <div className="alert-box success" style={{ marginBottom: '16px', background: '#e6f4ea', border: '1px solid #34a853', color: '#137333', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} />
                <span><strong>[Chế độ mô phỏng]</strong> Mã OTP của bạn là: <strong>{simulatedOtp}</strong></span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="verify-otp-input">Mã OTP gồm 6 chữ số</label>
              <div className="auth-input-wrapper">
                <input
                  id="verify-otp-input"
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập 6 số..."
                  className="input-text auth-phone-input"
                  style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '6px', fontWeight: 'bold' }}
                  required
                  disabled={loading}
                  autoFocus
                />
                <Lock size={18} className="auth-input-icon" />
              </div>
            </div>

            <div className="quick-meet-buttons-row" style={{ marginTop: '24px' }}>
              <button
                type="submit"
                className="btn btn-primary btn-quick-meet-submit"
                disabled={loading || otp.length !== 6}
                style={{ width: '100%' }}
              >
                {loading ? <RefreshCw size={18} className="spin" /> : <span>Xác minh & Đăng nhập</span>}
              </button>
            </div>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setStep('email')}
                className="btn btn-secondary"
                style={{ background: 'none', border: 'none', color: '#64748b', textDecoration: 'underline', padding: 0, marginRight: '16px' }}
                disabled={loading}
              >
                Thay đổi Email
              </button>

              <button
                type="button"
                onClick={() => handleSendOtp(null)}
                className="btn btn-secondary"
                style={{ background: 'none', border: 'none', color: timer > 0 ? '#94a3b8' : '#0068ff', textDecoration: timer > 0 ? 'none' : 'underline', padding: 0 }}
                disabled={loading || timer > 0}
              >
                {timer > 0 ? `Gửi lại mã (${timer}s)` : 'Gửi lại mã OTP'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
});

EmailVerificationModal.displayName = 'EmailVerificationModal';
