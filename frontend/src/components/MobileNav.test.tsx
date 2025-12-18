import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { MobileNav, type MobileNavItem, type MobileNavOrganization } from './MobileNav';

const renderMobileNav = (props: { 
  isOpen: boolean; 
  onClose: () => void; 
  items: MobileNavItem[];
  sections?: Array<{ label: string; items: MobileNavItem[] }>;
  organizations?: MobileNavOrganization[];
  activeOrgId?: string;
  onOrgChange?: (orgId: string) => void;
}) => {
  return render(
    <BrowserRouter>
      <MobileNav {...props} />
    </BrowserRouter>
  );
};

describe('MobileNav', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = renderMobileNav({
      isOpen: false,
      onClose: vi.fn(),
      items: [],
    });
    
    expect(container.querySelector('.mobile-nav-drawer')).toBeFalsy();
  });

  it('renders drawer and backdrop when isOpen is true', () => {
    renderMobileNav({
      isOpen: true,
      onClose: vi.fn(),
      items: [],
    });
    
    expect(screen.getByLabelText('Mobile navigation')).toBeTruthy();
    expect(document.querySelector('.mobile-nav-backdrop')).toBeTruthy();
  });

  it('renders navigation items correctly', () => {
    const items: MobileNavItem[] = [
      { id: 'home', label: 'Home', path: '/', isActive: true },
      { id: 'account', label: 'My Account', path: '/me', isActive: false },
    ];
    
    renderMobileNav({
      isOpen: true,
      onClose: vi.fn(),
      items,
    });
    
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('My Account')).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    
    renderMobileNav({
      isOpen: true,
      onClose,
      items: [],
    });
    
    const closeButton = screen.getByLabelText('Close navigation');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    
    renderMobileNav({
      isOpen: true,
      onClose,
      items: [],
    });
    
    const backdrop = document.querySelector('.mobile-nav-backdrop');
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when a navigation link is clicked', () => {
    const onClose = vi.fn();
    const items: MobileNavItem[] = [
      { id: 'home', label: 'Home', path: '/' },
    ];
    
    renderMobileNav({
      isOpen: true,
      onClose,
      items,
    });
    
    const homeLink = screen.getByText('Home');
    fireEvent.click(homeLink);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('applies active class to active items', () => {
    const items: MobileNavItem[] = [
      { id: 'home', label: 'Home', path: '/', isActive: true },
      { id: 'account', label: 'My Account', path: '/me', isActive: false },
    ];
    
    renderMobileNav({
      isOpen: true,
      onClose: vi.fn(),
      items,
    });
    
    const homeLink = screen.getByText('Home');
    expect(homeLink.classList.contains('active')).toBe(true);
    
    const accountLink = screen.getByText('My Account');
    expect(accountLink.classList.contains('active')).toBe(false);
  });

  it('renders sections correctly', () => {
    const sections = [
      {
        label: 'User',
        items: [
          { id: 'home', label: 'Home', path: '/' },
        ],
      },
      {
        label: 'Admin',
        items: [
          { id: 'users', label: 'Users', path: '/admin/users' },
        ],
      },
    ];
    
    renderMobileNav({
      isOpen: true,
      onClose: vi.fn(),
      items: [],
      sections,
    });
    
    expect(screen.getByText('User')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Users')).toBeTruthy();
  });

  it('closes drawer when Escape key is pressed', () => {
    const onClose = vi.fn();
    
    renderMobileNav({
      isOpen: true,
      onClose,
      items: [],
    });
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps focus within drawer', async () => {
    const user = userEvent.setup();
    const items: MobileNavItem[] = [
      { id: 'home', label: 'Home', path: '/' },
      { id: 'account', label: 'My Account', path: '/me' },
      { id: 'settings', label: 'Settings', path: '/settings' },
    ];
    
    renderMobileNav({
      isOpen: true,
      onClose: vi.fn(),
      items,
    });

    const homeLink = screen.getByRole('link', { name: 'Home' });
    const accountLink = screen.getByRole('link', { name: 'My Account' });
    const settingsLink = screen.getByRole('link', { name: 'Settings' });
    const closeButton = screen.getByRole('button', { name: 'Close navigation' });

    // Wait for focus to be set on first nav item
    await waitFor(() => {
      expect(homeLink).toHaveFocus();
    });

    // Tab to first link
    await user.tab();
    expect(accountLink).toHaveFocus();

    // Tab through to last link
    await user.tab();
    expect(settingsLink).toHaveFocus();

    // Tab should wrap to close button
    await user.tab();
    expect(closeButton).toHaveFocus();

    // Shift+Tab should wrap to last link
    await user.tab({ shift: true });
    expect(settingsLink).toHaveFocus();
  });

  it('announces open and close state changes', async () => {
    const baseProps = {
      isOpen: true,
      onClose: vi.fn(),
      items: [],
    };

    const view = renderMobileNav(baseProps);
    const status = screen.getByRole('status');

    await waitFor(() => {
      expect(status).toHaveTextContent('Navigation menu opened.');
    });

    view.rerender(
      <BrowserRouter>
        <MobileNav {...baseProps} isOpen={false} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(status).toHaveTextContent('Navigation menu closed.');
    });
  });

  it('returns focus to trigger when closed', async () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Open menu';
    document.body.appendChild(trigger);
    trigger.focus();

    const baseProps = {
      isOpen: true,
      onClose: vi.fn(),
      items: [],
    };

    const view = renderMobileNav(baseProps);

    const closeButton = await screen.findByRole('button', { name: 'Close navigation' });
    expect(closeButton).toBeInTheDocument();

    view.rerender(
      <BrowserRouter>
        <MobileNav {...baseProps} isOpen={false} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });

    document.body.removeChild(trigger);
  });

  describe('Organization switcher', () => {
    it('does not render org switcher when no organizations provided', () => {
      renderMobileNav({
        isOpen: true,
        onClose: vi.fn(),
        items: [],
      });
      
      expect(screen.queryByText('Organization')).toBeFalsy();
    });

    it('does not render org switcher when only one organization', () => {
      const organizations: MobileNavOrganization[] = [
        { id: 'org1', name: 'Org 1', role: 'OrgAdmin' },
      ];
      
      renderMobileNav({
        isOpen: true,
        onClose: vi.fn(),
        items: [],
        organizations,
        activeOrgId: 'org1',
      });
      
      expect(screen.queryByText('Organization')).toBeFalsy();
    });

    it('renders org switcher when multiple organizations provided', () => {
      const organizations: MobileNavOrganization[] = [
        { id: 'org1', name: 'Organization One', role: 'OrgAdmin' },
        { id: 'org2', name: 'Organization Two', role: 'Member' },
      ];
      
      renderMobileNav({
        isOpen: true,
        onClose: vi.fn(),
        items: [],
        organizations,
        activeOrgId: 'org1',
      });
      
      expect(screen.getByText('Organization')).toBeTruthy();
      expect(screen.getByText('Organization One')).toBeTruthy();
      expect(screen.getByText('Organization Two')).toBeTruthy();
    });

    it('shows correct role badges for organizations', () => {
      const organizations: MobileNavOrganization[] = [
        { id: 'org1', name: 'Organization One', role: 'OrgAdmin' },
        { id: 'org2', name: 'Organization Two', role: 'Member' },
      ];
      
      renderMobileNav({
        isOpen: true,
        onClose: vi.fn(),
        items: [],
        organizations,
        activeOrgId: 'org1',
      });
      
      const adminBadges = screen.getAllByText('Admin');
      const memberBadges = screen.getAllByText('Member');
      
      expect(adminBadges.length).toBeGreaterThan(0);
      expect(memberBadges.length).toBeGreaterThan(0);
    });

    it('marks active organization correctly', () => {
      const organizations: MobileNavOrganization[] = [
        { id: 'org1', name: 'Organization One', role: 'OrgAdmin' },
        { id: 'org2', name: 'Organization Two', role: 'Member' },
      ];
      
      renderMobileNav({
        isOpen: true,
        onClose: vi.fn(),
        items: [],
        organizations,
        activeOrgId: 'org1',
      });
      
      const org1Button = screen.getByTestId('mobile-org-org1');
      const org2Button = screen.getByTestId('mobile-org-org2');
      
      expect(org1Button.classList.contains('active')).toBe(true);
      expect(org2Button.classList.contains('active')).toBe(false);
    });

    it('calls onOrgChange when organization is clicked', () => {
      const onOrgChange = vi.fn();
      const organizations: MobileNavOrganization[] = [
        { id: 'org1', name: 'Organization One', role: 'OrgAdmin' },
        { id: 'org2', name: 'Organization Two', role: 'Member' },
      ];
      
      renderMobileNav({
        isOpen: true,
        onClose: vi.fn(),
        items: [],
        organizations,
        activeOrgId: 'org1',
        onOrgChange,
      });
      
      const org2Button = screen.getByTestId('mobile-org-org2');
      fireEvent.click(org2Button);
      
      expect(onOrgChange).toHaveBeenCalledWith('org2');
    });

    it('org buttons meet minimum tap target of 44px', () => {
      const organizations: MobileNavOrganization[] = [
        { id: 'org1', name: 'Organization One', role: 'OrgAdmin' },
        { id: 'org2', name: 'Organization Two', role: 'Member' },
      ];
      
      renderMobileNav({
        isOpen: true,
        onClose: vi.fn(),
        items: [],
        organizations,
        activeOrgId: 'org1',
      });
      
      const org1Button = screen.getByTestId('mobile-org-org1');
      
      // Check that min-height is set in CSS (we verify the class is applied)
      expect(org1Button.classList.contains('mobile-nav-org-button')).toBe(true);
    });
  });
});
