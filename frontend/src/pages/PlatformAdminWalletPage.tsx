import React, { useState, useEffect, useCallback } from 'react';
import { blockchainApi } from '../api/blockchainApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { Button } from '../components/Button';
import { Tooltip } from '../components/Tooltip';
import { Select } from '../components/Select';
import './AdminPage.css';
import type { PlatformWalletDto } from '../types/api';

export const PlatformAdminWalletPage: React.FC = () => {
  const [wallet, setWallet] = useState<PlatformWalletDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBlockchain, setSelectedBlockchain] = useState<string>('Solana');

  const fetchWallet = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await blockchainApi.getPlatformWallet(selectedBlockchain);
      setWallet(data);
    } catch (err: any) {
      console.error('Failed to fetch wallet info:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch wallet info');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBlockchain]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Platform Wallet</h1>
          <p className="admin-subtitle">View platform wallet details and balance</p>
        </div>
        <div className="admin-actions">
          <Button variant="secondary" onClick={fetchWallet} disabled={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="admin-filters">
        <div className="filter-group">
          <Select
            label="Blockchain"
            id="blockchain-select"
            value={selectedBlockchain}
            onChange={(e) => setSelectedBlockchain(e.target.value)}
          >
            <option value="Solana">Solana</option>
            <option value="Polygon">Polygon</option>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : wallet ? (
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Wallet Details</h5>
            <div className="row mt-4">
              <div className="col-md-8">
                <div className="mb-3">
                  <label className="form-label text-muted">Address</label>
                  <div className="d-flex align-items-center">
                    <code className="fs-5 me-2">{wallet.address}</code>
                    <Tooltip content="Copy to clipboard">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => navigator.clipboard.writeText(wallet.address)}
                      >
                        Copy
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="mb-3">
                  <label className="form-label text-muted">Balance</label>
                  <div className="fs-4 fw-bold">
                    {wallet.balance.toLocaleString()} {wallet.currency}
                  </div>
                </div>
              </div>
            </div>
            
            {selectedBlockchain === 'Solana' && (
              <div className="mt-3">
                <a 
                  href={`https://explorer.solana.com/address/${wallet.address}?cluster=devnet`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-link p-0"
                >
                  View on Solana Explorer <i className="bi bi-box-arrow-up-right ms-1"></i>
                </a>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="alert alert-warning">No wallet information available.</div>
      )}
    </div>
  );
};
