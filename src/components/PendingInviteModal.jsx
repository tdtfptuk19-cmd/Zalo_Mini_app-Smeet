import React from 'react';
import { MailCheck, CheckCircle2, XCircle } from 'lucide-react';

export const PendingInviteModal = ({
  invite,
  onRespond
}) => {
  if (!invite) return null;

  const roleText = invite.role === 'admin' 
    ? 'Quản lý (Admin Host)' 
    : invite.role === 'delegated' 
      ? 'Ủy quyền tổ chức (Delegated)' 
      : 'Thành viên tham gia (Member)';

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content confirmation-modal" style={{ maxWidth: '440px', padding: '24px', borderRadius: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ width: '56px', height: '56px', background: '#e0f2fe', color: '#0068FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
            <MailCheck size={28} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main, #1e293b)' }}>
            Lời Mời Gia Nhập Nhóm
          </h3>
        </div>

        <div className="modal-body" style={{ padding: '0 0 20px 0', textAlign: 'center' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#475569', lineHeight: '1.5' }}>
            <strong>{invite.inviterName}</strong> vừa mời bạn gia nhập nhóm họp SMeet với vai trò:
          </p>
          <div style={{ background: '#f8fafc', padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold', color: '#0068FF', display: 'inline-block', fontSize: '0.9rem' }}>
            {roleText}
          </div>
        </div>

        <div className="modal-footer-buttons" style={{ display: 'flex', gap: '12px' }}>
          <button 
            type="button"
            onClick={() => onRespond(invite.id, 'accept')} 
            className="btn btn-primary"
            style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <CheckCircle2 size={16} />
            <span>Chấp nhận</span>
          </button>

          <button 
            type="button"
            onClick={() => onRespond(invite.id, 'decline')} 
            className="btn btn-secondary"
            style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <XCircle size={16} />
            <span>Từ chối</span>
          </button>
        </div>
      </div>
    </div>
  );
};
