// Helper: kiểm tra user có role cụ thể không (hỗ trợ cả role string cũ và roles array mới)
export const hasRole = (user, roleToCheck) => {
  if (!user) return false;
  // Kiểm tra roles array trước (mới)
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles.includes(roleToCheck);
  }
  // Fallback: kiểm tra role string (cũ, backward compat)
  return user.role === roleToCheck;
};

// Helper: lấy label hiển thị cho tất cả roles của user
export const getRoleLabel = (user, lang = 'vi') => {
  if (!user) return '';
  const labelMap = {
    admin: lang === 'vi' ? 'Quản lý' : 'Admin',
    delegated: lang === 'vi' ? 'Ủy quyền' : 'Delegated',
    member: lang === 'vi' ? 'Thành viên' : 'Member',
  };
  const roleList = (Array.isArray(user.roles) && user.roles.length > 0)
    ? user.roles
    : (user.role ? [user.role] : ['member']);
  return roleList.map(r => labelMap[r] || r).join(' / ');
};


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
  const [zaloTempProfile, setZaloTempProfile] = useState(null); // Giữ thông tin Zalo tạm thời khi cần liên kết email
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerRole, setRegisterRole] = useState(['member']); // Mảng roles, VD: ['admin', 'member']
  const [loginError, setLoginError] = useState('');
  const [personalPhone, setPersonalPhone] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Email verification modal states
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationCallback, setVerificationCallback] = useState(null);

  const openVerificationModal = useCallback((callback) => {
    setVerificationCallback(() => callback);
    setIsVerificationModalOpen(true);
  }, []);

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

  const handleZaloLogin = async () => {
    setLoginError('');
    try {
      await authorize({ scopes: ['scope.userInfo'] });
      const res = await getUserInfo({});
      if (res?.userInfo) {
        const zaloUser = res.userInfo;
        const ZALO_DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI0U2RjBGRiIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE4IiBmaWxsPSIjMDA2OEZGIi8+PHBhdGggZD0iTTUwIDYwYy0xOCAwLTMwIDgtMzAgMTh2NGg2MHYtNGMwLTEwLTEyLTE4LTMwLTE4eiIgZmlsbD0iIzAwNjhGRiIvPjwvc3ZnPg==';
        const apiRes = await Storage.authenticateZalo({
          id: zaloUser.id,
          name: zaloUser.name,
          avatar: zaloUser.avatar || ZALO_DEFAULT_AVATAR
        });

        if (apiRes.needEmail || apiRes.needEmailLink) {
          // Đăng nhập tạm thời với tài khoản chưa verify email
          const tempUser = {
            id: apiRes.zaloUser.id,
            name: apiRes.zaloUser.name || 'Người dùng Zalo',
            avatar: apiRes.zaloUser.avatar || ZALO_DEFAULT_AVATAR,
            is_email_verified: false
          };
          setCurrentUser(tempUser);
          await Storage.setLoggedInUser(tempUser);
          resetLoginStates();
        } else if (apiRes.user) {
          // Zalo đã liên kết và verify email -> Đăng nhập thành công
          setCurrentUser(apiRes.user);
          await Storage.setLoggedInUser(apiRes.user);
          resetLoginStates();
          setTimeout(() => requestNotificationPermission(true), 500);
        }
        return true;
      }
    } catch (err) {
      console.warn("Zalo SDK auth failed, using Mock Admin for simulation/browser testing:", err);
      // Giả lập cho trình duyệt: Đăng nhập thẳng bằng tài khoản Nguyễn Văn A chưa verify để có thể test popup
      try {
        const mockUser = {
          id: 'u1',
          name: 'Nguyễn Văn A (Host)',
          avatar: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI0U2RjBGRiIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE4IiBmaWxsPSIjMDA2OEZGIi8+PHBhdGggZD0iTTUwIDYwYy0xOCAwLTMwIDgtMzAgMTh2NGg2MHYtNGMwLTEwLTEyLTE4LTMwLTE4eiIgZmlsbD0iIzAwNjhGRiIvPjwvc3ZnPg==',
          email: 'nguyenvana@gmail.com',
          phone: '0912345678',
          role: 'admin',
          roles: ['admin'],
          is_email_verified: false // Cho phép test luồng OTP dễ dàng trên browser
        };
        setCurrentUser(mockUser);
        await Storage.setLoggedInUser(mockUser);
        resetLoginStates();
        return true;
      } catch (mockErr) {
        setLoginError('Không thể giả lập đăng nhập: ' + mockErr.message);
      }
      return false;
    }
  };

  const handleLinkEmailAndLogin = async (email, roles) => {
    setLoginError('');
    if (!email || !email.trim()) {
      setLoginError('Vui lòng nhập địa chỉ email của bạn.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim().toLowerCase())) {
      setLoginError('Định dạng email không hợp lệ (ví dụ: user@example.com).');
      return false;
    }

    // Mở popup xác thực OTP trực tiếp từ Auth page
    openVerificationModal(() => {
      resetLoginStates();
    });
    return true;
  };

  const resetLoginStates = () => {
    setLoginEmail('');
    setLoginPhone('');
    setZaloTempProfile(null);
    setIsRegistering(false);
    setRegisterName('');
    setRegisterRole(['member']);
    setLoginError('');
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

  const handleSavePersonalName = async (newName) => {
    if (!newName || !newName.trim()) {
      triggerNotification("[Lỗi] Tên người dùng không được để trống.");
      return false;
    }
    try {
      const updatedUser = { ...currentUser, name: newName.trim() };
      const savedUser = await Storage.saveUser(updatedUser);
      
      setCurrentUser(savedUser);
      await Storage.setLoggedInUser(savedUser);
      
      await initUsers();
      triggerNotification("[Hệ thống] Cập nhật họ và tên thành công!");
      return true;
    } catch (err) {
      console.error(err);
      triggerNotification("[Lỗi] " + (err.message || "Có lỗi xảy ra khi lưu họ và tên."));
      return false;
    }
  };

  const handleAddMember = async (name, phone, role, email = '') => {
    if (!name.trim()) return false;
    try {
      await Storage.saveUser({
        name: name.trim(),
        phone: phone.trim(),
        role: role,
        email: email.trim().toLowerCase() || undefined
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
    zaloTempProfile,
    setZaloTempProfile,
    isRegistering,
    setIsRegistering,
    registerName,
    setRegisterName,
    registerRole,
    setRegisterRole,
    loginError,
    setLoginError,
    personalPhone,
    setPersonalPhone,
    isEditingPhone,
    setIsEditingPhone,
    isAvatarModalOpen,
    setIsAvatarModalOpen,
    initUsers,
    refreshUsers,
    handleZaloLogin,
    handleLinkEmailAndLogin,
    handleLogout,
    handleSavePersonalPhone,
    handleSavePersonalName,
    handleAddMember,
    handleDeleteMember,
    toggleUserRole,
    handleAvatarChange,
    resetLoginStates,
    isVerificationModalOpen,
    setIsVerificationModalOpen,
    verificationCallback,
    setVerificationCallback,
    openVerificationModal,
    REGISTRATION_OPEN
  };
}
