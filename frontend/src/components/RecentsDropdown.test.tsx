import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RecentsDropdown } from './RecentsDropdown';
import * as recentsUtils from '../utils/recentsUtils';

// Mock the recents utils
vi.mock('../utils/recentsUtils');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('RecentsDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render closed dropdown by default', () => {
    vi.mocked(recentsUtils.getRecents).mockReturnValue([]);
    
    render(
      <BrowserRouter>
        <RecentsDropdown />
      </BrowserRouter>
    );

    const button = screen.getByLabelText(/recent items/i);
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('should open dropdown when button is clicked', () => {
    vi.mocked(recentsUtils.getRecents).mockReturnValue([]);
    
    render(
      <BrowserRouter>
        <RecentsDropdown />
      </BrowserRouter>
    );

    const button = screen.getByLabelText(/recent items/i);
    fireEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/no recent items/i)).toBeInTheDocument();
  });

  it('should display empty state when no recents exist', () => {
    vi.mocked(recentsUtils.getRecents).mockReturnValue([]);
    
    render(
      <BrowserRouter>
        <RecentsDropdown />
      </BrowserRouter>
    );

    const button = screen.getByLabelText(/recent items/i);
    fireEvent.click(button);

    const emptyState = screen.getByText(/no recent items/i);
    expect(emptyState).toBeInTheDocument();
    expect(emptyState).toHaveAttribute('role', 'status');
  });

  it('should display list of recents when they exist', () => {
    const mockRecents = [
      { id: '1', name: 'User One', type: 'user' as const, timestamp: Date.now() },
      { id: '2', name: 'Org Two', type: 'organization' as const, timestamp: Date.now() - 1000 },
    ];
    vi.mocked(recentsUtils.getRecents).mockReturnValue(mockRecents);
    
    render(
      <BrowserRouter>
        <RecentsDropdown />
      </BrowserRouter>
    );

    const button = screen.getByLabelText(/recent items/i);
    fireEvent.click(button);

    expect(screen.getByText('Recently Viewed')).toBeInTheDocument();
    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('Org Two')).toBeInTheDocument();
  });

  it('should navigate to user detail when user item is clicked', () => {
    const mockRecents = [
      { id: 'user-1', name: 'Test User', type: 'user' as const, timestamp: Date.now() },
    ];
    vi.mocked(recentsUtils.getRecents).mockReturnValue(mockRecents);
    
    render(
      <BrowserRouter>
        <RecentsDropdown />
      </BrowserRouter>
    );

    const button = screen.getByLabelText(/recent items/i);
    fireEvent.click(button);

    const userItem = screen.getByText('Test User').closest('button');
    fireEvent.click(userItem!);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/users/user-1');
  });

  it('should navigate to organization detail when org item is clicked', () => {
    const mockRecents = [
      { id: 'org-1', name: 'Test Org', type: 'organization' as const, timestamp: Date.now() },
    ];
    vi.mocked(recentsUtils.getRecents).mockReturnValue(mockRecents);
    
    render(
      <BrowserRouter>
        <RecentsDropdown />
      </BrowserRouter>
    );

    const button = screen.getByLabelText(/recent items/i);
    fireEvent.click(button);

    const orgItem = screen.getByText('Test Org').closest('button');
    fireEvent.click(orgItem!);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/organizations/org-1/edit');
  });

  it('should close dropdown after clicking an item', () => {
    const mockRecents = [
      { id: 'user-1', name: 'Test User', type: 'user' as const, timestamp: Date.now() },
    ];
    vi.mocked(recentsUtils.getRecents).mockReturnValue(mockRecents);
    
    render(
      <BrowserRouter>
        <RecentsDropdown />
      </BrowserRouter>
    );

    const button = screen.getByLabelText(/recent items/i);
    fireEvent.click(button);

    const userItem = screen.getByText('Test User').closest('button');
    fireEvent.click(userItem!);

    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('should close dropdown when clicking outside', async () => {
    vi.mocked(recentsUtils.getRecents).mockReturnValue([]);
    
    render(
      <BrowserRouter>
        <div>
          <RecentsDropdown />
          <div data-testid="outside">Outside</div>
        </div>
      </BrowserRouter>
    );

    const button = screen.getByLabelText(/recent items/i);
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    const outside = screen.getByTestId('outside');
    fireEvent.mouseDown(outside);

    await waitFor(() => {
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('should load recents when dropdown opens', () => {
    const mockRecents = [
      { id: '1', name: 'User One', type: 'user' as const, timestamp: Date.now() },
    ];
    vi.mocked(recentsUtils.getRecents).mockReturnValue(mockRecents);
    
    render(
      <BrowserRouter>
        <RecentsDropdown />
      </BrowserRouter>
    );

    // getRecents should not be called initially
    expect(recentsUtils.getRecents).not.toHaveBeenCalled();

    const button = screen.getByLabelText(/recent items/i);
    fireEvent.click(button);

    // getRecents should be called when dropdown opens
    expect(recentsUtils.getRecents).toHaveBeenCalledTimes(1);
  });

  it('should display correct icons for users and organizations', () => {
    const mockRecents = [
      { id: '1', name: 'User One', type: 'user' as const, timestamp: Date.now() },
      { id: '2', name: 'Org Two', type: 'organization' as const, timestamp: Date.now() - 1000 },
    ];
    vi.mocked(recentsUtils.getRecents).mockReturnValue(mockRecents);
    
    render(
      <BrowserRouter>
        <RecentsDropdown />
      </BrowserRouter>
    );

    const button = screen.getByLabelText(/recent items/i);
    fireEvent.click(button);

    // Check for user and organization type labels
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Organization')).toBeInTheDocument();
  });
});
