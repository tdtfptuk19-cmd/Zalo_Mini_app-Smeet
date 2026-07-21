import { useState, useCallback, useRef } from 'react';
import { Storage } from '../utils/storage';
import { requestNotificationPermission } from '../utils/notificationHelper';

// ─────────────────────────────────────────────────────────────────────
// Cấu hình: đóng/mở tự đăng ký tài khoản mới
// Khi REGISTRATION_OPEN = false: chỉ admin mới thêm được thành viên
// ─────────────────────────────────────────────────────────────────────
const REGISTRATION_OPEN = false;
const OTP_EXPIRY_SECONDS = 300; // 5 phút

export function useAuth(triggerNotification) {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loginPhone, setLoginPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loginOtp, setLoginOtp] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState(null); // timestamp OTP hết hạn
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerRole, setRegisterRole] = useState('member');
  const [loginError, setLoginError] = useState('');
  const [loginPhoneMatchedUsers, setLoginPhoneMatchedUsers] = useState([]);
  const [isSelectingAccount, setIsSelectingAccount] = useState(false);
  const [personalPhone, setPersonalPhone] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Ref giữ OTP và thời hạn để kiểm tra chính xác khi verify
  const otpRef = useRef({ code: '', expiresAt: 0 });

  // Load initial data
  const initUsers = useCallback(async () => {
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

  const handleSendOtp = (phoneNum) => {
    setLoginError('');
    const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
    if (!phoneRegex.test(phoneNum)) {
      setLoginError('Số điện thoại không hợp lệ! Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số (đầu số 03, 05, 07, 08, 09).');
      return false;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + OTP_EXPIRY_SECONDS * 1000;

    // Lưu vào ref để kiểm tra không bị stale closure
    otpRef.current = { code, expiresAt };
    setSimulatedOtp(code);
    setOtpExpiresAt(expiresAt);
    setOtpSent(true);

    triggerNotification(`[OTP Đăng nhập] Mã xác thực của bạn là ${code}. Có hiệu lực trong 5 phút.`);
    return true;
  };

  const handleVerifyOtp = async (otp) => {
    setLoginError('');

    // Kiểm tra OTP hết hạn chưa
    if (Date.now() > otpRef.current.expiresAt) {
      setLoginError('Mã OTP đã hết hạn! Vui lòng nhấn "Gửi lại mã" để nhận mã mới.');
      return false;
    }

    if (otp !== otpRef.current.code) {
      setLoginError('Mã OTP không chính xác! Vui lòng kiểm tra lại thông báo ở đầu trang.');
      return false;
    }

    const matchedUsers = users.filter(u => u.phone === loginPhone);
    if (matchedUsers.length > 1) {
      setLoginPhoneMatchedUsers(matchedUsers);
      setIsSelectingAccount(true);
    } else if (matchedUsers.length === 1) {
      const targetUser = matchedUsers[0];
      setCurrentUser(targetUser);
      await Storage.setLoggedInUser(targetUser);
      resetLoginStates();
      // Xin quyền thông báo nổi hệ thống ngay khi đăng nhập thành công (chế độ im lặng)
      setTimeout(() => requestNotificationPermission(true), 500);
    } else {
      // Số điện thoại chưa đăng ký
      if (!REGISTRATION_OPEN) {
        setLoginError('Số điện thoại này chưa được đăng ký trong hệ thống. Vui lòng liên hệ quản trị viên để được thêm vào hệ thống.');
        return false;
      }
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
        phone: loginPhone,
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
    setLoginPhone('');
    setOtpSent(false);
    setLoginOtp('');
    setSimulatedOtp('');
    setOtpExpiresAt(null);
    otpRef.current = { code: '', expiresAt: 0 };
    setIsRegistering(false);
    setRegisterName('');
    setRegisterRole('member');
    setLoginError('');
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
    handleUserChange,
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
