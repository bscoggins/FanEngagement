import React from 'react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

/**
 * A consistent error message component
 * 
 * @example
 * <ErrorMessage message="Failed to load data" onRetry={refetch} />
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        padding: '1rem',
        backgroundColor: '#f8d7da',
        color: '#721c24',
        border: '1px solid #f5c6cb',
        borderRadius: '4px',
        marginTop: '1rem',
      }}
    >
      <p style={{ margin: 0 }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: '0.75rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
          aria-label="Retry loading"
        >
          Retry
        </button>
      )}
    </div>
  );
};
