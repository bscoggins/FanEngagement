import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useRoleBasedNavigation } from '../hooks/useRoleBasedNavigation';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

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
          <Input
            id="mfaCode"
            label="MFA Code *"
            type="text"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            placeholder="Enter 6-digit code"
            required
            autoFocus
          />
          {error && (
            <div
              role="alert"
              data-testid="mfa-error"
              style={{ padding: '0.75rem', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c33' }}
            >
              {error}
            </div>
          )}
          <Button
            type="submit"
            isLoading={isLoading}
            variant="primary"
            fullWidth
          >
            Verify Code
          </Button>
          <Button
            type="button"
            onClick={() => {
              setMfaRequired(false);
              setPendingUserId(null);
              setMfaCode('');
              setError('');
            }}
            variant="secondary"
            fullWidth
          >
            Back to Login
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="login-page" style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input
          id="email"
          label="Email *"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          id="password"
          label="Password *"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && (
          <div
            role="alert"
            data-testid="login-error"
            style={{ padding: '0.75rem', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c33' }}
          >
            {error}
          </div>
        )}
        <Button
          type="submit"
          isLoading={isLoading}
          variant="primary"
          fullWidth
        >
          {isLoading ? 'Logging in...' : 'Log In'}
        </Button>
      </form>
    </div>
  );
};
