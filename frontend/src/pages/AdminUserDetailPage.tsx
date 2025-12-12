import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usersApi } from '../api/usersApi';
import { membershipsApi } from '../api/membershipsApi';
import { useNotifications } from '../contexts/NotificationContext';
import { parseApiError } from '../utils/errorUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Checkbox } from '../components/Checkbox';
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
      <div className="admin-user-detail-page">
        <h1>Edit User</h1>
        <LoadingSpinner message="Loading user..." />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="admin-user-detail-page">
        <h1>Edit User</h1>
        <ErrorMessage message={fetchError} onRetry={fetchUserAndMemberships} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-user-detail-page">
        <h1>Edit User</h1>
        <p>User not found</p>
        <Link to="/admin/users" style={{ color: '#0066cc' }}>
          ← Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-user-detail-page">
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/admin/users" style={{ color: '#0066cc', textDecoration: 'none' }}>
          ← Back to Users
        </Link>
      </div>
      
      <h1>Edit User</h1>
      
      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))' }}>
        {/* User Edit Form */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>User Details</h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              id="email"
              name="email"
              label="Email *"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <Input
              id="displayName"
              name="displayName"
              label="Display Name *"
              type="text"
              value={formData.displayName}
              onChange={handleChange}
              required
            />

            <Select
              id="role"
              name="role"
              label="Role *"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </Select>

            <Checkbox
              id="mfaRequired"
              name="mfaRequired"
              label="Require MFA for Admin Access"
              helperText="Force this user to complete MFA before accessing admin tools. Disable if the user should be allowed to sign in without MFA."
              checked={!!formData.mfaRequired}
              onChange={handleChange}
            />

            <div style={{ 
              padding: '0.75rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              fontSize: '0.875rem',
              color: '#666'
            }}>
              <strong>User ID:</strong> {user.id}<br />
              <strong>Created:</strong> {new Date(user.createdAt).toLocaleString()}
            </div>

            {error && (
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: '4px',
                  color: '#c33',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <Button
                type="submit"
                isLoading={isSaving}
                variant="primary"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>

        {/* Organization Memberships */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>
            Organization Memberships
          </h2>
          
          {memberships.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '2rem 0' }}>
              This user is not a member of any organizations.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {memberships.map((membership) => (
                <div
                  key={membership.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    backgroundColor: '#f8f9fa',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                    {membership.organizationName}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    <strong>Role:</strong> {membership.role}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    <strong>Joined:</strong> {new Date(membership.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Password Management Section */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
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
    <form onSubmit={handleSubmit} data-testid="admin-password-set-form">
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        Set a new password for this user. The current password is not required.
      </p>

      {error && (
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c33',
            marginBottom: '1rem',
          }}
          data-testid="password-error"
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <Input
          type="password"
          id="newPassword"
          name="newPassword"
          label="New Password *"
          value={formData.newPassword}
          onChange={handleChange}
          required
          disabled={isSubmitting}
          minLength={8}
          helperText="Minimum 8 characters"
          data-testid="new-password-input"
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <Input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm New Password *"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          disabled={isSubmitting}
          minLength={8}
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
