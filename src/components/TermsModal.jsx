import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const TermsModal = React.memo(({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay drawer-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-content terms-modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '680px',
          width: '92%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          padding: 0
        }}
      >
        {/* Header */}
        <div 
          className="modal-header" 
          style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            background: 'var(--card-bg, #ffffff)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={24} color="#0068FF" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color, #1e293b)' }}>
              Điều Khoản Sử Dụng & Bảo Mật
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="drawer-close-btn"
            style={{
              border: 'none',
              background: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-muted, #64748b)',
              padding: '0 4px'
            }}
          >
            &times;
          </button>
        </div>

        {/* Scrollable Body */}
        <div 
          className="modal-body" 
          style={{ 
            padding: '20px', 
            overflowY: 'auto', 
            fontSize: '0.92rem', 
            lineHeight: '1.6',
            color: 'var(--text-color, #334155)'
          }}
        >
          <h2 style={{ color: '#0068FF', fontSize: '1.25rem', borderBottom: '2px solid #0068FF', paddingBottom: '6px', marginTop: 0 }}>
            ĐIỀU KHOẢN SỬ DỤNG & CHÍNH SÁCH BẢO MẬT SMEET
          </h2>
          <p style={{ fontStyle: 'italic', color: '#64748b', marginTop: '4px' }}>Cập nhật lần cuối: 22/07/2026</p>

          <div style={{
            background: '#f8fafc',
            borderLeft: '4px solid #0068FF',
            padding: '12px 16px',
            borderRadius: '4px',
            margin: '16px 0'
          }}>
            Ứng dụng <strong>Smeet (Zalo Mini App)</strong> cam kết bảo vệ dữ liệu cá nhân của người dùng tuân thủ theo Quy định dành cho Nhà phát triển của Zalo (Zalo Developer Platform Guidelines) và Pháp luật Việt Nam.
          </div>

          <h3 style={{ color: '#1e293b', marginTop: '20px', fontSize: '1.05rem', fontWeight: 600 }}>
            1. Các Dữ Liệu Cá Nhân Thu Thập
          </h3>
          <p>Smeet xin cấp các quyền và dữ liệu tối thiểu phục vụ cho tính năng đặt lịch họp nhóm, quản lý phòng họp và lưu trữ biên bản cuộc họp:</p>
          <ul style={{ paddingLeft: '20px' }}>
            <li style={{ marginBottom: '6px' }}><strong>Thông tin tài khoản Zalo:</strong> Tên hiển thị, Ảnh đại diện (Avatar), Zalo User ID (khi người dùng đồng ý cấp quyền trên Zalo Mini App SDK).</li>
            <li style={{ marginBottom: '6px' }}><strong>Số điện thoại & Xác thực:</strong> Dùng để xác thực tài khoản, phân quyền vai trò (Quản lý, Ủy quyền, Thành viên) và gửi thông báo nhắc lịch họp.</li>
            <li style={{ marginBottom: '6px' }}><strong>Dữ liệu cuộc họp:</strong> Tiêu đề cuộc họp, thời gian, địa điểm, danh sách thành viên tham gia, nội dung ghi chú và báo cáo biên bản họp do người dùng khởi tạo.</li>
          </ul>

          <h3 style={{ color: '#1e293b', marginTop: '20px', fontSize: '1.05rem', fontWeight: 600 }}>
            2. Mục Đích Sử Dụng Dữ Liệu
          </h3>
          <ul style={{ paddingLeft: '20px' }}>
            <li style={{ marginBottom: '6px' }}>Xác thực danh tính người dùng và phân quyền vai trò khi tham gia các phòng họp nhóm.</li>
            <li style={{ marginBottom: '6px' }}>Gửi thông báo nhắc lịch họp tự động để đảm bảo các thành viên không bỏ lỡ cuộc họp.</li>
            <li style={{ marginBottom: '6px' }}>Lưu trữ và hiển thị danh sách lịch họp, điểm danh và biên bản báo cáo cuộc họp cho nhóm.</li>
            <li style={{ marginBottom: '6px' }}>Tiếp nhận và hỗ trợ xử lý báo cáo sự cố kỹ thuật khi người dùng gửi phản hồi.</li>
          </ul>

          <h3 style={{ color: '#1e293b', marginTop: '20px', fontSize: '1.05rem', fontWeight: 600 }}>
            3. Cam Kết Bảo Mật
          </h3>
          <p>
            Smeet cam kết <strong>KHÔNG</strong> bán, chia sẻ hoặc tiết lộ thông tin cá nhân của người dùng cho bất kỳ bên thứ ba nào vì mục đích thương mại hoặc quảng cáo.
          </p>

          <h3 style={{ color: '#1e293b', marginTop: '20px', fontSize: '1.05rem', fontWeight: 600 }}>
            4. Quyền Rút Đồng Ý & Xóa Dữ Liệu
          </h3>
          <p>
            Người dùng có quyền dừng sử dụng ứng dụng bất kỳ lúc nào bằng cách gỡ Mini App Smeet khỏi tài khoản Zalo. Để yêu cầu xóa toàn bộ dữ liệu cá nhân và lịch sử cuộc họp khỏi hệ thống, vui lòng liên hệ:
          </p>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 16px', borderRadius: '6px', marginTop: '8px' }}>
            • Email hỗ trợ: <strong>smeetreport@gmail.com</strong><br />
            • Thời gian xử lý yêu cầu xóa dữ liệu: Trong vòng <strong>48 giờ làm việc</strong>.
          </div>
        </div>

        {/* Footer */}
        <div 
          className="modal-footer" 
          style={{ 
            padding: '12px 20px', 
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            justify: 'flex-end',
            background: 'var(--card-bg, #ffffff)'
          }}
        >
          <button 
            type="button"
            onClick={onClose} 
            className="btn btn-primary"
            style={{ padding: '8px 24px', borderRadius: '8px' }}
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
});
