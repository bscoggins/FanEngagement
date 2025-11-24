import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrganizationSelector } from './OrganizationSelector';
import * as OrgContext from '../contexts/OrgContext';
import type { MembershipWithOrganizationDto } from '../types/api';

vi.mock('../contexts/OrgContext');

describe('OrganizationSelector', () => {
  const mockMemberships: MembershipWithOrganizationDto[] = [
    {
      id: 'membership-1',
      organizationId: 'org-1',
      organizationName: 'Organization One',
      userId: 'user-1',
      role: 'OrgAdmin',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'membership-2',
      organizationId: 'org-2',
      organizationName: 'Organization Two',
      userId: 'user-1',
      role: 'Member',
      createdAt: new Date().toISOString(),
    },
  ];

  const mockSetActiveOrg = vi.fn();

  it('renders nothing when user has only one organization', () => {
    vi.mocked(OrgContext.useActiveOrganization).mockReturnValue({
      activeOrg: {
        id: 'org-1',
        name: 'Organization One',
        role: 'OrgAdmin',
      },
      setActiveOrg: mockSetActiveOrg,
      memberships: [mockMemberships[0]],
      hasMultipleOrgs: false,
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    const { container } = render(<OrganizationSelector />);
    expect(container.firstChild).toBeNull();
  });

  it('renders selector when user has multiple organizations', () => {
    vi.mocked(OrgContext.useActiveOrganization).mockReturnValue({
      activeOrg: {
        id: 'org-1',
        name: 'Organization One',
        role: 'OrgAdmin',
      },
      setActiveOrg: mockSetActiveOrg,
      memberships: mockMemberships,
      hasMultipleOrgs: true,
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    render(<OrganizationSelector />);

    expect(screen.getByLabelText('Organization:')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays all organizations in the selector', () => {
    vi.mocked(OrgContext.useActiveOrganization).mockReturnValue({
      activeOrg: {
        id: 'org-1',
        name: 'Organization One',
        role: 'OrgAdmin',
      },
      setActiveOrg: mockSetActiveOrg,
      memberships: mockMemberships,
      hasMultipleOrgs: true,
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    render(<OrganizationSelector />);

    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option'));

    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Organization One (Admin)');
    expect(options[1]).toHaveTextContent('Organization Two (Member)');
  });

  it('displays the active organization role badge', () => {
    vi.mocked(OrgContext.useActiveOrganization).mockReturnValue({
      activeOrg: {
        id: 'org-1',
        name: 'Organization One',
        role: 'OrgAdmin',
      },
      setActiveOrg: mockSetActiveOrg,
      memberships: mockMemberships,
      hasMultipleOrgs: true,
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    render(<OrganizationSelector />);

    expect(screen.getByText('Org Admin')).toBeInTheDocument();
  });

  it('displays Member badge when user is a regular member', () => {
    vi.mocked(OrgContext.useActiveOrganization).mockReturnValue({
      activeOrg: {
        id: 'org-2',
        name: 'Organization Two',
        role: 'Member',
      },
      setActiveOrg: mockSetActiveOrg,
      memberships: mockMemberships,
      hasMultipleOrgs: true,
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    render(<OrganizationSelector />);

    expect(screen.getByText('Member')).toBeInTheDocument();
  });

  it('calls setActiveOrg when organization is changed', () => {
    vi.mocked(OrgContext.useActiveOrganization).mockReturnValue({
      activeOrg: {
        id: 'org-1',
        name: 'Organization One',
        role: 'OrgAdmin',
      },
      setActiveOrg: mockSetActiveOrg,
      memberships: mockMemberships,
      hasMultipleOrgs: true,
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    render(<OrganizationSelector />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'org-2' } });

    expect(mockSetActiveOrg).toHaveBeenCalledWith({
      id: 'org-2',
      name: 'Organization Two',
      role: 'Member',
    });
  });

  it('selects the active organization in the dropdown', () => {
    vi.mocked(OrgContext.useActiveOrganization).mockReturnValue({
      activeOrg: {
        id: 'org-2',
        name: 'Organization Two',
        role: 'Member',
      },
      setActiveOrg: mockSetActiveOrg,
      memberships: mockMemberships,
      hasMultipleOrgs: true,
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    render(<OrganizationSelector />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('org-2');
  });
});
