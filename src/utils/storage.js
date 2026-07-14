// Storage Client Adapter to communicate with the Node.js Backend Server



// Dynamic API Base URL detection
const getApiBase = () => {
  if (typeof window === 'undefined') return '';
  
  const hostname = window.location.hostname;
  
  // If running locally in browser or simulator (localhost / 127.0.0.1)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return ''; // Uses relative URL via Vite development proxy
  }
  
  // If running on a real mobile device scanning QR code, 
  // localhost won't work. We need the developer's computer IP or public URL.
  // We can let them define it via environment variable or default.
  // We read Vite's environment variable VITE_API_URL if set.
  if (import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Fallback default (replace this with your computer's IP address if testing on a real phone, e.g. 'http://192.168.1.5:5000')
  return 'http://localhost:5000';
};

const API_BASE = getApiBase();

// Safe Fetch Wrapper to handle connection errors and empty/malformed responses
const safeFetch = async (url, options = {}) => {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      let errMsg = `Server returned status ${res.status}`;
      try {
        const errData = await res.json();
        errMsg = errData.error || errData.message || errMsg;
      } catch {}
      throw new Error(errMsg);
    }
    return res;
  } catch (e) {
    // If it's already a formatted error, rethrow it
    if (e.message && (e.message.includes('Trùng lịch') || e.message.includes('Không có ghi chú'))) {
      throw e;
    }
    console.error("Network error calling API:", e);
    throw new Error("Không thể kết nối với Backend Server. Hãy chắc chắn rằng bạn đã khởi động backend bằng lệnh 'node server/server.js' ở cửa sổ terminal thứ hai!");
  }
};

export const Storage = {
  // Users APIs
  getUsers: async () => {
    const res = await safeFetch(`${API_BASE}/api/users`);
    return res.json();
  },
  
  saveUser: async (user) => {
    const res = await safeFetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    return res.json();
  },
  
  deleteUser: async (id) => {
    await safeFetch(`${API_BASE}/api/users/${id}`, {
      method: 'DELETE'
    });
  },

  // Authentication via Zalo
  authenticateZalo: async (zaloUserInfo) => {
    const res = await safeFetch(`${API_BASE}/api/auth/zalo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(zaloUserInfo)
    });
    return res.json();
  },

  // Meetings APIs
  getMeetings: async () => {
    const res = await safeFetch(`${API_BASE}/api/meetings`);
    return res.json();
  },
  
  saveMeeting: async (meeting) => {
    const res = await safeFetch(`${API_BASE}/api/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meeting)
    });
    return res.json();
  },
  
  deleteMeeting: async (id) => {
    await safeFetch(`${API_BASE}/api/meetings/${id}`, {
      method: 'DELETE'
    });
  },
  
  checkConflict: async (meeting) => {
    // Check overlap locally using the fetched meetings from server
    try {
      const meetings = await Storage.getMeetings();
      const newStart = new Date(meeting.startTime).getTime();
      const newEnd = new Date(meeting.endTime).getTime();

      return meetings.find(m => {
        if (meeting.id && m.id === meeting.id) return false;
        if (m.status === 'canceled') return false; // Ignore canceled meetings
        const mStart = new Date(m.startTime).getTime();
        const mEnd = new Date(m.endTime).getTime();
        return (newStart < mEnd && newEnd > mStart);
      });
    } catch {
      return null;
    }
  },

  // Notes APIs
  getNotes: async (meetingId) => {
    const res = await safeFetch(`${API_BASE}/api/meetings/${meetingId}/notes`);
    return res.json();
  },
  
  saveNote: async (meetingId, userId, content) => {
    await safeFetch(`${API_BASE}/api/meetings/${meetingId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, content })
    });
  },

  // Polls APIs
  getPolls: async (meetingId) => {
    const res = await safeFetch(`${API_BASE}/api/meetings/${meetingId}/polls`);
    return res.json();
  },
  
  savePoll: async (poll) => {
    const res = await safeFetch(`${API_BASE}/api/meetings/${poll.meetingId}/polls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(poll)
    });
    return res.json();
  },
  
  submitAnswer: async (pollId, userId, optionId) => {
    const res = await safeFetch(`${API_BASE}/api/meetings/any/polls/${pollId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, optionId })
    });
    return res.json();
  },

  // Reports APIs
  getReports: async () => {
    const res = await safeFetch(`${API_BASE}/api/reports`);
    return res.json();
  },
  
  saveReport: async (report) => {
    const res = await safeFetch(`${API_BASE}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report)
    });
    return res.json();
  },
  
  // Gemini AI Report Generation API
  generateReport: async (meetingId, options = {}) => {
    const res = await safeFetch(`${API_BASE}/api/meetings/${meetingId}/generate-report`, {
      method: 'POST',
      ...options
    });
    return res.json();
  },

  // Notification Config APIs
  getNotifConfig: async () => {
    const res = await safeFetch(`${API_BASE}/api/notif-config`);
    return res.json();
  },
  
  saveNotifConfig: async (config) => {
    const res = await safeFetch(`${API_BASE}/api/notif-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.json();
  },

  // Session / Logged In User APIs (kept local to browser/webview)
  getLoggedInUser: async () => {
    const userJson = window.localStorage.getItem('zmp_logged_in_user');
    return userJson ? JSON.parse(userJson) : null;
  },
  
  setLoggedInUser: async (user) => {
    if (user) {
      window.localStorage.setItem('zmp_logged_in_user', JSON.stringify(user));
    } else {
      window.localStorage.removeItem('zmp_logged_in_user');
    }
  },
  
  clearLoggedInUser: async () => {
    window.localStorage.removeItem('zmp_logged_in_user');
  }
};
