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
  showSuccess: (message: string, options?: ToastOptions) => string;
  showError: (message: string, options?: ToastOptions) => string;
  showInfo: (message: string, options?: ToastOptions) => string;
  showWarning: (message: string, options?: ToastOptions) => string;
  removeNotification: (id: string) => void;
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ToastProvider>{children}</ToastProvider>
);

export const useNotifications = (): NotificationContextType => {
  const { toasts, showSuccess, showError, showInfo, showWarning, dismissToast } = useToast();

  return {
    notifications: toasts,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    removeNotification: dismissToast,
  };
};
