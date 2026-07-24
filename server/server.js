import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';
import http from 'http';
import nodemailer from 'nodemailer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import { db } from './db.js';
import { User, Meeting, Note, Poll, Report, NotifConfig, Otp } from './models/Schemas.js';

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
// JWT Helpers using built-in Node.js crypto module
// ─────────────────────────────────────────────────────────────────────
const base64UrlEncode = (str) => {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const base64UrlDecode = (base64Url) => {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString();
};

const signToken = (payload, secret, expiresInSeconds = 3 * 24 * 60 * 60) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerStr = base64UrlEncode(JSON.stringify(header));
  
  const payloadWithExp = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds
  };
  const payloadStr = base64UrlEncode(JSON.stringify(payloadWithExp));
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerStr}.${payloadStr}`)
    .digest('base64url');
    
  return `${headerStr}.${payloadStr}.${signature}`;
};

const verifyToken = (token, secret) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerStr, payloadStr, signature] = parts;
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${headerStr}.${payloadStr}`)
      .digest('base64url');
      
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(base64UrlDecode(payloadStr));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────
// MIDDLEWARE: requireAuth – kiểm tra header x-user-id hợp lệ hoặc JWT token
// ─────────────────────────────────────────────────────────────────────
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let userId = req.headers['x-user-id'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token, process.env.JWT_SECRET || 'smeet_secret_key');
    if (decoded) {
      userId = decoded.id;
    } else {
      return res.status(401).json({ error: 'Unauthorized: token không hợp lệ hoặc đã hết hạn.' });
    }
  }

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: thiếu token hoặc x-user-id.' });
  }

  try {
    let user = await User.findOne({ id: userId });
    
    // Automatically recreate the mock user u1 in development if missing from DB
    if (!user && userId === 'u1') {
      user = new User({
        id: 'u1',
        name: 'Nguyễn Văn A (Host)',
        email: 'nguyenvana@gmail.com',
        phone: '0912345678',
        role: 'admin',
        roles: ['admin'],
        avatar: ZALO_DEFAULT_AVATAR,
        is_email_verified: false // allows testing OTP flow on browser
      });
      await user.save();
      console.log('[Dev] Automatically recreated mock user u1 in DB');
    }

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
  const { id, name, avatar, phone } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Missing Zalo User ID' });
  }

  try {
    let user = await User.findOne({ $or: [{ zalo_id: id }, { id: id }] });

    if (user && user.is_email_verified) {
      // Cập nhật thông tin profile Zalo
      user.name = name || user.name;
      user.avatar = avatar || user.avatar;
      if (phone) user.phone = phone;
      if (!user.zalo_id) user.zalo_id = id;
      await user.save();

      // Tạo JWT token
      const token = signToken({ id: user.id, zalo_id: id }, process.env.JWT_SECRET || 'smeet_secret_key');

      return res.json({ success: true, token, user });
    }

    // Nếu chưa có user hoặc user chưa verify Email -> Báo cho client hiển thị form liên kết/xác thực Email
    return res.json({
      success: false,
      needEmail: true,
      zaloUser: { id, name, avatar, phone }
    });
  } catch (err) {
    console.error('Auth API error:', err);
    res.status(500).json({ error: 'Có lỗi xảy ra khi xác thực người dùng.' });
  }
});

// API send-otp: Nhận Email + Zalo ID, tạo OTP 6 số (hạn 3-5 phút) và gửi
app.post('/api/auth/send-otp', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const zalo_id = (req.body.zalo_id || '').trim();

  if (!email || !zalo_id) {
    return res.status(400).json({ error: 'Thiếu email hoặc Zalo ID.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Địa chỉ email không đúng định dạng.' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

  try {
    // Lưu vào database otps, trước hết xóa các OTP cũ
    await Otp.deleteMany({ email, zalo_id });
    const newOtp = new Otp({ email, zalo_id, code, expiresAt });
    await newOtp.save();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0068ff; text-align: center; margin-bottom: 8px;">Smeet Zalo Mini App</h2>
        <p style="text-align: center; color: #64748b; font-size: 14px; margin-top: 0;">Mã xác thực Gmail OTP</p>
        <div style="background-color: #f0f7ff; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0068ff;">${code}</span>
        </div>
        <p style="color: #334155; font-size: 14px; text-align: center;">Mã xác thực có hiệu lực trong <strong>5 phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
      </div>
    `;

    const emailRes = await sendEmailHelper({
      to: email,
      subject: `[Smeet] Mã xác thực OTP: ${code}`,
      html: htmlContent
    });

    if (emailRes.success) {
      return res.json({
        success: true,
        message: `Mã OTP đã gửi đến hộp thư ${email}!`,
        mode: 'real'
      });
    } else {
      console.log(`[Email OTP] ℹ️ (Chế độ mô phỏng) Mã OTP cho ${email} là: ${code}`);
      return res.json({
        success: true,
        message: `[Mô phỏng] Mã OTP của bạn là ${code}.`,
        code,
        mode: 'simulated'
      });
    }
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Có lỗi xảy ra khi gửi mã OTP: ' + err.message });
  }
});

// API verify-otp: User nhập OTP, kiểm tra, cập nhật email và is_email_verified = true
app.post('/api/auth/verify-otp', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const zalo_id = (req.body.zalo_id || '').trim();
  const otp = (req.body.otp || '').trim();
  const { name, avatar, phone, roles } = req.body;

  if (!email || !zalo_id || !otp) {
    return res.status(400).json({ error: 'Thiếu email, Zalo ID hoặc mã OTP.' });
  }

  try {
    const cached = await Otp.findOne({ email, zalo_id, code: otp });
    if (!cached) {
      return res.status(400).json({ error: 'Mã OTP không chính xác hoặc không tồn tại.' });
    }

    if (new Date() > cached.expiresAt) {
      await Otp.deleteMany({ email, zalo_id });
      return res.status(400).json({ error: 'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại.' });
    }

    // OTP hợp lệ — xóa khỏi DB để tránh tái sử dụng
    await Otp.deleteOne({ _id: cached._id });

    // Tìm xem email này đã tồn tại tài khoản chưa
    let user = await User.findOne({ email });

    if (user) {
      // Email đã có sẵn tài khoản: Liên kết Zalo ID vào tài khoản này
      const oldId = user.id;

      // Kiểm tra xem Zalo ID này đã được gán cho user nào khác chưa để tránh trùng lặp unique index
      const existingUserWithId = await User.findOne({ $or: [{ id: zalo_id }, { zalo_id }] });
      if (existingUserWithId && existingUserWithId._id.toString() !== user._id.toString()) {
        await User.deleteOne({ _id: existingUserWithId._id });
        console.log(`[Verify OTP] 🗑️ Đã xóa user tạm thời trùng Zalo ID: ${zalo_id}`);
      }

      user.id = zalo_id;
      user.zalo_id = zalo_id;
      user.is_email_verified = true;
      if (name) user.name = name;
      if (avatar) user.avatar = avatar;
      if (phone) user.phone = phone;
      await user.save();
      console.log(`[Verify OTP] ✅ Đã liên kết Zalo ID ${zalo_id} và verify email cho: ${email}`);

      // Cập nhật tất cả các liên kết dữ liệu cũ của user (từ oldId sang zalo_id)
      if (oldId && oldId !== zalo_id) {
        await Promise.all([
          Meeting.updateMany({ createdBy: oldId }, { createdBy: zalo_id }),
          Note.updateMany({ userId: oldId }, { userId: zalo_id }),
          Report.updateMany({ createdBy: oldId }, { createdBy: zalo_id }),
          Poll.updateMany(
            { "answers.userId": oldId },
            { $set: { "answers.$[elem].userId": zalo_id } },
            { arrayFilters: [{ "elem.userId": oldId }] }
          )
        ]);
        console.log(`[Verify OTP] 🔄 Đã cập nhật tất cả dữ liệu tham chiếu từ ${oldId} sang ${zalo_id}`);
      }
    } else {
      // Email chưa có tài khoản: Kiểm tra xem đã có user trùng Zalo ID chưa
      const existingUserWithId = await User.findOne({ $or: [{ id: zalo_id }, { zalo_id }] });
      if (existingUserWithId) {
        existingUserWithId.email = email;
        existingUserWithId.zalo_id = zalo_id;
        existingUserWithId.is_email_verified = true;
        if (name) existingUserWithId.name = name;
        if (avatar) existingUserWithId.avatar = avatar;
        if (phone) existingUserWithId.phone = phone;
        await existingUserWithId.save();
        user = existingUserWithId;
        console.log(`[Verify OTP] ✅ Cập nhật Email & Verify vào tài khoản Zalo đã có sẵn: ${user.name}`);
      } else {
        // Tạo tài khoản mới hoàn toàn
        const rolesArr = Array.isArray(roles) ? roles : (roles ? [roles] : ['member']);
        const primaryRole = rolesArr.includes('admin') ? 'admin'
          : rolesArr.includes('delegated') ? 'delegated'
          : 'member';

        user = new User({
          id: zalo_id,
          zalo_id,
          name: name || 'Người dùng Zalo',
          email,
          is_email_verified: true,
          phone: phone || undefined,
          avatar: avatar || ZALO_DEFAULT_AVATAR,
          role: primaryRole,
          roles: rolesArr
        });
        await user.save();
        console.log(`[Verify OTP] ✅ Tạo tài khoản mới và verify email thành công: ${user.name} (${email})`);
      }
    }

    // Tạo JWT token
    const token = signToken({ id: user.id, zalo_id: user.zalo_id }, process.env.JWT_SECRET || 'smeet_secret_key');

    res.json({
      success: true,
      token,
      user
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Không thể xác thực OTP: ' + err.message });
  }
});

// Route mới: Liên kết Zalo ID với Email (Không dùng OTP)
app.post('/api/auth/zalo-link-email', async (req, res) => {
  const { id, name, avatar, phone, email, roles } = req.body;
  if (!id || !email) {
    return res.status(400).json({ error: 'Thiếu Zalo User ID hoặc địa chỉ Email liên kết.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  try {
    // Tìm xem email này đã tồn tại chưa
    let user = await User.findOne({ email: cleanEmail });

    if (user) {
      // Email đã có sẵn tài khoản: Liên kết Zalo ID vào tài khoản này
      const oldId = user.id;

      // Kiểm tra xem Zalo ID này đã được gán cho user nào khác chưa để tránh trùng lặp unique index
      const existingUserWithId = await User.findOne({ id });
      if (existingUserWithId && existingUserWithId._id.toString() !== user._id.toString()) {
        // Xóa tài khoản Zalo rác/tạm thời này đi để nhường Zalo ID cho tài khoản email chính
        await User.deleteOne({ _id: existingUserWithId._id });
        console.log(`[Zalo Link] 🗑️ Đã xóa user tạm thời trùng Zalo ID: ${id}`);
      }

      user.id = id; // Cập nhật Zalo ID mới vào tài khoản có sẵn
      if (name) user.name = name;
      if (avatar) user.avatar = avatar;
      if (phone) user.phone = phone;
      // Giữ nguyên quyền hạn (roles) cũ của tài khoản email để đảm bảo bảo mật
      await user.save();
      console.log(`[Zalo Link] ✅ Đã liên kết Zalo ID ${id} vào tài khoản email: ${cleanEmail}`);

      // Cập nhật tất cả các liên kết dữ liệu cũ của user (từ oldId sang id mới của Zalo)
      if (oldId && oldId !== id) {
        await Promise.all([
          Meeting.updateMany({ createdBy: oldId }, { createdBy: id }),
          Note.updateMany({ userId: oldId }, { userId: id }),
          Report.updateMany({ createdBy: oldId }, { createdBy: id }),
          Poll.updateMany(
            { "answers.userId": oldId },
            { $set: { "answers.$[elem].userId": id } },
            { arrayFilters: [{ "elem.userId": oldId }] }
          )
        ]);
        console.log(`[Zalo Link] 🔄 Đã cập nhật tất cả dữ liệu tham chiếu từ ${oldId} sang ${id}`);
      }
    } else {
      // Email chưa có tài khoản: Tạo tài khoản mới
      // Để chắc chắn không bị lỗi E11000 khi tạo mới: kiểm tra xem id đã tồn tại chưa
      const existingUserWithId = await User.findOne({ id });
      if (existingUserWithId) {
        // Nếu đã có user trùng Zalo ID (nhưng email khác/trống), cập nhật email và thông tin vào user đó luôn
        existingUserWithId.email = cleanEmail;
        if (name) existingUserWithId.name = name;
        if (avatar) existingUserWithId.avatar = avatar;
        if (phone) existingUserWithId.phone = phone;
        const rolesArr = Array.isArray(roles) ? roles : (roles ? [roles] : ['member']);
        const primaryRole = rolesArr.includes('admin') ? 'admin'
          : rolesArr.includes('delegated') ? 'delegated'
          : 'member';
        existingUserWithId.role = primaryRole;
        existingUserWithId.roles = rolesArr;
        await existingUserWithId.save();
        user = existingUserWithId;
        console.log(`[Zalo Link] ✅ Cập nhật Email vào tài khoản Zalo đã có sẵn: ${user.name} (${cleanEmail})`);
      } else {
        const rolesArr = Array.isArray(roles) ? roles : (roles ? [roles] : ['member']);
        const primaryRole = rolesArr.includes('admin') ? 'admin'
          : rolesArr.includes('delegated') ? 'delegated'
          : 'member';

        user = new User({
          id,
          name: name || 'Người dùng Zalo',
          email: cleanEmail,
          phone: phone || undefined,
          avatar: avatar || ZALO_DEFAULT_AVATAR,
          role: primaryRole,
          roles: rolesArr
        });
        await user.save();
        console.log(`[Zalo Link] ✅ Tạo tài khoản mới qua liên kết Zalo: ${user.name} (${cleanEmail})`);
      }
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error('[Zalo Link Error]:', err);
    res.status(500).json({ error: 'Không thể thực hiện liên kết email: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 1b. Public user lookup by email or phone (for OTP login before session exists)
// ─────────────────────────────────────────────────────────────────────
const EMAIL_OTP_CACHE = new Map();

app.get('/api/users/lookup', async (req, res) => {
  const email = (req.query.email || '').trim().toLowerCase();
  const phone = (req.query.phone || '').trim();

  let query = {};
  if (email) {
    query.email = { $regex: new RegExp(`^${email}$`, 'i') };
  } else if (phone) {
    query.phone = phone;
  } else {
    return res.status(400).json({ error: 'Vui lòng cung cấp email hoặc số điện thoại để tra cứu.' });
  }

  try {
    const users = await User.find(query).select('id name email phone role roles avatar defaultMeet -_id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper gửi email dùng chung (SMTP hoặc Resend API)
async function sendEmailHelper({ to, subject, html }) {
  // 1. Ưu tiên gửi qua Resend API nếu có RESEND_API_KEY
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && resendApiKey.trim()) {
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Smeet App <onboarding@resend.dev>',
          to: [to],
          subject,
          html
        })
      });
      if (resendRes.ok) {
        console.log(`[Email] ✅ Gửi thành công tới: ${to} (qua Resend API)`);
        return { success: true, mode: 'resend' };
      } else {
        const errData = await resendRes.json();
        console.error('[Resend Error]:', errData);
      }
    } catch (resendErr) {
      console.error('[Resend Exception]:', resendErr.message);
    }
  }

  // 2. Sử dụng Nodemailer SMTP nếu có EMAIL_USER và EMAIL_PASS
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (emailUser && emailPass && emailUser.trim() && emailPass.trim()) {
    try {
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: emailUser.trim(),
          pass: emailPass.trim()
        }
      });

      await transporter.sendMail({
        from: `"Smeet App" <${emailUser.trim()}>`,
        to,
        subject,
        html
      });

      console.log(`[Email] ✅ Gửi thành công tới: ${to} (qua SMTP)`);
      return { success: true, mode: 'smtp' };
    } catch (err) {
      console.error('[Email] ❌ Lỗi gửi email qua SMTP:', err.message);
      return { success: false, error: err.message };
    }
  }

  console.warn('[Email] ⚠️ Chưa cấu hình Email provider. Chạy chế độ mô phỏng.');
  return { success: false, reason: 'not_configured' };
}

// ─────────────────────────────────────────────────────────────────────
// 1c. Send Real Email OTP via Nodemailer / SMTP
// ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/send-email-otp', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Địa chỉ email không đúng định dạng.' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  EMAIL_OTP_CACHE.set(email, { code, expiresAt });

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #0068ff; text-align: center; margin-bottom: 8px;">Smeet Zalo Mini App</h2>
      <p style="text-align: center; color: #64748b; font-size: 14px; margin-top: 0;">Mã xác thực đăng nhập (OTP)</p>
      <div style="background-color: #f0f7ff; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0068ff;">${code}</span>
      </div>
      <p style="color: #334155; font-size: 14px; text-align: center;">Mã xác thực có hiệu lực trong <strong>5 phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
    </div>
  `;

  const emailRes = await sendEmailHelper({
    to: email,
    subject: `[Smeet] Mã xác thực OTP đăng nhập: ${code}`,
    html: htmlContent
  });

  if (emailRes.success) {
    return res.json({
      success: true,
      message: `Mã OTP đã gửi đến hộp thư ${email}!`,
      mode: 'real'
    });
  } else {
    console.log(`[Email OTP] ℹ️ (Chế độ mô phỏng) Mã OTP cho ${email} là: ${code}`);
    return res.json({
      success: true,
      message: `[Mô phỏng] Mã OTP của bạn là ${code}. (Để gửi email thật, cài RESEND_API_KEY hoặc EMAIL_USER/EMAIL_PASS trong server/.env)`,
      code,
      mode: 'simulated'
    });
  }
});

// Route mới: Nhận báo cáo sự cố và gửi email về smeetreport@gmail.com
app.post('/api/reports/bug', async (req, res) => {
  const { email, name, category, description } = req.body;
  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'Thiếu nội dung mô tả sự cố.' });
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 8px; margin-top: 0;">⚠️ Báo Cáo Sự Cố Mới (Smeet App)</h2>
      <p style="font-size: 14px; color: #334155;">Hệ thống vừa nhận được phản hồi báo cáo sự cố từ người dùng qua Zalo Mini App.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 120px; color: #64748b;">Người gửi:</td>
          <td style="padding: 8px 0; color: #1e293b;">${name || 'Thành viên'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Email liên hệ:</td>
          <td style="padding: 8px 0; color: #1e293b;"><a href="mailto:${email || ''}">${email || 'Chưa cung cấp'}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Phân loại:</td>
          <td style="padding: 8px 0; color: #ef4444; font-weight: bold;">${(category || 'ui').toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #64748b; vertical-align: top;">Chi tiết sự cố:</td>
          <td style="padding: 8px 0; color: #1e293b; background-color: #f8fafc; border-radius: 6px; padding: 12px; white-space: pre-wrap; border: 1px solid #e2e8f0;">${description}</td>
        </tr>
      </table>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 0;">Email này được gửi tự động từ hệ thống Smeet.</p>
    </div>
  `;

  try {
    const emailRes = await sendEmailHelper({
      to: 'smeetreport@gmail.com',
      subject: `[Smeet Bug Report] - Phân loại: ${(category || 'ui').toUpperCase()}`,
      html: htmlContent
    });

    if (emailRes.success) {
      return res.json({ success: true, message: 'Báo cáo sự cố đã được gửi tới email quản trị viên!' });
    } else {
      console.log(`[Bug Report] ℹ️ (Mô phỏng) Đã nhận báo cáo sự cố từ ${email || 'guest'}: ${description}`);
      return res.json({
        success: true,
        simulated: true,
        message: '[Mô phỏng] Đã ghi nhận báo cáo sự cố (do server chưa cấu hình email gửi đi).'
      });
    }
  } catch (err) {
    console.error('Error sending bug report email:', err);
    res.status(500).json({ error: 'Không thể gửi email báo cáo sự cố: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 1d. Verify Email OTP (server-side check against EMAIL_OTP_CACHE)
// ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/verify-email-otp', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const otp = (req.body.otp || '').trim();

  if (!email || !otp) {
    return res.status(400).json({ error: 'Thiếu email hoặc mã OTP.' });
  }

  const cached = EMAIL_OTP_CACHE.get(email);
  if (!cached) {
    return res.status(400).json({ error: 'Không tìm thấy mã OTP cho email này. Vui lòng yêu cầu gửi lại.' });
  }

  if (Date.now() > cached.expiresAt) {
    EMAIL_OTP_CACHE.delete(email);
    return res.status(400).json({ error: 'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại.' });
  }

  if (otp !== cached.code) {
    return res.status(400).json({ error: 'Mã OTP không chính xác. Vui lòng kiểm tra lại.' });
  }

  // OTP hợp lệ — xóa khỏi cache để tránh tái sử dụng
  EMAIL_OTP_CACHE.delete(email);
  console.log(`[Verify OTP] ✅ OTP xác thực thành công cho: ${email}`);
  return res.json({ success: true, message: 'Xác thực OTP thành công.' });
});

// ─────────────────────────────────────────────────────────────────────
// 1e. Public User Registration (cho phép người dùng mới tự đăng ký sau khi xác thực OTP)
// ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { name, email, phone, role, roles } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Vui lòng nhập họ và tên.' });
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanEmail) {
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ error: 'Email này đã được đăng ký tài khoản.' });
    }
  }

  try {
    const rolesArr = Array.isArray(roles) ? roles : (roles ? [roles] : [role || 'member']);
    // Xác định primary role
    const primaryRole = rolesArr.includes('admin') ? 'admin'
      : rolesArr.includes('delegated') ? 'delegated'
      : 'member';

    const newUser = new User({
      id: 'u_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: name.trim(),
      email: cleanEmail || undefined,
      phone: (phone || '').trim() || undefined,
      role: primaryRole,
      roles: rolesArr,
      avatar: ZALO_DEFAULT_AVATAR
    });
    await newUser.save();
    console.log(`[Register] ✅ Đăng ký tài khoản mới thành công: ${newUser.name} (${newUser.email}) - Roles: ${newUser.roles.join(', ')}`);
    res.json(newUser);
  } catch (err) {
    console.error('[Register Error]:', err);
    res.status(500).json({ error: 'Không thể tạo tài khoản: ' + err.message });
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
  // Hỗ trợ kiểm tra admin qua cả role chính hoặc mảng roles
  const callerIsAdmin = caller.role === 'admin' || (Array.isArray(caller.roles) && caller.roles.includes('admin'));
  if (!isSelf && !callerIsAdmin) {
    return res.status(403).json({ error: 'Chỉ admin mới được thêm hoặc sửa thông tin thành viên khác.' });
  }

  // Đồng bộ hóa role chính và mảng roles để tránh không nhất quán dữ liệu
  if (user.roles) {
    const rolesArr = Array.isArray(user.roles) ? user.roles : [user.roles];
    user.roles = rolesArr;
    user.role = rolesArr.includes('admin') ? 'admin'
      : rolesArr.includes('delegated') ? 'delegated'
      : 'member';
  } else if (user.role) {
    user.roles = [user.role];
  }

  try {
    if (user.id) {
      const updated = await User.findOneAndUpdate({ id: user.id }, user, { new: true, upsert: true });
      res.json(updated);
    } else {
      // Tạo user mới – chỉ admin được làm
      if (!callerIsAdmin) {
        return res.status(403).json({ error: 'Chỉ admin mới được tạo thành viên mới.' });
      }
      user.id = 'u_' + Date.now();
      user.avatar = user.avatar || ZALO_DEFAULT_AVATAR;
      if (!user.role && !user.roles) {
        user.role = 'member';
        user.roles = ['member'];
      }
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

// ─────────────────────────────────────────────────────────────────────
// 13. Zalo Webhook Endpoint (cho Zalo Mini App console verification)
// ─────────────────────────────────────────────────────────────────────
app.all('/api/zalo/webhook', (req, res) => {
  console.log('[Zalo Webhook] Received webhook ping/event:', req.body || req.query);
  res.status(200).json({
    status: 'success',
    message: 'Zalo Webhook is active and verified.',
    timestamp: new Date().toISOString()
  });
});

// ─────────────────────────────────────────────────────────────────────
// 14. Terms of Service & Privacy Policy Web Pages (đáp ứng điều kiện Duyệt App)
// ─────────────────────────────────────────────────────────────────────
const TERMS_HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Điều khoản sử dụng & Chính sách bảo mật - Smeet Zalo Mini App</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 24px 16px; background-color: #f8fafc; }
    .card { background: #ffffff; padding: 32px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    h1 { color: #0068ff; font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
    h2 { color: #0f172a; font-size: 18px; margin-top: 24px; }
    p, li { font-size: 15px; color: #334155; }
    ul { padding-left: 20px; }
    .footer { margin-top: 32px; font-size: 13px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Điều Khoản Sử Dụng & Chính Sách Bảo Mật — Smeet</h1>
    <p><em>Cập nhật gần nhất: 22/07/2026</em></p>
    
    <h2>1. Giới thiệu ứng dụng Smeet</h2>
    <p>Smeet là ứng dụng Zalo Mini App cung cấp giải pháp đặt lịch họp, quản lý cuộc họp nhóm và tự động tóm tắt biên bản báo cáo bằng trí tuệ nhân tạo (AI).</p>
    
    <h2>2. Thu thập và Sử dụng Thông tin Cá nhân</h2>
    <p>Để vận hành ứng dụng và cung cấp dịch vụ tốt nhất, Smeet thu thập các thông tin tối thiểu sau từ tài khoản Zalo khi được sự đồng ý của người dùng:</p>
    <ul>
      <li><strong>Thông tin hồ sơ:</strong> Họ và tên, ảnh đại diện (avatar) và Zalo User ID nhằm hiển thị thành viên trong phòng họp.</li>
      <li><strong>Địa chỉ Email & Số điện thoại:</strong> Dùng để gửi mã xác thực OTP đăng nhập, thông báo nhắc nhở lịch họp và báo cáo AI.</li>
      <li><strong>Nội dung ghi chú cuộc họp:</strong> Dùng để lưu trữ biên bản làm việc nhóm và truyền tới mô hình AI để tự động tạo báo cáo tóm tắt.</li>
    </ul>

    <h2>3. Cam kết Bảo mật Dữ liệu</h2>
    <ul>
      <li>Dữ liệu cá nhân và nội dung cuộc họp của bạn được mã hóa an toàn trên hệ thống cơ sở dữ liệu.</li>
      <li>Chúng tôi cam kết <strong>không bao giờ chia sẻ, bán hoặc chuyển giao</strong> thông tin người dùng cho bên thứ ba vì mục đích thương mại.</li>
    </ul>

    <h2>4. Quyền Hủy Đồng ý và Xóa Dữ liệu</h2>
    <p>Người dùng có toàn quyền hủy bỏ sự đồng ý cấp quyền hoặc yêu cầu xóa dữ liệu bất kỳ lúc nào bằng cách xóa ứng dụng Smeet khỏi Zalo hoặc liên hệ quản trị viên qua email: <strong>smeetreport@gmail.com</strong>.</p>
    
    <div class="footer">
      &copy; 2026 Smeet Zalo Mini App. Tất cả các quyền được bảo lưu.
    </div>
  </div>
</body>
</html>`;

app.get(['/terms', '/terms.html', '/privacy', '/privacy.html'], (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(TERMS_HTML);
});

// Only run listen in non-production or non-serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Server] Express server running on port ${PORT}`);
    console.log(`[Health] Endpoint: http://localhost:${PORT}/api/health`);
  });
}

export default app;
