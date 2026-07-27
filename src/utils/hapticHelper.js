/**
 * Haptic Feedback Helper (Rung phản hồi haptic chuẩn Mobile Native App)
 */

export const triggerHaptic = (type = 'light') => {
  if (typeof window === 'undefined' || !navigator.vibrate) return;

  try {
    switch (type) {
      case 'light':
        // Rung nhẹ khi chạm nút hoặc chuyển tab
        navigator.vibrate(12);
        break;
      case 'medium':
        // Rung vừa khi xác nhận hành động
        navigator.vibrate(25);
        break;
      case 'heavy':
        // Rung mạnh khi tạo cuộc họp / lưu dữ liệu
        navigator.vibrate(40);
        break;
      case 'success':
        // Nhịp rung báo thành công [rung nhẹ, nghỉ, rung mượt]
        navigator.vibrate([10, 30, 18]);
        break;
      case 'error':
        // Nhịp rung báo lỗi [rung dồn dập]
        navigator.vibrate([40, 40, 40]);
        break;
      default:
        navigator.vibrate(12);
    }
  } catch (err) {
    // Silently ignore if device/browser disables vibration
  }
};
