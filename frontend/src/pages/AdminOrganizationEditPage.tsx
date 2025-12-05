import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { organizationsApi } from '../api/organizationsApi';
import { shareTypesApi } from '../api/shareTypesApi';
import { proposalsApi } from '../api/proposalsApi';
import type { UpdateOrganizationRequest, Organization } from '../types/api';

export const AdminOrganizationEditPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [formData, setFormData] = useState<UpdateOrganizationRequest>({
    name: '',
    description: '',
    logoUrl: '',
    primaryColor: '',
    secondaryColor: '',
    blockchainType: 'None',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasExistingData, setHasExistingData] = useState(false);

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
          logoUrl: orgData.logoUrl || '',
          primaryColor: orgData.primaryColor || '',
          secondaryColor: orgData.secondaryColor || '',
          blockchainType: orgData.blockchainType || 'None',
        });
        
        // Check if organization has existing data (shares or proposals)
        try {
          const [shareTypes, proposals] = await Promise.all([
            shareTypesApi.getByOrganization(orgId),
            proposalsApi.getByOrganization(orgId)
          ]);
          setHasExistingData(shareTypes.length > 0 || proposals.length > 0);
        } catch (error) {
          // If we can't check, assume no existing data to allow editing
          console.warn('Could not check for existing data:', error);
          setHasExistingData(false);
        }
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
        logoUrl: updatedOrg.logoUrl || '',
        primaryColor: updatedOrg.primaryColor || '',
        secondaryColor: updatedOrg.secondaryColor || '',
        blockchainType: updatedOrg.blockchainType || 'None',
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
      <h1>Organization Overview</h1>

      {organization && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
            <div>Created: {new Date(organization.createdAt).toLocaleString()}</div>
          </div>
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

          <div style={{ marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Blockchain Configuration</h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="blockchainType" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Blockchain Platform
              </label>
              <select
                id="blockchainType"
                name="blockchainType"
                value={formData.blockchainType || 'None'}
                onChange={handleChange}
                disabled={hasExistingData}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  backgroundColor: hasExistingData ? '#f5f5f5' : 'white',
                  cursor: hasExistingData ? 'not-allowed' : 'pointer',
                }}
              >
                <option value="None">None (Off-chain only)</option>
                <option value="Solana">Solana</option>
                <option value="Polygon">Polygon</option>
              </select>
              {hasExistingData && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                  Blockchain type cannot be changed after shares or proposals are created.
                </div>
              )}
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                Select a blockchain platform for governance transparency. This setting determines where governance actions are recorded.
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Branding</h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="logoUrl" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Logo URL
              </label>
              <input
                type="url"
                id="logoUrl"
                name="logoUrl"
                value={formData.logoUrl}
                onChange={handleChange}
                placeholder="https://example.com/logo.png"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                }}
              />
              {formData.logoUrl && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>Preview:</div>
                  <img 
                    src={formData.logoUrl} 
                    alt="Organization logo preview" 
                    style={{ 
                      maxWidth: '200px', 
                      maxHeight: '100px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      padding: '0.5rem',
                      backgroundColor: '#f9f9f9',
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label htmlFor="primaryColor" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Primary Color
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    id="primaryColorPicker"
                    value={formData.primaryColor || '#0066cc'}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                    style={{
                      width: '50px',
                      height: '40px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  />
                  <input
                    type="text"
                    id="primaryColor"
                    name="primaryColor"
                    value={formData.primaryColor || ''}
                    onChange={handleChange}
                    placeholder="#0066cc (default)"
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="secondaryColor" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Secondary Color
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    id="secondaryColorPicker"
                    value={formData.secondaryColor || '#6c757d'}
                    onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    style={{
                      width: '50px',
                      height: '40px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  />
                  <input
                    type="text"
                    id="secondaryColor"
                    name="secondaryColor"
                    value={formData.secondaryColor || ''}
                    onChange={handleChange}
                    placeholder="#6c757d (default)"
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem',
                    }}
                  />
                </div>
              </div>
            </div>
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
