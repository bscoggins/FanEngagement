import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { usersApi } from '../api/usersApi';
import { useNotifications } from '../contexts/NotificationContext';
import { parseApiError } from '../utils/errorUtils';
import { ErrorMessage } from '../components/ErrorMessage';
import { MfaSettings } from '../components/MfaSettings';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import '../pages/AdminPage.css';
import type { UserProfile, ThemePreference } from '../types/api';
import { Skeleton, SkeletonTextLines } from '../components/Skeleton';

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
    return (
      <div className="admin-page" role="status" aria-live="polite">
        <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          <h1>Loading account</h1>
          <SkeletonTextLines count={3} widths={['55%', '70%', '40%']} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--spacing-3)' }}>
            <Skeleton height="2.75rem" />
            <Skeleton height="2.75rem" />
            <Skeleton height="2.75rem" />
          </div>
          <p className="admin-secondary-text" style={{ margin: 0 }}>
            Loading account...
          </p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return <ErrorMessage message={error} onRetry={fetchUser} />;
  }

  if (!user) {
    return <div style={{ padding: '2rem' }}>User not found.</div>;
  }

  return (
    <div className="admin-page" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <h1>My Account</h1>
          <div className="admin-page-subtitle">Manage your profile, theme, and security preferences.</div>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="admin-card">
        {!isEditing ? (
          <div>
            <div className="admin-info-grid">
              <div>
                <div className="text-label">Name</div>
                <div className="text-body-large">{user.displayName}</div>
              </div>
              <div>
                <div className="text-label">Email</div>
                <div className="text-body-large">{user.email}</div>
              </div>
              <div>
                <div className="text-label">Role</div>
                <div className="text-body-large">{user.role}</div>
              </div>
              {user.createdAt && (
                <div>
                  <div className="text-label">Member Since</div>
                  <div className="text-body-large">{new Date(user.createdAt).toLocaleDateString()}</div>
                </div>
              )}
            </div>

            {isAdmin ? (
              <Button onClick={() => setIsEditing(true)} variant="primary">
                Edit Profile
              </Button>
            ) : (
              <p className="admin-secondary-text" style={{ fontStyle: 'italic' }}>
                Contact an administrator to update your profile information.
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="admin-form">
            <Input
              type="text"
              id="displayName"
              label="Name"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              required
              className="admin-input"
            />

            <Input
              type="email"
              id="email"
              label="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="admin-input"
            />

            <div className="admin-secondary-text" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
              <strong>Role:</strong> {user.role}{' '}
              {!isAdmin && <span>(Cannot be changed)</span>}
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Button type="submit" variant="primary">
                Save Changes
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    displayName: user.displayName,
                    email: user.email,
                  });
                  setError('');
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Theme Preference Section */}
      <section className="admin-card">
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
      <section className="admin-card">
        <h2 style={{ marginBottom: '1rem' }}>Change Password</h2>
        <PasswordChangeForm />
      </section>

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
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

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

      showSuccess('Password updated successfully!');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Failed to change password:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="admin-form" data-testid="password-change-form">
      {/* Hidden username field for accessibility/password managers */}
      <input type="text" name="username" autoComplete="username" style={{ display: 'none' }} />

      {error && (
        <div className="admin-alert admin-alert-error" data-testid="password-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <Input
          type="password"
          id="currentPassword"
          name="currentPassword"
          label="Current Password:"
          value={formData.currentPassword}
          onChange={handleChange}
          required
          disabled={isSubmitting}
          className="admin-input"
          data-testid="current-password-input"
          autoComplete="current-password"
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <Input
          type="password"
          id="newPassword"
          name="newPassword"
          label="New Password:"
          value={formData.newPassword}
          onChange={handleChange}
          required
          minLength={8}
          helperText="Minimum 8 characters"
          data-testid="new-password-input"
          disabled={isSubmitting}
          className="admin-input"
          autoComplete="new-password"
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <Input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm New Password:"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          disabled={isSubmitting}
          minLength={8}
          className="admin-input"
          data-testid="confirm-password-input"
          autoComplete="new-password"
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        isLoading={isSubmitting}
        disabled={isSubmitting}
        testId="change-password-button"
      >
        {isSubmitting ? 'Changing...' : 'Change Password'}
      </Button>
    </form>
  );
};
