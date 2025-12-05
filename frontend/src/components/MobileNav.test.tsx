import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MobileNav, type MobileNavItem } from './MobileNav';

const renderMobileNav = (props: { 
  isOpen: boolean; 
  onClose: () => void; 
  items: MobileNavItem[];
  sections?: Array<{ label: string; items: MobileNavItem[] }>;
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
});
