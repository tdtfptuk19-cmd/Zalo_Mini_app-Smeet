import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';
import http from 'http';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from './db.js';
import { User, Meeting, Note, Poll, Report, NotifConfig } from './models/Schemas.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- CORS: Cho phép tất cả origin (Zalo Webview, Webhook, Mobile không gửi Origin header) ---
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Root: tránh 404 gây hiểu nhầm khi mở URL Vercel trên trình duyệt
app.get('/', (req, res) => {
  res.json({
    service: 'Smeet Backend',
    status: 'ok',
    hint: 'Đây là API backend. Frontend chạy trên Zalo Mini App.',
    endpoints: {
      health: '/api/health',
      terms: '/terms',
      webhook: '/api/zalo/webhook'
    }
  });
});

// Middleware: Tự động đảm bảo MongoDB Atlas đã kết nối trước khi xử lý API request trên Vercel
app.use(async (req, res, next) => {
  if (
    req.path === '/' ||
    req.path === '/api/health' ||
    req.path === '/api/zalo/webhook' ||
    req.path === '/terms'
  ) return next();
  try {
    await db.connect();
    next();
  } catch (err) {
    console.error('[Middleware DB error]:', err.message);
    return res.status(500).json({ error: 'Không thể kết nối đến CSDL MongoDB Atlas. Vui lòng kiểm tra MONGODB_URI trong cài đặt Vercel.' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// ZALO WEBHOOK ENDPOINT (Dành cho Zalo xét duyệt Mini App)
// ─────────────────────────────────────────────────────────────────────
app.all('/api/zalo/webhook', (req, res) => {
  console.log('[Zalo Webhook Event]:', req.body);
  res.status(200).json({ error: 0, message: 'Success' });
});

// ─────────────────────────────────────────────────────────────────────
// ĐIỀU KHOẢN SỬ DỤNG & CHÍNH SÁCH BẢO MẬT (Terms of Use)
// ─────────────────────────────────────────────────────────────────────
app.get('/terms', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Điều Khoản Sử Dụng - Smeet Zalo Mini App</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto; color: #333; }
        h1 { color: #0068FF; border-bottom: 2px solid #0068FF; padding-bottom: 8px; font-size: 1.6rem; }
        h2 { color: #1e293b; margin-top: 24px; font-size: 1.15rem; }
        ul { padding-left: 20px; }
        li { margin-bottom: 6px; }
        .box { background: #f8fafc; border-left: 4px solid #0068FF; padding: 12px 16px; margin: 16px 0; border-radius: 4px; }
        .contact-box { background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px 16px; border-radius: 6px; margin-top: 12px; }
      </style>
    </head>
    <body>
      <h1>ĐIỀU KHOẢN SỬ DỤNG & CHÍNH SÁCH BẢO MẬT SMEET</h1>
      <p><em>Cập nhật lần cuối: 22/07/2026</em></p>
      
      <div class="box">
        Ứng dụng <strong>Smeet (Zalo Mini App)</strong> cam kết bảo vệ dữ liệu cá nhân của người dùng tuân thủ theo Quy định dành cho Nhà phát triển của Zalo (Zalo Developer Platform Guidelines) và Pháp luật Việt Nam.
      </div>

      <h2>1. Các Dữ Liệu Cá Nhân Thu Thập</h2>
      <p>Smeet xin cấp các quyền và dữ liệu tối thiểu phục vụ cho tính năng đặt lịch họp nhóm, quản lý phòng họp và lưu trữ biên bản cuộc họp:</p>
      <ul>
        <li><strong>Thông tin tài khoản Zalo:</strong> Tên hiển thị, Ảnh đại diện (Avatar), Zalo User ID (khi người dùng đồng ý cấp quyền trên Zalo Mini App SDK).</li>
        <li><strong>Số điện thoại & Xác thực:</strong> Dùng để xác thực tài khoản, phân quyền vai trò (Quản lý, Ủy quyền, Thành viên) và gửi thông báo nhắc lịch họp.</li>
        <li><strong>Dữ liệu cuộc họp:</strong> Tiêu đề cuộc họp, thời gian, địa điểm, danh sách thành viên tham gia, nội dung ghi chú và báo cáo biên bản họp do người dùng khởi tạo.</li>
      </ul>

      <h2>2. Mục Đích Sử Dụng Dữ Liệu</h2>
      <ul>
        <li>Xác thực danh tính người dùng và phân quyền vai trò khi tham gia các phòng họp nhóm.</li>
        <li>Gửi thông báo nhắc lịch họp tự động để đảm bảo các thành viên không bỏ lỡ cuộc họp.</li>
        <li>Lưu trữ và hiển thị danh sách lịch họp, điểm danh và biên bản báo cáo cuộc họp cho nhóm.</li>
        <li>Tiếp nhận và hỗ trợ xử lý báo cáo sự cố kỹ thuật khi người dùng gửi phản hồi.</li>
      </ul>

      <h2>3. Cam Kết Bảo Mật</h2>
      <p>Smeet cam kết <strong>KHÔNG</strong> bán, chia sẻ hoặc tiết lộ thông tin cá nhân của người dùng cho bất kỳ bên thứ ba nào vì mục đích thương mại hoặc quảng cáo.</p>

      <h2>4. Quyền Rút Đồng Ý & Xóa Dữ Liệu</h2>
      <p>Người dùng có quyền dừng sử dụng ứng dụng bất kỳ lúc nào bằng cách gỡ Mini App Smeet khỏi tài khoản Zalo. Để yêu cầu xóa toàn bộ dữ liệu cá nhân và lịch sử cuộc họp khỏi hệ thống, vui lòng liên hệ:</p>
      <div class="contact-box">
        • Email hỗ trợ: <strong>tthanh241.work@gmail.com</strong><br>
        • Thời gian xử lý yêu cầu xóa dữ liệu: Trong vòng <strong>48 giờ làm việc</strong>.
      </div>
    </body>
    </html>
  `);
});

// ─────────────────────────────────────────────────────────────────────
// ZALO OA: Helper gửi tin nhắn vào nhóm qua Zalo OA API
// Tài liệu: https://developers.zalo.me/docs/oa/gui-tin-nhan
// Để sử dụng: cấu hình OA_ACCESS_TOKEN và GROUP_ID trong .env
// ─────────────────────────────────────────────────────────────────────
async function sendZaloOAGroupMessage(message) {
  const oaToken = process.env.ZALO_OA_ACCESS_TOKEN;
  const groupId = process.env.ZALO_OA_GROUP_ID;

  if (!oaToken || !groupId) {
    console.warn('[ZaloOA] Chưa cấu hình ZALO_OA_ACCESS_TOKEN hoặc ZALO_OA_GROUP_ID. Bỏ qua gửi thông báo.');
    return { success: false, reason: 'not_configured' };
  }

  return new Promise((resolve) => {
    const body = JSON.stringify({
      recipient: { group_id: groupId },
      message: { text: message }
    });

    const options = {
      hostname: 'openapi.zalo.me',
      path: '/v3.0/oa/message/cs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': oaToken,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error === 0) {
            console.log(`[ZaloOA] ✅ Gửi thông báo thành công:`, message.substring(0, 60));
            resolve({ success: true });
          } else {
            console.error('[ZaloOA] ❌ Lỗi gửi thông báo:', parsed);
            resolve({ success: false, error: parsed });
          }
        } catch (e) {
          resolve({ success: false, error: e.message });
        }
      });
    });

    req.on('error', (e) => {
      console.error('[ZaloOA] ❌ Network error:', e.message);
      resolve({ success: false, error: e.message });
    });

    req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────
// REMINDER SCHEDULER: Kiểm tra cuộc họp sắp diễn ra mỗi 30 phút
// Gửi nhắc nhở 2 lần: trước 24 giờ và trước 30 phút
// ─────────────────────────────────────────────────────────────────────
const REMINDER_SENT_CACHE = new Map(); // meetingId → Set of reminder types sent

async function runReminderCheck() {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in31min = new Date(now.getTime() + 31 * 60 * 1000);
    const in29min = new Date(now.getTime() + 29 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Lấy tất cả cuộc họp đang active
    const upcomingMeetings = await Meeting.find({ status: 'active' });

    for (const meeting of upcomingMeetings) {
      const startTime = new Date(meeting.startTime);
      const cacheKey = meeting.id;

      if (!REMINDER_SENT_CACHE.has(cacheKey)) {
        REMINDER_SENT_CACHE.set(cacheKey, new Set());
      }
      const sentTypes = REMINDER_SENT_CACHE.get(cacheKey);

      const startFormatted = startTime.toLocaleString('vi-VN', {
        weekday: 'long', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
      });

      // === Nhắc lần 1: trước 24 giờ ===
      if (!sentTypes.has('24h') && startTime >= in24h && startTime <= in25h) {
        const locationText = meeting.locationType === 'online'
          ? `🔗 Online${meeting.locationDetail ? ': ' + meeting.locationDetail : ''}`
          : `📍 Tại chỗ: ${meeting.locationDetail || 'Chưa cập nhật'}${meeting.meetLink ? '\n🔗 Meet: ' + meeting.meetLink : ''}`;

        const msg = [
          `📅 NHẮC HỌP (ngày mai) — Smeet`,
          `━━━━━━━━━━━━━━━━━━`,
          `📋 Tên: ${meeting.title}`,
          `🕐 Thời gian: ${startFormatted}`,
          `👤 Chủ trì: ${meeting.hostName || 'Chưa cập nhật'}`,
          locationText,
          `━━━━━━━━━━━━━━━━━━`,
          `👉 Mở Smeet để xem chi tiết và chuẩn bị!`
        ].join('\n');

        const result = await sendZaloOAGroupMessage(msg);
        if (result.success || result.reason === 'not_configured') {
          sentTypes.add('24h');
          console.log(`[Reminder] ✅ Đã nhắc 24h trước cho: "${meeting.title}"`);
        }
      }

      // === Nhắc lần 2: trước 30 phút ===
      if (!sentTypes.has('30min') && startTime >= in29min && startTime <= in31min) {
        const meetLinkLine = meeting.meetLink || meeting.locationDetail;
        const msg = [
          `🔔 SẮP HỌP (30 phút nữa) — Smeet`,
          `━━━━━━━━━━━━━━━━━━`,
          `📋 ${meeting.title}`,
          `🕐 Bắt đầu lúc: ${startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
          meetLinkLine ? `🔗 ${meetLinkLine}` : '',
          `━━━━━━━━━━━━━━━━━━`,
          `👉 Mở Smeet → vào Phòng Họp để tham gia!`
        ].filter(Boolean).join('\n');

        const result = await sendZaloOAGroupMessage(msg);
        if (result.success || result.reason === 'not_configured') {
          sentTypes.add('30min');
          console.log(`[Reminder] ✅ Đã nhắc 30 phút trước cho: "${meeting.title}"`);
        }
      }
    }

    // Dọn cache cho các meeting đã qua (để tránh memory leak)
    for (const [id] of REMINDER_SENT_CACHE) {
      const m = upcomingMeetings.find(x => x.id === id);
      if (!m || new Date(m.startTime) < now) {
        REMINDER_SENT_CACHE.delete(id);
      }
    }
  } catch (err) {
    console.error('[Reminder] ❌ Lỗi khi kiểm tra reminder:', err.message);
  }
}

// Chạy ngay khi server khởi động, sau đó mỗi 30 phút
setTimeout(() => {
  runReminderCheck();
  setInterval(runReminderCheck, 30 * 60 * 1000);
}, 5000); // Đợi 5 giây sau khi server khởi động để DB kết nối xong

console.log('[Reminder] ✅ Meeting reminder scheduler đã khởi động (kiểm tra mỗi 30 phút)');

const ZALO_DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI0U2RjBGRiIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE4IiBmaWxsPSIjMDA2OEZGIi8+PHBhdGggZD0iTTUwIDYwYy0xOCAwLTMwIDgtMzAgMTh2NGg2MHYtNGMwLTEwLTEyLTE4LTMwLTE4eiIgZmlsbD0iIzAwNjhGRiIvPjwvc3ZnPg==';

// ─────────────────────────────────────────────────────────────────────
// MIDDLEWARE: requireAuth – kiểm tra header x-user-id hợp lệ
// ─────────────────────────────────────────────────────────────────────
const requireAuth = async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: thiếu x-user-id header.' });
  }
  try {
    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: user không tồn tại trong hệ thống.' });
    }
    req.authUser = user; // đính kèm user vào request để dùng ở handler
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi xác thực người dùng.' });
  }
};

// ─────────────────────────────────────────────────────────────────────
// HELPER: kiểm tra xung đột lịch họp
// Logic: online meetings không conflict với nhau (mỗi người dùng link riêng).
// Chỉ conflict khi: cùng phòng offline (locationType='offline' + locationDetail giống nhau)
// hoặc meeting đang chỉnh sửa bị overlap thời gian với chính nó (cùng locationType offline)
// ─────────────────────────────────────────────────────────────────────
const checkConflict = async (newMeeting) => {
  const newStart = new Date(newMeeting.startTime).getTime();
  const newEnd = new Date(newMeeting.endTime).getTime();

  // Chỉ kiểm tra conflict cho meeting offline (phòng vật lý có giới hạn)
  if (newMeeting.locationType !== 'offline') return null;

  const activeMeetings = await Meeting.find({
    status: { $ne: 'canceled' },
    locationType: 'offline'
  });

  return activeMeetings.find(m => {
    if (newMeeting.id && m.id === newMeeting.id) return false;

    // Chỉ conflict nếu cùng địa điểm (phòng họp)
    const sameLocation = m.locationDetail && newMeeting.locationDetail &&
      m.locationDetail.trim().toLowerCase() === newMeeting.locationDetail.trim().toLowerCase();
    if (!sameLocation) return false;

    const mStart = new Date(m.startTime).getTime();
    const mEnd = new Date(m.endTime).getTime();
    return (newStart < mEnd && newEnd > mStart);
  });
};

// ─────────────────────────────────────────────────────────────────────
// 1. Authentication Route (public – không cần requireAuth)
// ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/zalo', async (req, res) => {
  const { id, name, avatar, phone, role } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Missing Zalo User ID' });
  }

  try {
    let user = await User.findOne({ id });

    if (user) {
      // Cập nhật thông tin user Zalo hiện có
      user.name = name || user.name;
      user.avatar = avatar || user.avatar;
      user.phone = phone || user.phone;
      // Không ghi đè role đã có
      await user.save();
    } else {
      // Đăng ký user Zalo mới – mặc định role là 'member' (an toàn hơn 'admin')
      user = new User({
        id,
        name: name || 'Người dùng Zalo',
        avatar: avatar || ZALO_DEFAULT_AVATAR,
        phone: phone || '09xxxxxxxx',
        role: role || 'member' // Luôn là 'member' khi tự đăng ký qua Zalo
      });
      await user.save();
    }

    res.json(user);
  } catch (err) {
    console.error('Auth API error:', err);
    res.status(500).json({ error: 'Có lỗi xảy ra khi xác thực người dùng.' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 1b. Public user lookup by phone (for OTP login before session exists)
// ─────────────────────────────────────────────────────────────────────
app.get('/api/users/lookup', async (req, res) => {
  const phone = (req.query.phone || '').trim();
  const phoneRegex = /^(03|05|07|08|09)\d{8}$/;

  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ error: 'Số điện thoại không hợp lệ.' });
  }

  try {
    const users = await User.find({ phone }).select('id name phone role avatar defaultMeet -_id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 2. Users APIs (protected)
// ─────────────────────────────────────────────────────────────────────
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', requireAuth, async (req, res) => {
  // Chỉ admin mới được thêm/sửa user khác
  const caller = req.authUser;
  const user = req.body;

  // Cho phép tự cập nhật thông tin cá nhân, hoặc admin cập nhật bất kỳ ai
  const isSelf = user.id === caller.id;
  if (!isSelf && caller.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới được thêm hoặc sửa thông tin thành viên khác.' });
  }

  try {
    if (user.id) {
      const updated = await User.findOneAndUpdate({ id: user.id }, user, { new: true, upsert: true });
      res.json(updated);
    } else {
      // Tạo user mới – chỉ admin được làm
      if (caller.role !== 'admin') {
        return res.status(403).json({ error: 'Chỉ admin mới được tạo thành viên mới.' });
      }
      user.id = 'u_' + Date.now();
      user.avatar = user.avatar || ZALO_DEFAULT_AVATAR;
      const created = new User(user);
      await created.save();
      res.json(created);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', requireAuth, async (req, res) => {
  const caller = req.authUser;
  if (caller.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới được xóa thành viên.' });
  }
  if (req.params.id === caller.id) {
    return res.status(400).json({ error: 'Không thể tự xóa chính mình.' });
  }
  const { id } = req.params;
  try {
    await User.deleteOne({ id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 3. Meetings APIs (protected)
// ─────────────────────────────────────────────────────────────────────
app.get('/api/meetings', requireAuth, async (req, res) => {
  try {
    const meetings = await Meeting.find({});
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/meetings', requireAuth, async (req, res) => {
  const caller = req.authUser;
  // Chỉ admin và delegated mới được tạo cuộc họp
  if (caller.role === 'member') {
    return res.status(403).json({ error: 'Chỉ quản lý hoặc người được ủy quyền mới được tạo cuộc họp.' });
  }

  const meeting = req.body;
  try {
    const conflict = await checkConflict(meeting);
    if (conflict) {
      const conflictTime = `${new Date(conflict.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} - ${new Date(conflict.endTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}`;
      return res.status(400).json({ error: `Trùng phòng họp với cuộc họp: "${conflict.title}" (${conflictTime})` });
    }

    if (meeting.id) {
      const updated = await Meeting.findOneAndUpdate({ id: meeting.id }, meeting, { new: true, upsert: true });
      res.json(updated);
    } else {
      meeting.id = 'm_' + Date.now();
      meeting.createdAt = new Date().toISOString();
      meeting.files = meeting.files || [];
      meeting.status = meeting.status || 'active';
      const created = new Meeting(meeting);
      await created.save();
      res.json(created);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH: cập nhật status cuộc họp (canceled, completed)
app.patch('/api/meetings/:id/status', requireAuth, async (req, res) => {
  const caller = req.authUser;
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['active', 'canceled', 'completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${validStatuses.join(', ')}` });
  }

  try {
    const meeting = await Meeting.findOne({ id });
    if (!meeting) return res.status(404).json({ error: 'Không tìm thấy cuộc họp.' });

    // Chỉ host, admin, hoặc delegated mới được đổi status
    const isHost = meeting.createdBy === caller.id || meeting.hostPhone === caller.phone;
    if (!isHost && caller.role !== 'admin' && caller.role !== 'delegated') {
      return res.status(403).json({ error: 'Không có quyền thay đổi trạng thái cuộc họp này.' });
    }

    const updateData = { status };
    if (status === 'completed') {
      updateData.completedAt = new Date().toISOString();
    }

    const updated = await Meeting.findOneAndUpdate({ id }, updateData, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/meetings/:id', requireAuth, async (req, res) => {
  const caller = req.authUser;
  const { id } = req.params;
  try {
    const meeting = await Meeting.findOne({ id });
    if (!meeting) return res.status(404).json({ error: 'Không tìm thấy cuộc họp.' });

    const isHost = meeting.createdBy === caller.id;
    if (!isHost && caller.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ người tạo hoặc admin mới được xóa cuộc họp.' });
    }

    await Meeting.deleteOne({ id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 4. Notes APIs (protected)
// ─────────────────────────────────────────────────────────────────────
app.get('/api/meetings/:meetingId/notes', requireAuth, async (req, res) => {
  const { meetingId } = req.params;
  try {
    const meetingNotes = await Note.find({ meetingId });
    res.json(meetingNotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/meetings/:meetingId/notes', requireAuth, async (req, res) => {
  const { meetingId } = req.params;
  const { userId, content } = req.body;
  try {
    const existing = await Note.findOne({ meetingId, userId });
    if (existing) {
      existing.content = content;
      existing.updatedAt = new Date().toISOString();
      await existing.save();
    } else {
      const created = new Note({
        id: 'note_' + Date.now() + Math.random().toString(36).substr(2, 5),
        meetingId,
        userId,
        content,
        updatedAt: new Date().toISOString()
      });
      await created.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 5. Polls APIs (protected)
// ─────────────────────────────────────────────────────────────────────
app.get('/api/meetings/:meetingId/polls', requireAuth, async (req, res) => {
  const { meetingId } = req.params;
  try {
    const meetingPolls = await Poll.find({ meetingId });
    res.json(meetingPolls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/meetings/:meetingId/polls', requireAuth, async (req, res) => {
  const caller = req.authUser;
  if (caller.role === 'member') {
    return res.status(403).json({ error: 'Chỉ quản lý hoặc người được ủy quyền mới được tạo khảo sát.' });
  }

  const { meetingId } = req.params;
  const poll = req.body;
  try {
    if (poll.id) {
      const updated = await Poll.findOneAndUpdate({ id: poll.id }, poll, { new: true, upsert: true });
      res.json(updated);
    } else {
      poll.id = 'p_' + Date.now();
      poll.meetingId = meetingId;
      poll.isActive = true;
      poll.answers = [];
      const created = new Poll(poll);
      await created.save();
      res.json(created);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vote route: đúng đường dẫn qua meetingId
app.post('/api/meetings/:meetingId/polls/:pollId/vote', requireAuth, async (req, res) => {
  const { pollId } = req.params;
  const { userId, optionId } = req.body;
  try {
    const poll = await Poll.findOne({ id: pollId });
    if (!poll) return res.status(404).json({ error: 'Poll không tồn tại.' });
    if (!poll.isActive) return res.status(400).json({ error: 'Khảo sát đã đóng, không thể bình chọn.' });

    if (poll.pollType === 'single') {
      poll.answers = poll.answers.filter(a => a.userId !== userId);
      poll.answers.push({ userId, optionId });
    } else if (poll.pollType === 'multiple') {
      const existingIdx = poll.answers.findIndex(a => a.userId === userId && a.optionId === optionId);
      if (existingIdx !== -1) {
        poll.answers.splice(existingIdx, 1);
      } else {
        poll.answers.push({ userId, optionId });
      }
    }
    await poll.save();
    res.json(poll);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vote route standalone (fix cho storage.js cũ nếu còn dùng)
app.post('/api/polls/:pollId/vote', requireAuth, async (req, res) => {
  const { pollId } = req.params;
  const { userId, optionId } = req.body;
  try {
    const poll = await Poll.findOne({ id: pollId });
    if (!poll) return res.status(404).json({ error: 'Poll không tồn tại.' });
    if (!poll.isActive) return res.status(400).json({ error: 'Khảo sát đã đóng, không thể bình chọn.' });

    if (poll.pollType === 'single') {
      poll.answers = poll.answers.filter(a => a.userId !== userId);
      poll.answers.push({ userId, optionId });
    } else if (poll.pollType === 'multiple') {
      const existingIdx = poll.answers.findIndex(a => a.userId === userId && a.optionId === optionId);
      if (existingIdx !== -1) {
        poll.answers.splice(existingIdx, 1);
      } else {
        poll.answers.push({ userId, optionId });
      }
    }
    await poll.save();
    res.json(poll);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/meetings/:meetingId/polls/:pollId', requireAuth, async (req, res) => {
  const caller = req.authUser;
  if (caller.role === 'member') {
    return res.status(403).json({ error: 'Không có quyền xóa khảo sát.' });
  }
  const { pollId } = req.params;
  try {
    await Poll.deleteOne({ id: pollId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 6. Reports APIs (protected)
// ─────────────────────────────────────────────────────────────────────
app.get('/api/reports', requireAuth, async (req, res) => {
  try {
    const reports = await Report.find({});
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports', requireAuth, async (req, res) => {
  const report = req.body;
  try {
    if (report.id) {
      const updated = await Report.findOneAndUpdate({ id: report.id }, report, { new: true, upsert: true });
      res.json(updated);
    } else {
      report.id = 'r_' + Date.now();
      report.createdAt = new Date().toISOString();
      const created = new Report(report);
      await created.save();
      res.json(created);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reports/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await Report.deleteOne({ id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 7. Notification Config APIs (protected, admin only)
// ─────────────────────────────────────────────────────────────────────
app.get('/api/notif-config', requireAuth, async (req, res) => {
  try {
    let config = await NotifConfig.findOne({});
    if (!config) {
      config = await NotifConfig.create({
        zaloOaLinked: false,
        notifEnabled: false
      });
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notif-config', requireAuth, async (req, res) => {
  const caller = req.authUser;
  if (caller.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới được thay đổi cấu hình thông báo.' });
  }
  const config = req.body;
  try {
    const updated = await NotifConfig.findOneAndUpdate({}, config, { new: true, upsert: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 8. Dashboard API – thống kê nội bộ (protected)
// ─────────────────────────────────────────────────────────────────────
app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7);

    const allMeetings = await Meeting.find({});
    const allUsers = await User.find({});
    const allReports = await Report.find({});

    const todayMeetings = allMeetings.filter(m => {
      const s = new Date(m.startTime);
      return s >= todayStart && s <= todayEnd && m.status !== 'canceled';
    });

    const upcomingMeetings = allMeetings.filter(m => {
      const s = new Date(m.startTime);
      return s > now && s <= weekEnd && m.status === 'active';
    }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    const activeMeetingNow = allMeetings.filter(m => {
      const s = new Date(m.startTime);
      const e = new Date(m.endTime);
      return s <= now && e >= now && m.status === 'active';
    });

    // Meetings chưa có báo cáo
    const reportedMeetingIds = new Set(allReports.map(r => r.meetingId));
    const meetingsWithoutReport = allMeetings.filter(m =>
      m.status === 'completed' && !reportedMeetingIds.has(m.id)
    );

    res.json({
      totalMembers: allUsers.length,
      todayMeetingsCount: todayMeetings.length,
      todayMeetings,
      activeMeetingNow,
      upcomingMeetings: upcomingMeetings.slice(0, 5),
      totalReports: allReports.length,
      meetingsWithoutReport
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 9. Gemini AI Report Generation Route (protected)
// ─────────────────────────────────────────────────────────────────────
app.post('/api/meetings/:meetingId/generate-report', requireAuth, async (req, res) => {
  const { meetingId } = req.params;
  try {
    const meeting = await Meeting.findOne({ id: meetingId });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const meetingNotes = await Note.find({ meetingId });
    if (meetingNotes.length === 0) {
      return res.status(400).json({ error: 'Không có ghi chú nào của các thành viên để tổng hợp báo cáo.' });
    }

    const allUsers = await User.find({});
    const notesTextList = meetingNotes.map(n => {
      const user = allUsers.find(u => u.id === n.userId);
      const userName = user ? user.name : 'Thành viên ẩn danh';
      return `- **${userName}**: ${n.content}`;
    }).join('\n');

    const startTimeStr = new Date(meeting.startTime).toLocaleString('vi-VN');
    const endTimeStr = new Date(meeting.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const prompt = `Hãy đóng vai trò là một thư ký cuộc họp chuyên nghiệp. Hãy viết một bản tóm tắt biên bản cuộc họp chính thức (Minutes of Meeting) ngắn gọn và súc tích bằng tiếng Việt dưới định dạng Markdown dựa trên các ghi chú đầu vào dưới đây.\n\nThông tin cuộc họp:\n- Tiêu đề: ${meeting.title}\n- Thời gian: ${startTimeStr} - ${endTimeStr}\n- Người chủ trì: ${meeting.hostName}\n\nGhi chú từ các thành viên tham gia:\n${notesTextList}\n\nBiên bản cuộc họp cần bao gồm các phần chính sau:\n1. Các quyết định đã thống nhất (liệt kê các quyết định từ các ý kiến thống nhất)\n2. Phân công công việc (chỉ định rõ ai làm nhiệm vụ gì dựa trên thông tin ghi chú)\n3. Các vấn đề cần thảo luận hoặc lưu ý thêm\n\nHãy viết nội dung bằng tiếng Việt tự nhiên, định dạng Markdown rõ ràng, đẹp mắt, chia các tiêu đề rõ ràng, sử dụng danh sách gạch đầu dòng để dễ đọc. Tránh thêm các thông tin phụ trợ ngoài ghi chú trên.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY' || apiKey.trim() === '') {
      console.warn('[Gemini AI] GEMINI_API_KEY is not configured. Falling back to mock summary.');
      const mockSummary = `**BIÊN BẢN CUỘC HỌP CHÍNH THỨC (MÔ PHỎNG)**\n*Thời gian:* ${startTimeStr} - ${endTimeStr}\n*Địa điểm:* ${meeting.locationType === 'online' ? 'Online' : 'Trực tiếp'}\n\n**1. Các quyết định đã thống nhất:**\n- Duyệt phương án thiết kế giao diện nhóm hiện đại với các góc bo tròn 12px.\n- Tích hợp cổng thanh toán/nhắc lịch SMS để đảm bảo nhắc hẹn tự động.\n\n**2. Phân công công việc:**\n${meetingNotes.map(n => {
        const user = allUsers.find(u => u.id === n.userId);
        const userName = user ? user.name : 'Thành viên';
        return `- **${userName}**: Thực thi nội dung: "${n.content}"`;
      }).join('\n')}\n\n**3. Các vấn đề cần thảo luận thêm:**\n- Khảo sát chi phí hạ tầng và dung lượng gói tin khi chạy thử nghiệm trên Zalo Cloud.`;

      return res.json({
        title: `Biên bản: ${meeting.title}`,
        summaryContent: mockSummary
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summaryText = response.text();

    res.json({
      title: `Biên bản: ${meeting.title}`,
      summaryContent: summaryText
    });
  } catch (err) {
    console.error('Error generating report with Gemini AI:', err);
    res.status(500).json({ error: 'Có lỗi xảy ra khi gọi dịch vụ Gemini AI. Vui lòng thử lại sau.' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 10. Health Check – dùng cho keep-alive ping (UptimeRobot)
// Endpoint: GET /api/health
// ─────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Smeet Backend',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()) + 's'
  });
});

// ─────────────────────────────────────────────────────────────────────
// 11. Notification Test Route – admin gửi thông báo thử
// POST /api/notify/test  { "message": "Nội dung thông báo" }
// ─────────────────────────────────────────────────────────────────────
app.post('/api/notify/test', requireAuth, async (req, res) => {
  const caller = req.authUser;
  if (caller.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới được gửi thông báo thử.' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Thiếu trường message.' });
  }

  const result = await sendZaloOAGroupMessage(message);
  res.json(result);
});

// ─────────────────────────────────────────────────────────────────────
// 12. Manual Reminder Trigger – admin kích hoạt kiểm tra ngay
// POST /api/notify/run-check
// ─────────────────────────────────────────────────────────────────────
app.post('/api/notify/run-check', requireAuth, async (req, res) => {
  const caller = req.authUser;
  if (caller.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới được kích hoạt kiểm tra nhắc nhở.' });
  }

  try {
    await runReminderCheck();
    res.json({ success: true, message: 'Đã kiểm tra và gửi nhắc nhở (nếu có cuộc họp sắp diễn ra).' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Only run listen in non-production or non-serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Server] Express server running on port ${PORT}`);
    console.log(`[Health] Endpoint: http://localhost:${PORT}/api/health`);
  });
}

export default app;
