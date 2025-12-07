import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { GlobalSearch } from './GlobalSearch';

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

vi.mock('../api/proposalsApi', () => ({}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render search input', () => {
    render(
      <BrowserRouter>
        <GlobalSearch />
      </BrowserRouter>
    );

    const input = screen.getByPlaceholderText(/search users, organizations/i);
    expect(input).toBeInTheDocument();
  });

  it('should show clear button when query is entered', () => {
    render(
      <BrowserRouter>
        <GlobalSearch />
      </BrowserRouter>
    );

    const input = screen.getByPlaceholderText(/search users, organizations/i);
    fireEvent.change(input, { target: { value: 'test' } });

    const clearButton = screen.getByLabelText(/clear search/i);
    expect(clearButton).toBeInTheDocument();
  });

  it('should clear input when clear button is clicked', () => {
    render(
      <BrowserRouter>
        <GlobalSearch />
      </BrowserRouter>
    );

    const input = screen.getByPlaceholderText(/search users, organizations/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test' } });
    
    const clearButton = screen.getByLabelText(/clear search/i);
    fireEvent.click(clearButton);

    expect(input.value).toBe('');
  });

  it('should have proper ARIA attributes', () => {
    render(
      <BrowserRouter>
        <GlobalSearch />
      </BrowserRouter>
    );

    const input = screen.getByPlaceholderText(/search users, organizations/i);
    expect(input).toHaveAttribute('aria-label', 'Global search');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('should render with autoFocus when prop is true', () => {
    render(
      <BrowserRouter>
        <GlobalSearch autoFocus={true} />
      </BrowserRouter>
    );

    const input = screen.getByPlaceholderText(/search users, organizations/i);
    expect(input).toBeInTheDocument();
  });
});

