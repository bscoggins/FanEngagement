import React, { type ReactNode } from 'react';
import {
  ToastProvider,
  useToast,
  type Toast,
  type ToastOptions,
  type ToastPosition,
  type ToastType,
} from './ToastContext';

export type NotificationType = ToastType;
export type NotificationPosition = ToastPosition;
export type NotificationOptions = ToastOptions;

export interface Notification extends Toast {}

interface NotificationContextType {
  notifications: Notification[];
  showSuccess: (message: string, options?: ToastOptions) => void;
  showError: (message: string, options?: ToastOptions) => void;
  showInfo: (message: string, options?: ToastOptions) => void;
  showWarning: (message: string, options?: ToastOptions) => void;
  removeNotification: (id: string) => void;
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ToastProvider>{children}</ToastProvider>
);

export const useNotifications = (): NotificationContextType => {
  const {
    toasts,
    showSuccess: toastSuccess,
    showError: toastError,
    showInfo: toastInfo,
    showWarning: toastWarning,
    dismissToast,
  } = useToast();

  return {
    notifications: toasts,
    showSuccess: (message: string, options?: ToastOptions) => {
      toastSuccess(message, options);
    },
    showError: (message: string, options?: ToastOptions) => {
      toastError(message, options);
    },
    showInfo: (message: string, options?: ToastOptions) => {
      toastInfo(message, options);
    },
    showWarning: (message: string, options?: ToastOptions) => {
      toastWarning(message, options);
    },
    removeNotification: dismissToast,
  };
};
