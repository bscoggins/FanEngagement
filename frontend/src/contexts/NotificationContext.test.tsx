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
    try {
      let notificationMethods: any;
      
      function TestComponent() {
        notificationMethods = useNotifications();
        const { notifications } = useNotifications();
        
        return (
          <div>
            {notifications.map(n => (
              <div key={n.id}>{n.message}</div>
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
        notificationMethods.showError('Error!');
      });

      await waitFor(() => {
        expect(screen.getByText('Error!')).toBeInTheDocument();
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await waitFor(() => {
        expect(screen.queryByText('Error!')).not.toBeInTheDocument();
      });
    } finally {
      vi.useRealTimers();
    }
  }, 10000); // Increase timeout for this test
});
