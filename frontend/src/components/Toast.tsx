import React, { useEffect, useMemo, useState } from 'react';
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

const iconByType: Record<ToastModel['type'], string> = {
  success: '✓',
  warning: '⚠',
  error: '✗',
  info: 'ℹ',
};

const accentColorByType: Record<ToastModel['type'], string> = {
  success: 'var(--color-success-600)',
  warning: 'var(--color-warning-700)',
  error: 'var(--color-error-700)',
  info: 'var(--color-info-700)',
};

const trackColorByType: Record<ToastModel['type'], string> = {
  success: 'var(--color-success-100)',
  warning: 'var(--color-warning-100)',
  error: 'var(--color-error-100)',
  info: 'var(--color-info-100)',
};

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const isError = toast.type === 'error';
  const direction = getAnimationDirection(toast.position);
  const [progress, setProgress] = useState(100);
  const offsetX = direction === 'left' ? '-120%' : direction === 'right' ? '120%' : '0';
  const offsetY = direction === 'top' ? '-120%' : direction === 'bottom' ? '120%' : '0';

  useEffect(() => {
    setProgress(100);
    if (toast.duration <= 0) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setProgress(0);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [toast.duration, toast.id]);

  const icon = useMemo(() => iconByType[toast.type], [toast.type]);
  const accentColor = useMemo(() => accentColorByType[toast.type], [toast.type]);
  const trackColor = useMemo(() => trackColorByType[toast.type], [toast.type]);

  return (
    <div
      className={`toast toast--${toast.type}`}
      role={isError ? 'alert' : undefined}
      data-position={toast.position}
      data-direction={direction}
      data-testid={`toast-${toast.type}`}
      style={{
        // Ensure slide-in starts from viewport edge using transform for performance
        ['--toast-translate-x' as string]: offsetX,
        ['--toast-translate-y' as string]: offsetY,
      }}
    >
      <div
        className="toast__content"
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: 'var(--spacing-3)',
          alignItems: 'start',
        }}
      >
        <span
          aria-hidden="true"
          data-testid="toast-icon"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: 'var(--radius-full, 9999px)',
            background: 'var(--color-surface-elevated, var(--color-surface))',
            color: accentColor,
            boxShadow: 'var(--shadow-sm)',
            transition: 'transform var(--duration-normal) var(--ease-out)',
          }}
        >
          {icon}
        </span>
        <div className="toast__body">
          <div className="toast__message">{toast.message}</div>
          {toast.description ? <div className="toast__description">{toast.description}</div> : null}
        </div>
      </div>
      <button
        type="button"
        className="toast__close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <span aria-hidden="true">×</span>
      </button>
      {toast.duration > 0 ? (
        <div
          aria-hidden="true"
          data-testid="toast-progress-track"
          style={{
            gridColumn: '1 / span 2',
            marginTop: 'var(--spacing-2)',
            height: '0.35rem',
            borderRadius: 'var(--radius-full, 9999px)',
            background: trackColor,
            overflow: 'hidden',
          }}
        >
          <div
            data-testid="toast-progress"
            style={{
              width: `${progress}%`,
              height: '100%',
              background: accentColor,
              borderRadius: 'inherit',
              transition: `width ${toast.duration}ms linear`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
};
