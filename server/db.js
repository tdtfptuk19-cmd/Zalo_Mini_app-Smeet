import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Meeting, Note, Poll, Report, NotifConfig } from './models/Schemas.js';

dotenv.config();

const ZALO_DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI0U2RjBGRiIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE4IiBmaWxsPSIjMDA2OEZGIi8+PHBhdGggZD0iTTUwIDYwYy0xOCAwLTMwIDgtMzAgMTh2NGg2MHYtNGMwLTEwLTEyLTE4LTMwLTE4eiIgZmlsbD0iIzAwNjhGRiIvPjwvc3ZnPg==';

const getTodayAtTime = (hours, minutes) => {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

const getTomorrowAtTime = (hours, minutes) => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

const SEED_USERS = [
  { id: 'u1', name: 'Nguyễn Văn A', email: 'nguyenvana@gmail.com', phone: '0912345678', role: 'admin', avatar: ZALO_DEFAULT_AVATAR },
  { id: 'u2', name: 'Trần Thị B', email: 'tranthib@gmail.com', phone: '0987654321', role: 'delegated', avatar: ZALO_DEFAULT_AVATAR, defaultMeet: 'https://meet.google.com/abc-defg-hij' },
  { id: 'u3', name: 'Lê Văn C', email: 'levanc@gmail.com', phone: '0901234567', role: 'member', avatar: ZALO_DEFAULT_AVATAR },
  { id: 'u4', name: 'Phạm Văn D', email: 'phamvand@gmail.com', phone: '0934567890', role: 'member', avatar: ZALO_DEFAULT_AVATAR },
  { id: 'u5', name: 'Hoàng Thị E', email: 'hoangthie@gmail.com', phone: '0971234567', role: 'member', avatar: ZALO_DEFAULT_AVATAR }
];

const SEED_MEETINGS = [
  {
    id: 'm1',
    title: 'Họp Chiến Lược Zalo Mini App Q3',
    startTime: getTodayAtTime(14, 0),
    endTime: getTodayAtTime(15, 0),
    duration: 60,
    locationType: 'online',
    locationDetail: 'https://meet.google.com/xyz-mno-pqr',
    hostName: 'Nguyễn Văn A',
    hostPhone: '0912345678',
    note: 'Thành viên dùng mobile cài Zalo bản mới để kiểm tra.',
    preparationContent: 'Chuẩn bị bản báo cáo doanh thu tháng trước và slide đề xuất tính năng mới.',
    files: [
      { name: 'Kế_hoạch_phát_triển_Q3.pdf', type: 'pdf', url: '#', size: '2.4 MB' },
      { name: 'Slide_Giới_Thiệu_Hệ_Thống.pptx', type: 'ppt', url: '#', size: '5.1 MB' }
    ],
    createdBy: 'u1',
    createdAt: new Date().toISOString()
  },
  {
    id: 'm2',
    title: 'Thống Nhất Quy Trình Gửi Báo Cáo AI',
    startTime: getTomorrowAtTime(9, 30),
    endTime: getTomorrowAtTime(10, 30),
    duration: 60,
    locationType: 'online',
    locationDetail: 'https://meet.google.com/abc-defg-hij',
    hostName: 'Trần Thị B (Ủy quyền)',
    hostPhone: '0987654321',
    note: 'Ủy quyền cho Trần Thị B chủ trì họp chính.',
    preparationContent: 'Đọc kỹ tài liệu tích hợp eSMS & Zalo OA API trong kênh thiết lập.',
    files: [],
    createdBy: 'u1',
    createdAt: new Date().toISOString()
  }
];

const SEED_NOTES = [
  { id: 'n1', meetingId: 'm1', userId: 'u1', content: 'Cần tối ưu dung lượng gói tin tải lên Zalo Cloud.', updatedAt: new Date().toISOString() },
  { id: 'n2', meetingId: 'm1', userId: 'u2', content: 'Đã hoàn thiện liên kết API SMS chi phí thấp (eSMS 350đ/sms).', updatedAt: new Date().toISOString() },
  { id: 'n3', meetingId: 'm1', userId: 'u3', content: 'Giao diện bo tròn góc 12px nhìn rất hiện đại.', updatedAt: new Date().toISOString() }
];

const SEED_POLLS = [
  {
    id: 'p1',
    meetingId: 'm1',
    question: 'Bạn đánh giá thế nào về thiết kế giao diện (UI) mới của App?',
    pollType: 'single',
    isActive: true,
    options: [
      { id: 'o1', text: 'Rất hiện đại, bo góc đẹp mắt (Khuyên dùng)' },
      { id: 'o2', text: 'Bình thường, dễ sử dụng' },
      { id: 'o3', text: 'Cần phối màu đỏ rực rỡ hơn' }
    ],
    answers: [
      { userId: 'u1', optionId: 'o1' },
      { userId: 'u2', optionId: 'o1' },
      { userId: 'u3', optionId: 'o2' },
      { userId: 'u4', optionId: 'o1' }
    ]
  },
  {
    id: 'p2',
    meetingId: 'm1',
    question: 'Chúng ta nên chọn nhà cung cấp nào làm kênh gửi SMS phụ trợ?',
    pollType: 'multiple',
    isActive: true,
    options: [
      { id: 'o4', text: 'eSMS (Giá rẻ nhất, hỗ trợ tốt)' },
      { id: 'o5', text: 'VietGuy (Hạ tầng ổn định)' },
      { id: 'o6', text: 'SpeedSMS (Tích hợp API nhanh)' }
    ],
    answers: [
      { userId: 'u1', optionId: 'o4' },
      { userId: 'u2', optionId: 'o4' },
      { userId: 'u2', optionId: 'o5' },
      { userId: 'u3', optionId: 'o4' },
      { userId: 'u4', optionId: 'o6' }
    ]
  }
];

const SEED_REPORTS = [
  {
    id: 'r1',
    meetingId: 'm1',
    title: 'Họp Lập Kế Hoạch Dự Án Tuần 27',
    summaryContent: `**BIÊN BẢN CUỘC HỌP CHÍNH THỨC**\n*Thời gian:* 09:00 - 10:00, Ngày 03/07/2026\n\n**1. Các quyết định đã thống nhất:**\n- Thống nhất phát triển ứng dụng dưới dạng Zalo Mini App sử dụng React Vite.\n- Thiết kế giao diện theo tông màu chủ đạo Trắng, Xanh dương Zalo, và các điểm nhấn Đỏ cảnh báo. Các nút và hộp nhập liệu bo tròn góc 12px-16px.\n\n**2. Phân công công việc:**\n- **Nguyễn Văn A:** Thiết lập cấu hình Zalo Developer Console và tích hợp App ID.\n- **Trần Thị B:** Nghiên cứu dịch vụ SMS Gateway (eSMS) và tích hợp API Google Meet.\n- **Lê Văn C & Phạm Văn D:** Phác thảo UI/UX các màn hình chính (Calendar, Meeting Interaction).\n\n**3. Vấn đề thảo luận thêm:**\n- Sẽ khảo sát ý kiến nhóm về chi phí gửi tin nhắn ZNS của Zalo OA so với tin nhắn SMS truyền thống.`,
    status: 'published',
    createdBy: 'Nguyễn Văn A',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const SEED_NOTIF_CONFIG = {
  zaloOaLinked: true,
  zaloAppId: '2495395253818320492',
  smsProvider: 'esms',
  smsApiKey: 'mock_key_esms_lowest_cost_vietnam',
  notifEnabled: true
};

// Seed database function
const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.insertMany(SEED_USERS);
      console.log('[DB] Seeded Users');
    }

    const meetingCount = await Meeting.countDocuments();
    if (meetingCount === 0) {
      await Meeting.insertMany(SEED_MEETINGS);
      console.log('[DB] Seeded Meetings');
    }

    const noteCount = await Note.countDocuments();
    if (noteCount === 0) {
      await Note.insertMany(SEED_NOTES);
      console.log('[DB] Seeded Notes');
    }

    const pollCount = await Poll.countDocuments();
    if (pollCount === 0) {
      await Poll.insertMany(SEED_POLLS);
      console.log('[DB] Seeded Polls');
    }

    const reportCount = await Report.countDocuments();
    if (reportCount === 0) {
      await Report.insertMany(SEED_REPORTS);
      console.log('[DB] Seeded Reports');
    }

    const configCount = await NotifConfig.countDocuments();
    if (configCount === 0) {
      await NotifConfig.create(SEED_NOTIF_CONFIG);
      console.log('[DB] Seeded NotifConfig');
    }
  } catch (err) {
    console.error('[DB] Seeding failed:', err);
  }
};

let cachedPromise = null;

export const db = {
  connect: async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smeet_db';
    
    // Nếu Mongoose đã kết nối (readyState === 1), tái sử dụng connection ngay lập tức
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    if (!cachedPromise) {
      const opts = {
        bufferCommands: false, // Tránh treo query 10 giây khi mất kết nối DB
        serverSelectionTimeoutMS: 5000, // Thất bại nhanh sau 5s thay vì 10s
      };

      console.log('[DB] Connecting to MongoDB...');
      cachedPromise = mongoose.connect(mongoUri, opts).then(async (m) => {
        console.log('[DB] MongoDB connected successfully');
        try {
          await seedDatabase();
        } catch (e) {
          console.error('[DB] Seeding error:', e.message);
        }
        return m;
      }).catch((err) => {
        cachedPromise = null;
        console.error('[DB] MongoDB connection error:', err.message);
        throw err;
      });
    }

    return cachedPromise;
  }
};
