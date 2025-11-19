import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderProtectedRoute = (initialRoute = '/protected') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('redirects to /login when user is not authenticated', () => {
    renderProtectedRoute();
    
    // Should show login page
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders protected content when user is authenticated', async () => {
    // Simulate existing auth session
    localStorage.setItem('authToken', 'test-token');
    localStorage.setItem('authUser', JSON.stringify({
      token: 'test-token',
      userId: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    }));

    renderProtectedRoute();
    
    // Should show protected content (wait for AuthContext to load from localStorage)
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
