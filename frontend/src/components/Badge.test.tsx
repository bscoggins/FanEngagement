import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Badge>Active</Badge>);
      const badge = screen.getByText('Active');
      expect(badge.parentElement).toBeInTheDocument();
      expect(badge.parentElement).toHaveClass('badge', 'badge--default', 'badge--md', 'badge--rounded');
    });

    it('should render with custom text', () => {
      render(<Badge>Custom Label</Badge>);
      expect(screen.getByText('Custom Label')).toBeInTheDocument();
    });

    it('should render without children', () => {
      const { container } = render(<Badge />);
      const badge = container.querySelector('.badge');
      expect(badge).toBeInTheDocument();
      expect(badge?.textContent).toBe('');
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      render(<Badge variant="default">Default</Badge>);
      const badge = screen.getByText('Default').parentElement;
      expect(badge).toHaveClass('badge--default');
    });

    it('should render success variant', () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText('Success').parentElement;
      expect(badge).toHaveClass('badge--success');
    });

    it('should render warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText('Warning').parentElement;
      expect(badge).toHaveClass('badge--warning');
    });

    it('should render error variant', () => {
      render(<Badge variant="error">Error</Badge>);
      const badge = screen.getByText('Error').parentElement;
      expect(badge).toHaveClass('badge--error');
    });

    it('should render info variant', () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText('Info').parentElement;
      expect(badge).toHaveClass('badge--info');
    });

    it('should render neutral variant', () => {
      render(<Badge variant="neutral">Neutral</Badge>);
      const badge = screen.getByText('Neutral').parentElement;
      expect(badge).toHaveClass('badge--neutral');
    });
  });

  describe('Sizes', () => {
    it('should render sm size', () => {
      render(<Badge size="sm">Small</Badge>);
      const badge = screen.getByText('Small').parentElement;
      expect(badge).toHaveClass('badge--sm');
    });

    it('should render md size (default)', () => {
      render(<Badge size="md">Medium</Badge>);
      const badge = screen.getByText('Medium').parentElement;
      expect(badge).toHaveClass('badge--md');
    });

    it('should render lg size', () => {
      render(<Badge size="lg">Large</Badge>);
      const badge = screen.getByText('Large').parentElement;
      expect(badge).toHaveClass('badge--lg');
    });
  });

  describe('Shapes', () => {
    it('should render rounded shape (default)', () => {
      render(<Badge shape="rounded">Rounded</Badge>);
      const badge = screen.getByText('Rounded').parentElement;
      expect(badge).toHaveClass('badge--rounded');
    });

    it('should render pill shape', () => {
      render(<Badge shape="pill">Pill</Badge>);
      const badge = screen.getByText('Pill').parentElement;
      expect(badge).toHaveClass('badge--pill');
    });
  });

  describe('Icon', () => {
    it('should render with icon', () => {
      render(<Badge icon="✓">Success</Badge>);
      const badge = screen.getByText('Success').parentElement;
      const icon = badge?.querySelector('.badge__icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('✓');
    });

    it('should render with emoji icon', () => {
      render(<Badge icon="🔔">Notification</Badge>);
      const badge = screen.getByText('Notification').parentElement;
      const icon = badge?.querySelector('.badge__icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('🔔');
    });

    it('should render icon with aria-hidden', () => {
      render(<Badge icon="→">Next</Badge>);
      const icon = screen.getByText('Next').parentElement?.querySelector('.badge__icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Dot indicator', () => {
    it('should render with dot indicator', () => {
      render(<Badge dot>Online</Badge>);
      const badge = screen.getByText('Online').parentElement;
      const dot = badge?.querySelector('.badge__dot');
      expect(dot).toBeInTheDocument();
    });

    it('should render dot with aria-hidden', () => {
      render(<Badge dot>Status</Badge>);
      const dot = screen.getByText('Status').parentElement?.querySelector('.badge__dot');
      expect(dot).toHaveAttribute('aria-hidden', 'true');
    });

    it('should not render dot when icon is provided (icon takes precedence)', () => {
      render(<Badge icon="✓" dot>Both</Badge>);
      const badge = screen.getByText('Both').parentElement;
      const dot = badge?.querySelector('.badge__dot');
      const icon = badge?.querySelector('.badge__icon');
      expect(icon).toBeInTheDocument();
      expect(dot).not.toBeInTheDocument();
    });

    it('should render only dot when no children provided', () => {
      const { container } = render(<Badge dot />);
      const badge = container.querySelector('.badge');
      const dot = badge?.querySelector('.badge__dot');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should accept custom className', () => {
      render(<Badge className="custom-class">Custom</Badge>);
      const badge = screen.getByText('Custom').parentElement;
      expect(badge).toHaveClass('custom-class');
      expect(badge).toHaveClass('badge');
    });

    it('should merge custom className with default classes', () => {
      render(<Badge className="custom-class" variant="success" size="lg">Merge</Badge>);
      const badge = screen.getByText('Merge').parentElement;
      expect(badge).toHaveClass('badge', 'badge--success', 'badge--lg', 'custom-class');
    });
  });

  describe('Test ID', () => {
    it('should accept testId prop', () => {
      render(<Badge testId="test-badge">Test</Badge>);
      const badge = screen.getByTestId('test-badge');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Ref forwarding', () => {
    it('should forward ref to span element', () => {
      const ref = React.createRef<HTMLSpanElement>();
      render(<Badge ref={ref}>Ref Test</Badge>);
      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
      expect(ref.current).toHaveClass('badge');
    });
  });

  describe('Combinations', () => {
    it('should render with multiple props combined', () => {
      render(
        <Badge
          variant="warning"
          size="lg"
          shape="pill"
          icon="⚠️"
          testId="combined-badge"
        >
          Warning
        </Badge>
      );
      const badge = screen.getByTestId('combined-badge');
      expect(badge).toHaveClass('badge--warning', 'badge--lg', 'badge--pill');
      expect(badge.querySelector('.badge__icon')).toHaveTextContent('⚠️');
    });

    it('should render success badge with dot and custom size', () => {
      render(
        <Badge variant="success" size="sm" dot>
          Active
        </Badge>
      );
      const badge = screen.getByText('Active').parentElement;
      expect(badge).toHaveClass('badge--success', 'badge--sm');
      expect(badge?.querySelector('.badge__dot')).toBeInTheDocument();
    });
  });

  describe('Style prop', () => {
    it('should accept inline styles', () => {
      const customStyle = { marginLeft: '10px', opacity: 0.8 };
      render(<Badge style={customStyle}>Styled</Badge>);
      const badge = screen.getByText('Styled').parentElement;
      expect(badge).toHaveStyle({ marginLeft: '10px', opacity: '0.8' });
    });
  });
});
