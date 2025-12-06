import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('renders selector button when user has multiple organizations', () => {
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

    expect(screen.getByText('Organization:')).toBeInTheDocument();
    expect(screen.getByTestId('org-selector-button')).toBeInTheDocument();
    expect(screen.getByText('Organization One')).toBeInTheDocument();
  });

  it('displays active organization with role badge', () => {
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

    const button = screen.getByTestId('org-selector-button');
    expect(button).toHaveTextContent('Organization One');
    expect(button).toHaveTextContent('Admin');
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

    const button = screen.getByTestId('org-selector-button');
    expect(button).toHaveTextContent('Organization Two');
    expect(button).toHaveTextContent('Member');
  });

  it('opens dropdown when button is clicked', () => {
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

    const button = screen.getByTestId('org-selector-button');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('org-selector-dropdown')).toBeInTheDocument();
  });

  it('displays all organizations in dropdown with role badges', () => {
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

    const button = screen.getByTestId('org-selector-button');
    fireEvent.click(button);

    const dropdown = screen.getByTestId('org-selector-dropdown');
    const options = dropdown.querySelectorAll('[role="option"]');

    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Organization One');
    expect(options[0]).toHaveTextContent('Admin');
    expect(options[1]).toHaveTextContent('Organization Two');
    expect(options[1]).toHaveTextContent('Member');
  });

  it('highlights active organization in dropdown', () => {
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

    const button = screen.getByTestId('org-selector-button');
    fireEvent.click(button);

    const activeOption = screen.getByTestId('org-option-org-1');
    expect(activeOption).toHaveClass('active');
    expect(activeOption).toHaveAttribute('aria-selected', 'true');
    // Check for checkmark
    expect(activeOption).toHaveTextContent('✓');
  });

  it('calls setActiveOrg when organization is selected', async () => {
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

    const button = screen.getByTestId('org-selector-button');
    fireEvent.click(button);

    const org2Option = screen.getByTestId('org-option-org-2');
    fireEvent.click(org2Option);

    await waitFor(() => {
      expect(mockSetActiveOrg).toHaveBeenCalledWith({
        id: 'org-2',
        name: 'Organization Two',
        role: 'Member',
      });
    });

    // Dropdown should close after selection
    await waitFor(() => {
      expect(screen.queryByTestId('org-selector-dropdown')).not.toBeInTheDocument();
    });
  });

  it('supports keyboard navigation with arrow keys', () => {
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

    const button = screen.getByTestId('org-selector-button');
    
    // Open dropdown with arrow down
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    expect(button).toHaveAttribute('aria-expanded', 'true');

    // Navigate down
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    const secondOption = screen.getByTestId('org-option-org-2');
    expect(secondOption).toHaveClass('focused');

    // Navigate up
    fireEvent.keyDown(button, { key: 'ArrowUp' });
    const firstOption = screen.getByTestId('org-option-org-1');
    expect(firstOption).toHaveClass('focused');
  });

  it('selects organization with Enter key', async () => {
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

    const button = screen.getByTestId('org-selector-button');
    
    // Open dropdown
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    
    // Navigate to second option
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    
    // Select with Enter
    fireEvent.keyDown(button, { key: 'Enter' });

    await waitFor(() => {
      expect(mockSetActiveOrg).toHaveBeenCalledWith({
        id: 'org-2',
        name: 'Organization Two',
        role: 'Member',
      });
    });
  });

  it('closes dropdown with Escape key', () => {
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

    const button = screen.getByTestId('org-selector-button');
    
    // Open dropdown
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    
    // Close with Escape
    fireEvent.keyDown(button, { key: 'Escape' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('org-selector-dropdown')).not.toBeInTheDocument();
  });

  it('has proper ARIA attributes for accessibility', () => {
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

    const button = screen.getByTestId('org-selector-button');
    expect(button).toHaveAttribute('aria-haspopup', 'listbox');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-labelledby');

    fireEvent.click(button);

    const dropdown = screen.getByTestId('org-selector-dropdown');
    expect(dropdown).toHaveAttribute('role', 'listbox');
    
    const options = dropdown.querySelectorAll('[role="option"]');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('closes dropdown when clicking outside', () => {
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

    const button = screen.getByTestId('org-selector-button');
    
    // Open dropdown
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    
    // Click outside the dropdown
    fireEvent.mouseDown(document.body);
    
    // Dropdown should close
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('org-selector-dropdown')).not.toBeInTheDocument();
  });

  it('shows tooltip for truncated organization names', () => {
    const longOrgMemberships: MembershipWithOrganizationDto[] = [
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
        organizationName: 'This is a Very Long Organization Name That Exceeds Thirty Characters',
        userId: 'user-1',
        role: 'Member',
        createdAt: new Date().toISOString(),
      },
    ];

    vi.mocked(OrgContext.useActiveOrganization).mockReturnValue({
      activeOrg: {
        id: 'org-1',
        name: 'Organization One',
        role: 'OrgAdmin',
      },
      setActiveOrg: mockSetActiveOrg,
      memberships: longOrgMemberships,
      hasMultipleOrgs: true,
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    render(<OrganizationSelector />);

    const button = screen.getByTestId('org-selector-button');
    fireEvent.click(button);

    const longOrgOption = screen.getByTestId('org-option-org-2');
    
    // Hover over the option with long name
    fireEvent.mouseEnter(longOrgOption);
    
    // Tooltip should appear
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('This is a Very Long Organization Name That Exceeds Thirty Characters');
    
    // Mouse leave should hide tooltip
    fireEvent.mouseLeave(longOrgOption);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('does not show tooltip for short organization names', () => {
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

    const button = screen.getByTestId('org-selector-button');
    fireEvent.click(button);

    const shortOrgOption = screen.getByTestId('org-option-org-1');
    
    // Hover over the option with short name
    fireEvent.mouseEnter(shortOrgOption);
    
    // Tooltip should not appear
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
