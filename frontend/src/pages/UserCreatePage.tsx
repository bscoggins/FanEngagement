import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usersApi } from '../api/usersApi';
import type { CreateUserRequest } from '../types/api';
import { InfoBox } from '../components/InfoBox';
import { Button } from '../components/Button';
import { parseApiError } from '../utils/errorUtils';
import './AdminPage.css';

export const UserCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMountedRef = useRef(true);
  const isAdminContext = location.pathname.startsWith('/admin');
  const usersListRoute = isAdminContext ? '/admin/users' : '/users';
  const [formData, setFormData] = useState<CreateUserRequest>({
    email: '',
    password: '',
    displayName: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMountedRef.current) return;
    
    setError(null);
    setIsLoading(true);

    try {
      await usersApi.create(formData);
      // On success, navigate to users page
      if (isMountedRef.current) {
        navigate(usersListRoute);
      }
    } catch (err) {
      console.error('Failed to create user:', err);
      if (!isMountedRef.current) return;
      setError(parseApiError(err));
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleCancel = () => {
    if (!isMountedRef.current) return;
    navigate(usersListRoute);
  };

  return (
    <div className="admin-page" style={{ maxWidth: '720px' }}>
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <h1>Create User</h1>
          <p className="admin-page-subtitle">
            Provision a new platform administrator account with secure credentials.
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={handleCancel} disabled={isLoading}>
          Back to Users
        </Button>
      </div>

      <div className="admin-card">
        {error && (
          <div className="admin-alert admin-alert-error" role="alert" style={{ marginBottom: 'var(--spacing-4)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-form" data-testid="create-user-form">
          <div className="admin-form-field">
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
              maxLength={256}
              autoComplete="email"
              disabled={isLoading}
              className="admin-input"
            />
          </div>

          <div className="admin-form-field">
            <label htmlFor="password" className="admin-form-label">
              Password *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              maxLength={128}
              autoComplete="new-password"
              disabled={isLoading}
              className="admin-input"
            />
            <InfoBox>
              <strong>Password Requirements:</strong>
              <ul style={{ margin: 'var(--spacing-2) 0 0 var(--spacing-4)', paddingLeft: 0 }}>
                <li>At least 12 characters long</li>
                <li>At least one uppercase letter (A-Z)</li>
                <li>At least one number (0-9)</li>
                <li>At least one special character (any non-alphanumeric character)</li>
              </ul>
            </InfoBox>
          </div>

          <div className="admin-form-field">
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
              maxLength={120}
              autoComplete="name"
              disabled={isLoading}
              className="admin-input"
            />
          </div>

          <div className="admin-form-actions">
            <Button type="submit" variant="primary" isLoading={isLoading} disabled={isLoading}>
              Create User
            </Button>
            <Button type="button" variant="ghost" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
