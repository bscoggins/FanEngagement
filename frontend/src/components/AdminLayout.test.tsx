import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { AdminLayout } from './AdminLayout';

describe('AdminLayout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderAdminLayout = (initialRoute = '/admin') => {
    // Set up auth state for admin user
    localStorage.setItem('authToken', 'test-token');
    localStorage.setItem('authUser', JSON.stringify({
      token: 'test-token',
      userId: 'user-123',
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'Admin',
    }));

    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <Routes>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<div>Dashboard Content</div>} />
              <Route path="users" element={<div>Users Content</div>} />
              <Route path="organizations" element={<div>Organizations Content</div>} />
              <Route path="dev-tools" element={<div>Dev Tools Content</div>} />
            </Route>
            <Route path="/" element={<div>Home Page</div>} />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('renders admin header with title', () => {
    renderAdminLayout();
    expect(screen.getByText('FanEngagement Admin')).toBeInTheDocument();
  });

  it('displays user email in header', async () => {
    renderAdminLayout();
    await waitFor(() => {
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    });
  });

  it('displays logout button', () => {
    renderAdminLayout();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('displays sidebar navigation links', () => {
    renderAdminLayout();
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Organizations')).toBeInTheDocument();
    expect(screen.getByText('Dev Tools')).toBeInTheDocument();
  });

  it('displays back to main app link', () => {
    renderAdminLayout();
    const backLink = screen.getByText('← Back to Main App');
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('renders child content in main area', () => {
    renderAdminLayout('/admin');
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('navigates to users page when users link is clicked', async () => {
    renderAdminLayout('/admin');
    const user = userEvent.setup();
    
    const usersLink = screen.getByText('Users').closest('a');
    expect(usersLink).toHaveAttribute('href', '/admin/users');
    
    await user.click(usersLink!);
    
    await waitFor(() => {
      expect(screen.getByText('Users Content')).toBeInTheDocument();
    });
  });

  it('has correct navigation link hrefs', () => {
    renderAdminLayout();
    
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    const usersLink = screen.getByText('Users').closest('a');
    const orgsLink = screen.getByText('Organizations').closest('a');
    const devToolsLink = screen.getByText('Dev Tools').closest('a');
    
    expect(dashboardLink).toHaveAttribute('href', '/admin');
    expect(usersLink).toHaveAttribute('href', '/admin/users');
    expect(orgsLink).toHaveAttribute('href', '/admin/organizations');
    expect(devToolsLink).toHaveAttribute('href', '/admin/dev-tools');
  });

  it('handles logout button click', async () => {
    renderAdminLayout();
    const user = userEvent.setup();
    
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await user.click(logoutButton);
    
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  it('handles auth:logout event from API client', async () => {
    renderAdminLayout();
    
    // Dispatch the auth:logout event (simulating a 401 from the API)
    window.dispatchEvent(new CustomEvent('auth:logout'));
    
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
    
    // Verify localStorage was cleared
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('authUser')).toBeNull();
  });
});
