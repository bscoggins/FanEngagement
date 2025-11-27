import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { shareTypesApi } from '../api/shareTypesApi';
import { organizationsApi } from '../api/organizationsApi';
import { useNotifications } from '../contexts/NotificationContext';
import { parseApiError } from '../utils/errorUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
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
      <div>
        <h1>Manage Share Types</h1>
        <LoadingSpinner message="Loading share types..." />
      </div>
    );
  }

  if (!organization) {
    return (
      <div>
        <h1>Manage Share Types</h1>
        <ErrorMessage message={error || 'Organization not found'} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1>Share Types</h1>
          <div style={{ color: '#666', fontSize: '1rem' }}>
            Organization: {organization.name}
          </div>
        </div>
        <button
          onClick={showForm ? handleCancel : handleCreateNew}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: showForm ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {showForm ? 'Cancel' : 'Create Share Type'}
        </button>
      </div>

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

      {showForm && (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>
            {editingId ? 'Edit Share Type' : 'Create New Share Type'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
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

              <div>
                <label htmlFor="symbol" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Symbol *
                </label>
                <input
                  type="text"
                  id="symbol"
                  name="symbol"
                  value={formData.symbol}
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
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label htmlFor="votingWeight" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
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
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem',
                  }}
                />
              </div>

              <div>
                <label htmlFor="maxSupply" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
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
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem',
                  }}
                />
              </div>

              <div>
                <label htmlFor="isTransferable" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Transferable
                </label>
                <select
                  id="isTransferable"
                  name="isTransferable"
                  value={formData.isTransferable ? 'true' : 'false'}
                  onChange={handleIsTransferableChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem',
                  }}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: isSaving ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? 'Saving...' : (editingId ? 'Update Share Type' : 'Create Share Type')}
            </button>
          </form>
        </div>
      )}

      {shareTypes.length === 0 ? (
        <EmptyState message="No share types found. Create one to get started." />
      ) : (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <table data-testid="share-types-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Symbol</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Voting Weight</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Max Supply</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Transferable</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shareTypes.map((shareType) => (
                <tr key={shareType.id} data-testid="share-type-row" style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '1rem' }}>
                    <span data-testid="share-type-name">{shareType.name}</span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{shareType.symbol}</td>
                  <td style={{ padding: '1rem' }}>{shareType.votingWeight}</td>
                  <td style={{ padding: '1rem' }}>
                    {shareType.maxSupply !== null && shareType.maxSupply !== undefined ? shareType.maxSupply : <em style={{ color: '#999' }}>Unlimited</em>}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      backgroundColor: shareType.isTransferable ? '#e7f5e7' : '#fee',
                      color: shareType.isTransferable ? '#2d5a2d' : '#c33',
                    }}>
                      {shareType.isTransferable ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => handleEdit(shareType)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#0066cc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      Edit
                    </button>
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
