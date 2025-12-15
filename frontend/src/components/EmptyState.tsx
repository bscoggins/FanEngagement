import React from 'react';

interface EmptyStateProps {
  message: string;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * A consistent empty state component for when there's no data
 * 
 * @example
 * <EmptyState 
 *   message="No users found" 
 *   action={{ label: "Create User", onClick: handleCreate }} 
 * />
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ message, icon, action }) => {
  return (
    <section
      role="status"
      aria-label="Empty state"
      style={{
        padding: '3rem 2rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        textAlign: 'center',
      }}
    >
      {icon && (
        <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }} aria-hidden="true">
          {icon}
        </div>
      )}
      <p style={{ color: '#666', fontSize: '1rem', margin: '0 0 1.5rem 0' }}>
        {message}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
          aria-label={action.label}
        >
          {action.label}
        </button>
      )}
    </section>
  );
};
