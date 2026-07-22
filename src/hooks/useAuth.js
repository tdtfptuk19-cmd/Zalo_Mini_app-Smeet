import { useState, useCallback, useRef } from 'react';
import { Storage } from '../utils/storage';
import { requestNotificationPermission } from '../utils/notificationHelper';

// ─────────────────────────────────────────────────────────────────────
// Cấu hình: đóng/mở tự đăng ký tài khoản mới (True = tự do đăng ký kiểu App hiện đại)
// ─────────────────────────────────────────────────────────────────────
const REGISTRATION_OPEN = true;
const OTP_EXPIRY_SECONDS = 300; // 5 phút

export function useAuth(triggerNotification) {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loginOtp, setLoginOtp] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState(null); // timestamp OTP hết hạn
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerRole, setRegisterRole] = useState('member');
  const [loginError, setLoginError] = useState('');
  const [loginEmailMatchedUsers, setLoginEmailMatchedUsers] = useState([]);
  const [loginPhoneMatchedUsers, setLoginPhoneMatchedUsers] = useState([]);
  const [isSelectingAccount, setIsSelectingAccount] = useState(false);
  const [personalPhone, setPersonalPhone] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Ref giữ OTP và thời hạn để kiểm tra chính xác khi verify
  // mode: 'real' = OTP gửi qua email thật (verify phía server), 'simulated' = OTP giả (verify local)
  const otpRef = useRef({ code: '', expiresAt: 0, mode: 'simulated' });

  // Load initial data (only when user is authenticated)
  const initUsers = useCallback(async () => {
    const loggedIn = await Storage.getLoggedInUser();
    if (!loggedIn?.id) {
      setUsers([]);
      return [];
    }

    try {
      const loadedUsers = await Storage.getUsers();
      // Auto-migrate old Unsplash avatars to default local Base64 SVGs to avoid loading broken external images
      const ZALO_DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI0U2RjBGRiIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE4IiBmaWxsPSIjMDA2OEZGIi8+PHBhdGggZD0iTTUwIDYwYy0xOCAwLTMwIDgtMzAgMTh2NGg2MHYtNGMwLTEwLTEyLTE4LTMwLTE4eiIgZmlsbD0iIzAwNjhGRiIvPjwvc3ZnPg==';
      let migrated = false;
      const updated = loadedUsers.map(u => {
        if (u.avatar && u.avatar.includes('unsplash.com')) {
          migrated = true;
          return { ...u, avatar: ZALO_DEFAULT_AVATAR };
        }
        return u;
      });
      if (migrated) {
        localStorage.setItem('zmp_users', JSON.stringify(updated));
      }
      setUsers(updated);
      return updated;
    } catch (err) {
      console.error("Failed to load users:", err);
      return [];
    }
  }, []);

  const refreshUsers = async () => {
    await initUsers();
  };

  const handleUserChange = async (userId) => {
    const selected = users.find(u => u.id === userId);
    if (selected) {
      setCurrentUser(selected);
      await Storage.setLoggedInUser(selected);
      return selected;
    }
    return null;
  };

  const [matchedUserPreview, setMatchedUserPreview] = useState(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const handleSendOtp = async (emailTarget) => {
    setLoginError('');
    const targetEmail = (emailTarget || loginEmail).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      setLoginError('Email không hợp lệ! Vui lòng kiểm tra lại địa chỉ email (ví dụ: user@example.com).');
      return false;
    }

    try {
      const res = await Storage.sendEmailOtp(targetEmail);
      const expiresAt = Date.now() + OTP_EXPIRY_SECONDS * 1000;

      if (res && res.mode === 'real') {
        // Email thật đã gửi — OTP nằm ở server, verify sẽ gọi server
        otpRef.current = { code: '', expiresAt, mode: 'real' };
        setSimulatedOtp('');
        setOtpExpiresAt(expiresAt);
        setOtpSent(true);
        triggerNotification(`[Email OTP] Mã xác thực 6 số đã được gửi tới hòm thư ${targetEmail}. Vui lòng kiểm tra Inbox/Spam.`);
      } else {
        // Chế độ mô phỏng — OTP trả về trong res.code
        const code = res.code || Math.floor(100000 + Math.random() * 900000).toString();
        otpRef.current = { code, expiresAt, mode: 'simulated' };
        setSimulatedOtp(code);
        setOtpExpiresAt(expiresAt);
        setOtpSent(true);
        triggerNotification(`[Email OTP] Mã xác thực 6 số đã được gửi tới hòm thư ${targetEmail}. Vui lòng kiểm tra Hộp thư đến.`);
      }
      return true;
    } catch (err) {
      console.warn("Failed calling sendEmailOtp backend:", err);
      // Không giả thành công — hiển thị lỗi rõ ràng để người dùng biết
      setLoginError(
        `Không thể gửi mã OTP. Backend Server chưa sẵn sàng hoặc mạng bị gián đoạn. ` +
        `Vui lòng kiểm tra cài đặt API URL trong ⚙️ Cài đặt, hoặc thử lại sau.`
      );
      return false;
    }
  };

  // Modern smart step 1: Check Email existence and route user automatically
  const handleCheckEmailAndSendOtp = async (emailTarget) => {
    setLoginError('');
    const targetEmail = (emailTarget || loginEmail).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(targetEmail)) {
      setLoginError('Email không hợp lệ! Vui lòng nhập đúng định dạng (ví dụ: user@example.com).');
      return false;
    }

    setIsCheckingEmail(true);
    setLoginEmail(targetEmail);

    try {
      let matched = await Storage.lookupUsersByEmail(targetEmail);
      if ((!matched || matched.length === 0) && /^\d+$/.test(targetEmail)) {
        matched = await Storage.lookupUsersByPhone(targetEmail);
      }

      setIsCheckingEmail(false);

      if (matched && matched.length > 1) {
        // Bảo mật: Gửi OTP trước, chỉ hiện picker tài khoản SAU KHI verify OTP thành công
        setLoginEmailMatchedUsers(matched);
        setMatchedUserPreview(null);
        setIsRegistering(false);
        return await handleSendOtp(targetEmail);
      } else if (matched && matched.length === 1) {
        setMatchedUserPreview(matched[0]);
        setIsRegistering(false);
        return await handleSendOtp(targetEmail);
      } else {
        // Email chưa có tài khoản → chuyển sang form đăng ký
        setMatchedUserPreview(null);
        setIsRegistering(true);
        return true;
      }
    } catch (err) {
      setIsCheckingEmail(false);
      // If error or backend offline, fallback to direct OTP flow
      return await handleSendOtp(targetEmail);
    }
  };

  const handleVerifyOtp = async (otp) => {
    setLoginError('');
    const targetEmail = loginEmail.trim().toLowerCase();

    // Kiểm tra OTP hết hạn (kiểm tra client-side nhanh)
    if (Date.now() > otpRef.current.expiresAt) {
      setLoginError('Mã OTP đã hết hạn! Vui lòng nhấn "Gửi lại mã" để nhận mã mới.');
      return false;
    }

    if (otpRef.current.mode === 'real') {
      // Verify OTP qua server (OTP thật đã gửi qua email)
      try {
        const verifyRes = await Storage.verifyEmailOtp(targetEmail, otp);
        if (!verifyRes.success) {
          setLoginError(verifyRes.error || 'Mã OTP không chính xác. Vui lòng kiểm tra email và thử lại.');
          return false;
        }
      } catch (err) {
        setLoginError('Không thể xác minh mã OTP. Vui lòng thử lại.');
        return false;
      }
    } else {
      // Chế độ mô phỏng — so sánh local
      if (otp !== otpRef.current.code) {
        setLoginError('Mã OTP không chính xác! Vui lòng kiểm tra lại thông báo ở đầu trang.');
        return false;
      }
    }

    // Ưu tiên 1: Dùng matchedUserPreview đã có từ bước lookup email (tránh gọi server lại)
    if (matchedUserPreview) {
      setCurrentUser(matchedUserPreview);
      await Storage.setLoggedInUser(matchedUserPreview);
      resetLoginStates();
      setTimeout(() => requestNotificationPermission(true), 500);
      return true;
    }

    // Ưu tiên 2: Đã có danh sách multi-account từ bước lookup (chờ OTP verify)
    if (loginEmailMatchedUsers && loginEmailMatchedUsers.length > 1) {
      // OTP đã verify thành công → giờ mới hiện picker
      setIsSelectingAccount(true);
      return true;
    }

    // Fallback: Lookup lại từ server (trường hợp không có cache)
    let matchedUsers = [];
    try {
      matchedUsers = await Storage.lookupUsersByEmail(targetEmail);
      if ((!matchedUsers || matchedUsers.length === 0) && /^\d+$/.test(targetEmail)) {
        matchedUsers = await Storage.lookupUsersByPhone(targetEmail);
      }
    } catch (err) {
      setLoginError(err.message || 'Không thể tra cứu tài khoản. Vui lòng thử lại.');
      return false;
    }

    if (matchedUsers.length > 1) {
      setLoginEmailMatchedUsers(matchedUsers);
      setIsSelectingAccount(true);
    } else if (matchedUsers.length === 1) {
      const targetUser = matchedUsers[0];
      setCurrentUser(targetUser);
      await Storage.setLoggedInUser(targetUser);
      resetLoginStates();
      setTimeout(() => requestNotificationPermission(true), 500);
    } else {
      setIsRegistering(true);
    }
    return true;
  };

  const handleSelectAccount = async (selectedUser) => {
    setCurrentUser(selectedUser);
    await Storage.setLoggedInUser(selectedUser);
    resetLoginStates();
    // Xin quyền thông báo nổi hệ thống khi chọn tài khoản (chế độ im lặng)
    setTimeout(() => requestNotificationPermission(true), 500);
  };

  const handleRegister = async (name, role) => {
    setLoginError('');

    // Kiểm tra lại đăng ký có được phép không
    if (!REGISTRATION_OPEN) {
      setLoginError('Đăng ký tự do đã bị tắt. Vui lòng liên hệ quản trị viên.');
      return false;
    }

    if (!name.trim()) {
      setLoginError('Vui lòng nhập họ và tên của bạn.');
      return false;
    }

    try {
      const newUser = {
        name: name.trim(),
        email: loginEmail.trim().toLowerCase(),
        phone: loginPhone || '',
        role: 'member' // Tự đăng ký chỉ được role 'member'
      };

      const savedUser = await Storage.saveUser(newUser);
      await initUsers();
      
      setCurrentUser(savedUser);
      await Storage.setLoggedInUser(savedUser);
      resetLoginStates();
      // Xin quyền thông báo nổi hệ thống khi hoàn tất đăng ký (chế độ im lặng)
      setTimeout(() => requestNotificationPermission(true), 500);
      return true;
    } catch (err) {
      setLoginError(err.message || 'Có lỗi xảy ra khi tạo tài khoản.');
      return false;
    }
  };

  const resetLoginStates = () => {
    setLoginEmail('');
    setLoginPhone('');
    setOtpSent(false);
    setLoginOtp('');
    setSimulatedOtp('');
    setOtpExpiresAt(null);
    setMatchedUserPreview(null);
    setIsCheckingEmail(false);
    otpRef.current = { code: '', expiresAt: 0 };
    setIsRegistering(false);
    setRegisterName('');
    setRegisterRole('member');
    setLoginError('');
    setLoginEmailMatchedUsers([]);
    setLoginPhoneMatchedUsers([]);
    setIsSelectingAccount(false);
  };

  const handleLogout = async () => {
    await Storage.clearLoggedInUser();
    setCurrentUser(null);
    setIsAvatarModalOpen(false);
  };

  const handleSavePersonalPhone = async (newPhone) => {
    if (!newPhone || newPhone.length < 10) {
      triggerNotification("[Lỗi] Số điện thoại không hợp lệ! Vui lòng nhập ít nhất 10 số.");
      return false;
    }
    try {
      const updatedUser = { ...currentUser, phone: newPhone };
      const savedUser = await Storage.saveUser(updatedUser);
      
      setCurrentUser(savedUser);
      await Storage.setLoggedInUser(savedUser);
      
      await initUsers();
      setIsEditingPhone(false);
      triggerNotification("[Hệ thống] Cập nhật số điện thoại thành công!");
      return true;
    } catch (err) {
      console.error(err);
      triggerNotification("[Lỗi] " + (err.message || "Có lỗi xảy ra khi lưu số điện thoại."));
      return false;
    }
  };

  const handleAddMember = async (name, phone, role) => {
    if (!name.trim()) return false;
    try {
      await Storage.saveUser({
        name: name.trim(),
        phone: phone.trim(),
        role: role
      });
      await initUsers();
      return true;
    } catch (err) {
      triggerNotification('[Lỗi] ' + (err.message || 'Không thể thêm thành viên.'));
      return false;
    }
  };

  const handleDeleteMember = async (userId) => {
    if (userId === currentUser?.id) {
      triggerNotification('[Lỗi] Không thể xóa chính bạn!');
      return false;
    }
    try {
      await Storage.deleteUser(userId);
      await initUsers();
      return true;
    } catch (err) {
      triggerNotification('[Lỗi] ' + (err.message || 'Không thể xóa thành viên.'));
      return false;
    }
  };

  const toggleUserRole = async (userId, newRole) => {
    const targetUser = users.find(u => u.id === userId);
    if (targetUser) {
      await Storage.saveUser({ ...targetUser, role: newRole });
      await initUsers();
      if (userId === currentUser?.id) {
        const updatedSession = { ...currentUser, role: newRole };
        setCurrentUser(updatedSession);
        await Storage.setLoggedInUser(updatedSession);
      }
      return true;
    }
    return false;
  };

  const handleAvatarChange = async (base64Avatar) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, avatar: base64Avatar };
    setCurrentUser(updatedUser);
    
    await Storage.saveUser(updatedUser);
    await Storage.setLoggedInUser(updatedUser);
    await initUsers();
  };

  return {
    currentUser,
    setCurrentUser,
    users,
    loginEmail,
    setLoginEmail,
    loginPhone,
    setLoginPhone,
    otpSent,
    setOtpSent,
    loginOtp,
    setLoginOtp,
    simulatedOtp,
    otpExpiresAt,
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
    personalPhone,
    setPersonalPhone,
    isEditingPhone,
    setIsEditingPhone,
    isAvatarModalOpen,
    setIsAvatarModalOpen,
    initUsers,
    refreshUsers,
    matchedUserPreview,
    isCheckingEmail,
    handleCheckEmailAndSendOtp,
    handleSendOtp,
    handleVerifyOtp,
    handleSelectAccount,
    handleRegister,
    handleLogout,
    handleSavePersonalPhone,
    handleAddMember,
    handleDeleteMember,
    toggleUserRole,
    handleAvatarChange,
    resetLoginStates,
    REGISTRATION_OPEN
  };
}
