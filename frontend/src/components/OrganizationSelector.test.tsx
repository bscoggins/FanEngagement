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

  const renderSelector = (overrides?: Partial<ReturnType<typeof OrgContext.useActiveOrganization>>) => {
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
      ...overrides,
    });

    return render(<OrganizationSelector />);
  };

  it('renders nothing when user has only one organization', () => {
    const { container } = renderSelector({
      memberships: [mockMemberships[0]],
      hasMultipleOrgs: false,
    });
    expect(container.firstChild).toBeNull();
  });

  it('renders selector button when user has multiple organizations', () => {
    renderSelector();

    expect(screen.getByText('Organization:')).toBeInTheDocument();
    expect(screen.getByTestId('org-selector-button')).toBeInTheDocument();
    expect(screen.getByText('Organization One')).toBeInTheDocument();
  });

  it('displays active organization with role badge', () => {
    renderSelector();

    const button = screen.getByTestId('org-selector-button');
    expect(button).toHaveTextContent('Organization One');
    expect(button).toHaveTextContent('Admin');
  });

  it('displays Member badge when user is a regular member', () => {
    renderSelector({
      activeOrg: {
        id: 'org-2',
        name: 'Organization Two',
        role: 'Member',
      },
    });

    const button = screen.getByTestId('org-selector-button');
    expect(button).toHaveTextContent('Organization Two');
    expect(button).toHaveTextContent('Member');
  });

  it('opens dropdown when button is clicked', () => {
    renderSelector();

    const button = screen.getByTestId('org-selector-button');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('org-selector-menu')).toBeInTheDocument();
  });

  it('displays all organizations in dropdown with role badges', () => {
    renderSelector();

    fireEvent.click(screen.getByTestId('org-selector-button'));

    const dropdown = screen.getByTestId('org-selector-menu');
    const options = dropdown.querySelectorAll('[role="menuitemradio"]');

    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Organization One');
    expect(options[0]).toHaveTextContent('Admin');
    expect(options[1]).toHaveTextContent('Organization Two');
    expect(options[1]).toHaveTextContent('Member');
  });

  it('highlights active organization in dropdown', () => {
    renderSelector();

    fireEvent.click(screen.getByTestId('org-selector-button'));

    const activeOption = screen.getByTestId('org-option-org-1');
    expect(activeOption).toHaveClass('active');
    expect(activeOption.querySelector('button')).toHaveAttribute('aria-checked', 'true');
    expect(activeOption).toHaveTextContent('✓');
  });

  it('calls setActiveOrg when organization is selected', async () => {
    renderSelector();

    fireEvent.click(screen.getByTestId('org-selector-button'));

    const org2Option = screen.getByTestId('org-option-org-2').querySelector('button')!;
    fireEvent.click(org2Option);

    await waitFor(() => {
      expect(mockSetActiveOrg).toHaveBeenCalledWith({
        id: 'org-2',
        name: 'Organization Two',
        role: 'Member',
      });
    });

    await waitFor(() => {
      expect(screen.queryByTestId('org-selector-menu')).not.toBeInTheDocument();
    });
  });

  it('supports keyboard navigation with arrow keys', () => {
    renderSelector();

    const button = screen.getByTestId('org-selector-button');

    fireEvent.keyDown(button, { key: 'ArrowDown' });
    expect(button).toHaveAttribute('aria-expanded', 'true');

    const firstOptionButton = screen.getByTestId('org-option-org-1').querySelector('button')!;
    fireEvent.keyDown(firstOptionButton, { key: 'ArrowDown' });
    const secondOption = screen.getByTestId('org-option-org-2');
    expect(secondOption).toHaveClass('focused');

    const secondOptionButton = secondOption.querySelector('button')!;
    fireEvent.keyDown(secondOptionButton, { key: 'ArrowUp' });
    const firstOption = screen.getByTestId('org-option-org-1');
    expect(firstOption).toHaveClass('focused');
  });

  it('selects organization with Enter key', async () => {
    renderSelector();

    const button = screen.getByTestId('org-selector-button');

    fireEvent.keyDown(button, { key: 'ArrowDown' });
    const firstOptionButton = screen.getByTestId('org-option-org-1').querySelector('button')!;
    fireEvent.keyDown(firstOptionButton, { key: 'ArrowDown' });
    const secondOptionButton = screen.getByTestId('org-option-org-2').querySelector('button')!;
    fireEvent.keyDown(secondOptionButton, { key: 'Enter' });

    await waitFor(() => {
      expect(mockSetActiveOrg).toHaveBeenCalledWith({
        id: 'org-2',
        name: 'Organization Two',
        role: 'Member',
      });
    });
  });

  it('closes dropdown with Escape key', () => {
    renderSelector();

    const button = screen.getByTestId('org-selector-button');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(button, { key: 'Escape' });
    return waitFor(() => {
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('org-selector-menu')).not.toBeInTheDocument();
    });
  });

  it('has proper ARIA attributes for accessibility', () => {
    renderSelector();

    const button = screen.getByTestId('org-selector-button');
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-labelledby');

    fireEvent.click(button);

    const dropdown = screen.getByTestId('org-selector-menu');
    expect(dropdown).toHaveAttribute('role', 'menu');

    const options = dropdown.querySelectorAll('[role="menuitemradio"]');
    expect(options[0]).toHaveAttribute('aria-checked', 'true');
    expect(options[1]).toHaveAttribute('aria-checked', 'false');
  });

  it('closes dropdown when clicking outside', async () => {
    renderSelector();

    const button = screen.getByTestId('org-selector-button');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('org-selector-menu')).not.toBeInTheDocument();
    });
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

    renderSelector({
      memberships: longOrgMemberships,
    });

    fireEvent.click(screen.getByTestId('org-selector-button'));

    const longOrgOption = screen.getByTestId('org-option-org-2').querySelector('button')!;

    fireEvent.mouseEnter(longOrgOption);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('This is a Very Long Organization Name That Exceeds Thirty Characters');

    fireEvent.mouseLeave(longOrgOption);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('does not show tooltip for short organization names', () => {
    renderSelector();

    fireEvent.click(screen.getByTestId('org-selector-button'));

    const shortOrgOption = screen.getByTestId('org-option-org-1').querySelector('button')!;

    fireEvent.mouseEnter(shortOrgOption);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
