import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { AdminRoute } from './AdminRoute';

describe('AdminRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderAdminRoute = (initialRoute = '/admin', role = 'Admin') => {
    // Set up auth state
    if (role) {
      localStorage.setItem('authToken', 'test-token');
      localStorage.setItem('authUser', JSON.stringify({
        token: 'test-token',
        userId: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: role,
      }));
    }

    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/" element={<div>Home Page</div>} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <div>Admin Content</div>
                </AdminRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('redirects to /login when user is not authenticated', () => {
    renderAdminRoute('/admin', '');
    
    // Should show login page
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('redirects to home when user is authenticated but not admin', async () => {
    renderAdminRoute('/admin', 'User');
    
    // Should redirect to home page
    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('renders admin content when user is authenticated and is admin', async () => {
    renderAdminRoute('/admin', 'Admin');
    
    // Should show admin content
    await waitFor(() => {
      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Home Page')).not.toBeInTheDocument();
  });
});
