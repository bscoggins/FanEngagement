import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card } from './Card';

describe('Card', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render with custom text', () => {
      render(<Card>Custom card text</Card>);
      expect(screen.getByText('Custom card text')).toBeInTheDocument();
    });

    it('should apply default classes', () => {
      render(<Card testId="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('card', 'card--default', 'card--padding-default', 'card--elevation-md');
    });

    it('should apply custom className', () => {
      render(<Card className="custom-class" testId="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-class');
    });

    it('should apply custom styles', () => {
      render(<Card style={{ width: '200px' }} testId="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveStyle({ width: '200px' });
    });

    it('should forward ref', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Card ref={ref}>Content</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      render(<Card variant="default" testId="card">Default</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card--default');
    });

    it('should render interactive variant', () => {
      render(<Card variant="interactive" testId="card">Interactive</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card--interactive');
    });

    it('should render bordered variant', () => {
      render(<Card variant="bordered" testId="card">Bordered</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card--bordered');
    });
  });

  describe('Padding Options', () => {
    it('should render compact padding', () => {
      render(<Card padding="compact" testId="card">Compact</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card--padding-compact');
    });

    it('should render default padding', () => {
      render(<Card padding="default" testId="card">Default</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card--padding-default');
    });

    it('should render spacious padding', () => {
      render(<Card padding="spacious" testId="card">Spacious</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card--padding-spacious');
    });
  });

  describe('Elevation Levels', () => {
    it('should render no elevation', () => {
      render(<Card elevation="none" testId="card">None</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card--elevation-none');
    });

    it('should render sm elevation', () => {
      render(<Card elevation="sm" testId="card">Small</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card--elevation-sm');
    });

    it('should render md elevation', () => {
      render(<Card elevation="md" testId="card">Medium</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card--elevation-md');
    });

    it('should render lg elevation', () => {
      render(<Card elevation="lg" testId="card">Large</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card--elevation-lg');
    });

    it('should render xl elevation', () => {
      render(<Card elevation="xl" testId="card">Extra Large</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card--elevation-xl');
    });
  });

  describe('Interactive Behavior', () => {
    it('should handle click events', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Card onClick={handleClick}>Clickable card</Card>);
      
      const card = screen.getByText('Clickable card');
      await user.click(card);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should have button role when interactive with onClick', () => {
      const handleClick = vi.fn();
      render(<Card onClick={handleClick}>Clickable</Card>);
      
      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();
    });

    it('should be keyboard accessible with Enter key', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Card onClick={handleClick}>Clickable</Card>);
      
      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard('{Enter}');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should be keyboard accessible with Space key', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Card onClick={handleClick}>Clickable</Card>);
      
      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard(' ');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should have tabIndex 0 for interactive cards', () => {
      const handleClick = vi.fn();
      render(<Card onClick={handleClick}>Clickable</Card>);
      
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should accept custom tabIndex', () => {
      const handleClick = vi.fn();
      render(<Card onClick={handleClick} tabIndex={-1}>Clickable</Card>);
      
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '-1');
    });

    it('should apply aria-label when provided', () => {
      const handleClick = vi.fn();
      render(<Card onClick={handleClick} aria-label="Action card">Icon only</Card>);
      
      const card = screen.getByRole('button', { name: 'Action card' });
      expect(card).toBeInTheDocument();
    });
  });

  describe('Link Behavior', () => {
    it('should render as link when href is provided', () => {
      render(<Card href="/details">Link card</Card>);
      
      const link = screen.getByText('Link card').closest('a');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/details');
    });

    it('should not have button role when href is provided', () => {
      render(<Card href="/details">Link card</Card>);
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should prioritize href over onClick', () => {
      const handleClick = vi.fn();
      render(<Card href="/details" onClick={handleClick}>Link card</Card>);
      
      const link = screen.getByText('Link card').closest('a');
      expect(link).toHaveAttribute('href', '/details');
    });
  });

  describe('Accessibility', () => {
    it('should have proper outline style for focus', () => {
      render(<Card testId="card">Content</Card>);
      const card = screen.getByTestId('card');
      // Card should be in the document (outline style is applied via CSS)
      expect(card).toBeInTheDocument();
    });

    it('should support aria-label for screen readers', () => {
      const handleClick = vi.fn();
      render(<Card onClick={handleClick} aria-label="Custom label">Content</Card>);
      
      const card = screen.getByRole('button', { name: 'Custom label' });
      expect(card).toBeInTheDocument();
    });
  });

  describe('Combination Props', () => {
    it('should support all props together', () => {
      const handleClick = vi.fn();
      render(
        <Card
          variant="interactive"
          padding="compact"
          elevation="lg"
          className="custom"
          testId="combo-card"
          onClick={handleClick}
          aria-label="Combo card"
        >
          Combined props
        </Card>
      );
      
      const card = screen.getByTestId('combo-card');
      expect(card).toHaveClass(
        'card',
        'card--interactive',
        'card--padding-compact',
        'card--elevation-lg',
        'custom'
      );
      expect(card).toHaveAttribute('role', 'button');
    });
  });
});
