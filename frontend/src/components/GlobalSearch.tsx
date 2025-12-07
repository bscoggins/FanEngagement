import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../api/usersApi';
import { organizationsApi } from '../api/organizationsApi';
import { addRecent } from '../utils/recentsUtils';
import type { User, Organization } from '../types/api';
import './GlobalSearch.css';

interface SearchResults {
  users: User[];
  organizations: Organization[];
}

interface GlobalSearchProps {
  onClose?: () => void;
  autoFocus?: boolean;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onClose, autoFocus = false }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ users: [], organizations: [] });
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

  // Memoize allResults to avoid unnecessary re-renders
  const allResults = useMemo(() => [
    ...results.users.map(u => ({ type: 'user' as const, item: u })),
    ...results.organizations.map(o => ({ type: 'organization' as const, item: o })),
  ], [results.users, results.organizations]);

  // Navigate to result and track in recents
  const handleResultClick = useCallback((result: { type: 'user' | 'organization'; item: User | Organization }) => {
    const { type, item } = result;

    if (type === 'user') {
      const user = item as User;
      addRecent({ id: user.id, name: user.displayName, type: 'user' });
      navigate(`/admin/users/${user.id}`);
    } else if (type === 'organization') {
      const org = item as Organization;
      addRecent({ id: org.id, name: org.name, type: 'organization' });
      navigate(`/admin/organizations/${org.id}/edit`);
    }

    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    onClose?.();
  }, [navigate, onClose]);

  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({ users: [], organizations: [] });
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
      ]);

      setResults({
        users: usersResult.items,
        organizations: orgsResult.items,
      });
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search failed:', error);
      setResults({ users: [], organizations: [] });
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
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
  }, [isOpen, allResults, selectedIndex, onClose, handleResultClick]);

  // Navigate to result and track in recents - Moved above handleKeyDown
  // const handleResultClick = ...


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

  const hasResults = results.users.length > 0 || results.organizations.length > 0;

  return (
    <div className="global-search">
      <div className="global-search-input-wrapper">
        <span className="global-search-icon" aria-hidden="true">🔍</span>
        <input
          ref={inputRef}
          type="text"
          className="global-search-input"
          placeholder="Search users, organizations..."
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
                const globalIndex = index; // users come first in allResults
                return (
                  <button
                    key={user.id}
                    id={`search-result-${globalIndex}`}
                    className={`global-search-result ${selectedIndex === globalIndex ? 'selected' : ''}`}
                    onClick={() => handleResultClick({ type: 'user', item: user })}
                    role="option"
                    aria-selected={selectedIndex === globalIndex}
                    type="button"
                  >
                    <div className="global-search-result-icon">👤</div>
                    <div className="global-search-result-content">
                      <div className="global-search-result-title">{user.displayName}</div>
                      <div className="global-search-result-subtitle">{user.email}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!isSearching && results.organizations.length > 0 && (
            <div className="global-search-section">
              <div className="global-search-section-title">Organizations</div>
              {results.organizations.map((org, index) => {
                const globalIndex = results.users.length + index; // orgs come after users
                return (
                  <button
                    key={org.id}
                    id={`search-result-${globalIndex}`}
                    className={`global-search-result ${selectedIndex === globalIndex ? 'selected' : ''}`}
                    onClick={() => handleResultClick({ type: 'organization', item: org })}
                    role="option"
                    aria-selected={selectedIndex === globalIndex}
                    type="button"
                  >
                    <div className="global-search-result-icon">🏢</div>
                    <div className="global-search-result-content">
                      <div className="global-search-result-title">{org.name}</div>
                      <div className="global-search-result-subtitle">{org.description || 'Organization'}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
