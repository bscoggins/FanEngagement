import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb';

const renderBreadcrumb = (items: BreadcrumbItem[]) => {
  return render(
    <BrowserRouter>
      <Breadcrumb items={items} />
    </BrowserRouter>
  );
};

describe('Breadcrumb', () => {
  it('renders nothing when items array is empty', () => {
    const { container } = renderBreadcrumb([]);
    expect(container.querySelector('nav')).toBeFalsy();
  });

  it('renders breadcrumb items correctly', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', path: '/' },
      { label: 'Admin', path: '/admin' },
      { label: 'Users' },
    ];
    
    renderBreadcrumb(items);
    
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText('Users')).toBeTruthy();
  });

  it('renders links for non-last items with paths', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', path: '/' },
      { label: 'Current' },
    ];
    
    renderBreadcrumb(items);
    
    const homeLink = screen.getByText('Home');
    expect(homeLink.tagName).toBe('A');
    expect(homeLink.getAttribute('href')).toBe('/');
  });

  it('renders last item as span with aria-current', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', path: '/' },
      { label: 'Current Page' },
    ];
    
    renderBreadcrumb(items);
    
    const currentItem = screen.getByText('Current Page');
    expect(currentItem.tagName).toBe('SPAN');
    expect(currentItem.getAttribute('aria-current')).toBe('page');
  });

  it('has proper ARIA label', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', path: '/' },
    ];
    
    const { container } = renderBreadcrumb(items);
    const nav = container.querySelector('nav');
    
    expect(nav?.getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('renders separators between items', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', path: '/' },
      { label: 'Admin', path: '/admin' },
      { label: 'Users' },
    ];
    
    const { container } = renderBreadcrumb(items);
    const separators = container.querySelectorAll('.breadcrumb-separator');
    
    // Should have 2 separators for 3 items
    expect(separators.length).toBe(2);
  });
});
