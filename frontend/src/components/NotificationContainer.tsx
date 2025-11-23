import React from 'react';
import { useNotifications, type NotificationType } from '../contexts/NotificationContext';

const getNotificationStyles = (type: NotificationType) => {
  const base = {
    padding: '1rem 1.5rem',
    borderRadius: '4px',
    marginBottom: '0.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    animation: 'slideIn 0.3s ease-out',
    minWidth: '300px',
    maxWidth: '500px',
  };

  const variants = {
    success: {
      backgroundColor: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb',
    },
    error: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb',
    },
    info: {
      backgroundColor: '#d1ecf1',
      color: '#0c5460',
      border: '1px solid #bee5eb',
    },
    warning: {
      backgroundColor: '#fff3cd',
      color: '#856404',
      border: '1px solid #ffeeba',
    },
  };

  return { ...base, ...variants[type] };
};

export const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
      <div
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {notifications.map((notification) => (
          <div key={notification.id} style={getNotificationStyles(notification.type)}>
            <span>{notification.message}</span>
            <button
              onClick={() => removeNotification(notification.id)}
              style={{
                marginLeft: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.25rem',
                cursor: 'pointer',
                color: 'inherit',
                padding: '0',
                lineHeight: '1',
              }}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
};
