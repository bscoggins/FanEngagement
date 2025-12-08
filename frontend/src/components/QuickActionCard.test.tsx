import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QuickActionCard } from './QuickActionCard';

describe('QuickActionCard', () => {
  it('should render with all props', () => {
    render(
      <BrowserRouter>
        <QuickActionCard
          to="/test-route"
          icon="🎯"
          iconBackground="#e3f2fd"
          title="Test Card"
          description="This is a test description"
          actionText="Go to test"
          testId="test-card"
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('This is a test description')).toBeInTheDocument();
    expect(screen.getByText('Go to test →')).toBeInTheDocument();
    expect(screen.getByText('🎯')).toBeInTheDocument();
  });

  it('should render as a link to the correct route', () => {
    render(
      <BrowserRouter>
        <QuickActionCard
          to="/admin/organizations/new"
          icon="➕"
          iconBackground="#e3f2fd"
          title="Create Organization"
          description="Set up a new organization"
          actionText="Create new"
        />
      </BrowserRouter>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/admin/organizations/new');
  });

  it('should apply test ID when provided', () => {
    const { container } = render(
      <BrowserRouter>
        <QuickActionCard
          to="/test"
          icon="🎯"
          iconBackground="#e3f2fd"
          title="Test"
          description="Test"
          actionText="Test"
          testId="custom-test-id"
        />
      </BrowserRouter>
    );

    const link = container.querySelector('[data-testid="custom-test-id"]');
    expect(link).toBeInTheDocument();
  });

  it('should not have test ID when not provided', () => {
    const { container } = render(
      <BrowserRouter>
        <QuickActionCard
          to="/test"
          icon="🎯"
          iconBackground="#e3f2fd"
          title="Test"
          description="Test"
          actionText="Test"
        />
      </BrowserRouter>
    );

    const links = container.querySelectorAll('[data-testid]');
    expect(links.length).toBe(0);
  });

  it('should apply icon background color correctly', () => {
    render(
      <BrowserRouter>
        <QuickActionCard
          to="/test"
          icon="🎯"
          iconBackground="#ff0000"
          title="Test"
          description="Test"
          actionText="Test"
        />
      </BrowserRouter>
    );

    const iconContainer = screen.getByText('🎯');
    expect(iconContainer).toHaveStyle({ backgroundColor: '#ff0000' });
  });

  it('should render different icons correctly', () => {
    const { rerender } = render(
      <BrowserRouter>
        <QuickActionCard
          to="/test"
          icon="➕"
          iconBackground="#e3f2fd"
          title="Test"
          description="Test"
          actionText="Test"
        />
      </BrowserRouter>
    );

    expect(screen.getByText('➕')).toBeInTheDocument();

    rerender(
      <BrowserRouter>
        <QuickActionCard
          to="/test"
          icon="👥"
          iconBackground="#e3f2fd"
          title="Test"
          description="Test"
          actionText="Test"
        />
      </BrowserRouter>
    );

    expect(screen.getByText('👥')).toBeInTheDocument();
  });

  it('should have proper class names for styling', () => {
    const { container } = render(
      <BrowserRouter>
        <QuickActionCard
          to="/test"
          icon="🎯"
          iconBackground="#e3f2fd"
          title="Test Card"
          description="Test description"
          actionText="Test action"
        />
      </BrowserRouter>
    );

    expect(container.querySelector('.quick-action-card-link')).toBeInTheDocument();
    expect(container.querySelector('.quick-action-card')).toBeInTheDocument();
    expect(container.querySelector('.quick-action-card-header')).toBeInTheDocument();
    expect(container.querySelector('.quick-action-card-icon')).toBeInTheDocument();
    expect(container.querySelector('.quick-action-card-title')).toBeInTheDocument();
    expect(container.querySelector('.quick-action-card-description')).toBeInTheDocument();
    expect(container.querySelector('.quick-action-card-action')).toBeInTheDocument();
  });

  it('should render title as h3 element', () => {
    render(
      <BrowserRouter>
        <QuickActionCard
          to="/test"
          icon="🎯"
          iconBackground="#e3f2fd"
          title="Test Title"
          description="Test"
          actionText="Test"
        />
      </BrowserRouter>
    );

    const title = screen.getByRole('heading', { level: 3 });
    expect(title).toHaveTextContent('Test Title');
  });

  it('should display action text with arrow', () => {
    render(
      <BrowserRouter>
        <QuickActionCard
          to="/test"
          icon="🎯"
          iconBackground="#e3f2fd"
          title="Test"
          description="Test"
          actionText="Click here"
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Click here →')).toBeInTheDocument();
  });
});
