import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface ToastOptions {
  duration?: number;
  position?: ToastPosition;
  description?: string;
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration: number;
  position: ToastPosition;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (type: ToastType, message: string, options?: ToastOptions) => string;
  showSuccess: (message: string, options?: ToastOptions) => string;
  showError: (message: string, options?: ToastOptions) => string;
  showInfo: (message: string, options?: ToastOptions) => string;
  showWarning: (message: string, options?: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

const DEFAULT_DURATION = 5000;
const DEFAULT_POSITION: ToastPosition = 'top-right';

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, options: ToastOptions = {}) => {
      const id = generateId();
      const duration = options.duration ?? DEFAULT_DURATION;
      const toast: Toast = {
        id,
        type,
        message,
        description: options.description,
        duration,
        position: options.position ?? DEFAULT_POSITION,
      };

      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        const timeoutId = setTimeout(() => {
          dismissToast(id);
        }, duration);
        timeoutsRef.current.set(id, timeoutId);
      }

      return id;
    },
    [dismissToast]
  );

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutsRef.current.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      toasts,
      showToast: addToast,
      showSuccess: (message: string, options?: ToastOptions) => addToast('success', message, options),
      showError: (message: string, options?: ToastOptions) => addToast('error', message, options),
      showInfo: (message: string, options?: ToastOptions) => addToast('info', message, options),
      showWarning: (message: string, options?: ToastOptions) => addToast('warning', message, options),
      dismissToast,
    }),
    [addToast, dismissToast, toasts]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
