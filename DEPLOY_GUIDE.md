# Hướng Dẫn Triển Khai Chi Tiết Hệ Thống Smeet
*(Frontend: Zalo Mini App | Backend: Express Node.js | Database: MongoDB Atlas)*

Tài liệu này hướng dẫn chi tiết từng bước cách triển khai toàn bộ hệ thống dự án **Smeet** từ môi trường phát triển (Local) lên các nền tảng đám mây thực tế phục vụ sản xuất.

---

## Mục lục
1. [Triển khai Database lên MongoDB Atlas](#1-triển-khai-database-lên-mongodb-atlas)
2. [Triển khai Backend Server lên Vercel](#2-triển-khai-backend-server-lên-vercel)
3. [Triển khai Frontend lên Zalo Mini App Cloud](#3-triển-khai-frontend-lên-zalo-mini-app-cloud)
4. [Cấu hình CORS & Tên miền kết nối](#4-cấu-hình-cors--tên-miền-kết-nối)

---

## 1. Triển khai Database lên MongoDB Atlas

MongoDB Atlas cung cấp dịch vụ cơ sở dữ liệu MongoDB được quản lý hoàn toàn trên đám mây. Bạn có thể sử dụng gói miễn phí (M0 Sandbox) để chạy thử nghiệm dự án.

### Bước 1.1: Tạo tài khoản và Khởi tạo Cluster
1. Truy cập trang chủ [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) và đăng ký/đăng nhập tài khoản.
2. Nhấp vào nút **Create a Deployment** (Khởi tạo cơ sở dữ liệu).
3. Chọn gói **M0 (Free)** (Gói miễn phí).
4. Lựa chọn nhà cung cấp đám mây (Cloud Provider - đề xuất AWS) và Vùng địa lý gần nhất (Region - ví dụ: Singapore / ap-southeast-1 để đạt tốc độ tối đa).
5. Đặt tên Cluster (ví dụ: `ClusterSmeet`) và nhấp **Create**.

### Bước 1.2: Thiết lập Tài khoản Kết nối và IP Access List
1. **Tạo tài khoản quản trị DB (Database User)**:
   - Điền **Username** (ví dụ: `smeet_admin`).
   - Điền **Password** (hãy nhấn *Autogenerate Secure Password* và lưu lại mật khẩu này).
   - Nhấp vào **Create Database User**.
2. **Cấu hình IP truy cập (IP Access List)**:
   - Vì Backend sẽ chạy trên nền tảng Serverless của Vercel (dùng dải IP động), bạn **bắt buộc** phải cho phép kết nối từ mọi địa chỉ IP.
   - Trong phần *IP Access List*, thêm địa chỉ IP `0.0.0.0/0` (Allow Access from Anywhere).
   - Nhấp **Add Entry**.
3. Nhấp **Finish and Close** để hoàn tất cấu hình ban đầu.

### Bước 1.3: Lấy Chuỗi Kết Nối (Connection String)
1. Trên trang quản lý cơ sở dữ liệu (Database), nhấp vào nút **Connect** bên cạnh Cluster của bạn.
2. Chọn phương thức kết nối: **Drivers**.
3. Sao chép chuỗi kết nối hiển thị trong ô. Chuỗi kết nối sẽ có định dạng tương tự:
   ```text
   mongodb+srv://smeet_admin:<db_password>@cluster0.xxxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
4. Thay thế `<db_password>` bằng mật khẩu quản trị bạn đã lưu ở Bước 1.2, đồng thời thêm tên Database mong muốn vào trước ký tự `?` (ví dụ: `/smeet_db?`). Chuỗi kết nối hoàn chỉnh sẽ là:
   ```text
   mongodb+srv://smeet_admin:MatKhauCuaBan@cluster0.xxxxxx.mongodb.net/smeet_db?retryWrites=true&w=majority&appName=Cluster0
   ```
   *(Hãy lưu chuỗi kết nối này lại để dùng cho cấu hình Backend trên Vercel)*

---

## 2. Triển khai Backend Server lên Vercel

Backend Express Node.js của dự án được thiết kế dưới dạng hàm phi máy chủ (Serverless Functions) và có thể triển khai lên Vercel một cách cực kỳ nhanh chóng và miễn phí.

### Bước 2.1: Đẩy dự án lên GitHub/GitLab
1. Tạo một kho lưu trữ riêng tư (Private Repository) trên GitHub.
2. Cam kết (Commit) toàn bộ mã nguồn của dự án của bạn (lưu ý: đảm bảo tệp `.env` đã nằm trong `.gitignore` để tránh bị lộ khóa bí mật).
3. Đẩy (Push) mã nguồn lên kho lưu trữ GitHub.

### Bước 2.2: Liên kết và Deploy lên Vercel
1. Đăng nhập vào cổng quản trị [Vercel](https://vercel.com).
2. Nhấp vào nút **Add New** -> **Project**.
3. Tìm và chọn kho lưu trữ GitHub chứa mã nguồn dự án của bạn, sau đó nhấp **Import**.
4. **Cấu hình Project Settings**:
   - **Framework Preset**: Chọn **Other** (hệ thống sẽ tự nhận diện Node.js).
   - **Root Directory**: Để trống `./` (thư mục gốc).
5. **Cấu hình Biến môi trường (Environment Variables)**:
   Mở phần *Environment Variables* và thêm các khóa sau:
   - `MONGODB_URI`: Chuỗi kết nối MongoDB Atlas đã có ở **Bước 1.3**.
   - `GEMINI_API_KEY`: API Key nhận được từ [Google AI Studio](https://aistudio.google.com/) để gọi mô hình tóm tắt báo cáo. Nếu không điền, hệ thống sẽ tự động chuyển sang chế độ mô phỏng (Mock).
   - `PORT`: `5000` (hoặc để mặc định).
   - `NODE_ENV`: `production`
6. Nhấp vào nút **Deploy**. Vercel sẽ tự động đọc tệp cấu hình `vercel.json` ở thư mục gốc, biên dịch mã nguồn server và cung cấp cho bạn một tên miền HTTPS dạng:
   ```text
   https://ten-du-an-backend.vercel.app
   ```
   *(Sao chép URL Backend này để chuẩn bị cấu hình cho Frontend)*

---

## 3. Triển khai Frontend lên Zalo Mini App Cloud

Frontend được xây dựng bằng React Vite và sẽ được đóng gói tải lên hệ thống Zalo Cloud để phân phối trực tiếp tới người dùng Zalo.

### Bước 3.1: Đăng ký ứng dụng trên Zalo Developer
1. Truy cập [Zalo Developer Console](https://developer.zalo.me) và đăng nhập bằng tài khoản Zalo.
2. Nhấp vào **Tạo Ứng Dụng Mới** -> Chọn loại ứng dụng là **Mini App**.
3. Điền các thông tin mô tả ứng dụng, logo và thông tin liên hệ.
4. Sau khi khởi tạo thành công, bạn sẽ nhận được một dãy số **Mini App ID** (ví dụ: `4234750456143037550`).

### Bước 3.2: Cấu hình mã nguồn Frontend Local
1. Mở tệp `app-config.json` ở thư mục gốc của dự án, cập nhật hoặc kiểm tra cấu hình.
2. Tạo hoặc sửa tệp `.env` ở thư mục gốc và cấu hình API trỏ về Backend Vercel vừa deploy ở **Bước 2.2**:
   ```env
   VITE_API_URL=https://ten-du-an-backend.vercel.app
   ```
   *(Vite sẽ đọc biến môi trường này khi đóng gói mã nguồn và trỏ các API `fetch` về máy chủ Vercel)*

### Bước 3.3: Cài đặt CLI và Đóng gói Triển khai
Để đẩy ứng dụng lên Zalo Cloud, bạn cần sử dụng Zalo Mini App CLI (ZMP-CLI) thông qua command-line.

1. **Cài đặt ZMP CLI toàn cục**:
   Mở Terminal/PowerShell và chạy lệnh:
   ```bash
   npm install -g zmp-cli
   ```
2. **Đăng nhập tài khoản nhà phát triển**:
   Chạy lệnh sau và quét mã QR hiển thị trên màn hình bằng ứng dụng Zalo trên điện thoại của bạn:
   ```bash
   zmp login
   ```
3. **Đóng gói mã nguồn (Build)**:
   Chạy lệnh build tại thư mục gốc dự án để tạo thư mục `dist`:
   ```bash
   npm run build
   ```
4. **Deploy mã nguồn lên Zalo Cloud**:
   Chạy lệnh sau để tải tệp nén của ứng dụng lên máy chủ quản trị Zalo:
   ```bash
   zmp deploy
   ```
   - Nhập mô tả phiên bản mới (ví dụ: `Phiên bản nâng cấp giao diện, sửa lỗi logic v1.0`).
   - Nhấn Enter. Hệ thống sẽ tải mã nguồn lên thành công và xuất ra một đường dẫn trang quản lý phiên bản.

5. **Trải nghiệm thử**:
   - Truy cập trang quản trị ứng dụng Zalo Mini App của bạn trên [Zalo Developer](https://developer.zalo.me).
   - Chọn phiên bản vừa được tải lên từ CLI.
   - Nhấn **Thiết lập trải nghiệm** để lấy mã QR dùng cho việc kiểm tra thực tế trên điện thoại di động.

---

## 4. Cấu hình CORS & Tên miền kết nối

Để ứng dụng Frontend trên điện thoại di động có thể gọi API đến Backend Vercel mà không bị trình duyệt hoặc hệ điều hành chặn, bạn cần cấu hình Domain Whitelist.

### Bước 4.1: Cấu hình Whitelist API trên Zalo Developer
1. Truy cập [Cổng quản lý Zalo Mini App](https://developer.zalo.me).
2. Vào mục **Cấu hình ứng dụng** -> **Thiết lập cổng kết nối** (API Domain Settings).
3. Thêm URL Backend của bạn (ví dụ: `https://ten-du-an-backend.vercel.app`) vào danh sách **Allowed Domains (Whitelist)**.
4. Lưu cấu hình. Việc này đảm bảo Zalo App cho phép thiết bị di động gửi các request mạng HTTP/HTTPS đến máy chủ của bạn.

### Bước 4.2: Cấu hình CORS trên Backend (Tùy chọn nâng cao bảo mật)
Hiện tại Backend của bạn đang cho phép mọi nguồn kết nối thông qua lệnh `app.use(cors())`. Khi chạy trên môi trường Production thật, bạn nên giới hạn chỉ cho phép các request từ Zalo Mini App client để tăng độ bảo mật.
Bạn có thể cập nhật trong tệp `server/server.js` cấu hình cors an toàn hơn khi đã hoạt động ổn định:
```javascript
app.use(cors({
  origin: [
    'https://h5.zdn.vn', // Máy chủ phân phối ứng dụng của Zalo
    /zalo/ // Cho phép các domain phụ từ zalo
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

Chúc các bạn triển khai thành công hệ thống ứng dụng quản lý cuộc họp Smeet!

---

## 5. Giữ Backend Luôn "Thức" – Fix Cold Start (UptimeRobot)

Vercel Serverless Functions sẽ **tắt sau 30 giây** không hoạt động. Lần mở app tiếp theo sẽ mất 2-4 giây để server khởi động lại (cold start). Giải pháp miễn phí: ping endpoint `/api/health` mỗi 5 phút.

### Bước 5.1: Đăng ký UptimeRobot (miễn phí)
1. Truy cập [UptimeRobot.com](https://uptimerobot.com) → **Sign up free**.
2. Đăng nhập → nhấn **Add New Monitor**.
3. Cấu hình như sau:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `Smeet Backend Keep-Alive`
   - **URL**: `https://ten-du-an-backend.vercel.app/api/health` (thay bằng URL thực của bạn)
   - **Monitoring Interval**: `5 minutes`
4. Nhấp **Create Monitor**.

UptimeRobot sẽ ping backend mỗi 5 phút → server luôn trong trạng thái "thức" → **không còn cold start**.

> **Kết quả kiểm tra**: Truy cập `https://your-backend.vercel.app/api/health` trong trình duyệt, bạn sẽ thấy:
> ```json
> { "status": "ok", "service": "Smeet Backend", "timestamp": "...", "uptime": "...s" }
> ```

---

## 6. Lối Tắt & Nhắc Nhở Tự Động – Zalo OA

### Bước 6.1: Ghim Mini App vào Nhóm Zalo (Lối tắt 1 chạm)

Đây là cách đơn giản nhất để thành viên truy cập Smeet nhanh chóng:

1. **Admin nhóm** mở nhóm Zalo công ty.
2. Nhấn vào **biểu tượng tiện ích** (⊞) ở góc dưới bên phải thanh chat.
3. Chọn **Thêm tiện ích** → tìm kiếm **Smeet** (Mini App của bạn).
4. Nhấn **Ghim vào nhóm** → Mini App xuất hiện ngay trong thanh tiện ích nhóm.

✅ **Kết quả**: Mọi thành viên thấy icon Smeet ngay trong giao diện nhóm, chỉ cần **1 chạm** để mở app.

### Bước 6.2: Tạo Zalo Official Account (OA) nội bộ

Zalo OA là "tài khoản doanh nghiệp" trên Zalo, cho phép gửi tin nhắn tự động vào nhóm. **Miễn phí cho tổ chức nội bộ.**

1. Truy cập [oa.zalo.me](https://oa.zalo.me) → **Tạo OA mới**.
2. Chọn loại: **OA Doanh Nghiệp Nội Bộ**.
3. Điền thông tin: Tên OA (ví dụ: `Smeet Bot`), logo, mô tả.
4. Sau khi tạo xong, lấy **OA ID** từ trang quản lý.

### Bước 6.3: Lấy Access Token để Backend gửi tin nhắn

1. Truy cập [Zalo Developer Console](https://developers.zalo.me) → chọn App của bạn.
2. Vào **Tích hợp OA** → liên kết OA vừa tạo với ứng dụng Mini App.
3. Truy cập công cụ **Token Generator**: [developers.zalo.me/tools](https://developers.zalo.me/tools)
4. Chọn OA của bạn → **Generate Access Token**.
5. Sao chép `access_token` (có hiệu lực 90 ngày, cần gia hạn định kỳ).

### Bước 6.4: Lấy Group ID của nhóm Zalo

1. Mở ứng dụng Zalo trên điện thoại → vào nhóm công ty.
2. Mời OA Bot (`Smeet Bot`) vào nhóm.
3. Gọi API để lấy Group ID:
   ```bash
   curl -X GET "https://openapi.zalo.me/v3.0/oa/groupchat/list" \
     -H "access_token: YOUR_OA_ACCESS_TOKEN"
   ```
4. Tìm nhóm của bạn trong kết quả → lấy giá trị `group_id`.

### Bước 6.5: Cấu hình biến môi trường

Thêm vào **Vercel** → **Environment Variables** của project backend:
```env
ZALO_OA_ACCESS_TOKEN=your_oa_access_token_here
ZALO_OA_GROUP_ID=your_group_id_here
```

Hoặc trong file `server/.env` để chạy local:
```env
ZALO_OA_ACCESS_TOKEN=your_oa_access_token_here
ZALO_OA_GROUP_ID=your_group_id_here
```

### Bước 6.6: Kiểm tra nhắc nhở hoạt động

Sau khi cấu hình xong, admin có thể test gửi thông báo thủ công qua API:
```bash
curl -X POST "https://your-backend.vercel.app/api/notify/test" \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_ADMIN_USER_ID" \
  -d '{"message": "🔔 Test thông báo từ Smeet – Hệ thống nhắc nhở đang hoạt động!"}'
```

Nếu cấu hình đúng, tin nhắn sẽ xuất hiện trong nhóm Zalo ngay lập tức.

### Lịch nhắc nhở tự động

Hệ thống backend sẽ **tự động kiểm tra mỗi 30 phút** và gửi:

| Thời điểm | Nội dung thông báo |
|---|---|
| **24 giờ trước** họp | 📅 Nhắc họp ngày mai: Tên, thời gian, chủ trì, địa điểm |
| **30 phút trước** họp | 🔔 Sắp họp: Tên, giờ bắt đầu, link Meet (nếu có) |

> **Lưu ý quan trọng**: Access Token của Zalo OA có hiệu lực **90 ngày**. Hãy đặt lịch nhắc nhở để gia hạn token trước khi hết hạn để đảm bảo hệ thống nhắc nhở hoạt động liên tục.
