import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getRecents,
  getRecentItemIcon,
  getRecentItemLabel,
  type RecentItem,
} from '../utils/recentsUtils';
import { useAuth } from '../auth/AuthContext';
import type { SearchRouteMode } from '../search/searchConfig';
import './RecentsDropdown.css';

interface RecentsDropdownProps {
  className?: string;
  /** Route mode determines how navigation works - defaults to 'member' */
  routeMode?: SearchRouteMode;
}

const ClockIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
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

export const RecentsDropdown: React.FC<RecentsDropdownProps> = ({ className, routeMode = 'member' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Load recents when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setRecents(getRecents(user?.userId));
    }
  }, [isOpen, user?.userId]);

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
    // For non-admin modes, only proposals and organizations are valid
    // Members should not have user, member, or shareType in their recents
    // but if they do click on them, navigate safely
    
    switch (item.type) {
      case 'user':
        // Users are only accessible to platform admins
        if (routeMode === 'platformAdmin') {
          navigate(`/admin/users/${item.id}`);
        }
        // For other modes, do nothing (no valid route)
        break;
      case 'organization':
        if (routeMode === 'platformAdmin') {
          navigate(`/admin/organizations/${item.id}/edit`);
        } else if (routeMode === 'orgAdmin' && item.id) {
          navigate(`/admin/organizations/${item.id}/edit`);
        } else if (item.id) {
          // Member mode - navigate to member org view
          navigate(`/me/organizations/${item.id}`);
        }
        break;
      case 'proposal':
        if (item.organizationId) {
          if (routeMode === 'platformAdmin' || routeMode === 'orgAdmin') {
            navigate(`/admin/organizations/${item.organizationId}/proposals/${item.id}`);
          } else {
            // Member mode - navigate to member proposal view
            navigate(`/me/proposals/${item.id}`);
          }
        }
        break;
      case 'member':
        // Members list is only accessible to platform admins and org admins
        if (item.organizationId) {
          if (routeMode === 'platformAdmin' || routeMode === 'orgAdmin') {
            navigate(`/admin/organizations/${item.organizationId}/memberships`);
          }
          // For member mode, do nothing (no valid route for viewing members list)
        }
        break;
      case 'shareType':
        // Share types list is only accessible to platform admins and org admins
        if (item.organizationId) {
          if (routeMode === 'platformAdmin' || routeMode === 'orgAdmin') {
            navigate(`/admin/organizations/${item.organizationId}/share-types`);
          }
          // For member mode, do nothing (no valid route for viewing share types)
        }
        break;
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
                    {getRecentItemIcon(item.type)}
                  </span>
                  <div className="recents-dropdown-item-content">
                    <div className="recents-dropdown-item-name">{item.name}</div>
                    <div className="recents-dropdown-item-type">
                      {getRecentItemLabel(item.type)}
                      {item.subtitle && (
                        <span className="recents-dropdown-item-subtitle">
                          {' · '}{item.subtitle}
                        </span>
                      )}
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
