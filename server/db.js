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

const SEED_USERS = [];
const SEED_MEETINGS = [];
const SEED_NOTES = [];
const SEED_POLLS = [];
const SEED_REPORTS = [];

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
    // Xóa các user có sẵn nếu còn tồn tại trong DB theo yêu cầu của user
    const deleteEmails = ['nguyenvana@gmail.com', 'tranthib@gmail.com', 'levanc@gmail.com', 'phamvand@gmail.com', 'hoangthie@gmail.com'];
    const deleteRes = await User.deleteMany({ email: { $in: deleteEmails } });
    if (deleteRes.deletedCount > 0) {
      console.log(`[DB] Deleted ${deleteRes.deletedCount} demo users from database.`);
    }

    const userCount = await User.countDocuments();
    if (userCount === 0 && SEED_USERS.length > 0) {
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
