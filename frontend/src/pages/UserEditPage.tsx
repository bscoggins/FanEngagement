import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usersApi } from '../api/usersApi';
import type { UpdateUserRequest, User } from '../types/api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export const UserEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UpdateUserRequest>({
    email: '',
    displayName: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (!id) {
        setFetchError('Invalid user ID');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setFetchError(null);
        const userData = await usersApi.getById(id);
        setUser(userData);
        setFormData({
          email: userData.email,
          displayName: userData.displayName,
        });
      } catch (err) {
        console.error('Failed to fetch user:', err);
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { status: number } };
          if (axiosError.response?.status === 404) {
            setFetchError('User not found');
          } else {
            setFetchError('Failed to load user. Please try again.');
          }
        } else {
          setFetchError('Failed to load user. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setError(null);
    setIsSaving(true);

    try {
      await usersApi.update(id, formData);
      // On success, navigate to users page
      navigate('/users');
    } catch (err) {
      console.error('Failed to update user:', err);
      // Handle validation errors from API
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status: number; data?: { message?: string } } };
        if (axiosError.response?.status === 400) {
          setError(axiosError.response.data?.message || 'Invalid user data. Please check your inputs.');
        } else if (axiosError.response?.status === 404) {
          setError('User not found');
        } else {
          setError('Failed to update user. Please try again.');
        }
      } else {
        setError('Failed to update user. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="user-edit-page">
        <h2>Edit User</h2>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="user-edit-page">
        <h2>Edit User</h2>
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c33',
            marginBottom: '1rem',
          }}
        >
          {fetchError}
        </div>
        <Link to="/users" style={{ color: '#0066cc' }}>
          ← Back to Users
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-edit-page">
        <h2>Edit User</h2>
        <p>User not found</p>
        <Link to="/users" style={{ color: '#0066cc' }}>
          ← Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="user-edit-page" style={{ maxWidth: '600px' }}>
      <h2>Edit User</h2>
      
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
