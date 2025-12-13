import React, { useMemo } from 'react';
import { Toast } from './Toast';
import { useToast, type ToastPosition } from '../contexts/ToastContext';

const POSITIONS: ToastPosition[] = ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'];

export const NotificationContainer: React.FC = () => {
  const { toasts, dismissToast } = useToast();

  const groupedToasts = useMemo(() => {
    const groups = new Map<ToastPosition, typeof toasts>();
    POSITIONS.forEach((position) => groups.set(position, []));

    toasts.forEach((toast) => {
      const stack = groups.get(toast.position);
      if (stack) {
        stack.push(toast);
      } else {
        groups.set(toast.position, [toast]);
      }
    });

    return groups;
  }, [toasts]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-portal" role="status" aria-live="polite" aria-atomic="true">
      {POSITIONS.map((position) => {
        const stack = groupedToasts.get(position);
        if (!stack || stack.length === 0) {
          return null;
        }

        return (
          <div key={position} className={`toast-stack toast-stack--${position}`} data-position={position}>
            {stack.map((toast) => (
              <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
            ))}
          </div>
        );
      })}
    </div>
  );
};
