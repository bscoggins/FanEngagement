import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
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

  it('should reset page to 1 when search query changes', () => {
    const { result, rerender } = renderHook(
      ({ searchQuery }) =>
        useTableData({
          data: mockUsers,
          searchQuery,
          searchFields: (user) => [user.displayName, user.email],
          initialSortConfig: { key: 'name', direction: 'asc' },
          pageSize: 2,
        }),
      { initialProps: { searchQuery: '' } }
    );

    // Go to page 2
    act(() => {
      result.current.setCurrentPage(2);
    });
    expect(result.current.currentPage).toBe(2);

    // Change search query - should reset to page 1
    rerender({ searchQuery: 'alice' });
    expect(result.current.currentPage).toBe(1);
  });

  describe('Generic sort fallback logic', () => {
    it('should warn when sorting by unknown key', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      renderHook(() =>
        useTableData({
          data: mockUsers,
          searchQuery: '',
          searchFields: (user) => [user.displayName, user.email],
          initialSortConfig: { key: 'unknownKey', direction: 'asc' },
          customSortFields: {
            name: (user) => user.displayName.toLowerCase(),
          },
          componentName: 'TestComponent',
        })
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'TestComponent: Unknown sort key "unknownKey" encountered in sort logic. Attempting generic comparison. Please update the sort logic to handle this key.'
      );

      consoleWarnSpy.mockRestore();
    });

    it('should only warn once per unknown key', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const { rerender } = renderHook(
        ({ searchQuery }) =>
          useTableData({
            data: mockUsers,
            searchQuery,
            searchFields: (user) => [user.displayName, user.email],
            initialSortConfig: { key: 'unknownKey', direction: 'asc' },
            customSortFields: {
              name: (user) => user.displayName.toLowerCase(),
            },
            componentName: 'TestComponent',
          }),
        { initialProps: { searchQuery: '' } }
      );

      // Initial render should warn
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

      // Rerender with different search query - should not warn again
      rerender({ searchQuery: 'alice' });
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

      consoleWarnSpy.mockRestore();
    });

    it('should handle null/undefined values in generic sort', () => {
      interface TestData {
        id: string;
        name: string | null;
        value: string | undefined;
      }

      const testData: TestData[] = [
        { id: '1', name: 'Alice', value: 'value1' },
        { id: '2', name: null, value: undefined },
        { id: '3', name: 'Bob', value: 'value2' },
        { id: '4', name: null, value: 'value3' },
      ];

      const { result } = renderHook(() =>
        useTableData({
          data: testData,
          searchQuery: '',
          searchFields: (item) => [item.id],
          initialSortConfig: { key: 'name', direction: 'asc' },
          // No customSortFields - forcing generic fallback
        })
      );

      // Null values should be sorted last
      expect(result.current.sortedData[0].name).toBe('Alice');
      expect(result.current.sortedData[1].name).toBe('Bob');
      expect(result.current.sortedData[2].name).toBe(null);
      expect(result.current.sortedData[3].name).toBe(null);
    });

    it('should handle generic sort for non-string types', () => {
      interface TestData {
        id: string;
        priority: number;
      }

      const testData: TestData[] = [
        { id: '1', priority: 3 },
        { id: '2', priority: 1 },
        { id: '3', priority: 5 },
        { id: '4', priority: 2 },
      ];

      const { result } = renderHook(() =>
        useTableData({
          data: testData,
          searchQuery: '',
          searchFields: (item) => [item.id],
          initialSortConfig: { key: 'priority', direction: 'asc' },
          // No customSortFields - forcing generic fallback for numbers
        })
      );

      // Numbers should be sorted correctly
      expect(result.current.sortedData[0].priority).toBe(1);
      expect(result.current.sortedData[1].priority).toBe(2);
      expect(result.current.sortedData[2].priority).toBe(3);
      expect(result.current.sortedData[3].priority).toBe(5);
    });

    it('should handle both null values correctly', () => {
      interface TestData {
        id: string;
        value: string | null;
      }

      const testData: TestData[] = [
        { id: '1', value: 'value1' },
        { id: '2', value: null },
        { id: '3', value: null },
      ];

      const { result } = renderHook(() =>
        useTableData({
          data: testData,
          searchQuery: '',
          searchFields: (item) => [item.id],
          initialSortConfig: { key: 'value', direction: 'asc' },
          // No customSortFields - forcing generic fallback
        })
      );

      // When both values are null, they should maintain relative order
      expect(result.current.sortedData[0].value).toBe('value1');
      expect(result.current.sortedData[1].value).toBe(null);
      expect(result.current.sortedData[2].value).toBe(null);
    });

    it('should convert strings to lowercase for case-insensitive sorting', () => {
      interface TestData {
        id: string;
        name: string;
      }

      const testData: TestData[] = [
        { id: '1', name: 'zebra' },
        { id: '2', name: 'Apple' },
        { id: '3', name: 'banana' },
      ];

      const { result } = renderHook(() =>
        useTableData({
          data: testData,
          searchQuery: '',
          searchFields: (item) => [item.id],
          initialSortConfig: { key: 'name', direction: 'asc' },
          // No customSortFields - forcing generic fallback
        })
      );

      // Should sort case-insensitively
      expect(result.current.sortedData[0].name).toBe('Apple');
      expect(result.current.sortedData[1].name).toBe('banana');
      expect(result.current.sortedData[2].name).toBe('zebra');
    });
  });
});
