import { useState, useMemo, useCallback, useEffect } from 'react';

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface UseTableDataOptions<T> {
  data: T[];
  searchQuery: string;
  searchFields: (item: T) => string[];
  initialSortConfig?: SortConfig;
  customSortFields?: Record<string, (item: T) => string | Date>;
  pageSize?: number;
  componentName?: string;
}

export interface UseTableDataResult<T> {
  filteredData: T[];
  sortedData: T[];
  paginatedData: T[];
  currentPage: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  setCurrentPage: (page: number) => void;
  handleSort: (key: string) => void;
  sortConfig: SortConfig;
  setSortConfig: React.Dispatch<React.SetStateAction<SortConfig>>;
}

/**
 * Custom hook for managing table data with client-side filtering, sorting, and pagination
 * 
 * @param options - Configuration options for table data management
 * @returns Table data and pagination controls
 * 
 * @example
 * const {
 *   paginatedData,
 *   currentPage,
 *   totalPages,
 *   handleSort,
 *   sortConfig
 * } = useTableData({
 *   data: users,
 *   searchQuery,
 *   searchFields: (user) => [user.displayName, user.email],
 *   initialSortConfig: { key: 'name', direction: 'asc' },
 *   customSortFields: {
 *     name: (user) => user.displayName,
 *     email: (user) => user.email,
 *     created: (user) => new Date(user.createdAt)
 *   },
 *   componentName: 'AdminUsersPage'
 * });
 */
export function useTableData<T>({
  data,
  searchQuery,
  searchFields,
  initialSortConfig = { key: 'name', direction: 'asc' as const },
  customSortFields = {},
  pageSize = 10,
  componentName = 'Table'
}: UseTableDataOptions<T>): UseTableDataResult<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>(initialSortConfig);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1); // Reset to first page when sort changes
  }, []);

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(item => {
      const fields = searchFields(item);
      return fields.some(field => field && field.toLowerCase().includes(query));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- searchFields is expected to be stable (memoized with useCallback) at the call site
  }, [data, searchQuery]);

  // Sort data based on sortConfig
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    
    // Log warning once if using generic fallback (not per comparison)
    if (!customSortFields[sortConfig.key]) {
      console.warn(`${componentName}: Unknown sort key "${sortConfig.key}" encountered in sort logic. Attempting generic comparison. Please update the sort logic to handle this key.`);
    }
    
    sorted.sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;

      // Check if there's a custom sort function for this key
      if (customSortFields[sortConfig.key]) {
        const sortFn = customSortFields[sortConfig.key];
        aValue = sortFn(a);
        bValue = sortFn(b);
      } else {
        // Generic fallback: access property dynamically
        const rawA = (a as any)[sortConfig.key];
        const rawB = (b as any)[sortConfig.key];
        
        // Handle null/undefined values
        if (rawA == null && rawB == null) return 0;
        if (rawA == null) return 1;
        if (rawB == null) return -1;
        
        // Convert to comparable values
        aValue = typeof rawA === 'string' ? rawA.toLowerCase() : rawA;
        bValue = typeof rawB === 'string' ? rawB.toLowerCase() : rawB;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sorted;
  }, [filteredData, sortConfig, customSortFields, componentName]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return {
    filteredData,
    sortedData,
    paginatedData,
    currentPage,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    setCurrentPage,
    handleSort,
    sortConfig,
    setSortConfig
  };
}
