import React from 'react';
import { type Toast } from '../contexts/ToastContext';
import './Toast.css';

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const getAnimationDirection = (position: Toast['position']) => {
  if (position.includes('left')) {
    return 'left';
  }

  if (position.includes('right')) {
    return 'right';
  }

  return position.startsWith('top') ? 'top' : 'bottom';
};

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const role = toast.type === 'error' ? 'alert' : 'status';
  const direction = getAnimationDirection(toast.position);

  return (
    <div
      className={`toast toast--${toast.type}`}
      role={role}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      data-position={toast.position}
      data-direction={direction}
      tabIndex={0}
      data-testid={`toast-${toast.type}`}
    >
      <div className="toast__body">
        <div className="toast__message">{toast.message}</div>
        {toast.description ? <div className="toast__description">{toast.description}</div> : null}
      </div>
      <button
        type="button"
        className="toast__close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
};
