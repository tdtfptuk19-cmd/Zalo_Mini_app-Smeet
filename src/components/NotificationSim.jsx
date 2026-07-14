import React from 'react';
import { MessageSquare } from 'lucide-react';

export const NotificationSim = React.memo(({ message }) => {
  if (!message) return null;

  return (
    <div className="notification-toast-container">
      <div className="notification-toast-icon-wrapper">
        <MessageSquare size={20} />
      </div>
      <div className="notification-toast-content">
        <div className="notification-toast-title">
          <span>Thông báo Zalo / SMS</span>
          <span className="notification-toast-time">Vừa xong</span>
        </div>
        <p className="notification-toast-text">{message}</p>
      </div>
    </div>
  );
});

NotificationSim.displayName = 'NotificationSim';
