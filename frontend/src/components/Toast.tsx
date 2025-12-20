import React, { useEffect, useMemo, useState } from 'react';
import { type Toast as ToastModel } from '../contexts/ToastContext';
import './Toast.css';

type ToastAnimationStyle = React.CSSProperties & {
  '--toast-translate-x'?: string;
  '--toast-translate-y'?: string;
};

const SLIDE_DISTANCE = '120%';
const PILL_RADIUS = '9999px';
const SURFACE_ELEVATED = 'var(--color-surface-elevated, var(--color-surface))';
const MAX_TICK_INTERVAL = 150;
const MIN_TICK_INTERVAL = 30;
const TARGET_TICKS = 30;
const SR_ONLY_STYLE: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const CONTENT_GRID_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--spacing-3)',
  alignItems: 'flex-start',
};

const ICON_BASE_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '2.5rem',
  height: '2.5rem',
  borderRadius: `var(--radius-full, ${PILL_RADIUS})`,
  background: SURFACE_ELEVATED,
  boxShadow: 'var(--shadow-sm)',
  transition: 'transform var(--duration-normal) var(--ease-out)',
};

const PROGRESS_TRACK_BASE_STYLE: React.CSSProperties = {
  marginTop: 'var(--spacing-2)',
  height: '0.35rem',
  borderRadius: `var(--radius-full, ${PILL_RADIUS})`,
  overflow: 'hidden',
};

const PROGRESS_BAR_BASE_STYLE: React.CSSProperties = {
  height: '100%',
  borderRadius: 'inherit',
  transition: 'width 80ms linear',
};

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

const getSlideOffset = (direction: ReturnType<typeof getAnimationDirection>) => {
  switch (direction) {
    case 'left':
      return { x: `-${SLIDE_DISTANCE}`, y: '0' };
    case 'right':
      return { x: SLIDE_DISTANCE, y: '0' };
    case 'top':
      return { x: '0', y: `-${SLIDE_DISTANCE}` };
    case 'bottom':
      return { x: '0', y: SLIDE_DISTANCE };
    default:
      return { x: SLIDE_DISTANCE, y: '0' };
  }
};

const iconByType: Record<ToastModel['type'], React.ReactNode> = {
  success: (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
      <path
        d="M20 6 9 17l-5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
      <path
        d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
      <path
        d="m6 6 12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 16v-4m0-4h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
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
  const { x: offsetX, y: offsetY } = getSlideOffset(direction);
  const animationKey = toast.id;

  useEffect(() => {
    setProgress(100);
    if (toast.duration <= 0) {
      return;
    }

    const start = performance.now();
    const duration = toast.duration;
    const maxFeasibleTicks = Math.max(1, Math.floor(duration / MIN_TICK_INTERVAL));
    const effectiveTargetTicks = Math.min(TARGET_TICKS, maxFeasibleTicks);
    const rawInterval = duration / effectiveTargetTicks;
    const tickInterval = Math.min(MAX_TICK_INTERVAL, Math.max(MIN_TICK_INTERVAL, rawInterval));

    const intervalId = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const ratio = Math.min(elapsed / duration, 1);
      const nextProgress = 100 - ratio * 100;
      setProgress(nextProgress);

      if (ratio >= 1) {
        setProgress(0);
        window.clearInterval(intervalId);
      }
    }, tickInterval);

    return () => window.clearInterval(intervalId);
  }, [animationKey, toast.duration]);

  const icon = iconByType[toast.type];
  const accentColor = accentColorByType[toast.type];
  const trackColor = trackColorByType[toast.type];
  const remainingMs = useMemo(() => Math.max(0, Math.round((progress / 100) * toast.duration)), [progress, toast.duration]);
  const typeLabel = useMemo(() => {
    switch (toast.type) {
      case 'success':
        return 'Success notification';
      case 'error':
        return 'Error notification';
      case 'warning':
        return 'Warning notification';
      case 'info':
      default:
        return 'Information notification';
    }
  }, [toast.type]);
  const animationStyle: ToastAnimationStyle = {
    '--toast-translate-x': offsetX,
    '--toast-translate-y': offsetY,
  };

  return (
    <div
      className={`toast toast--${toast.type}`}
      role={isError ? 'alert' : undefined}
      data-position={toast.position}
      data-direction={direction}
      data-testid={`toast-${toast.type}`}
      style={animationStyle}
    >
      <div
        className="toast__content"
        style={CONTENT_GRID_STYLE}
      >
        <span
          aria-hidden="true"
          data-testid="toast-icon"
          style={{
            ...ICON_BASE_STYLE,
            color: accentColor,
          }}
        >
          {icon}
        </span>
        <div className="toast__body">
          <span style={SR_ONLY_STYLE}>{typeLabel}</span>
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
            ...PROGRESS_TRACK_BASE_STYLE,
            background: trackColor,
          }}
        >
          <div
            data-testid="toast-progress"
            style={{
              ...PROGRESS_BAR_BASE_STYLE,
              width: `${progress}%`,
              background: accentColor,
            }}
          />
        </div>
      ) : null}
      {toast.duration > 0 ? (
        <span style={SR_ONLY_STYLE} aria-live="polite">
          Dismissing in {Math.ceil(remainingMs / 1000)} seconds
        </span>
      ) : null}
    </div>
  );
};
