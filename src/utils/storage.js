// Storage Client Adapter to communicate directly with the Node.js / Vercel Backend Server

// URL backend Vercel cố định
const VERCEL_BACKEND_URL = 'https://smeet-zalo-app.vercel.app';

// Dynamic API Base URL detection
export const getApiBase = () => {
  if (typeof window === 'undefined') return VERCEL_BACKEND_URL;
  
  // Custom API URL set in settings drawer takes top priority
  const customUrl = window.localStorage.getItem('zmp_custom_api_url');
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }

  // Environment variable VITE_API_URL if configured
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim()) {
    return import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '');
  }
  
  const hostname = window.location.hostname;
  
  // If running locally in browser or simulator (localhost / 127.0.0.1)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return ''; // Uses relative URL via Vite development proxy
  }
  
  // Trên thiết bị thật (Zalo Mini App), luôn dùng Vercel backend
  return VERCEL_BACKEND_URL;
};

// Auth header helper: inject x-user-id from localStorage session
const getAuthHeaders = () => {
  try {
    const userJson = window.localStorage.getItem('zmp_logged_in_user');
    if (userJson) {
      const user = JSON.parse(userJson);
      if (user && user.id) {
        return { 'x-user-id': user.id };
      }
    }
  } catch {
    // ignore
  }
  return {};
};

// Safe Fetch Wrapper: Handles network & HTTP error formatting
const safeFetch = async (url, options = {}) => {
  let res;
  try {
    const isAuthRoute = url.includes('/api/auth/') || url.includes('/api/users/lookup');
    const authHeaders = isAuthRoute ? {} : getAuthHeaders();

    const mergedOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options.headers || {})
      }
    };

    res = await fetch(url, mergedOptions);
  } catch (networkErr) {
    console.error("Network error calling Live API:", networkErr);
    throw new Error("Không thể kết nối đến Backend Server trên Vercel. Vui lòng kiểm tra lại đường dẫn VITE_API_URL hoặc kết nối mạng.");
  }

  if (!res.ok) {
    let errMsg = `Server status ${res.status}`;
    try {
      const errData = await res.json();
      errMsg = errData.error || errData.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }
  return res;
};

export const Storage = {
  // ─── Users APIs ───
  getUsers: async () => {
    const res = await safeFetch(`${getApiBase()}/api/users`);
    return res.json();
  },
  
  saveUser: async (user) => {
    const loggedIn = await Storage.getLoggedInUser();
    // Nếu chưa đăng nhập hoặc đang tự đăng ký tài khoản mới (user không có id), dùng endpoint /api/auth/register công khai
    const isSelfRegister = !loggedIn || !loggedIn.id || !user.id;
    const url = isSelfRegister ? `${getApiBase()}/api/auth/register` : `${getApiBase()}/api/users`;

    const res = await safeFetch(url, {
      method: 'POST',
      body: JSON.stringify(user)
    });
    return res.json();
  },
  
  deleteUser: async (id) => {
    await safeFetch(`${getApiBase()}/api/users/${id}`, {
      method: 'DELETE'
    });
  },

  // ─── Authentication via Zalo ───
  authenticateZalo: async (zaloUserInfo) => {
    const res = await safeFetch(`${getApiBase()}/api/auth/zalo`, {
      method: 'POST',
      body: JSON.stringify(zaloUserInfo)
    });
    return res.json();
  },

  linkZaloEmail: async (linkData) => {
    const res = await safeFetch(`${getApiBase()}/api/auth/zalo-link-email`, {
      method: 'POST',
      body: JSON.stringify(linkData)
    });
    return res.json();
  },

  // Public lookup for OTP login (no session required)
  sendEmailOtp: async (email) => {
    const res = await safeFetch(`${getApiBase()}/api/auth/send-email-otp`, {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    return res.json();
  },

  verifyEmailOtp: async (email, otp) => {
    const res = await safeFetch(`${getApiBase()}/api/auth/verify-email-otp`, {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });
    return res.json();
  },

  lookupUsersByEmail: async (email) => {
    const res = await safeFetch(`${getApiBase()}/api/users/lookup?email=${encodeURIComponent(email)}`);
    return res.json();
  },

  lookupUsersByPhone: async (phone) => {
    const res = await safeFetch(`${getApiBase()}/api/users/lookup?phone=${encodeURIComponent(phone)}`);
    return res.json();
  },


  // ─── Meetings APIs ───
  getMeetings: async () => {
    const res = await safeFetch(`${getApiBase()}/api/meetings`);
    return res.json();
  },
  
  saveMeeting: async (meeting) => {
    const res = await safeFetch(`${getApiBase()}/api/meetings`, {
      method: 'POST',
      body: JSON.stringify(meeting)
    });
    return res.json();
  },
  
  deleteMeeting: async (id) => {
    await safeFetch(`${getApiBase()}/api/meetings/${id}`, {
      method: 'DELETE'
    });
  },

  updateMeetingStatus: async (meetingId, status) => {
    const res = await safeFetch(`${getApiBase()}/api/meetings/${meetingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  // ─── Notes APIs ───
  getNotes: async (meetingId) => {
    const res = await safeFetch(`${getApiBase()}/api/meetings/${meetingId}/notes`);
    return res.json();
  },
  
  saveNote: async (meetingId, userId, content) => {
    await safeFetch(`${getApiBase()}/api/meetings/${meetingId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ userId, content })
    });
  },

  // ─── Polls APIs ───
  getPolls: async (meetingId) => {
    const res = await safeFetch(`${getApiBase()}/api/meetings/${meetingId}/polls`);
    return res.json();
  },
  
  savePoll: async (poll) => {
    const res = await safeFetch(`${getApiBase()}/api/meetings/${poll.meetingId}/polls`, {
      method: 'POST',
      body: JSON.stringify(poll)
    });
    return res.json();
  },
  
  deletePoll: async (meetingId, pollId) => {
    await safeFetch(`${getApiBase()}/api/meetings/${meetingId}/polls/${pollId}`, {
      method: 'DELETE'
    });
  },

  submitAnswer: async (meetingId, pollId, userId, optionId) => {
    const res = await safeFetch(`${getApiBase()}/api/meetings/${meetingId}/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ userId, optionId })
    });
    return res.json();
  },

  // ─── Reports APIs ───
  getReports: async () => {
    const res = await safeFetch(`${getApiBase()}/api/reports`);
    return res.json();
  },
  
  saveReport: async (report) => {
    const res = await safeFetch(`${getApiBase()}/api/reports`, {
      method: 'POST',
      body: JSON.stringify(report)
    });
    return res.json();
  },
  
  deleteReport: async (id) => {
    await safeFetch(`${getApiBase()}/api/reports/${id}`, {
      method: 'DELETE'
    });
  },
  
  // Gemini AI Report Generation API
  generateReport: async (meetingId, options = {}) => {
    const res = await safeFetch(`${getApiBase()}/api/meetings/${meetingId}/generate-report`, {
      method: 'POST',
      ...options
    });
    return res.json();
  },

  // ─── Notification Config APIs ───
  getNotifConfig: async () => {
    const res = await safeFetch(`${getApiBase()}/api/notif-config`);
    return res.json();
  },
  
  saveNotifConfig: async (config) => {
    const res = await safeFetch(`${getApiBase()}/api/notif-config`, {
      method: 'POST',
      body: JSON.stringify(config)
    });
    return res.json();
  },

  // ─── Dashboard API ───
  getDashboard: async () => {
    const res = await safeFetch(`${getApiBase()}/api/dashboard`);
    return res.json();
  },

  // Test Server Connection
  testConnection: async (customUrl) => {
    const target = (customUrl || getApiBase()).replace(/\/+$/, '');
    try {
      const res = await fetch(`${target}/api/health`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        return { success: true, message: `Kết nối thành công đến Backend Server Vercel! (${data.service || 'Smeet Backend'})` };
      }
      return { success: false, message: `Server phản hồi mã lỗi HTTP ${res.status}` };
    } catch (err) {
      return { success: false, message: `Không thể kết nối đến ${target}. Vui lòng kiểm tra lại URL Vercel.` };
    }
  },

  // ─── Session / Logged In User ───
  // Session hết hạn sau 3 ngày (tính từ lần đăng nhập gần nhất)
  SESSION_EXPIRY_MS: 3 * 24 * 60 * 60 * 1000, // 3 ngày = 259200000ms

  getLoggedInUser: async () => {
    try {
      const userJson = window.localStorage.getItem('zmp_logged_in_user');
      if (!userJson) return null;
      const saved = JSON.parse(userJson);
      // Kiểm tra session đã hết hạn chưa
      if (saved && saved._loginAt) {
        const elapsed = Date.now() - saved._loginAt;
        if (elapsed > Storage.SESSION_EXPIRY_MS) {
          window.localStorage.removeItem('zmp_logged_in_user');
          console.info('[Session] Phương pháp bảo vệ: Session đã hết hạn sau 3 ngày. Yêu cầu đăng nhập lại.');
          return null;
        }
      }
      return saved;
    } catch {
      return null;
    }
  },
  
  setLoggedInUser: async (user) => {
    if (user) {
      // Lưu kèm timestamp đăng nhập để kiểm tra hết hạn session
      const sessionData = { ...user, _loginAt: user._loginAt || Date.now() };
      window.localStorage.setItem('zmp_logged_in_user', JSON.stringify(sessionData));
    } else {
      window.localStorage.removeItem('zmp_logged_in_user');
    }
  },
  
  clearLoggedInUser: async () => {
    window.localStorage.removeItem('zmp_logged_in_user');
  }
};
