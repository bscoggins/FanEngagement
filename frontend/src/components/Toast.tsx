import React from 'react';
import { type Toast as ToastModel } from '../contexts/ToastContext';
import './Toast.css';

interface ToastProps {
  toast: ToastModel;
  onDismiss: (id: string) => void;
}

const getAnimationDirection = (position: ToastModel['position']) => {
  switch (position) {
    case 'top-left':
    case 'bottom-left':
      return 'left';
    case 'top-right':
    case 'bottom-right':
      return 'right';
    case 'top-center':
      return 'top';
    case 'bottom-center':
      return 'bottom';
    default:
      return 'right';
  }
};

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const isError = toast.type === 'error';
  const direction = getAnimationDirection(toast.position);

  return (
    <div
      className={`toast toast--${toast.type}`}
      role={isError ? 'alert' : undefined}
      data-position={toast.position}
      data-direction={direction}
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
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
};
