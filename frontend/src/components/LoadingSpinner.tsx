import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}

const sizes = {
  small: '24px',
  medium: '40px',
  large: '64px',
};

/**
 * A consistent loading spinner component
 * 
 * @example
 * <LoadingSpinner size="medium" message="Loading users..." />
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  message 
}) => {
  const spinnerSize = sizes[size];
  
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #0066cc',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      {message && (
        <p style={{ marginTop: '1rem', color: '#666', fontSize: '0.875rem' }}>
          {message}
        </p>
      )}
      {!message && (
        <span className="visually-hidden">Loading...</span>
      )}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};
