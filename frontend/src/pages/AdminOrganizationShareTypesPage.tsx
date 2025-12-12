import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { shareTypesApi } from '../api/shareTypesApi';
import { organizationsApi } from '../api/organizationsApi';
import { useNotifications } from '../contexts/NotificationContext';
import { parseApiError } from '../utils/errorUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import './AdminPage.css';
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

  const handleIsTransferableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, isTransferable: e.target.value === 'true' }));
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
          <Button
            type="button"
            variant={showForm ? 'ghost' : 'primary'}
            onClick={showForm ? handleCancel : handleCreateNew}
          >
            {showForm ? 'Close form' : 'Create Share Type'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {showForm && (
        <div className="admin-card" style={{ marginBottom: 'var(--spacing-6)' }}>
          <h2 style={{ marginTop: 0 }}>{editingId ? 'Edit Share Type' : 'Create New Share Type'}</h2>
          <form onSubmit={handleSubmit} className="admin-form" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 'var(--spacing-4)' }}>
              <div>
                <label htmlFor="name" className="admin-form-label">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="admin-input"
                />
              </div>

              <div>
                <label htmlFor="symbol" className="admin-form-label">
                  Symbol *
                </label>
                <input
                  type="text"
                  id="symbol"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleChange}
                  required
                  className="admin-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="admin-form-label">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="admin-textarea"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 'var(--spacing-4)' }}>
              <div>
                <label htmlFor="votingWeight" className="admin-form-label">
                  Voting Weight *
                </label>
                <input
                  type="number"
                  id="votingWeight"
                  name="votingWeight"
                  value={formData.votingWeight}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="admin-input"
                />
              </div>

              <div>
                <label htmlFor="maxSupply" className="admin-form-label">
                  Max Supply
                </label>
                <input
                  type="number"
                  id="maxSupply"
                  name="maxSupply"
                  value={formData.maxSupply ?? ''}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="admin-input"
                />
              </div>

              <div>
                <label htmlFor="isTransferable" className="admin-form-label">
                  Transferable
                </label>
                <select
                  id="isTransferable"
                  name="isTransferable"
                  value={formData.isTransferable ? 'true' : 'false'}
                  onChange={handleIsTransferableChange}
                  className="admin-select"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            <div>
              <Button type="submit" variant="primary" isLoading={isSaving} disabled={isSaving}>
                {isSaving ? 'Saving...' : editingId ? 'Update Share Type' : 'Create Share Type'}
              </Button>
            </div>
          </form>
        </div>
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
                    <span className={`admin-pill ${shareType.isTransferable ? 'admin-pill-success' : 'admin-pill-danger'}`}>
                      {shareType.isTransferable ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="admin-table-actions">
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={() => handleEdit(shareType)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleCancel}
                      >
                        Cancel
                      </Button>
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
