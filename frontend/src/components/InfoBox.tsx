import React from 'react';
import './InfoBox.css';

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
  return <div className="info-box">{children}</div>;
};
