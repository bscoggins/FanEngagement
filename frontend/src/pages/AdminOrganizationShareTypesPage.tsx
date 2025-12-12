import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { shareTypesApi } from '../api/shareTypesApi';
import { organizationsApi } from '../api/organizationsApi';
import { useNotifications } from '../contexts/NotificationContext';
import { parseApiError } from '../utils/errorUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Checkbox } from '../components/Checkbox';
import type { ShareType, Organization, CreateShareTypeRequest, UpdateShareTypeRequest } from '../types/api';

export const AdminOrganizationShareTypesPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const { showSuccess, showError } = useNotifications();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [shareTypes, setShareTypes] = useState<ShareType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateShareTypeRequest>({
    name: '',
    symbol: '',
    description: '',
    votingWeight: 1,
    maxSupply: undefined,
    isTransferable: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    if (!orgId) {
      setError('Invalid organization ID');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const [orgData, shareTypesData] = await Promise.all([
        organizationsApi.getById(orgId),
        shareTypesApi.getByOrganization(orgId),
      ]);
      
      setOrganization(orgData);
      setShareTypes(shareTypesData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const handleCreateNew = () => {
    setEditingId(null);
    setFormData({
      name: '',
      symbol: '',
      description: '',
      votingWeight: 1,
      maxSupply: undefined,
      isTransferable: true,
    });
    setShowForm(true);
    setError(null);
  };

  const handleEdit = (shareType: ShareType) => {
    setEditingId(shareType.id);
    setFormData({
      name: shareType.name,
      symbol: shareType.symbol,
      description: shareType.description || '',
      votingWeight: shareType.votingWeight,
      maxSupply: shareType.maxSupply,
      isTransferable: shareType.isTransferable,
    });
    setShowForm(true);
    setError(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      symbol: '',
      description: '',
      votingWeight: 1,
      maxSupply: undefined,
      isTransferable: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;

    setError(null);
    setIsSaving(true);

    try {
      if (editingId) {
        // Update existing share type
        await shareTypesApi.update(orgId, editingId, formData as UpdateShareTypeRequest);
        showSuccess('Share type updated successfully!');
      } else {
        // Create new share type
        await shareTypesApi.create(orgId, formData);
        showSuccess('Share type created successfully!');
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        symbol: '',
        description: '',
        votingWeight: 1,
        maxSupply: undefined,
        isTransferable: true,
      });
      
      // Refresh share types
      await fetchData();
    } catch (err) {
      console.error('Failed to save share type:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === 'votingWeight' || name === 'maxSupply') {
      if (value === '') {
        setFormData((prev) => ({ ...prev, [name]: undefined }));
      } else {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          setFormData((prev) => ({ ...prev, [name]: numValue }));
        }
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  if (isLoading) {
    return (
      <div className="admin-page">
        <h1>Manage Share Types</h1>
        <LoadingSpinner message="Loading share types..." />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="admin-page">
        <h1>Manage Share Types</h1>
        <ErrorMessage message={error || 'Organization not found'} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <h1>Share Types</h1>
          <div className="admin-page-subtitle">
            Organization: {organization.name}
          </div>
        </div>
        <div className="admin-page-actions">
          <button
            type="button"
            onClick={showForm ? handleCancel : handleCreateNew}
            className={`admin-button ${showForm ? 'admin-button-neutral' : 'admin-button-success'}`}
          >
            {showForm ? 'Cancel' : 'Create Share Type'}
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {showForm && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>
            {editingId ? 'Edit Share Type' : 'Create New Share Type'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  label="Name *"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Input
                  type="text"
                  id="symbol"
                  name="symbol"
                  label="Symbol *"
                  value={formData.symbol}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="description" className="form-field__label">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                className="form-control form-control--textarea"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <Input
                  type="number"
                  id="votingWeight"
                  name="votingWeight"
                  label="Voting Weight"
                  value={formData.votingWeight}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <Input
                  type="number"
                  id="maxSupply"
                  name="maxSupply"
                  label="Max Supply"
                  value={formData.maxSupply ?? ''}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  helperText="Leave blank for unlimited supply."
                />
              </div>

              <div>
                <Checkbox
                  id="isTransferable"
                  name="isTransferable"
                  label="Transferable"
                  helperText="Allow holders to transfer this share type."
                  checked={formData.isTransferable}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="admin-button admin-button-success"
            >
              {isSaving ? 'Saving...' : (editingId ? 'Update Share Type' : 'Create Share Type')}
            </button>
          </form>
        </Card>
      )}

      {shareTypes.length === 0 ? (
        <EmptyState message="No share types found. Create one to get started." />
      ) : (
        <div className="admin-table-wrapper">
          <table data-testid="share-types-table" className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Symbol</th>
                <th>Voting Weight</th>
                <th>Max Supply</th>
                <th style={{ textAlign: 'center' }}>Transferable</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shareTypes.map((shareType) => (
                <tr key={shareType.id} data-testid="share-type-row">
                  <td>
                    <span data-testid="share-type-name">{shareType.name}</span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{shareType.symbol}</td>
                  <td>{shareType.votingWeight}</td>
                  <td>
                    {shareType.maxSupply !== null && shareType.maxSupply !== undefined ? shareType.maxSupply : <em style={{ color: 'var(--color-text-tertiary)' }}>Unlimited</em>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        backgroundColor: shareType.isTransferable ? 'var(--color-success-50)' : 'var(--color-error-50)',
                        color: shareType.isTransferable ? 'var(--color-success-700)' : 'var(--color-error-700)',
                      }}
                    >
                      {shareType.isTransferable ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="admin-table-actions">
                      <button
                        type="button"
                        className="admin-button admin-button-primary"
                        onClick={() => handleEdit(shareType)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-button admin-button-outline"
                        onClick={() => handleCancel()}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
