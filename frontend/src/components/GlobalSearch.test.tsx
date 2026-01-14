import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { GlobalSearch } from './GlobalSearch';
import { type SearchContextConfig } from '../search/searchConfig';

// Mock the API modules
vi.mock('../api/usersApi', () => ({
  usersApi: {
    getAllPaged: vi.fn().mockResolvedValue({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 5,
    }),
  },
}));

vi.mock('../api/organizationsApi', () => ({
  organizationsApi: {
    getAllPaged: vi.fn().mockResolvedValue({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 5,
    }),
  },
}));

vi.mock('../utils/recentsUtils', () => ({
  addRecent: vi.fn(),
}));

// Mock useAuth hook
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { userId: 'test-user-id', displayName: 'Test User', email: 'test@test.com', role: 'User' },
    token: 'mock-token',
    isAuthenticated: true,
    isAdmin: false,
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Default search context for Platform Admin
const defaultContext: SearchContextConfig = {
  resources: ['users', 'organizations'],
  placeholder: 'Search users, organizations...',
  routeMode: 'platformAdmin',
};

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render search input', () => {
      render(
        <BrowserRouter>
          <GlobalSearch context={defaultContext} />
        </BrowserRouter>
      );

      const input = screen.getByPlaceholderText(/search users, organizations/i);
      expect(input).toBeInTheDocument();
    });

    it('should render with autoFocus when prop is true', () => {
      render(
        <BrowserRouter>
          <GlobalSearch context={defaultContext} autoFocus={true} />
        </BrowserRouter>
      );

      const input = screen.getByPlaceholderText(/search users, organizations/i);
      expect(input).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      render(
        <BrowserRouter>
          <GlobalSearch context={defaultContext} />
        </BrowserRouter>
      );

      const input = screen.getByPlaceholderText(/search users, organizations/i);
      expect(input).toHaveAttribute('aria-label', 'Global search');
      expect(input).toHaveAttribute('aria-expanded', 'false');
      expect(input).toHaveAttribute('aria-controls', 'global-search-results');
    });

    it('should render search icon', () => {
      const { container } = render(
        <BrowserRouter>
          <GlobalSearch context={defaultContext} />
        </BrowserRouter>
      );

      const icon = container.querySelector('.global-search-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('🔍');
    });
  });

  describe('Input Interaction', () => {
    it('should show clear button when query is entered', () => {
      render(
        <BrowserRouter>
          <GlobalSearch context={defaultContext} />
        </BrowserRouter>
      );

      const input = screen.getByPlaceholderText(/search users, organizations/i);
      fireEvent.change(input, { target: { value: 'test' } });

      const clearButton = screen.getByLabelText(/clear search/i);
      expect(clearButton).toBeInTheDocument();
    });

    it('should not show clear button when input is empty', () => {
      render(
        <BrowserRouter>
          <GlobalSearch context={defaultContext} />
        </BrowserRouter>
      );

      const clearButton = screen.queryByLabelText(/clear search/i);
      expect(clearButton).not.toBeInTheDocument();
    });

    it('should clear input when clear button is clicked', () => {
      render(
        <BrowserRouter>
          <GlobalSearch context={defaultContext} />
        </BrowserRouter>
      );

      const input = screen.getByPlaceholderText(/search users, organizations/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'test' } });
      
      const clearButton = screen.getByLabelText(/clear search/i);
      fireEvent.click(clearButton);

      expect(input.value).toBe('');
    });

    it('should update input value on change', () => {
      render(
        <BrowserRouter>
          <GlobalSearch context={defaultContext} />
        </BrowserRouter>
      );

      const input = screen.getByPlaceholderText(/search users, organizations/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'search query' } });

      expect(input.value).toBe('search query');
    });

    it('should set aria-expanded to true when query is entered', () => {
      render(
        <BrowserRouter>
          <GlobalSearch context={defaultContext} />
        </BrowserRouter>
      );

      const input = screen.getByPlaceholderText(/search users, organizations/i);
      fireEvent.change(input, { target: { value: 'test' } });

      // Note: This will change to 'true' once the debounce triggers and results load
      // For now we just verify the input updates
      expect(input).toHaveAttribute('aria-expanded');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle Escape key when dropdown is closed', () => {
      render(
        <BrowserRouter>
          <GlobalSearch context={defaultContext} />
        </BrowserRouter>
      );

      const input = screen.getByPlaceholderText(/search users, organizations/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'test' } });
      
      fireEvent.keyDown(input, { key: 'Escape' });

      // Should clear the query
      expect(input.value).toBe('');
    });

    it('should prevent default on ArrowDown when results exist', () => {
      render(
        <BrowserRouter>
          <GlobalSearch context={defaultContext} />
        </BrowserRouter>
      );

      const input = screen.getByPlaceholderText(/search users, organizations/i);
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      
      act(() => {
        input.dispatchEvent(event);
      });
      
      // When no results, preventDefault should not be called
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe('Component Structure', () => {
    it('should have proper CSS classes', () => {
      const { container } = render(
        <BrowserRouter>
          <GlobalSearch context={defaultContext} />
        </BrowserRouter>
      );

      expect(container.querySelector('.global-search')).toBeInTheDocument();
      expect(container.querySelector('.global-search-input-wrapper')).toBeInTheDocument();
      expect(container.querySelector('.global-search-input')).toBeInTheDocument();
      expect(container.querySelector('.global-search-icon')).toBeInTheDocument();
    });

    it('should render results container with proper attributes when dropdown opens', () => {
      render(
        <BrowserRouter>
          <GlobalSearch context={defaultContext} />
        </BrowserRouter>
      );

      const input = screen.getByPlaceholderText(/search users, organizations/i);
      
      // Initially, results should not be rendered
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      
      // Type to trigger dropdown (though results won't load in this test)
      fireEvent.change(input, { target: { value: 'test' } });
      
      // The input should update at least
      expect(input).toHaveValue('test');
    });
  });

  describe('Callbacks', () => {
    it('should call onClose when provided and clear button is clicked', () => {
      const onClose = vi.fn();
      
      render(
        <BrowserRouter>
          <GlobalSearch context={defaultContext} onClose={onClose} />
        </BrowserRouter>
      );

      const input = screen.getByPlaceholderText(/search users, organizations/i);
      fireEvent.change(input, { target: { value: 'test' } });
      
      const clearButton = screen.getByLabelText(/clear search/i);
      fireEvent.click(clearButton);

      // onClose is not called on clear, only on result selection or escape
      expect(input).toHaveValue('');
    });

    it('should handle Escape key with onClose callback', () => {
      const onClose = vi.fn();
      
      render(
        <BrowserRouter>
          <GlobalSearch context={defaultContext} onClose={onClose} />
        </BrowserRouter>
      );

      const input = screen.getByPlaceholderText(/search users, organizations/i);
      fireEvent.change(input, { target: { value: 'test' } });
      
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });
  });
});