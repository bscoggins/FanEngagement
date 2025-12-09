import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrganizationDropdown } from './OrganizationDropdown';
import type { MembershipWithOrganizationDto } from '../types/api';

describe('OrganizationDropdown', () => {
  const mockOnSelect = vi.fn();

  const mockMemberships: MembershipWithOrganizationDto[] = [
    {
      id: 'membership-1',
      organizationId: 'org-1',
      organizationName: 'Organization One',
      role: 'OrgAdmin',
      userId: 'user-1',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'membership-2',
      organizationId: 'org-2',
      organizationName: 'Organization Two',
      role: 'Member',
      userId: 'user-1',
      createdAt: '2024-01-02T00:00:00Z',
    },
    {
      id: 'membership-3',
      organizationId: 'org-3',
      organizationName: 'Very Long Organization Name That Should Be Truncated',
      role: 'OrgAdmin',
      userId: 'user-1',
      createdAt: '2024-01-03T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('should render closed dropdown by default', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should not render when memberships array is empty', () => {
      const { container } = render(
        <OrganizationDropdown
          memberships={[]}
          onSelect={mockOnSelect}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should display the active organization name', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-2"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('Organization Two')).toBeInTheDocument();
    });

    it('should display first organization when no activeOrgId is provided', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('Organization One')).toBeInTheDocument();
    });

    it('should display role badge for active organization', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const badge = screen.getByLabelText('Role: Admin');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('org-dropdown-role-badge', 'admin');
    });

    it('should use custom testId when provided', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
          testId="custom-dropdown"
        />
      );

      expect(screen.getByTestId('custom-dropdown')).toBeInTheDocument();
      expect(screen.getByTestId('custom-dropdown-button')).toBeInTheDocument();
    });
  });

  describe('Dropdown open/close behavior', () => {
    it('should open dropdown when button is clicked', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('menu', { name: /select organization/i })).toBeInTheDocument();
    });

    it('should close dropdown when button is clicked again', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      
      // Open dropdown
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');

      // Close dropdown
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should display menu title when opened', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      fireEvent.click(button);

      expect(screen.getByText('Your Organizations')).toBeInTheDocument();
    });
  });

  describe('Click outside to close', () => {
    it('should close dropdown when clicking outside', async () => {
      render(
        <div>
          <OrganizationDropdown
            memberships={mockMemberships}
            activeOrgId="org-1"
            onSelect={mockOnSelect}
          />
          <div data-testid="outside">Outside</div>
        </div>
      );

      const button = screen.getByRole('button', { name: /organization/i });
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');

      const outside = screen.getByTestId('outside');
      fireEvent.mouseDown(outside);

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should not close dropdown when clicking inside', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      fireEvent.click(button);

      const menu = screen.getByRole('menu');
      fireEvent.mouseDown(menu);

      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Keyboard navigation', () => {
    it('should close dropdown when Escape key is pressed', async () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should not close dropdown when other keys are pressed', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      fireEvent.click(button);

      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Tab' });
      fireEvent.keyDown(document, { key: 'ArrowDown' });

      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Organization selection', () => {
    it('should call onSelect when an organization is clicked', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      fireEvent.click(button);

      const orgItem = screen.getByTestId('org-option-org-2');
      fireEvent.click(orgItem);

      expect(mockOnSelect).toHaveBeenCalledWith('org-2');
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it('should close dropdown after selecting an organization', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      fireEvent.click(button);

      const orgItem = screen.getByTestId('org-option-org-2');
      fireEvent.click(orgItem);

      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should display all organizations in the menu', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      fireEvent.click(button);

      expect(screen.getAllByText('Organization One').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Organization Two')).toBeInTheDocument();
      expect(screen.getByText('Very Long Organization Name That Should Be Truncated')).toBeInTheDocument();
    });

    it('should display role labels for all organizations', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      fireEvent.click(button);

      const roleLabels = screen.getAllByText(/Admin|Member/);
      // Should have 3 role labels in the menu (one for each org)
      // Plus 1 in the button badge = 4 total
      expect(roleLabels.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Active organization highlighting', () => {
    it('should highlight the active organization', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-2"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      fireEvent.click(button);

      const activeItem = screen.getByTestId('org-option-org-2');
      expect(activeItem).toHaveClass('active');
    });

    it('should show checkmark for active organization', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-2"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      fireEvent.click(button);

      const activeItem = screen.getByTestId('org-option-org-2');
      expect(activeItem.textContent).toContain('✓');
    });

    it('should not show checkmark for inactive organizations', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      fireEvent.click(button);

      const inactiveItem = screen.getByTestId('org-option-org-2');
      expect(inactiveItem).not.toHaveClass('active');
    });

    it('should set aria-checked to true for active organization', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-2"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      fireEvent.click(button);

      const activeItem = screen.getByTestId('org-option-org-2');
      expect(activeItem).toHaveAttribute('aria-checked', 'true');
    });

    it('should set aria-checked to false for inactive organizations', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      fireEvent.click(button);

      const inactiveItem = screen.getByTestId('org-option-org-2');
      expect(inactiveItem).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('Accessibility attributes', () => {
    it('should have proper ARIA attributes on button', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      expect(button).toHaveAttribute('aria-haspopup', 'menu');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-controls', 'org-dropdown-menu');
    });

    it('should have proper ARIA attributes on menu', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      fireEvent.click(button);

      const menu = screen.getByRole('menu', { name: /select organization/i });
      expect(menu).toHaveAttribute('id', 'org-dropdown-menu');
      expect(menu).toHaveAttribute('role', 'menu');
      expect(menu).toHaveAttribute('aria-label', 'Select organization');
    });

    it('should have proper role on menu items', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      fireEvent.click(button);

      const menuItems = screen.getAllByRole('menuitemradio');
      expect(menuItems).toHaveLength(mockMemberships.length);
    });

    it('should have aria-live region for selected organization', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const liveRegion = screen.getByText('Organization One').parentElement;
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-hidden on decorative elements', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });
      fireEvent.click(button);

      // Check button icon
      const buttonIcon = button.querySelector('.org-dropdown-icon');
      expect(buttonIcon).toHaveAttribute('aria-hidden', 'true');

      // Check button arrow
      const arrow = button.querySelector('.org-dropdown-arrow');
      expect(arrow).toHaveAttribute('aria-hidden', 'true');

      // Check menu item icons
      const menuIcons = document.querySelectorAll('.org-dropdown-item-icon');
      menuIcons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Empty state handling', () => {
    it('should return null when memberships is empty', () => {
      const { container } = render(
        <OrganizationDropdown
          memberships={[]}
          onSelect={mockOnSelect}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not render dropdown menu when closed', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('Role badge styling', () => {
    it('should apply correct class for OrgAdmin role', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const badge = screen.getByLabelText('Role: Admin');
      expect(badge).toHaveClass('admin');
    });

    it('should apply correct class for Member role', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-2"
          onSelect={mockOnSelect}
        />
      );

      const badge = screen.getByLabelText('Role: Member');
      expect(badge).toHaveClass('member');
    });
  });

  describe('Edge cases', () => {
    it('should handle invalid activeOrgId gracefully', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="invalid-org-id"
          onSelect={mockOnSelect}
        />
      );

      // Should default to first organization
      expect(screen.getByText('Organization One')).toBeInTheDocument();
    });

    it('should handle single organization', () => {
      const singleMembership = [mockMemberships[0]];
      render(
        <OrganizationDropdown
          memberships={singleMembership}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('Organization One')).toBeInTheDocument();

      const button = screen.getByRole('button', { name: /organization/i });
      fireEvent.click(button);

      const menuItems = screen.getAllByRole('menuitemradio');
      expect(menuItems).toHaveLength(1);
    });

    it('should handle organization selection multiple times', () => {
      render(
        <OrganizationDropdown
          memberships={mockMemberships}
          activeOrgId="org-1"
          onSelect={mockOnSelect}
        />
      );

      const button = screen.getByRole('button', { name: /organization/i });

      // First selection
      fireEvent.click(button);
      fireEvent.click(screen.getByTestId('org-option-org-2'));
      expect(mockOnSelect).toHaveBeenCalledWith('org-2');

      // Second selection
      fireEvent.click(button);
      fireEvent.click(screen.getByTestId('org-option-org-3'));
      expect(mockOnSelect).toHaveBeenCalledWith('org-3');

      expect(mockOnSelect).toHaveBeenCalledTimes(2);
    });
  });
});
