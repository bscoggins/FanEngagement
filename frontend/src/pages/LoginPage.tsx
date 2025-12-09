import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useRoleBasedNavigation } from '../hooks/useRoleBasedNavigation';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const { login, validateMfa, isAuthenticated, user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const { navigateToDefaultRoute } = useRoleBasedNavigation();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      void navigateToDefaultRoute(user);
    }
  }, [isAuthenticated, user, navigateToDefaultRoute]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login({ email, password });
      
      if (result.mfaRequired) {
        // MFA is required, show MFA input
        setMfaRequired(true);
        setPendingUserId(result.userId);
        setIsLoading(false);
      } else {
        // Normal login without MFA
        showSuccess('Login successful!');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password. Please try again.');
      showError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!pendingUserId) {
        throw new Error('No pending user ID');
      }

      await validateMfa({ userId: pendingUserId, code: mfaCode });
      showSuccess('Login successful!');
    } catch (err) {
      console.error('MFA validation error:', err);
      setError('Invalid MFA code. Please try again.');
      showError('Invalid MFA code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (mfaRequired) {
    return (
      <div className="login-page" style={{ maxWidth: '400px', margin: '2rem auto' }}>
        <h2>Two-Factor Authentication</h2>
        <p style={{ marginBottom: '1rem', color: '#666' }}>
          Enter the 6-digit code from your authenticator app or use a backup code.
        </p>
        <form onSubmit={handleMfaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="mfaCode" style={{ display: 'block', marginBottom: '0.5rem' }}>
              MFA Code
            </label>
            <input
              id="mfaCode"
              type="text"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="Enter 6-digit code"
              required
              autoFocus
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
              data-testid="mfa-error"
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
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMfaRequired(false);
              setPendingUserId(null);
              setMfaCode('');
              setError('');
            }}
            style={{
              padding: '0.75rem',
              fontSize: '1rem',
              backgroundColor: '#fff',
              color: '#666',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Back to Login
          </button>
        </form>
      </div>
    );
  }

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
