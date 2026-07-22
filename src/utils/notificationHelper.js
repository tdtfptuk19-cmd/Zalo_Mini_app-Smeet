/**
 * notificationHelper.js - Quản lý Trình Thông Báo Hệ Thống (Web Notification API & Audio API)
 * Hoạt động thống nhất trên cả Điện thoại và Máy tính (nội dung đồng bộ 100%).
 * Gửi thông báo khi TẠO cuộc họp & SẮP TỚI cuộc họp (cho cả họp lên lịch và họp nhanh).
 */

// 1. Kiểm tra môi trường có hỗ trợ Notification API không
export function isNotificationSupported() {
  try {
    return typeof window !== 'undefined' && 
           'Notification' in window && 
           typeof window.Notification !== 'undefined' && 
           window.Notification !== null;
  } catch {
    return false;
  }
}

// 2. Lấy trạng thái cấp quyền hiện tại
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    return window.Notification.permission || 'unsupported';
  } catch {
    return 'unsupported';
  }
}

// 3. Âm thanh chuông báo (Web Audio API)
export function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5 note
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (err) {
    // Ignore audio autoplay restrictions
  }
}

// 4. Xin quyền từ người dùng
export async function requestNotificationPermission(silent = false) {
  if (!isNotificationSupported()) {
    if (!silent) {
      alert('Trình duyệt hoặc thiết bị này không hỗ trợ Thông Báo Nổi HTML5. Ứng dụng sẽ tự động dùng thông báo trong app!');
    }
    return false;
  }

  try {
    if (typeof window.Notification.requestPermission !== 'function') {
      return false;
    }
    const permission = await window.Notification.requestPermission();
    if (permission === 'granted') {
      // Gửi thông báo chào mừng chuẩn
      sendNativeNotification('🔔 Đã Bật Thông Báo Smeet!', {
        body: 'Bạn sẽ nhận được thông báo nhắc họp tức thì mỗi khi có cuộc họp mới hoặc sắp diễn ra.',
        tag: 'smeet-welcome'
      });
      return true;
    } else if (permission === 'denied') {
      if (!silent) {
        alert('Bạn đã từ chối quyền thông báo. Hãy bật lại trong cài đặt trình duyệt/ứng dụng.');
      }
      return false;
    }
    return false;
  } catch (err) {
    console.error('Lỗi khi xin quyền thông báo:', err);
    return false;
  }
}

// 5. Hàm phát thông báo nổi hệ thống (Native Floating Notification)
export function sendNativeNotification(title, options = {}) {
  playNotificationSound();

  if (!isNotificationSupported() || getNotificationPermission() !== 'granted') {
    return null;
  }

  const defaultOptions = {
    icon: '/assets/logo.png',
    badge: '/assets/logo.png',
    vibrate: [200, 100, 200, 100, 300], // Rung điện thoại
    requireInteraction: true,  // Cố định đến khi bấm vào
    timestamp: Date.now(),
    ...options
  };

  try {
    const notif = new window.Notification(title, defaultOptions);
    
    // Khi người dùng bấm vào thông báo nổi → Mở tab/app Smeet
    notif.onclick = function(event) {
      event.preventDefault();
      window.focus();
      if (options.url) {
        window.location.href = options.url;
      }
      notif.close();
    };

    return notif;
  } catch (err) {
    console.warn('Gửi thông báo qua ServiceWorker fallback...', err);
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, defaultOptions);
      }).catch(() => {});
    }
  }
}

// 6. Gửi thông báo NGAY KHI TẠO CUỘC HỌP (Đồng bộ nội dung trên mọi thiết bị)
export function sendMeetingCreatedNotification(meeting, isQuick = false) {
  if (!meeting) return;
  const startDateTime = new Date(meeting.startTime);
  const startTimeStr = startDateTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = startDateTime.toLocaleDateString('vi-VN');
  
  const title = isQuick
    ? `⚡ [HỌP NHANH] Đã khởi tạo: ${meeting.title}`
    : `📅 [ĐẶT LỊCH HỌP] Đã tạo: ${meeting.title}`;

  const locationInfo = meeting.locationDetail 
    ? (meeting.locationDetail.startsWith('http') ? 'Google Meet Online' : meeting.locationDetail)
    : 'Chưa có địa điểm';

  const body = isQuick
    ? `Cuộc họp bắt đầu lúc ${startTimeStr}. Nhấn để vào phòng họp ngay!`
    : `Bắt đầu lúc ${startTimeStr} - ngày ${dateStr}. Địa điểm: ${locationInfo}`;

  sendNativeNotification(title, {
    body,
    tag: `meeting-created-${meeting.id}`,
    url: meeting.locationDetail && meeting.locationDetail.startsWith('http') ? meeting.locationDetail : window.location.origin
  });
}

// 7. Scheduled Checker: Tự động kiểm tra và phát thông báo nổi cho cuộc họp sắp tới (Nội dung thống nhất)
const TRIGGERED_NOTIFS = new Set();

export function checkAndSendMeetingNotifications(meetings) {
  if (!meetings || !Array.isArray(meetings)) return;

  const now = new Date().getTime();

  meetings.forEach(meeting => {
    if (meeting.status === 'canceled' || meeting.status === 'completed') return;

    const startTime = new Date(meeting.startTime).getTime();
    const diffMinutes = (startTime - now) / (1000 * 60);
    const startTimeStr = new Date(meeting.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    // Mốc 1: Nhắc trước 24 giờ (từ 23h50m đến 24h10m)
    const key24h = `${meeting.id}-24h`;
    if (diffMinutes >= 1430 && diffMinutes <= 1450 && !TRIGGERED_NOTIFS.has(key24h)) {
      TRIGGERED_NOTIFS.add(key24h);
      sendNativeNotification(`📅 [NHẮC HỌP 24H]: ${meeting.title}`, {
        body: `Cuộc họp sẽ diễn ra vào ngày mai lúc ${startTimeStr}. Mở Smeet để chuẩn bị!`,
        tag: key24h,
        url: window.location.origin
      });
    }

    // Mốc 2: Nhắc trước 30 phút (từ 25m đến 35m)
    const key30m = `${meeting.id}-30m`;
    if (diffMinutes >= 25 && diffMinutes <= 35 && !TRIGGERED_NOTIFS.has(key30m)) {
      TRIGGERED_NOTIFS.add(key30m);
      sendNativeNotification(`🔔 [SẮP HỌP 30 PHÚT]: ${meeting.title}`, {
        body: `Cuộc họp sẽ bắt đầu lúc ${startTimeStr}. Nhấn để mở phòng họp!`,
        tag: key30m,
        url: meeting.locationDetail && meeting.locationDetail.startsWith('http') ? meeting.locationDetail : window.location.origin
      });
    }

    // Mốc 3: Nhắc trước 5 phút (từ 3m đến 7m)
    const key5m = `${meeting.id}-5m`;
    if (diffMinutes >= 3 && diffMinutes <= 7 && !TRIGGERED_NOTIFS.has(key5m)) {
      TRIGGERED_NOTIFS.add(key5m);
      sendNativeNotification(`⚡ [SẮP HỌP 5 PHÚT]: ${meeting.title}`, {
        body: `Chỉ còn 5 phút nữa! Chuẩn bị tham gia lúc ${startTimeStr}.`,
        tag: key5m,
        url: meeting.locationDetail && meeting.locationDetail.startsWith('http') ? meeting.locationDetail : window.location.origin
      });
    }

    // Mốc 4: ĐÚNG THỜI ĐIỂM BẮT ĐẦU (từ -3m đến 2m)
    const keyNow = `${meeting.id}-now`;
    if (diffMinutes >= -3 && diffMinutes <= 2 && !TRIGGERED_NOTIFS.has(keyNow)) {
      TRIGGERED_NOTIFS.add(keyNow);
      sendNativeNotification(`🚀 [HỌP NGAY]: ${meeting.title}`, {
        body: `Cuộc họp đang diễn ra! Nhấn vào đây để tham gia ngay lập tức.`,
        tag: keyNow,
        url: meeting.locationDetail && meeting.locationDetail.startsWith('http') ? meeting.locationDetail : window.location.origin
      });
    }
  });
}
