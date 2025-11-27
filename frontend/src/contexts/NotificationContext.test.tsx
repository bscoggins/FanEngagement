import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { NotificationProvider, useNotifications } from '../contexts/NotificationContext';

describe('NotificationContext', () => {
  it('provides notification methods', () => {
    let notificationMethods: any;
    
    function TestComponent() {
      notificationMethods = useNotifications();
      return <div>Test</div>;
    }

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    expect(notificationMethods.showSuccess).toBeDefined();
    expect(notificationMethods.showError).toBeDefined();
    expect(notificationMethods.showInfo).toBeDefined();
    expect(notificationMethods.showWarning).toBeDefined();
    expect(notificationMethods.removeNotification).toBeDefined();
  });

  it('adds and displays notifications', async () => {
    let notificationMethods: any;
    
    function TestComponent() {
      notificationMethods = useNotifications();
      const { notifications } = useNotifications();
      
      return (
        <div>
          {notifications.map(n => (
            <div key={n.id} data-testid={`notification-${n.type}`}>
              {n.message}
            </div>
          ))}
        </div>
      );
    }

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    act(() => {
      notificationMethods.showSuccess('Success!');
    });

    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });
  });

  it('auto-removes notifications after timeout', async () => {
    vi.useFakeTimers();
    let notificationMethods: any;
    
    function TestComponent() {
      notificationMethods = useNotifications();
      const { notifications } = useNotifications();
      
      return (
        <div data-testid="notifications-container">
          {notifications.map(n => (
            <div key={n.id} data-testid={`notification-${n.id}`}>{n.message}</div>
          ))}
        </div>
      );
    }

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    // Add a notification
    act(() => {
      notificationMethods.showError('Error!');
    });

    // Verify notification is present
    const container = screen.getByTestId('notifications-container');
    expect(container.textContent).toContain('Error!');

    // Advance fake timers past the 5 second auto-removal
    act(() => {
      vi.advanceTimersByTime(5100);
    });

    // Verify notification was removed
    expect(container.textContent).not.toContain('Error!');
    
    vi.useRealTimers();
  });
});
