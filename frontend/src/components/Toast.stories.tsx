import type { CSSProperties } from 'react';
import type { Meta } from '@storybook/react';
import { NotificationContainer } from './NotificationContainer';
import { ToastProvider, useToast, type ToastPosition } from '../contexts/ToastContext';

const meta: Meta<typeof NotificationContainer> = {
  title: 'Components/Feedback/Toast',
  component: NotificationContainer,
};

export default meta;

const buttonStyle: CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  border: '1px solid var(--color-border-default)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
};

const positions: ToastPosition[] = ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'];

const ToastPlayground = () => {
  const { showSuccess, showError, showInfo, showWarning } = useToast();

  return (
    <div style={{ display: 'grid', gap: '1rem', alignItems: 'start' }}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button style={buttonStyle} onClick={() => showSuccess('Saved successfully')}>
          Success
        </button>
        <button style={buttonStyle} onClick={() => showWarning('Heads up! Something needs attention')}>
          Warning
        </button>
        <button style={buttonStyle} onClick={() => showError('Something went wrong')}>
          Error
        </button>
        <button style={buttonStyle} onClick={() => showInfo('FYI: This is additional context')}>
          Info
        </button>
      </div>

      <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        {positions.map((position) => (
          <button
            key={position}
            style={buttonStyle}
            onClick={() => showInfo(`Toast at ${position}`, { position })}
            aria-label={`Show toast at ${position}`}
          >
            {position}
          </button>
        ))}
      </div>
    </div>
  );
};

export const Interactive = () => (
  <ToastProvider>
    <NotificationContainer />
    <ToastPlayground />
  </ToastProvider>
);
