import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkipLink } from './SkipLink';

describe('SkipLink', () => {
  it('renders with correct href and children', () => {
    render(<SkipLink href="#main-content">Skip to main content</SkipLink>);
    
    const link = screen.getByText('Skip to main content');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('#main-content');
  });

  it('has correct CSS class', () => {
    render(<SkipLink href="#main">Skip</SkipLink>);
    
    const link = screen.getByText('Skip');
    expect(link.classList.contains('skip-link')).toBe(true);
  });

  it('renders as an anchor element', () => {
    render(<SkipLink href="#content">Skip</SkipLink>);
    
    const link = screen.getByText('Skip');
    expect(link.tagName).toBe('A');
  });
});
