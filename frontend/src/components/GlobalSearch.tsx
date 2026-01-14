import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../api/usersApi';
import { organizationsApi } from '../api/organizationsApi';
import { proposalsApi } from '../api/proposalsApi';
import { membershipsApi } from '../api/membershipsApi';
import { shareTypesApi } from '../api/shareTypesApi';
import { addRecent } from '../utils/recentsUtils';
import { useAuth } from '../auth/AuthContext';
import type { User, Organization, Proposal, MembershipWithUserDto, ShareType, ProposalWithOrganization } from '../types/api';
import type { SearchContextConfig, SearchableResource } from '../search/searchConfig';
import { SEARCH_LIMITS, SEARCH_RESOURCE_ICONS, SEARCH_RESOURCE_LABELS } from '../search/searchConfig';
import './GlobalSearch.css';

interface SearchResults {
  users: User[];
  organizations: Organization[];
  proposals: (Proposal | ProposalWithOrganization)[];
  members: MembershipWithUserDto[];
  shareTypes: ShareType[];
}

type SearchResultItem =
  | { type: 'user'; item: User }
  | { type: 'organization'; item: Organization }
  | { type: 'proposal'; item: Proposal }
  | { type: 'member'; item: MembershipWithUserDto }
  | { type: 'shareType'; item: ShareType };

interface GlobalSearchProps {
  /** Search context configuration - determines what can be searched and how navigation works */
  context: SearchContextConfig;
  /** Callback when an organization is selected (for setting active org) */
  onOrganizationSelect?: (orgId: string, orgName: string) => void;
  /** Callback when the search should be closed */
  onClose?: () => void;
  /** Whether to auto-focus the input on mount */
  autoFocus?: boolean;
  /** Optional ref to the search input for external focus control */
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

const emptyResults: SearchResults = {
  users: [],
  organizations: [],
  proposals: [],
  members: [],
  shareTypes: [],
};

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  context,
  onOrganizationSelect,
  onClose,
  autoFocus = false,
  inputRef: externalInputRef,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef || internalInputRef;
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const userId = authUser?.userId;

  // Focus input on mount if autoFocus is true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Build flat list of all results for keyboard navigation
  const allResults = useMemo((): SearchResultItem[] => {
    const items: SearchResultItem[] = [];
    
    // Add results in the order they appear in UI
    results.users.forEach(u => items.push({ type: 'user', item: u }));
    results.organizations.forEach(o => items.push({ type: 'organization', item: o }));
    results.proposals.forEach(p => items.push({ type: 'proposal', item: p }));
    results.members.forEach(m => items.push({ type: 'member', item: m }));
    results.shareTypes.forEach(s => items.push({ type: 'shareType', item: s }));
    
    return items;
  }, [results]);

  // Navigate to result and track in recents
  const handleResultClick = useCallback((result: SearchResultItem) => {
    const { type, item } = result;

    switch (type) {
      case 'user': {
        const user = item as User;
        addRecent({ id: user.id, name: user.displayName, type: 'user' }, userId);
        navigate(`/admin/users/${user.id}`);
        break;
      }
      case 'organization': {
        const org = item as Organization;
        addRecent({ id: org.id, name: org.name, type: 'organization' }, userId);
        
        // Different navigation based on route mode
        if (context.routeMode === 'platformAdmin') {
          navigate(`/admin/organizations/${org.id}/edit`);
        } else {
          // For org admins and members, selecting an org sets it as active
          onOrganizationSelect?.(org.id, org.name);
        }
        break;
      }
      case 'proposal': {
        const proposal = item as Proposal;
        addRecent({
          id: proposal.id,
          name: proposal.title,
          type: 'proposal',
          organizationId: proposal.organizationId,
        }, userId);
        
        if (context.routeMode === 'platformAdmin' || context.routeMode === 'orgAdmin') {
          navigate(`/admin/organizations/${proposal.organizationId}/proposals/${proposal.id}`);
        } else {
          // Member view - navigate to voting page
          navigate(`/me/proposals/${proposal.id}`);
        }
        break;
      }
      case 'member': {
        const member = item as MembershipWithUserDto;
        addRecent({
          id: member.userId,
          name: member.userDisplayName,
          type: 'member',
          organizationId: member.organizationId,
          subtitle: member.role,
        }, userId);
        
        if (context.routeMode === 'orgAdmin') {
          navigate(`/admin/organizations/${member.organizationId}/memberships`);
        } else {
          // Members can view the member list (but not edit)
          navigate(`/me/organizations/${member.organizationId}`);
        }
        break;
      }
      case 'shareType': {
        const shareType = item as ShareType;
        addRecent({
          id: shareType.id,
          name: shareType.name,
          type: 'shareType',
          organizationId: shareType.organizationId,
          subtitle: shareType.symbol,
        }, userId);
        navigate(`/admin/organizations/${shareType.organizationId}/share-types`);
        break;
      }
    }

    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    onClose?.();
  }, [navigate, onClose, context.routeMode, onOrganizationSelect, userId]);

  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(emptyResults);
      setIsSearching(false);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    setIsOpen(true);

    const { resources, organizationId } = context;
    const newResults: SearchResults = { ...emptyResults };

    try {
      // Build promises for all requested resource types
      const promises: Promise<void>[] = [];

      if (resources.includes('users')) {
        promises.push(
          usersApi.getAllPaged(1, SEARCH_LIMITS.users, searchQuery)
            .then(result => { newResults.users = result.items; })
            .catch(() => { /* Ignore errors, keep empty */ })
        );
      }

      if (resources.includes('organizations')) {
        if (context.routeMode === 'platformAdmin') {
          // Platform Admin - search all organizations
          promises.push(
            organizationsApi.getAllPaged(1, SEARCH_LIMITS.organizations, searchQuery)
              .then(result => { newResults.organizations = result.items; })
              .catch(() => { /* Ignore errors, keep empty */ })
          );
        } else {
          // Non-admin users - only show organizations they're members of
          promises.push(
            membershipsApi.getMyOrganizations()
              .then(memberships => {
                const lowerQuery = searchQuery.toLowerCase();
                newResults.organizations = memberships
                  .filter(m => m.organizationName.toLowerCase().includes(lowerQuery))
                  .slice(0, SEARCH_LIMITS.organizations)
                  .map(m => ({
                    id: m.organizationId,
                    name: m.organizationName,
                    description: '', // Memberships don't include description
                  } as Organization));
              })
              .catch(() => { /* Ignore errors, keep empty */ })
          );
        }
      }

      if (resources.includes('proposals')) {
        if (context.routeMode === 'platformAdmin') {
          // Platform Admin - search all proposals globally
          promises.push(
            proposalsApi.searchAll(1, SEARCH_LIMITS.proposals, searchQuery)
              .then(result => { newResults.proposals = result.items; })
              .catch(() => { /* Ignore errors, keep empty */ })
          );
        } else if (organizationId) {
          // Org Admin or Member with active org - search within that organization
          promises.push(
            proposalsApi.getByOrganizationPaged(organizationId, 1, SEARCH_LIMITS.proposals, undefined, searchQuery)
              .then(result => { newResults.proposals = result.items; })
              .catch(() => { /* Ignore errors, keep empty */ })
          );
        } else {
          // Non-admin without active org - search proposals across all user's organizations
          promises.push(
            membershipsApi.getMyOrganizations()
              .then(async memberships => {
                const proposalPromises = memberships.map(m =>
                  proposalsApi.getByOrganizationPaged(m.organizationId, 1, SEARCH_LIMITS.proposals, undefined, searchQuery)
                    .then(result => result.items)
                    .catch(() => [] as Proposal[])
                );
                const allProposals = await Promise.all(proposalPromises);
                newResults.proposals = allProposals.flat().slice(0, SEARCH_LIMITS.proposals);
              })
              .catch(() => { /* Ignore errors, keep empty */ })
          );
        }
      }

      if (resources.includes('members') && organizationId) {
        // Members don't have backend search - fetch all and filter client-side
        promises.push(
          membershipsApi.getByOrganizationWithUserDetails(organizationId)
            .then(members => {
              const lowerQuery = searchQuery.toLowerCase();
              newResults.members = members
                .filter(m =>
                  m.userDisplayName.toLowerCase().includes(lowerQuery) ||
                  m.userEmail.toLowerCase().includes(lowerQuery)
                )
                .slice(0, SEARCH_LIMITS.members);
            })
            .catch(() => { /* Ignore errors, keep empty */ })
        );
      }

      if (resources.includes('shareTypes') && organizationId) {
        // Share types don't have backend search - fetch all and filter client-side
        promises.push(
          shareTypesApi.getByOrganization(organizationId)
            .then(shareTypes => {
              const lowerQuery = searchQuery.toLowerCase();
              newResults.shareTypes = shareTypes
                .filter(s =>
                  s.name.toLowerCase().includes(lowerQuery) ||
                  s.symbol.toLowerCase().includes(lowerQuery)
                )
                .slice(0, SEARCH_LIMITS.shareTypes);
            })
            .catch(() => { /* Ignore errors, keep empty */ })
        );
      }

      await Promise.all(promises);
      setResults(newResults);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search failed:', error);
      setResults(emptyResults);
    } finally {
      setIsSearching(false);
    }
  }, [context]);

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

  const hasResults =
    results.users.length > 0 ||
    results.organizations.length > 0 ||
    results.proposals.length > 0 ||
    results.members.length > 0 ||
    results.shareTypes.length > 0;

  // Render a result section
  const renderSection = <T,>(
    type: SearchableResource,
    items: T[],
    renderItem: (item: T, globalIndex: number) => React.ReactNode
  ) => {
    if (items.length === 0) return null;

    let baseOffset = 0;
    if (type === 'organizations') baseOffset = results.users.length;
    if (type === 'proposals') baseOffset = results.users.length + results.organizations.length;
    if (type === 'members') baseOffset = results.users.length + results.organizations.length + results.proposals.length;
    if (type === 'shareTypes') baseOffset = results.users.length + results.organizations.length + results.proposals.length + results.members.length;

    return (
      <div className="global-search-section">
        <div className="global-search-section-title">{SEARCH_RESOURCE_LABELS[type]}</div>
        {items.map((item, index) => renderItem(item, baseOffset + index))}
      </div>
    );
  };

  return (
    <div className="global-search">
      <div className="global-search-input-wrapper">
        <span className="global-search-icon" aria-hidden="true">🔍</span>
        <input
          ref={inputRef}
          type="text"
          className="global-search-input"
          placeholder={context.placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setIsOpen(true)}
          role="combobox"
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

          {!isSearching && renderSection('users', results.users, (user, globalIndex) => (
            <button
              key={user.id}
              id={`search-result-${globalIndex}`}
              className={`global-search-result ${selectedIndex === globalIndex ? 'selected' : ''}`}
              onClick={() => handleResultClick({ type: 'user', item: user })}
              role="option"
              aria-selected={selectedIndex === globalIndex}
              type="button"
            >
              <div className="global-search-result-icon">{SEARCH_RESOURCE_ICONS.users}</div>
              <div className="global-search-result-content">
                <div className="global-search-result-title">{user.displayName}</div>
                <div className="global-search-result-subtitle">{user.email}</div>
              </div>
            </button>
          ))}

          {!isSearching && renderSection('organizations', results.organizations, (org, globalIndex) => (
            <button
              key={org.id}
              id={`search-result-${globalIndex}`}
              className={`global-search-result ${selectedIndex === globalIndex ? 'selected' : ''}`}
              onClick={() => handleResultClick({ type: 'organization', item: org })}
              role="option"
              aria-selected={selectedIndex === globalIndex}
              type="button"
            >
              <div className="global-search-result-icon">{SEARCH_RESOURCE_ICONS.organizations}</div>
              <div className="global-search-result-content">
                <div className="global-search-result-title">{org.name}</div>
                <div className="global-search-result-subtitle">{org.description || 'Organization'}</div>
              </div>
            </button>
          ))}

          {!isSearching && renderSection('proposals', results.proposals, (proposal, globalIndex) => (
            <button
              key={proposal.id}
              id={`search-result-${globalIndex}`}
              className={`global-search-result ${selectedIndex === globalIndex ? 'selected' : ''}`}
              onClick={() => handleResultClick({ type: 'proposal', item: proposal })}
              role="option"
              aria-selected={selectedIndex === globalIndex}
              type="button"
            >
              <div className="global-search-result-icon">{SEARCH_RESOURCE_ICONS.proposals}</div>
              <div className="global-search-result-content">
                <div className="global-search-result-title">{proposal.title}</div>
                <div className="global-search-result-subtitle">
                  <span className={`global-search-status global-search-status-${proposal.status.toLowerCase()}`}>
                    {proposal.status}
                  </span>
                  {'organizationName' in proposal && proposal.organizationName && (
                    <span className="global-search-org-name"> • {proposal.organizationName}</span>
                  )}
                </div>
              </div>
            </button>
          ))}

          {!isSearching && renderSection('members', results.members, (member, globalIndex) => (
            <button
              key={member.id}
              id={`search-result-${globalIndex}`}
              className={`global-search-result ${selectedIndex === globalIndex ? 'selected' : ''}`}
              onClick={() => handleResultClick({ type: 'member', item: member })}
              role="option"
              aria-selected={selectedIndex === globalIndex}
              type="button"
            >
              <div className="global-search-result-icon">{SEARCH_RESOURCE_ICONS.members}</div>
              <div className="global-search-result-content">
                <div className="global-search-result-title">
                  {member.userDisplayName}
                  <span className={`global-search-role-badge global-search-role-${member.role.toLowerCase()}`}>
                    {member.role}
                  </span>
                </div>
                <div className="global-search-result-subtitle">{member.userEmail}</div>
              </div>
            </button>
          ))}

          {!isSearching && renderSection('shareTypes', results.shareTypes, (shareType, globalIndex) => (
            <button
              key={shareType.id}
              id={`search-result-${globalIndex}`}
              className={`global-search-result ${selectedIndex === globalIndex ? 'selected' : ''}`}
              onClick={() => handleResultClick({ type: 'shareType', item: shareType })}
              role="option"
              aria-selected={selectedIndex === globalIndex}
              type="button"
            >
              <div className="global-search-result-icon">{SEARCH_RESOURCE_ICONS.shareTypes}</div>
              <div className="global-search-result-content">
                <div className="global-search-result-title">
                  {shareType.name}
                  <span className="global-search-symbol">{shareType.symbol}</span>
                </div>
                <div className="global-search-result-subtitle">
                  Weight: {shareType.votingWeight}
                  {shareType.maxSupply && ` • Max: ${shareType.maxSupply}`}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
