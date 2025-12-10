import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { usersApi } from '../api/usersApi';
import { useNotifications } from '../contexts/NotificationContext';
import { parseApiError } from '../utils/errorUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { MfaSettings } from '../components/MfaSettings';
import type { UserProfile, ThemePreference } from '../types/api';

export const MyAccountPage: React.FC = () => {
  const { user: authUser, isAdmin, setUserThemePreference } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
  });
  const [themePreference, setThemePreference] = useState<ThemePreference>('Light');
  const [themeError, setThemeError] = useState('');
  const [isUpdatingTheme, setIsUpdatingTheme] = useState(false);

  // Create user data from auth context for non-admin users
  // Admin users will fetch from API to get full data including createdAt
  const authUserData: UserProfile | null = useMemo(() => {
    if (!authUser) return null;
    return {
      id: authUser.userId,
      email: authUser.email,
      displayName: authUser.displayName,
      role: authUser.role,
      themePreference: authUser.themePreference,
      // createdAt is intentionally omitted - not available from auth context
    };
  }, [authUser]);

  const fetchUser = async () => {
    if (!authUser?.userId) return;

    // For non-admin users, use auth context data instead of API call
    // The /users/{id} endpoint requires GlobalAdmin policy
    if (!isAdmin) {
      setUser(authUserData);
      if (authUserData) {
        setFormData({
          displayName: authUserData.displayName,
          email: authUserData.email,
        });
        setThemePreference(authUserData.themePreference ?? 'Light');
      }
      setLoading(false);
      return;
    }

    // Admin users can fetch from API to get full data
    try {
      setLoading(true);
      setError('');
      const userData = await usersApi.getById(authUser.userId);
      setUser(userData);
      setFormData({
        displayName: userData.displayName,
        email: userData.email,
      });
      setThemePreference(userData.themePreference ?? 'Light');
    } catch (err) {
      console.error('Failed to fetch user:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.userId, isAdmin, authUserData]);

  const handleThemeChange = useCallback(async (preference: ThemePreference) => {
    if (preference === themePreference || isUpdatingTheme) {
      return;
    }

    try {
      setThemeError('');
      setIsUpdatingTheme(true);
      await usersApi.updateMyThemePreference({ themePreference: preference });
      setThemePreference(preference);
      setUser((prev) => (prev ? { ...prev, themePreference: preference } : prev));
      setUserThemePreference(preference);
      showSuccess(preference === 'Dark' ? 'Dark mode enabled' : 'Light mode enabled');
    } catch (err) {
      const errorMessage = parseApiError(err);
      setThemeError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsUpdatingTheme(false);
    }
  }, [themePreference, isUpdatingTheme, showSuccess, showError, setUserThemePreference]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setError('');
      const updated = await usersApi.update(user.id, {
        displayName: formData.displayName,
        email: formData.email,
      });
      setUser(updated);
      setIsEditing(false);
      showSuccess('Profile updated successfully!');
    } catch (err: any) {
      console.error('Failed to update user:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading account..." />;
  }

  if (error && !user) {
    return <ErrorMessage message={error} onRetry={fetchUser} />;
  }

  if (!user) {
    return <div style={{ padding: '2rem' }}>User not found.</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>My Account</h1>

      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {!isEditing ? (
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Name:</strong> {user.displayName}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Email:</strong> {user.email}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Role:</strong> {user.role}
            </div>
            {user.createdAt && (
              <div style={{ marginBottom: '1rem' }}>
                <strong>Member Since:</strong>{' '}
                {new Date(user.createdAt).toLocaleDateString()}
              </div>
            )}
          </div>

          {isAdmin ? (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Edit Profile
            </button>
          ) : (
            <p style={{ color: '#6c757d', fontStyle: 'italic' }}>
              Contact an administrator to update your profile information.
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="displayName" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Name:
            </label>
            <input
              type="text"
              id="displayName"
              value={formData.displayName}
              onChange={(e) =>
                setFormData({ ...formData, displayName: e.target.value })
              }
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Email:
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <strong>Role:</strong> {user.role}{' '}
            {!isAdmin && <span style={{ color: '#6c757d' }}>(Cannot be changed)</span>}
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  displayName: user.displayName,
                  email: user.email,
                });
                setError('');
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Theme Preference Section */}
      <section
        style={{
          marginTop: '3rem',
          padding: '2rem',
          borderRadius: '12px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-subtle)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'baseline',
          }}
        >
          <div>
            <h2 style={{ marginBottom: '0.25rem' }}>Interface Theme</h2>
            <p style={{ margin: 0, maxWidth: '48ch', color: 'var(--color-text-secondary)' }}>
              Tune the dashboard to match your working style. Theme changes take effect instantly and persist for every login.
            </p>
          </div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Current: {themePreference}</span>
        </div>

        {themeError && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              border: '1px solid #f5c6cb',
            }}
            data-testid="theme-error"
          >
            {themeError}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginTop: '1.5rem',
          }}
        >
          {(['Light', 'Dark'] as ThemePreference[]).map((option) => {
            const isActive = themePreference === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleThemeChange(option)}
                disabled={isUpdatingTheme}
                aria-pressed={isActive}
                data-testid={`theme-${option.toLowerCase()}-button`}
                style={{
                  padding: '1.25rem',
                  textAlign: 'left',
                  borderRadius: '12px',
                  border: isActive ? '2px solid var(--color-primary-600)' : '2px solid var(--color-border-default)',
                  background: isActive ? 'var(--color-primary-50)' : 'var(--color-surface)',
                  boxShadow: isActive ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
                  color: isActive ? 'var(--color-primary-700)' : 'var(--color-text-primary)',
                  cursor: isUpdatingTheme ? 'not-allowed' : 'pointer',
                  transition: 'all var(--duration-normal) var(--ease-in-out)',
                }}
              >
                <span style={{ display: 'block', fontWeight: 600, letterSpacing: '0.02em' }}>
                  {option === 'Light' ? 'Sunrise' : 'Midnight'} Mode
                </span>
                <span style={{ display: 'block', marginTop: '0.25rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  {option === 'Light'
                    ? 'Clean panels with crisp neutrals and bold accents.'
                    : 'Deep graphite surfaces with saturated electric blues.'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Password Change Section */}
      <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #ddd' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Change Password</h2>
        <PasswordChangeForm />
      </div>

      {/* MFA Settings - Only for Admin users */}
      {isAdmin && <MfaSettings />}
    </div>
  );
};

// Password Change Form Component
const PasswordChangeForm: React.FC = () => {
  const { showSuccess, showError } = useNotifications();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    // Validate password length
    if (formData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      await usersApi.changeMyPassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      showSuccess('Password changed successfully!');
      
      // Clear form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      console.error('Failed to change password:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="password-change-form">
      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            marginBottom: '1rem',
          }}
          data-testid="password-error"
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="currentPassword" style={{ display: 'block', marginBottom: '0.5rem' }}>
          Current Password:
        </label>
        <input
          type="password"
          id="currentPassword"
          name="currentPassword"
          value={formData.currentPassword}
          onChange={handleChange}
          required
          disabled={isSubmitting}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
          data-testid="current-password-input"
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="newPassword" style={{ display: 'block', marginBottom: '0.5rem' }}>
          New Password:
        </label>
        <input
          type="password"
          id="newPassword"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          required
          disabled={isSubmitting}
          minLength={8}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
          data-testid="new-password-input"
        />
        <small style={{ color: '#6c757d', display: 'block', marginTop: '0.25rem' }}>
          Minimum 8 characters
        </small>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '0.5rem' }}>
          Confirm New Password:
        </label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          disabled={isSubmitting}
          minLength={8}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
          data-testid="confirm-password-input"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: isSubmitting ? '#6c757d' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
        }}
        data-testid="change-password-button"
      >
        {isSubmitting ? 'Changing Password...' : 'Change Password'}
      </button>
    </form>
  );
};
