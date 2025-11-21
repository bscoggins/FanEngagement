import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { usersApi } from '../api/usersApi';
import type { User } from '../types/api';

export const MyAccountPage: React.FC = () => {
  const { user: authUser, isAdmin } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
  });

  useEffect(() => {
    if (!authUser?.userId) return;

    const fetchUser = async () => {
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
        setError('Failed to load account information.');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [authUser?.userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setError('');
      setSuccessMessage('');
      const updated = await usersApi.update(user.id, {
        displayName: formData.displayName,
        email: formData.email,
      });
      setUser(updated);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
    } catch (err: any) {
      console.error('Failed to update user:', err);
      setError(err.response?.data?.message || 'Failed to update profile.');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  if (error && !user) {
    return <div style={{ padding: '2rem', color: '#dc3545' }}>{error}</div>;
  }

  if (!user) {
    return <div style={{ padding: '2rem' }}>User not found.</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>My Account</h1>

      {successMessage && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
            borderRadius: '4px',
            marginBottom: '1rem',
          }}
        >
          {successMessage}
        </div>
      )}

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
            <div style={{ marginBottom: '1rem' }}>
              <strong>Member Since:</strong>{' '}
              {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </div>

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
