# 🚀 SMEET - LỊCH HỌP NHÓM (Zalo Mini App)

> **Nền tảng quản lý lịch biểu & tổ chức họp nhóm trực tuyến WebRTC tích hợp liền mạch trên hệ sinh thái Zalo.**  
> *Giải pháp họp nhóm thông minh "All-In-One" – Không cần cài đặt ứng dụng phụ.*

---

## 📌 Giới Thiệu Dự Án

Trong công việc và học tập nhóm hiện nay, việc chốt thời gian họp thường bị trôi tin nhắn trong các nhóm chat Zalo/Telegram, và người dùng phải chuyển đổi phức tạp giữa các ứng dụng: **Zalo (Chat) ➔ Google Calendar (Lịch) ➔ Zoom/Google Meet (Họp)**.

**Smeet** ra đời nhằm giải quyết triệt để vấn đề trên. Chạy trực tiếp dưới dạng **Zalo Mini App**, Smeet mang đến trải nghiệm họp nhóm liền mạch ngay trên ứng dụng Zalo người dùng sử dụng hàng ngày.

---

## ✨ Tính Năng Nổi Bật

- 📅 **Quản Lý Lịch Họp Thông Minh (Smart Calendar View)**:
  - Giao diện lịch dạng tuần/tháng trực quan.
  - Tự động kiểm tra và cảnh báo khi có xung đột trùng lịch giữa các thành viên.
- 📹 **Phòng Họp Trực Tuyến WebRTC**:
  - Hỗ trợ Video HD, Audio nén tốc độ cao, bật/tắt Mic/Cam.
  - Tích hợp tính năng **Chia sẻ màn hình (Screen Sharing)** trực tiếp trong cuộc họp.
- ⚡ **Họp Nhanh (Quick Meeting) & Thông Báo Realtime**:
  - Tạo phòng họp tức thì trong 3 giây.
  - Gửi lời mời và thông báo nhắc lịch tự động qua **Zalo Notification**.
- 📊 **Báo Cáo & Lưu Trữ Biên Bản Họp**:
  - Lưu danh sách điểm danh tham dự và ghi nhận biên bản cuộc họp.
  - Hỗ trợ xuất file báo cáo tiện lợi.
- 🎨 **Giao Diện Chuẩn ZAUI & Phản Hồi Xúc Giác Haptic**:
  - Thiết kế đồng bộ theo chuẩn Zalo UI Guidelines.
  - Hỗ trợ giao diện **Dark Mode / Light Mode** linh hoạt.
  - Hiệu ứng rung Haptic mang lại trải nghiệm chân thực trên di động.

---

## 🛠️ Kiến Trúc Kỹ Thuật & Tech Stack

| Thành Phần | Công Nghệ Sử Dụng |
|---|---|
| **Frontend (Client)** | React 19, Vite, Zalo Mini App SDK (`zmp-sdk`, `zmp-ui`), Lucide Icons |
| **Backend (Server)** | Node.js, Express.js (RESTful APIs) |
| **Database** | MongoDB, Mongoose ODM |
| **Real-time & Streaming** | WebRTC (Peer-to-Peer Video/Audio), Socket.io (Signaling Server) |
| **Bảo Mật & Auth** | Zalo OAuth 2.0 / Zalo SSO, JWT Authentication |

---

## 📂 Cấu Trúc Thư Mục Dự Án

```
Zalo_Mini_app-Smeet/
├── src/                         # Source code Frontend (React + ZMP SDK)
│   ├── components/              # Các UI component (MeetingRoom, CalendarView, v.v.)
│   ├── pages/                   # Các trang màn hình chính
│   └── utils/                   # Helper utilities (WebRTC, Notification, Auth)
├── server/                      # Source code Backend (Node.js + Express + MongoDB)
│   ├── models/                  # Database Schemas (User, Meeting, Report)
│   ├── routes/                  # API Endpoints
│   └── server.js                # Entry point Express & WebRTC Signaling Server
├── public/                      # Static Assets, Icons & Visual Mockups
├── presentation.html            # Slide thuyết trình tương tác dạng Web App
├── presentation_guide.md        # Kịch bản thuyết trình chi tiết (Speaker Script)
├── Smeet_Presentation_ZaloMiniApp.pptx # Bộ Slide PowerPoint chuẩn 16:9 Canva
├── app-config.json              # Cấu hình Zalo Mini App
├── vite.config.js               # Cấu hình Vite Build
└── package.json                 # Khai báo dependencies
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Local

### 1. Yêu Cầu Môi Trường
- **Node.js**: v18+ hoặc v20+
- **npm** hoặc **yarn**
- **MongoDB**: Local MongoDB Server hoặc MongoDB Atlas connection URI

### 2. Cài Đặt & Khởi Chạy Frontend
```bash
# Cài đặt dependencies
npm install

# Khởi chạy môi trường Dev
npm run dev
```

### 3. Cài Đặt & Khởi Chạy Backend Server
```bash
cd server

# Cài đặt dependencies cho backend
npm install

# Tạo file .env cho server (nếu chưa có)
# Mẫu .env: PORT=5000, MONGODB_URI=mongodb://localhost:27017/smeet

# Khởi chạy Backend Server
npm run dev
```

---

## 📊 Tài Liệu Thuyết Trình Dự Án

Dự án đi kèm bộ tài liệu thuyết trình đầy đủ hỗ trợ báo cáo:
- **Slide Thuyết Trình Web App**: Mở file [`presentation.html`](./presentation.html) trên trình duyệt.
- **File Slide PowerPoint (Mở Canva)**: File [`Smeet_Presentation_ZaloMiniApp.pptx`](./Smeet_Presentation_ZaloMiniApp.pptx).
- **Kịch Bản Thuyết Trình Lời Nói**: Đọc file [`presentation_guide.md`](./presentation_guide.md).

---

## 📝 License & Tác Giả

- **Đội ngũ phát triển**: Smeet Development Team (Zalo Mini App Production 2026)
- **Repository**: [https://github.com/tdtfptuk19-cmd/Zalo_Mini_app-Smeet](https://github.com/tdtfptuk19-cmd/Zalo_Mini_app-Smeet)
