import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecents, type RecentItem } from '../utils/recentsUtils';
import './RecentsDropdown.css';

interface RecentsDropdownProps {
  className?: string;
}

const ClockIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path
      d="M12 7.5v5l3 1.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const RecentsDropdown: React.FC<RecentsDropdownProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load recents when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setRecents(getRecents());
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleItemClick = (item: RecentItem) => {
    if (item.type === 'user') {
      navigate(`/admin/users/${item.id}`);
    } else if (item.type === 'organization') {
      navigate(`/admin/organizations/${item.id}/edit`);
    }
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`recents-dropdown ${className || ''}`}>
      <button
        className="recents-dropdown-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Recent items"
        aria-expanded={isOpen}
        aria-controls="recents-dropdown-menu"
      >
        <span className="recents-dropdown-icon" aria-hidden="true">
          <ClockIcon />
        </span>
        <span className="recents-dropdown-label">Recents</span>
        <span className="recents-dropdown-arrow" aria-hidden="true">▼</span>
      </button>

      {isOpen && (
        <div
          id="recents-dropdown-menu"
          className="recents-dropdown-menu"
          role="menu"
          aria-label="Recently viewed items"
        >
          {recents.length === 0 ? (
            <div className="recents-dropdown-empty" role="status">
              No recent items
            </div>
          ) : (
            <>
              <div className="recents-dropdown-title">Recently Viewed</div>
              {recents.map(item => (
                <button
                  key={`${item.type}-${item.id}`}
                  className="recents-dropdown-item"
                  onClick={() => handleItemClick(item)}
                  role="menuitem"
                >
                  <span className="recents-dropdown-item-icon" aria-hidden="true">
                    {item.type === 'user' ? '👤' : '🏢'}
                  </span>
                  <div className="recents-dropdown-item-content">
                    <div className="recents-dropdown-item-name">{item.name}</div>
                    <div className="recents-dropdown-item-type">
                      {item.type === 'user' ? 'User' : 'Organization'}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};
