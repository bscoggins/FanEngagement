import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('btn', 'btn--primary', 'btn--md');
    });

    it('should render as button type by default', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('should render with custom text', () => {
      render(<Button>Submit Form</Button>);
      expect(screen.getByText('Submit Form')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render primary variant', () => {
      render(<Button variant="primary">Primary</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn--primary');
    });

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn--secondary');
    });

    it('should render outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn--outline');
    });

    it('should render ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn--ghost');
    });

    it('should render danger variant', () => {
      render(<Button variant="danger">Danger</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn--danger');
    });
  });

  describe('Sizes', () => {
    it('should render xs size', () => {
      render(<Button size="xs">Extra Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn--xs');
    });

    it('should render sm size', () => {
      render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn--sm');
    });

    it('should render md size (default)', () => {
      render(<Button size="md">Medium</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn--md');
    });

    it('should render lg size', () => {
      render(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn--lg');
    });

    it('should render xl size', () => {
      render(<Button size="xl">Extra Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn--xl');
    });
  });

  describe('Icon Support', () => {
    it('should render icon on the left by default', () => {
      render(<Button icon="→">Next</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button.querySelector('.btn__icon')).toBeInTheDocument();
    });

    it('should render icon on the right when iconPosition is right', () => {
      render(
        <Button icon="→" iconPosition="right">
          Next
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn');
      expect(button.querySelector('.btn__icon')).toBeInTheDocument();
    });

    it('should render icon-only button', () => {
      render(
        <Button icon="🔍" iconOnly aria-label="Search">
          Search
        </Button>
      );
      const button = screen.getByRole('button', { name: 'Search' });
      expect(button).toHaveClass('btn--icon-only');
      expect(button.querySelector('.visually-hidden')).toHaveTextContent('Search');
    });

    it('should render emoji icon correctly', () => {
      render(<Button icon="✓">Save</Button>);
      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('should be enabled by default', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('should render disabled state', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should render loading state', () => {
      render(<Button isLoading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('btn--loading');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button.querySelector('.btn__spinner')).toBeInTheDocument();
    });

    it('should show spinner when loading', () => {
      render(<Button isLoading>Processing</Button>);
      expect(screen.getByRole('button').querySelector('.btn__spinner')).toBeInTheDocument();
    });

    it('should hide icon when loading', () => {
      render(
        <Button icon="→" isLoading>
          Loading
        </Button>
      );
      expect(screen.getByRole('button').querySelector('.btn__icon')).not.toBeInTheDocument();
    });

    it('should disable button when loading', () => {
      render(<Button isLoading>Loading</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Interaction', () => {
    it('should handle click events', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      await user.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not trigger click when disabled', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );
      
      await user.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not trigger click when loading', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Button onClick={handleClick} isLoading>
          Loading
        </Button>
      );
      
      await user.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should handle keyboard activation', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(<Button onClick={handleClick}>Press me</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('Type Attribute', () => {
    it('should support submit type', () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('should support reset type', () => {
      render(<Button type="reset">Reset</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes when loading', () => {
      render(<Button isLoading>Loading</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });

    it('should support aria-label', () => {
      render(<Button aria-label="Close dialog">×</Button>);
      expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
    });

    it('should hide decorative icons from screen readers', () => {
      render(<Button icon="→">Next</Button>);
      const icon = screen.getByRole('button').querySelector('.btn__icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should provide visually hidden text for icon-only buttons', () => {
      render(
        <Button icon="🔍" iconOnly>
          Search
        </Button>
      );
      const button = screen.getByRole('button', { name: 'Search' });
      expect(button.querySelector('.visually-hidden')).toHaveTextContent('Search');
    });

    it('should support testId prop', () => {
      render(<Button testId="my-button">Test</Button>);
      expect(screen.getByTestId('my-button')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should accept custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn', 'custom-class');
    });

    it('should render full width button', () => {
      render(<Button fullWidth>Full Width</Button>);
      expect(screen.getByRole('button')).toHaveClass('btn--full-width');
    });

    it('should forward refs', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Ref Button</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('should pass through other HTML attributes', () => {
      render(
        <Button data-custom="test" title="Tooltip">
          Custom Attrs
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-custom', 'test');
      expect(button).toHaveAttribute('title', 'Tooltip');
    });
  });

  describe('Complex Combinations', () => {
    it('should render danger variant with loading state', () => {
      render(
        <Button variant="danger" isLoading>
          Deleting...
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn--danger', 'btn--loading');
      expect(button).toBeDisabled();
    });

    it('should render small outline button with icon', () => {
      render(
        <Button variant="outline" size="sm" icon="+" iconPosition="left">
          Add
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn--outline', 'btn--sm');
      expect(button.querySelector('.btn__icon')).toBeInTheDocument();
    });

    it('should render large primary button with right icon', () => {
      render(
        <Button variant="primary" size="lg" icon="→" iconPosition="right">
          Continue
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn--primary', 'btn--lg');
    });

    it('should render ghost icon-only button', () => {
      render(
        <Button variant="ghost" icon="⋮" iconOnly aria-label="More options">
          More
        </Button>
      );
      const button = screen.getByRole('button', { name: 'More options' });
      expect(button).toHaveClass('btn--ghost', 'btn--icon-only');
    });
  });
});
