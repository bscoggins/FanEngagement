import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usersApi } from '../api/usersApi';
import { membershipsApi } from '../api/membershipsApi';
import { useNotifications } from '../contexts/NotificationContext';
import { parseApiError } from '../utils/errorUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { Button } from '../components/Button';
import './AdminPage.css';
import type { UpdateUserRequest, User, MembershipWithOrganizationDto } from '../types/api';

export const AdminUserDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { showSuccess, showError } = useNotifications();
  
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<MembershipWithOrganizationDto[]>([]);
  const [formData, setFormData] = useState<UpdateUserRequest>({
    email: '',
    displayName: '',
    role: 'User',
    mfaRequired: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchUserAndMemberships = async () => {
    if (!userId) {
      setFetchError('Invalid user ID');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setFetchError(null);
      
      // Fetch user data
      const userData = await usersApi.getById(userId);
      setUser(userData);
      setFormData({
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        mfaRequired: userData.mfaRequired ?? false,
      });

      // Fetch user's memberships with organization details in a single call
      const userMemberships = await membershipsApi.getByUserId(userId);
      setMemberships(userMemberships);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      const errorMessage = parseApiError(err);
      setFetchError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndMemberships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const nextValue = type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setError(null);
    setIsSaving(true);

    try {
      await usersApi.update(userId, {
        ...formData,
        mfaRequired: formData.mfaRequired ?? false,
      });
      showSuccess('User updated successfully!');
      
      // Refresh user data
      const updatedUser = await usersApi.getById(userId);
      setUser(updatedUser);
      setFormData({
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        role: updatedUser.role,
        mfaRequired: updatedUser.mfaRequired ?? false,
      });
    } catch (err) {
      console.error('Failed to update user:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-page">
        <div className="admin-card compact">
          <h1>Edit User</h1>
          <LoadingSpinner message="Loading user..." />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="admin-page">
        <div className="admin-card compact">
          <h1>Edit User</h1>
          <ErrorMessage message={fetchError} onRetry={fetchUserAndMemberships} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-page">
        <div className="admin-card compact" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <h1>Edit User</h1>
          <p className="admin-secondary-text">User not found.</p>
          <Link to="/admin/users" className="admin-button admin-button-outline" style={{ textDecoration: 'none', width: 'fit-content' }}>
            ← Back to Users
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <h1>Edit User</h1>
          <div className="admin-page-subtitle">Manage user profile, membership, and password settings.</div>
        </div>
        <div className="admin-page-actions">
          <Link to="/admin/users" className="admin-button admin-button-outline" style={{ textDecoration: 'none' }}>
            ← Back to Users
          </Link>
        </div>
      </div>
      
      <div className="admin-card-grid">
        {/* User Edit Form */}
        <div className="admin-card">
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>User Details</h2>
          
          <form onSubmit={handleSubmit} className="admin-form">
            <div>
              <label htmlFor="email" className="admin-form-label">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="admin-input"
              />
            </div>

            <div>
              <label htmlFor="displayName" className="admin-form-label">
                Display Name *
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={formData.displayName}
                onChange={handleChange}
                required
                className="admin-input"
              />
            </div>

            <div>
              <label htmlFor="role" className="admin-form-label">
                Role *
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className="admin-select"
              >
                <option value="User">User</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div>
              <label htmlFor="mfaRequired" className="admin-form-label">
                Require MFA for Admin Access
              </label>
              <div className="admin-toggle-row">
                <input
                  id="mfaRequired"
                  name="mfaRequired"
                  type="checkbox"
                  checked={!!formData.mfaRequired}
                  onChange={handleChange}
                />
                <span>Force this user to complete MFA before accessing admin tools.</span>
              </div>
              <small className="admin-secondary-text">
                Disable if the user should be allowed to sign in without MFA.
              </small>
            </div>

            <div className="admin-meta-text" style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--admin-chip-muted-bg)' }}>
              <strong>User ID:</strong> {user.id}<br />
              <strong>Created:</strong> {new Date(user.createdAt).toLocaleString()}
            </div>

            {error && (
              <div className="admin-alert admin-alert-error">
                {error}
              </div>
            )}

            <Button type="submit" isLoading={isSaving} variant="primary">
              Save Changes
            </Button>
          </form>
        </div>

        {/* Organization Memberships */}
        <div className="admin-card">
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
            Organization Memberships
          </h2>
          
          {memberships.length === 0 ? (
            <p className="admin-secondary-text" style={{ textAlign: 'center', padding: '2rem 0' }}>
              This user is not a member of any organizations.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
              {memberships.map((membership) => (
                <div key={membership.id} className="admin-option-card">
                  <div style={{ fontWeight: 600 }}>
                    {membership.organizationName}
                  </div>
                  <div className="admin-secondary-text">
                    <strong>Role:</strong> {membership.role}
                  </div>
                  <div className="admin-secondary-text">
                    <strong>Joined:</strong> {new Date(membership.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Password Management Section */}
        <div className="admin-card">
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>
            Password Management
          </h2>
          <AdminPasswordSetForm userId={userId!} />
        </div>
      </div>
    </div>
  );
};

// Admin Password Set Form Component
const AdminPasswordSetForm: React.FC<{ userId: string }> = ({ userId }) => {
  const { showSuccess, showError } = useNotifications();
  const [formData, setFormData] = useState({
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
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      await usersApi.setUserPassword(userId, {
        newPassword: formData.newPassword,
      });

      showSuccess('Password set successfully!');
      
      // Clear form
      setFormData({
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      console.error('Failed to set password:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="admin-password-set-form"
      className="admin-form"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}
    >
      <p className="admin-secondary-text">
        Set a new password for this user. The current password is not required.
      </p>

      {error && (
        <div className="admin-alert admin-alert-error" data-testid="password-error">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="newPassword" className="admin-form-label">
          New Password
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
          className="admin-input"
          style={{ maxWidth: '420px' }}
          data-testid="new-password-input"
        />
        <small className="admin-secondary-text" style={{ display: 'block', marginTop: '0.25rem' }}>
          Minimum 8 characters
        </small>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="admin-form-label">
          Confirm New Password
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
          className="admin-input"
          style={{ maxWidth: '420px' }}
          data-testid="confirm-password-input"
        />
      </div>

      <Button
        type="submit"
        isLoading={isSubmitting}
        variant="primary"
        testId="set-password-button"
      >
        Set New Password
      </Button>
    </form>
  );
};