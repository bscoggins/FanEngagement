import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../api/usersApi';
import type { CreateUserRequest } from '../types/api';
import { InfoBox } from '../components/InfoBox';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export const UserCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const isMountedRef = useRef(true);
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
        navigate('/users');
      }
    } catch (err) {
      console.error('Failed to create user:', err);
      if (!isMountedRef.current) return;
      
      // Handle validation errors from API
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status: number; data?: { message?: string } } };
        if (axiosError.response?.status === 400) {
          setError(axiosError.response.data?.message || 'Invalid user data. Please check your inputs.');
        } else {
          setError('Failed to create user. Please try again.');
        }
      } else {
        setError('Failed to create user. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="user-create-page" style={{ maxWidth: '600px' }}>
      <h2>Create User</h2>
      
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Input
            id="password"
            name="password"
            label="Password *"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <InfoBox>
            <strong>Password Requirements:</strong>
            <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
              <li>At least 12 characters long</li>
              <li>At least one uppercase letter (A-Z)</li>
              <li>At least one number (0-9)</li>
              <li>At least one special character (any non-alphanumeric character)</li>
            </ul>
          </InfoBox>
        </div>

        <Input
          id="displayName"
          name="displayName"
          label="Display Name *"
          type="text"
          value={formData.displayName}
          onChange={handleChange}
          required
        />

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
            variant="primary"
            isLoading={isLoading}
          >
            Create User
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate('/users')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};
