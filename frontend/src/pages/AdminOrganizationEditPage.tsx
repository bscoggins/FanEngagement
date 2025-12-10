import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { organizationsApi } from '../api/organizationsApi';
import { shareTypesApi } from '../api/shareTypesApi';
import { proposalsApi } from '../api/proposalsApi';
import type { UpdateOrganizationRequest, Organization } from '../types/api';

const adminLabelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.5rem',
  fontWeight: 500,
};

const adminInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-md)',
  fontSize: '1rem',
  backgroundColor: 'var(--color-background)',
  color: 'var(--color-text-primary)',
};

const adminTextareaStyle: React.CSSProperties = {
  ...adminInputStyle,
  fontFamily: 'inherit',
};

const adminSelectStyle: React.CSSProperties = {
  ...adminInputStyle,
  cursor: 'pointer',
};

const adminInfoTextStyle: React.CSSProperties = {
  marginTop: '0.5rem',
  fontSize: '0.875rem',
  color: 'var(--color-text-secondary)',
};

const adminColorInputStyle: React.CSSProperties = {
  width: '50px',
  height: '40px',
  border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  backgroundColor: 'var(--color-surface)',
};

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
          // Fail-safe: if we can't check, assume existing data to prevent invalid changes
          console.warn('Could not check for existing data, assuming data exists for safety:', error);
          setHasExistingData(true);
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
      <div className="admin-page">
        <h1>Edit Organization</h1>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading organization...</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="admin-page">
        <h1>Edit Organization</h1>
        <div
          className="admin-alert admin-alert-error"
          style={{ marginTop: '1rem' }}
        >
          {fetchError}
        </div>
        <div style={{ marginTop: '1rem' }}>
          <Link
            to="/admin/organizations"
            className="admin-link-button"
          >
            Back to Organizations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h1>Organization Overview</h1>

      {organization && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            <div>Created: {new Date(organization.createdAt).toLocaleString()}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="admin-alert admin-alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div className="admin-alert admin-alert-success" style={{ marginBottom: '1rem' }}>
          {successMessage}
        </div>
      )}

      <div className="admin-card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="name" style={adminLabelStyle}>
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={adminInputStyle}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="description" style={adminLabelStyle}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              style={adminTextareaStyle}
            />
          </div>

          <div style={{ marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border-subtle)' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Blockchain Configuration</h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="blockchainType" style={adminLabelStyle}>
                Blockchain Platform
              </label>
              <select
                id="blockchainType"
                name="blockchainType"
                value={formData.blockchainType || 'None'}
                onChange={handleChange}
                disabled={hasExistingData}
                style={{
                  ...adminSelectStyle,
                  backgroundColor: hasExistingData ? 'var(--color-background)' : 'var(--color-surface)',
                  cursor: hasExistingData ? 'not-allowed' : 'pointer',
                }}
              >
                <option value="None">None (Off-chain only)</option>
                <option value="Solana">Solana</option>
                <option value="Polygon">Polygon</option>
              </select>
              {hasExistingData && (
                <div style={adminInfoTextStyle}>
                  Blockchain type cannot be changed after shares or proposals are created.
                </div>
              )}
              <div style={adminInfoTextStyle}>
                Select a blockchain platform for governance transparency. This setting determines where governance actions are recorded.
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border-subtle)' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Branding</h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="logoUrl" style={adminLabelStyle}>
                Logo URL
              </label>
              <input
                type="url"
                id="logoUrl"
                name="logoUrl"
                value={formData.logoUrl}
                onChange={handleChange}
                placeholder="https://example.com/logo.png"
                style={adminInputStyle}
              />
              {formData.logoUrl && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ ...adminInfoTextStyle, marginBottom: '0.5rem' }}>Preview:</div>
                  <img 
                    src={formData.logoUrl} 
                    alt="Organization logo preview" 
                    style={{ 
                      maxWidth: '200px', 
                      maxHeight: '100px',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem',
                      backgroundColor: 'var(--color-surface)',
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
                <label htmlFor="primaryColor" style={adminLabelStyle}>
                  Primary Color
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    id="primaryColorPicker"
                    value={formData.primaryColor || '#0066cc'}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                    style={adminColorInputStyle}
                  />
                  <input
                    type="text"
                    id="primaryColor"
                    name="primaryColor"
                    value={formData.primaryColor || ''}
                    onChange={handleChange}
                    placeholder="#0066cc (default)"
                    style={{ ...adminInputStyle, flex: 1 }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="secondaryColor" style={adminLabelStyle}>
                  Secondary Color
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    id="secondaryColorPicker"
                    value={formData.secondaryColor || '#6c757d'}
                    onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    style={adminColorInputStyle}
                  />
                  <input
                    type="text"
                    id="secondaryColor"
                    name="secondaryColor"
                    value={formData.secondaryColor || ''}
                    onChange={handleChange}
                    placeholder="#6c757d (default)"
                    style={{ ...adminInputStyle, flex: 1 }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              disabled={isSaving}
              className="admin-button admin-button-primary"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/organizations')}
              className="admin-button admin-button-neutral"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
