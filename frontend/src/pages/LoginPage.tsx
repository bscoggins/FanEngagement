import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { getDefaultRouteForUser } from '../utils/routeUtils';
import { membershipsApi } from '../api/membershipsApi';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    const redirectAuthenticatedUser = async () => {
      if (isAuthenticated && user) {
        // For admins, redirect immediately
        if (user.role === 'Admin') {
          navigate(getDefaultRouteForUser(user));
          return;
        }
        // For non-admins, fetch memberships to determine if they're OrgAdmin
        try {
          const memberships = await membershipsApi.getByUserId(user.userId);
          navigate(getDefaultRouteForUser(user, memberships));
        } catch {
          // On error, use default route without memberships
          navigate(getDefaultRouteForUser(user));
        }
      }
    };
    redirectAuthenticatedUser();
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const friendlyMessage = 'Invalid email or password. Please try again.';

    try {
      await login({ email, password });
      showSuccess('Login successful!');
      
      // After successful login, navigate based on user role
      // Get the user from localStorage since login stores it there
      const storedUser = localStorage.getItem('authUser');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role === 'Admin') {
          navigate(getDefaultRouteForUser(parsedUser));
        } else {
          // For non-admins, fetch memberships to determine route
          try {
            const memberships = await membershipsApi.getByUserId(parsedUser.userId);
            navigate(getDefaultRouteForUser(parsedUser, memberships));
          } catch {
            navigate(getDefaultRouteForUser(parsedUser));
          }
        }
      }
    } catch (err) {
      // Handle login errors
      console.error('Login error:', err);
      setError(friendlyMessage);
      showError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </div>
        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </div>
        {error && (
          <div
            role="alert"
            data-testid="login-error"
            style={{ padding: '0.75rem', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c33' }}
          >
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: '0.75rem',
            fontSize: '1rem',
            backgroundColor: isLoading ? '#ccc' : '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  );
};
