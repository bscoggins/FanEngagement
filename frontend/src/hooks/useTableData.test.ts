import { renderHook, act } from '@testing-library/react';
import { useTableData } from './useTableData';

interface TestUser {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
}

const mockUsers: TestUser[] = [
  { id: '1', displayName: 'Alice Smith', email: 'alice@example.com', createdAt: '2023-01-01' },
  { id: '2', displayName: 'Bob Johnson', email: 'bob@example.com', createdAt: '2023-02-01' },
  { id: '3', displayName: 'Charlie Brown', email: 'charlie@example.com', createdAt: '2023-03-01' },
  { id: '4', displayName: 'David Wilson', email: 'david@example.com', createdAt: '2023-04-01' },
  { id: '5', displayName: 'Eve Davis', email: 'eve@example.com', createdAt: '2023-05-01' },
];

describe('useTableData', () => {
  it('should return all data when no search query', () => {
    const { result } = renderHook(() =>
      useTableData({
        data: mockUsers,
        searchQuery: '',
        searchFields: (user) => [user.displayName, user.email],
        initialSortConfig: { key: 'name', direction: 'asc' },
        customSortFields: {
          name: (user) => user.displayName.toLowerCase(),
        },
      })
    );

    expect(result.current.filteredData).toHaveLength(5);
  });

  it('should filter data based on search query', () => {
    const { result } = renderHook(() =>
      useTableData({
        data: mockUsers,
        searchQuery: 'alice',
        searchFields: (user) => [user.displayName, user.email],
        initialSortConfig: { key: 'name', direction: 'asc' },
        customSortFields: {
          name: (user) => user.displayName.toLowerCase(),
        },
      })
    );

    expect(result.current.filteredData).toHaveLength(1);
    expect(result.current.filteredData[0].displayName).toBe('Alice Smith');
  });

  it('should sort data ascending', () => {
    const { result } = renderHook(() =>
      useTableData({
        data: mockUsers,
        searchQuery: '',
        searchFields: (user) => [user.displayName, user.email],
        initialSortConfig: { key: 'name', direction: 'asc' },
        customSortFields: {
          name: (user) => user.displayName.toLowerCase(),
        },
      })
    );

    expect(result.current.sortedData[0].displayName).toBe('Alice Smith');
    expect(result.current.sortedData[4].displayName).toBe('Eve Davis');
  });

  it('should sort data descending', () => {
    const { result } = renderHook(() =>
      useTableData({
        data: mockUsers,
        searchQuery: '',
        searchFields: (user) => [user.displayName, user.email],
        initialSortConfig: { key: 'name', direction: 'desc' },
        customSortFields: {
          name: (user) => user.displayName.toLowerCase(),
        },
      })
    );

    expect(result.current.sortedData[0].displayName).toBe('Eve Davis');
    expect(result.current.sortedData[4].displayName).toBe('Alice Smith');
  });

  it('should paginate data correctly', () => {
    const { result } = renderHook(() =>
      useTableData({
        data: mockUsers,
        searchQuery: '',
        searchFields: (user) => [user.displayName, user.email],
        initialSortConfig: { key: 'name', direction: 'asc' },
        customSortFields: {
          name: (user) => user.displayName.toLowerCase(),
        },
        pageSize: 2,
      })
    );

    expect(result.current.paginatedData).toHaveLength(2);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.currentPage).toBe(1);
  });

  it('should handle sort changes and reset page', () => {
    const { result } = renderHook(() =>
      useTableData({
        data: mockUsers,
        searchQuery: '',
        searchFields: (user) => [user.displayName, user.email],
        initialSortConfig: { key: 'name', direction: 'asc' },
        customSortFields: {
          name: (user) => user.displayName.toLowerCase(),
          email: (user) => user.email.toLowerCase(),
        },
        pageSize: 2,
      })
    );

    // Navigate to page 2
    act(() => {
      result.current.setCurrentPage(2);
    });
    expect(result.current.currentPage).toBe(2);

    // Change sort - should reset to page 1
    act(() => {
      result.current.handleSort('email');
    });
    expect(result.current.currentPage).toBe(1);
    expect(result.current.sortConfig.key).toBe('email');
    expect(result.current.sortConfig.direction).toBe('asc');
  });

  it('should toggle sort direction on same key', () => {
    const { result } = renderHook(() =>
      useTableData({
        data: mockUsers,
        searchQuery: '',
        searchFields: (user) => [user.displayName, user.email],
        initialSortConfig: { key: 'name', direction: 'asc' },
        customSortFields: {
          name: (user) => user.displayName.toLowerCase(),
        },
      })
    );

    // First click - should toggle to desc
    act(() => {
      result.current.handleSort('name');
    });
    expect(result.current.sortConfig.direction).toBe('desc');

    // Second click - should toggle back to asc
    act(() => {
      result.current.handleSort('name');
    });
    expect(result.current.sortConfig.direction).toBe('asc');
  });

  it('should calculate pagination metadata correctly', () => {
    const { result } = renderHook(() =>
      useTableData({
        data: mockUsers,
        searchQuery: '',
        searchFields: (user) => [user.displayName, user.email],
        initialSortConfig: { key: 'name', direction: 'asc' },
        customSortFields: {
          name: (user) => user.displayName.toLowerCase(),
        },
        pageSize: 2,
      })
    );

    expect(result.current.hasPreviousPage).toBe(false);
    expect(result.current.hasNextPage).toBe(true);

    act(() => {
      result.current.setCurrentPage(2);
    });
    expect(result.current.hasPreviousPage).toBe(true);
    expect(result.current.hasNextPage).toBe(true);

    act(() => {
      result.current.setCurrentPage(3);
    });
    expect(result.current.hasPreviousPage).toBe(true);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('should handle Date sorting', () => {
    const { result } = renderHook(() =>
      useTableData({
        data: mockUsers,
        searchQuery: '',
        searchFields: (user) => [user.displayName, user.email],
        initialSortConfig: { key: 'created', direction: 'asc' },
        customSortFields: {
          created: (user) => new Date(user.createdAt),
        },
      })
    );

    expect(result.current.sortedData[0].createdAt).toBe('2023-01-01');
    expect(result.current.sortedData[4].createdAt).toBe('2023-05-01');
  });

  it('should filter across multiple fields', () => {
    const { result } = renderHook(() =>
      useTableData({
        data: mockUsers,
        searchQuery: 'smith',
        searchFields: (user) => [user.displayName, user.email],
        initialSortConfig: { key: 'name', direction: 'asc' },
      })
    );

    // Should find Alice Smith in displayName
    expect(result.current.filteredData).toHaveLength(1);
    expect(result.current.filteredData[0].displayName).toBe('Alice Smith');
  });
});
