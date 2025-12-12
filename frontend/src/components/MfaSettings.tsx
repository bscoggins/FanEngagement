import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { mfaApi } from '../api/authApi';
import { useNotifications } from '../contexts/NotificationContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import type { MfaSetupResult } from '../types/api';

export const MfaSettings: React.FC = () => {
  const { showSuccess, showError } = useNotifications();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<MfaSetupResult | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [error, setError] = useState('');

  const fetchMfaStatus = async () => {
    try {
      setLoading(true);
      setError('');
      const status = await mfaApi.getStatus();
      setMfaEnabled(status.mfaEnabled);
    } catch (err: any) {
      console.error('Failed to fetch MFA status:', err);
      setError('Failed to load MFA status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMfaStatus();
  }, []);

  const handleSetupMfa = async () => {
    try {
      setError('');
      const setup = await mfaApi.setup();
      setSetupData(setup);
      setShowSetup(true);
    } catch (err: any) {
      console.error('Failed to setup MFA:', err);
      showError('Failed to initialize MFA setup');
    }
  };

  const handleEnableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData) return;

    try {
      setError('');
      const result = await mfaApi.enable({
        secretKey: setupData.secretKey,
        totpCode: totpCode,
      });
      
      setBackupCodes(result.backupCodes);
      setMfaEnabled(true);
      setTotpCode('');
      showSuccess('MFA enabled successfully! Please save your backup codes.');
    } catch (err: any) {
      console.error('Failed to enable MFA:', err);
      setError('Invalid code. Please try again.');
      showError('Invalid code. Please try again.');
    }
  };

  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setError('');
      await mfaApi.disable({ code: disableCode });
      
      setMfaEnabled(false);
      setShowDisable(false);
      setDisableCode('');
      setBackupCodes(null);
      showSuccess('MFA disabled successfully');
    } catch (err: any) {
      console.error('Failed to disable MFA:', err);
      setError('Invalid code. Please try again.');
      showError('Invalid code. Please try again.');
    }
  };

  const handleCloseSetup = () => {
    setShowSetup(false);
    setSetupData(null);
    setTotpCode('');
    setBackupCodes(null);
    setError('');
  };

  if (loading) {
    return <LoadingSpinner message="Loading MFA settings..." />;
  }

  if (error && !mfaEnabled && !showSetup) {
    return <ErrorMessage message={error} onRetry={fetchMfaStatus} />;
  }

  if (backupCodes) {
    return (
      <div className="admin-card admin-alert admin-alert-warning" style={{ marginTop: '2rem' }}>
        <h3>⚠️ Save Your Backup Codes</h3>
        <p style={{ marginBottom: '1rem' }}>
          Please save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '1rem', fontFamily: 'monospace', fontSize: '1.1rem' }}>
          {backupCodes.map((code, index) => (
            <div key={index} style={{ padding: '0.5rem', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }}>
              {code}
            </div>
          ))}
        </div>
        <button onClick={handleCloseSetup} className="admin-button admin-button-success">
          I've Saved My Backup Codes
        </button>
      </div>
    );
  }

  if (showSetup && setupData) {
    return (
      <div className="admin-card" style={{ marginTop: '2rem' }}>
        <h3>Enable Two-Factor Authentication</h3>
        
        <div style={{ marginTop: '1.5rem' }}>
          <p style={{ marginBottom: '1rem' }}>
            <strong>Step 1:</strong> Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <QRCodeSVG value={setupData.qrCodeUri} size={200} />
          </div>
          
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Or manually enter this code:</strong>
          </p>
          <div style={{ padding: '0.75rem', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace', marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.1rem' }}>
            {setupData.secretKey}
          </div>
        </div>

        <form onSubmit={handleEnableMfa} className="admin-form">
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Step 2:</strong> Enter the 6-digit code from your authenticator app:
          </p>
          <input
            type="text"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            placeholder="000000"
            maxLength={6}
            required
            className="admin-input"
            style={{ textAlign: 'center', letterSpacing: '0.2rem' }}
          />
          
          {error && (
            <div className="admin-alert admin-alert-error" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button type="submit" className="admin-button admin-button-success">
              Enable MFA
            </button>
            <button type="button" onClick={handleCloseSetup} className="admin-button admin-button-outline">
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (showDisable) {
    return (
      <div className="admin-card admin-alert admin-alert-warning" style={{ marginTop: '2rem' }}>
        <h3>Disable Two-Factor Authentication</h3>
        <p style={{ marginTop: '1rem' }}>
          Enter your 6-digit authenticator code or a backup code to disable MFA.
        </p>

        <form onSubmit={handleDisableMfa} className="admin-form">
          <input
            type="text"
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            placeholder="Enter code"
            required
            className="admin-input"
          />

          {error && (
            <div className="admin-alert admin-alert-error" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button type="submit" className="admin-button admin-button-danger">
              Disable MFA
            </button>
            <button
              type="button"
              className="admin-button admin-button-outline"
              onClick={() => {
                setShowDisable(false);
                setDisableCode('');
                setError('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-card" style={{ marginTop: '2rem' }}>
      <h3>Two-Factor Authentication</h3>
      
      <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
        <p>
          <strong>Status:</strong>{' '}
          <span style={{ color: mfaEnabled ? '#28a745' : '#6c757d', fontWeight: 'bold' }}>
            {mfaEnabled ? '✓ Enabled' : '✗ Disabled'}
          </span>
        </p>
        <p style={{ marginTop: '0.5rem', color: '#666' }}>
          Two-factor authentication adds an extra layer of security to your account by requiring a code from your authenticator app when you log in.
        </p>
      </div>

      {!mfaEnabled ? (
        <button onClick={handleSetupMfa} className="admin-button admin-button-primary">
          Enable Two-Factor Authentication
        </button>
      ) : (
        <button onClick={() => setShowDisable(true)} className="admin-button admin-button-danger">
          Disable Two-Factor Authentication
        </button>
      )}
    </div>
  );
};
