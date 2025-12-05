import React from 'react';
import './SkipLink.css';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

/**
 * SkipLink component for keyboard accessibility
 * Allows keyboard users to skip navigation and jump directly to main content
 */
export const SkipLink: React.FC<SkipLinkProps> = ({ href, children }) => {
  return (
    <a href={href} className="skip-link">
      {children}
    </a>
  );
};
