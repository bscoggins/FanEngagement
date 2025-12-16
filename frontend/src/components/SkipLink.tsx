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
  const handleClick = () => {
    if (!href.startsWith('#')) return;
    const targetId = href.slice(1);
    const target = document.getElementById(targetId);
    if (target && 'focus' in target && typeof target.focus === 'function') {
      target.focus();
    }
  };

  return (
    <a href={href} className="skip-link" onClick={handleClick}>
      {children}
    </a>
  );
};
