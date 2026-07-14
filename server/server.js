import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from './db.js';
import { User, Meeting, Note, Poll, Report, NotifConfig } from './models/Schemas.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Database connection
db.connect();

const ZALO_DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iI0U2RjBGRiIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE4IiBmaWxsPSIjMDA2OEZGIi8+PHBhdGggZD0iTTUwIDYwYy0xOCAwLTMwIDgtMzAgMTh2NGg2MHYtNGMwLTEwLTEyLTE4LTMwLTE4eiIgZmlsbD0iIzAwNjhGRiIvPjwvc3ZnPg==';

// Helper for conflict checking
const checkConflict = async (newMeeting) => {
  const newStart = new Date(newMeeting.startTime).getTime();
  const newEnd = new Date(newMeeting.endTime).getTime();

  // Only check overlap with active (non-canceled) meetings
  const activeMeetings = await Meeting.find({ status: { $ne: 'canceled' } });

  return activeMeetings.find(m => {
    // Don't check conflict with itself during edit
    if (newMeeting.id && m.id === newMeeting.id) return false;

    const mStart = new Date(m.startTime).getTime();
    const mEnd = new Date(m.endTime).getTime();

    // Check overlap: Start of A < End of B AND End of A > Start of B
    return (newStart < mEnd && newEnd > mStart);
  });
};

// 1. Authentication Route
app.post('/api/auth/zalo', async (req, res) => {
  const { id, name, avatar, phone, role } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Missing Zalo User ID' });
  }

  try {
    let user = await User.findOne({ id });

    if (user) {
      // Update existing user info
      user.name = name || user.name;
      user.avatar = avatar || user.avatar;
      user.phone = phone || user.phone;
      user.role = role || user.role || 'member';
      await user.save();
    } else {
      // Register new Zalo user
      user = new User({
        id,
        name: name || 'Người dùng Zalo',
        avatar: avatar || ZALO_DEFAULT_AVATAR,
        phone: phone || '09xxxxxxxx',
        role: role || 'admin' // Set admin for first Zalo logged in user for easier testing, or default to admin
      });
      await user.save();
    }

    res.json(user);
  } catch (err) {
    console.error('Auth API error:', err);
    res.status(500).json({ error: 'Có lỗi xảy ra khi xác thực người dùng.' });
  }
});

// 2. Users APIs
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const user = req.body;
  try {
    if (user.id) {
      const updated = await User.findOneAndUpdate({ id: user.id }, user, { new: true, upsert: true });
      res.json(updated);
    } else {
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

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await User.deleteOne({ id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Meetings APIs
app.get('/api/meetings', async (req, res) => {
  try {
    const meetings = await Meeting.find({});
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/meetings', async (req, res) => {
  const meeting = req.body;
  try {
    const conflict = await checkConflict(meeting);
    if (conflict) {
      const conflictTime = `${new Date(conflict.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} - ${new Date(conflict.endTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}`;
      return res.status(400).json({ error: `Trùng lịch họp với cuộc họp: "${conflict.title}" (${conflictTime})` });
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

app.delete('/api/meetings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await Meeting.deleteOne({ id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Notes APIs
app.get('/api/meetings/:meetingId/notes', async (req, res) => {
  const { meetingId } = req.params;
  try {
    const meetingNotes = await Note.find({ meetingId });
    res.json(meetingNotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/meetings/:meetingId/notes', async (req, res) => {
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

// 5. Polls APIs
app.get('/api/meetings/:meetingId/polls', async (req, res) => {
  const { meetingId } = req.params;
  try {
    const meetingPolls = await Poll.find({ meetingId });
    res.json(meetingPolls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/meetings/:meetingId/polls', async (req, res) => {
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

app.post('/api/meetings/:meetingId/polls/:pollId/vote', async (req, res) => {
  const { pollId } = req.params;
  const { userId, optionId } = req.body;
  try {
    const poll = await Poll.findOne({ id: pollId });
    if (poll) {
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
    } else {
      res.status(404).json({ error: 'Poll not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/meetings/:meetingId/polls/:pollId', async (req, res) => {
  const { pollId } = req.params;
  try {
    await Poll.deleteOne({ id: pollId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Reports APIs
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await Report.find({});
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports', async (req, res) => {
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

app.delete('/api/reports/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await Report.deleteOne({ id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Notification Config APIs
app.get('/api/notif-config', async (req, res) => {
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

app.post('/api/notif-config', async (req, res) => {
  const config = req.body;
  try {
    const updated = await NotifConfig.findOneAndUpdate({}, config, { new: true, upsert: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Gemini AI Report Generation Route
app.post('/api/meetings/:meetingId/generate-report', async (req, res) => {
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

    // Map user IDs to names for prompt context
    const allUsers = await User.find({});
    const notesTextList = meetingNotes.map(n => {
      const user = allUsers.find(u => u.id === n.userId);
      const userName = user ? user.name : 'Thành viên ẩn danh';
      return `- **${userName}**: ${n.content}`;
    }).join('\n');

    const startTimeStr = new Date(meeting.startTime).toLocaleString('vi-VN');
    const endTimeStr = new Date(meeting.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const prompt = `Hãy đóng vai trò là một thư ký cuộc họp chuyên nghiệp. Hãy viết một bản tóm tắt biên bản cuộc họp chính thức (Minutes of Meeting) ngắn gọn và súc tích bằng tiếng Việt dưới định dạng Markdown dựa trên các ghi chú đầu vào dưới đây.

Thông tin cuộc họp:
- Tiêu đề: ${meeting.title}
- Thời gian: ${startTimeStr} - ${endTimeStr}
- Người chủ trì: ${meeting.hostName}

Ghi chú từ các thành viên tham gia:
${notesTextList}

Biên bản cuộc họp cần bao gồm các phần chính sau:
1. Các quyết định đã thống nhất (liệt kê các quyết định từ các ý kiến thống nhất)
2. Phân công công việc (chỉ định rõ ai làm nhiệm vụ gì dựa trên thông tin ghi chú)
3. Các vấn đề cần thảo luận hoặc lưu ý thêm

Hãy viết nội dung bằng tiếng Việt tự nhiên, định dạng Markdown rõ ràng, đẹp mắt, chia các tiêu đề rõ ràng, sử dụng danh sách gạch đầu dòng để dễ đọc. Tránh thêm các thông tin phụ trợ ngoài ghi chú trên.`;

    // Check if Gemini API key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY' || apiKey.trim() === '') {
      console.warn('[Gemini AI] GEMINI_API_KEY is not configured. Falling back to mock summary.');
      // Simulated/Mock report generation
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

// Only run listen in non-production or non-serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Server] Express server running on port ${PORT}`);
  });
}

export default app;
