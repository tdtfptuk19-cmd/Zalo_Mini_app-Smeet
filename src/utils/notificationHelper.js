/**
 * notificationHelper.js - Quản lý Trình Thông Báo Nổi Hệ Thống (Web Notification API)
 * Hoạt động trên cả Điện thoại (Android / iOS 16.4+) và Máy tính (Windows / Mac).
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

// 3. Xin quyền từ người dùng
export async function requestNotificationPermission(silent = false) {
  if (!isNotificationSupported()) {
    if (!silent) {
      alert('Trình duyệt hoặc thiết bị này (WebView Zalo) không hỗ trợ Thông Báo Nổi HTML5. Ứng dụng sẽ tự động chuyển sang sử dụng thông báo mô phỏng trong ứng dụng!');
    }
    return false;
  }

  try {
    if (typeof window.Notification.requestPermission !== 'function') {
      return false;
    }
    const permission = await window.Notification.requestPermission();
    if (permission === 'granted') {
      // Gửi thông báo thử nghiệm
      sendNativeNotification('🔔 Đã Bật Thông Báo Nổi Smeet!', {
        body: 'Bạn sẽ nhận được thông báo nổi trên điện thoại và máy tính trước khi cuộc họp diễn ra.',
        tag: 'smeet-welcome'
      });
      return true;
    } else if (permission === 'denied') {
      if (!silent) {
        alert('Bạn đã từ chối quyền thông báo. Hãy bật lại trong Cài đặt Trình duyệt/Ứng dụng.');
      }
      return false;
    }
    return false;
  } catch (err) {
    console.error('Lỗi khi xin quyền thông báo:', err);
    return false;
  }
}

// 4. Hàm phát thông báo nổi hệ thống (Native Floating Notification)
export function sendNativeNotification(title, options = {}) {
  if (!isNotificationSupported() || getNotificationPermission() !== 'granted') {
    return null;
  }

  const defaultOptions = {
    icon: '/assets/logo.png',
    badge: '/assets/logo.png',
    vibrate: [200, 100, 200], // Rung điện thoại
    requireInteraction: true,  // Cố định đến khi bấm vào
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

// 5. Scheduled Checker: Tự động kiểm tra và phát thông báo nổi cho cuộc họp sắp tới
const TRIGGERED_NOTIFS = new Set();

export function checkAndSendMeetingNotifications(meetings) {
  if (!meetings || !Array.isArray(meetings) || getNotificationPermission() !== 'granted') return;

  const now = new Date().getTime();

  meetings.forEach(meeting => {
    if (meeting.status === 'canceled') return;

    const startTime = new Date(meeting.startTime).getTime();
    const diffMinutes = (startTime - now) / (1000 * 60);

    // Mốc 1: Trước 24 giờ (từ 23h50m đến 24h10m)
    const key24h = `${meeting.id}-24h`;
    if (diffMinutes >= 1430 && diffMinutes <= 1450 && !TRIGGERED_NOTIFS.has(key24h)) {
      TRIGGERED_NOTIFS.add(key24h);
      sendNativeNotification(`📅 NHẮC HỌP (Ngày Mai): ${meeting.title}`, {
        body: `Bắt đầu lúc ${new Date(meeting.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}. Mở Smeet để chuẩn bị!`,
        tag: key24h,
        url: window.location.origin
      });
    }

    // Mốc 2: Trước 30 phút (từ 25m đến 35m)
    const key30m = `${meeting.id}-30m`;
    if (diffMinutes >= 25 && diffMinutes <= 35 && !TRIGGERED_NOTIFS.has(key30m)) {
      TRIGGERED_NOTIFS.add(key30m);
      sendNativeNotification(`🔔 SẮP HỌP (30 phút nữa): ${meeting.title}`, {
        body: `Bắt đầu lúc ${new Date(meeting.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}. Nhấn để vào họp ngay!`,
        tag: key30m,
        url: meeting.locationDetail && meeting.locationDetail.startsWith('http') ? meeting.locationDetail : window.location.origin
      });
    }
  });
}
