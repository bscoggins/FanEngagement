import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../api/usersApi';
import { organizationsApi } from '../api/organizationsApi';
import { proposalsApi } from '../api/proposalsApi';
import { addRecent } from '../utils/recentsUtils';
import type { User, Organization, Proposal } from '../types/api';
import './GlobalSearch.css';

interface SearchResults {
  users: User[];
  organizations: Organization[];
  proposals: Proposal[];
}

interface GlobalSearchProps {
  onClose?: () => void;
  autoFocus?: boolean;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onClose, autoFocus = false }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ users: [], organizations: [], proposals: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  // Focus input on mount if autoFocus is true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Compute flat list of all results for keyboard navigation
  const allResults = [
    ...results.users.map(u => ({ type: 'user' as const, item: u })),
    ...results.organizations.map(o => ({ type: 'organization' as const, item: o })),
    ...results.proposals.map(p => ({ type: 'proposal' as const, item: p })),
  ];

  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({ users: [], organizations: [], proposals: [] });
      setIsSearching(false);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    setIsOpen(true);

    try {
      // Search in parallel across all endpoints
      const [usersResult, orgsResult] = await Promise.all([
        usersApi.getAllPaged(1, 5, searchQuery),
        organizationsApi.getAllPaged(1, 5, searchQuery),
        // Proposals don't have a platform-wide search endpoint yet
        Promise.resolve({ items: [] as Proposal[], totalCount: 0, page: 1, pageSize: 5 }),
      ]);

      setResults({
        users: usersResult.items,
        organizations: orgsResult.items,
        proposals: orgsResult.items, // Placeholder
      });
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search failed:', error);
      setResults({ users: [], organizations: [], proposals: [] });
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search on query change
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, performSearch]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || allResults.length === 0) {
      if (e.key === 'Escape') {
        setQuery('');
        setIsOpen(false);
        onClose?.();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < allResults.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < allResults.length) {
          handleResultClick(allResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setQuery('');
        setIsOpen(false);
        setSelectedIndex(-1);
        onClose?.();
        break;
    }
  };

  // Navigate to result and track in recents
  const handleResultClick = (result: { type: 'user' | 'organization' | 'proposal'; item: User | Organization | Proposal }) => {
    const { type, item } = result;

    if (type === 'user') {
      const user = item as User;
      addRecent({ id: user.id, name: user.displayName || user.username, type: 'user' });
      navigate(`/admin/users/${user.id}`);
    } else if (type === 'organization') {
      const org = item as Organization;
      addRecent({ id: org.id, name: org.name, type: 'organization' });
      navigate(`/admin/organizations/${org.id}/edit`);
    } else if (type === 'proposal') {
      const proposal = item as Proposal;
      // Proposals don't go in recents for now
      navigate(`/admin/organizations/${proposal.organizationId}/proposals/${proposal.id}`);
    }

    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    onClose?.();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasResults = results.users.length > 0 || results.organizations.length > 0 || results.proposals.length > 0;

  return (
    <div className="global-search">
      <div className="global-search-input-wrapper">
        <span className="global-search-icon" aria-hidden="true">🔍</span>
        <input
          ref={inputRef}
          type="text"
          className="global-search-input"
          placeholder="Search users, organizations, proposals..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setIsOpen(true)}
          aria-label="Global search"
          aria-expanded={isOpen}
          aria-controls="global-search-results"
          aria-activedescendant={selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined}
        />
        {query && (
          <button
            className="global-search-clear"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>

      {isOpen && query.trim() && (
        <div
          ref={resultsRef}
          id="global-search-results"
          className="global-search-results"
          role="listbox"
          aria-label="Search results"
        >
          {isSearching && (
            <div className="global-search-loading" role="status" aria-live="polite">
              <span className="global-search-spinner" aria-hidden="true">⏳</span>
              <span>Searching...</span>
            </div>
          )}

          {!isSearching && !hasResults && (
            <div className="global-search-empty" role="status">
              No results found for "{query}"
            </div>
          )}

          {!isSearching && results.users.length > 0 && (
            <div className="global-search-section">
              <div className="global-search-section-title">Users</div>
              {results.users.map((user, index) => {
                const globalIndex = allResults.findIndex(r => r.type === 'user' && r.item.id === user.id);
                return (
                  <div
                    key={user.id}
                    id={`search-result-${globalIndex}`}
                    className={`global-search-result ${selectedIndex === globalIndex ? 'selected' : ''}`}
                    onClick={() => handleResultClick({ type: 'user', item: user })}
                    role="option"
                    aria-selected={selectedIndex === globalIndex}
                  >
                    <div className="global-search-result-icon">👤</div>
                    <div className="global-search-result-content">
                      <div className="global-search-result-title">{user.displayName || user.username}</div>
                      <div className="global-search-result-subtitle">{user.username}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isSearching && results.organizations.length > 0 && (
            <div className="global-search-section">
              <div className="global-search-section-title">Organizations</div>
              {results.organizations.map((org, index) => {
                const globalIndex = allResults.findIndex(r => r.type === 'organization' && r.item.id === org.id);
                return (
                  <div
                    key={org.id}
                    id={`search-result-${globalIndex}`}
                    className={`global-search-result ${selectedIndex === globalIndex ? 'selected' : ''}`}
                    onClick={() => handleResultClick({ type: 'organization', item: org })}
                    role="option"
                    aria-selected={selectedIndex === globalIndex}
                  >
                    <div className="global-search-result-icon">🏢</div>
                    <div className="global-search-result-content">
                      <div className="global-search-result-title">{org.name}</div>
                      <div className="global-search-result-subtitle">{org.description || 'Organization'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isSearching && results.proposals.length > 0 && (
            <div className="global-search-section">
              <div className="global-search-section-title">Proposals</div>
              {results.proposals.map((proposal, index) => {
                const globalIndex = allResults.findIndex(r => r.type === 'proposal' && r.item.id === proposal.id);
                return (
                  <div
                    key={proposal.id}
                    id={`search-result-${globalIndex}`}
                    className={`global-search-result ${selectedIndex === globalIndex ? 'selected' : ''}`}
                    onClick={() => handleResultClick({ type: 'proposal', item: proposal })}
                    role="option"
                    aria-selected={selectedIndex === globalIndex}
                  >
                    <div className="global-search-result-icon">📋</div>
                    <div className="global-search-result-content">
                      <div className="global-search-result-title">{proposal.title}</div>
                      <div className="global-search-result-subtitle">{proposal.status}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
