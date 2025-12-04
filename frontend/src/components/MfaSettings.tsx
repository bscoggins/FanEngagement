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
      <div style={{ padding: '1.5rem', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', marginTop: '2rem' }}>
        <h3>⚠️ Save Your Backup Codes</h3>
        <p style={{ marginBottom: '1rem', color: '#856404' }}>
          Please save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '1rem', fontFamily: 'monospace', fontSize: '1.1rem' }}>
          {backupCodes.map((code, index) => (
            <div key={index} style={{ padding: '0.5rem', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }}>
              {code}
            </div>
          ))}
        </div>
        <button
          onClick={handleCloseSetup}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          I've Saved My Backup Codes
        </button>
      </div>
    );
  }

  if (showSetup && setupData) {
    return (
      <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px' }}>
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

        <form onSubmit={handleEnableMfa}>
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
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1.1rem',
              marginBottom: '1rem',
              textAlign: 'center',
              letterSpacing: '0.2rem',
            }}
          />
          
          {error && (
            <div style={{ padding: '0.75rem', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c33', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Enable MFA
            </button>
            <button
              type="button"
              onClick={handleCloseSetup}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (showDisable) {
    return (
      <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
        <h3>Disable Two-Factor Authentication</h3>
        <p style={{ marginTop: '1rem', color: '#856404' }}>
          Enter your 6-digit authenticator code or a backup code to disable MFA.
        </p>

        <form onSubmit={handleDisableMfa}>
          <input
            type="text"
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            placeholder="Enter code"
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1.1rem',
              marginTop: '1rem',
              marginBottom: '1rem',
            }}
          />

          {error && (
            <div style={{ padding: '0.75rem', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c33', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Disable MFA
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDisable(false);
                setDisableCode('');
                setError('');
              }}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
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
    <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px' }}>
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
        <button
          onClick={handleSetupMfa}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Enable Two-Factor Authentication
        </button>
      ) : (
        <button
          onClick={() => setShowDisable(true)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Disable Two-Factor Authentication
        </button>
      )}
    </div>
  );
};
