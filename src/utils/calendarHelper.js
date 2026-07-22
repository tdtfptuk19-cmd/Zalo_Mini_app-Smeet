/**
 * calendarHelper.js - Tiện ích tích hợp Lịch điện thoại (Google Calendar & Apple / Native ICS Calendar)
 * Giúp người dùng thêm cuộc họp vào Lịch thiết bị 1-click với 2 mốc nhắc nhở tự động (24h trước & 30 phút trước).
 */

/**
 * ĐỊnh dạng URL hợp lệ (tự động thêm https:// nếu thiếu)
 */
export function formatExternalUrl(url) {
  if (!url) return '';
  let trimmed = url.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Mở URL trên trình duyệt / Zalo Mini App WebView an toàn
 */
export function openExternalUrl(url) {
  if (!url) return;
  const formatted = formatExternalUrl(url);
  try {
    if (window.zmp && typeof window.zmp.openWebview === 'function') {
      window.zmp.openWebview({ url: formatted });
      return;
    }
  } catch {}

  window.open(formatted, '_blank', 'noopener,noreferrer');
}

/**
 * ĐỊnh dạng ISO 8601 UTC dạng YYYYMMDDTHHMMSSZ cho Google Calendar & ICS
 */
function formatDateToUTCString(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().replace(/-|:|\.\d+/g, '');
}

/**
 * 1. Tạo URL Google Calendar trực tiếp
 */
export function generateGoogleCalendarUrl(meeting) {
  if (!meeting) return '#';
  
  const startStr = formatDateToUTCString(meeting.startTime);
  const endStr = formatDateToUTCString(meeting.endTime);
  
  const title = encodeURIComponent(`[Smeet] ${meeting.title}`);
  
  const locationText = meeting.locationType === 'online'
    ? (meeting.locationDetail || 'Online Google Meet')
    : (meeting.locationDetail || 'Phòng họp trực tiếp');
  const location = encodeURIComponent(locationText);
  
  const detailsText = [
    `📋 Cuộc họp: ${meeting.title}`,
    `👤 Chủ trì: ${meeting.hostName || 'Smeet'}`,
    meeting.locationDetail ? `🔗 Link/Địa điểm: ${meeting.locationDetail}` : '',
    meeting.preparationContent ? `📝 Chuẩn bị: ${meeting.preparationContent}` : '',
    `\n---\nTạo tự động từ ứng dụng Smeet`
  ].filter(Boolean).join('\n');
  
  const details = encodeURIComponent(detailsText);

  // Google Calendar URL template
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
}

/**
 * 2. Tạo và tải file .ics (iCalendar) cho Apple Calendar (iPhone/Mac) / Android / Outlook
 * Chứa sẵn 2 mốc nhắc nhở (VALARM): 24h trước (1 ngày) và 30 phút trước.
 */
export function downloadIcsFile(meeting) {
  if (!meeting) return;

  const startUTC = formatDateToUTCString(meeting.startTime);
  const endUTC = formatDateToUTCString(meeting.endTime);
  const nowUTC = formatDateToUTCString(new Date().toISOString());

  const locationText = meeting.locationType === 'online'
    ? (meeting.locationDetail || 'Online Google Meet')
    : (meeting.locationDetail || 'Phòng họp trực tiếp');

  const description = [
    `Cuộc họp: ${meeting.title}`,
    `Chủ trì: ${meeting.hostName || 'Smeet'}`,
    meeting.locationDetail ? `Link/Địa điểm: ${meeting.locationDetail}` : '',
    meeting.preparationContent ? `Nội dung chuẩn bị: ${meeting.preparationContent}` : ''
  ].filter(Boolean).join('\\n');

  // Định dạng file .ics chứa 2 VALARM nhắc nhở (1D = 24 giờ, 30M = 30 phút)
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Smeet//Group Meeting Reminders//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:smeet-${meeting.id || Date.now()}@smeet.app`,
    `DTSTAMP:${nowUTC}`,
    `DTSTART:${startUTC}`,
    `DTEND:${endUTC}`,
    `SUMMARY:[Smeet] ${meeting.title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${locationText}`,
    'STATUS:CONFIRMED',
    // --- Alarm 1: 24 giờ trước (1 ngày) ---
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:Nhắc họp: ${meeting.title} vào ngày mai!`,
    'END:VALARM',
    // --- Alarm 2: 30 phút trước ---
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Sắp diễn ra cuộc họp: ${meeting.title} trong 30 phút nữa!`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  // Trigger download / open
  const a = document.createElement('a');
  a.href = url;
  a.download = `smeet-hop-${(meeting.title || 'cuoc-hop').replace(/\s+/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
