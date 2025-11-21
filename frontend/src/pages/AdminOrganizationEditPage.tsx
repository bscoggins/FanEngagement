import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { organizationsApi } from '../api/organizationsApi';
import type { UpdateOrganizationRequest, Organization } from '../types/api';

export const AdminOrganizationEditPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [formData, setFormData] = useState<UpdateOrganizationRequest>({
    name: '',
    description: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!orgId) {
        setFetchError('Invalid organization ID');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setFetchError(null);
        
        const orgData = await organizationsApi.getById(orgId);
        setOrganization(orgData);
        setFormData({
          name: orgData.name,
          description: orgData.description || '',
        });
      } catch (err) {
        console.error('Failed to fetch organization:', err);
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { status: number } };
          if (axiosError.response?.status === 404) {
            setFetchError('Organization not found');
          } else {
            setFetchError('Failed to load organization. Please try again.');
          }
        } else {
          setFetchError('Failed to load organization. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganization();
  }, [orgId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;

    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      await organizationsApi.update(orgId, formData);
      setSuccessMessage('Organization updated successfully!');
      
      // Refresh organization data
      const updatedOrg = await organizationsApi.getById(orgId);
      setOrganization(updatedOrg);
      setFormData({
        name: updatedOrg.name,
        description: updatedOrg.description || '',
      });
    } catch (err) {
      console.error('Failed to update organization:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status: number; data?: { message?: string } } };
        if (axiosError.response?.status === 400) {
          setError(axiosError.response.data?.message || 'Invalid organization data. Please check your inputs.');
        } else if (axiosError.response?.status === 404) {
          setError('Organization not found');
        } else {
          setError('Failed to update organization. Please try again.');
        }
      } else {
        setError('Failed to update organization. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1>Edit Organization</h1>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading organization...</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div>
        <h1>Edit Organization</h1>
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c33',
            marginTop: '1rem',
          }}
        >
          {fetchError}
        </div>
        <div style={{ marginTop: '1rem' }}>
          <Link
            to="/admin/organizations"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Back to Organizations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          to="/admin/organizations"
          style={{
            color: '#0066cc',
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}
        >
          ← Back to Organizations
        </Link>
      </div>

      <h1>Edit Organization</h1>

      {organization && (
        <div style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
          <div>Created: {new Date(organization.createdAt).toLocaleString()}</div>
        </div>
      )}

      {error && (
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
          {error}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#e7f5e7',
            border: '1px solid #b3e0b3',
            borderRadius: '4px',
            color: '#2d5a2d',
            marginBottom: '1rem',
          }}
        >
          {successMessage}
        </div>
      )}

      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '2rem',
        }}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: isSaving ? '#ccc' : '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/organizations')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
