import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { usersApi } from '../api/usersApi';
import { useNotifications } from '../contexts/NotificationContext';
import { parseApiError } from '../utils/errorUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import type { User } from '../types/api';

export const MyAccountPage: React.FC = () => {
  const { user: authUser, isAdmin } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
  });

  // Create user data from auth context for non-admin users
  // Admin users will fetch from API to get full data including createdAt
  const authUserData: User | null = useMemo(() => {
    if (!authUser) return null;
    return {
      id: authUser.userId,
      email: authUser.email,
      displayName: authUser.displayName,
      role: authUser.role,
      // For non-admin users, we don't have the createdAt date from the auth context
      // We'll leave it empty and handle the display accordingly
      createdAt: '',
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
            {user.createdAt && user.createdAt.trim() !== '' && (
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
    </div>
  );
};
