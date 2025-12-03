import React from 'react';

interface InfoBoxProps {
  children: React.ReactNode;
}

/**
 * A consistent informational message box component
 * 
 * @example
 * <InfoBox>
 *   <strong>Note:</strong> This is important information.
 * </InfoBox>
 */
export const InfoBox: React.FC<InfoBoxProps> = ({ children }) => {
  return (
    <div
      style={{
        marginTop: '0.5rem',
        padding: '0.75rem',
        backgroundColor: '#f0f8ff',
        border: '1px solid #cce5ff',
        borderRadius: '4px',
        fontSize: '0.9rem',
        color: '#004085',
      }}
    >
      {children}
    </div>
  );
};
