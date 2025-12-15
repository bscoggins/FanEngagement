import React, { useState, useCallback, useEffect } from 'react';
import { blockchainApi } from '../api/blockchainApi';
import { organizationsApi } from '../api/organizationsApi';
import { parseApiError } from '../utils/errorUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { Button } from '../components/Button';
import { Select } from '../components/Select';
import { Tooltip } from '../components/Tooltip';
import './AdminPage.css';
import type { BlockchainRecordDto, Organization, PagedResult, BlockchainVerificationDto } from '../types/api';

export const PlatformAdminBlockchainPage: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [records, setRecords] = useState<PagedResult<BlockchainRecordDto> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Verification state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationResults, setVerificationResults] = useState<Record<string, BlockchainVerificationDto>>({});

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch organizations independently so it doesn't fail if blockchain API fails
      try {
        const orgsData = await organizationsApi.getAll();
        setOrganizations(orgsData);
      } catch (orgErr) {
        console.error('Failed to fetch organizations:', orgErr);
      }

      const filters = {
        organizationId: selectedOrgId || undefined,
        type: selectedType || undefined,
        page,
        pageSize,
      };

      const recordsData = await blockchainApi.getTransactions(filters);
      setRecords(recordsData);
    } catch (err) {
      console.error('Failed to fetch blockchain data:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrgId, selectedType, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVerify = async (record: BlockchainRecordDto) => {
    // If already showing results for this record, close it
    if (verificationResults[record.entityId]) {
      setVerificationResults(prev => {
        const next = { ...prev };
        delete next[record.entityId];
        return next;
      });
      return;
    }

    try {
      setVerifyingId(record.entityId);
      const result = await blockchainApi.verifyRecord(record.entityType, record.entityId);
      setVerificationResults(prev => ({
        ...prev,
        [record.entityId]: result
      }));
    } catch (err) {
      console.error('Verification failed:', err);
      // Handle error (maybe show toast)
    } finally {
      setVerifyingId(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Blockchain Transactions</h1>
          <p className="admin-subtitle">Monitor and verify blockchain records across the platform</p>
        </div>
        <div className="admin-actions">
          <Button variant="secondary" onClick={fetchData} disabled={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="admin-filters">
        <div className="filter-group">
          <Select
            label="Organization"
            id="org-filter"
            value={selectedOrgId}
            onChange={(e) => {
              setSelectedOrgId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Organizations</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="filter-group">
          <Select
            label="Record Type"
            id="type-filter"
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Types</option>
            <option value="Organization">Organization</option>
            <option value="Proposal">Proposal</option>
            <option value="Vote">Vote</option>
            <option value="ShareIssuance">Share Issuance</option>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !records || records.items.length === 0 ? (
        <EmptyState
          message="No blockchain records found. Try adjusting your filters or ensure blockchain integration is enabled."
        />
      ) : (
        <>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Entity</th>
                  <th>Transaction / Address</th>
                  <th>Status</th>
                  <th>Verification</th>
                </tr>
              </thead>
              <tbody>
                {records.items.map((record) => (
                  <React.Fragment key={record.entityId}>
                    <tr>
                      <td>{formatDate(record.timestamp)}</td>
                      <td>{record.organizationName}</td>
                      <td>
                        <span className={`badge badge-${record.entityType.toLowerCase()}`}>
                          {record.entityType}
                        </span>
                      </td>
                      <td>{record.entityName}</td>
                      <td className="font-monospace small">
                        {record.transactionId ? (
                          <Tooltip content="Transaction ID">
                            <div>
                              TX: <a 
                                    href={`https://explorer.solana.com/tx/${record.transactionId}?cluster=devnet`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-decoration-none"
                                  >
                                    {record.transactionId}
                                  </a>
                            </div>
                          </Tooltip>
                        ) : null}
                        {record.onChainAddress ? (
                          <Tooltip content="On-Chain Address">
                            <div>
                              Addr: <a 
                                      href={`https://explorer.solana.com/address/${record.onChainAddress}?cluster=devnet`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-decoration-none"
                                    >
                                      {record.onChainAddress}
                                    </a>
                            </div>
                          </Tooltip>
                        ) : null}
                      </td>
                      <td>{record.status}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerify(record)}
                          disabled={verifyingId === record.entityId}
                        >
                          {verifyingId === record.entityId 
                            ? 'Verifying...' 
                            : verificationResults[record.entityId] 
                              ? 'Close' 
                              : 'Verify'}
                        </Button>
                      </td>
                    </tr>
                    {verificationResults[record.entityId] && (
                      <tr className="verification-row">
                        <td colSpan={7}>
                          <div className="verification-details p-3 bg-light rounded">
                            <h6>Verification Result</h6>
                            <div className="d-flex gap-4">
                              <div>
                                <strong>Status: </strong>
                                <span className={verificationResults[record.entityId].isVerified ? 'text-success' : 'text-danger'}>
                                  {verificationResults[record.entityId].isVerified ? 'Verified' : 'Failed'}
                                </span>
                              </div>
                              <div>
                                <strong>Message: </strong>
                                {verificationResults[record.entityId].message}
                              </div>
                            </div>
                            <div className="row mt-2">
                              <div className="col-md-6">
                                <strong>Database Value:</strong>
                                <pre className="bg-white p-2 border rounded mt-1">
                                  {JSON.stringify(verificationResults[record.entityId].databaseValue, null, 2)}
                                </pre>
                              </div>
                              <div className="col-md-6">
                                <strong>Blockchain Value:</strong>
                                <pre className="bg-white p-2 border rounded mt-1" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                  {JSON.stringify(verificationResults[record.entityId].blockchainValue, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={page}
            totalPages={records.totalPages}
            onPageChange={handlePageChange}
            hasPreviousPage={records.hasPreviousPage}
            hasNextPage={records.hasNextPage}
          />
        </>
      )}
    </div>
  );
};
