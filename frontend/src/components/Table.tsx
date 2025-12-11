import React from 'react';
import './Table.css';

export type TableLayout = 'scroll' | 'card';
export type TableSize = 'default' | 'compact';

export interface TableColumn<T> {
  /**
   * Unique identifier for the column
   */
  key: string;
  
  /**
   * Column header label
   */
  label: string;
  
  /**
   * Render function for cell content
   */
  render: (item: T, index: number) => React.ReactNode;
  
  /**
   * Text alignment for this column
   * @default 'left'
   */
  align?: 'left' | 'center' | 'right';
  
  /**
   * If true, this column is sortable
   */
  sortable?: boolean;
  
  /**
   * Sort key (defaults to column key)
   */
  sortKey?: string;
  
  /**
   * Optional width for this column
   */
  width?: string;
}

export interface TableProps<T> {
  /**
   * Array of data items to display
   */
  data: T[];
  
  /**
   * Column definitions
   */
  columns: TableColumn<T>[];
  
  /**
   * Unique key extractor for each row
   */
  getRowKey: (item: T, index: number) => string | number;
  
  /**
   * Layout mode on mobile
   * - 'scroll': Horizontal scrolling table (default)
   * - 'card': Transform rows into stacked cards
   * @default 'scroll'
   */
  mobileLayout?: TableLayout;
  
  /**
   * Table size variant
   * @default 'default'
   */
  size?: TableSize;
  
  /**
   * Enable sticky header
   * @default true
   */
  stickyHeader?: boolean;
  
  /**
   * Current sort configuration
   */
  sortConfig?: {
    key: string;
    direction: 'asc' | 'desc';
  } | null;
  
  /**
   * Sort change handler
   */
  onSort?: (key: string) => void;
  
  /**
   * Message to display when data is empty
   */
  emptyMessage?: string;
  
  /**
   * Additional CSS class names
   */
  className?: string;
  
  /**
   * Test ID for testing
   */
  testId?: string;
  
  /**
   * Optional caption for accessibility
   */
  caption?: string;
  
  /**
   * Click handler for row
   */
  onRowClick?: (item: T, index: number) => void;
}

/**
 * Table component with responsive layout, sortable columns, and design system tokens.
 * 
 * @example
 * ```tsx
 * <Table
 *   data={users}
 *   columns={[
 *     { key: 'name', label: 'Name', render: (user) => user.name },
 *     { key: 'email', label: 'Email', render: (user) => user.email }
 *   ]}
 *   getRowKey={(user) => user.id}
 * />
 * 
 * <Table
 *   data={items}
 *   columns={columns}
 *   getRowKey={(item) => item.id}
 *   mobileLayout="card"
 *   sortConfig={{ key: 'name', direction: 'asc' }}
 *   onSort={handleSort}
 * />
 * ```
 */
export function Table<T>({
  data,
  columns,
  getRowKey,
  mobileLayout = 'scroll',
  size = 'default',
  stickyHeader = true,
  sortConfig = null,
  onSort,
  emptyMessage = 'No data available',
  className = '',
  testId,
  caption,
  onRowClick,
}: TableProps<T>) {
  const handleSort = (column: TableColumn<T>) => {
    if (column.sortable && onSort) {
      const sortKey = column.sortKey || column.key;
      onSort(sortKey);
    }
  };

  const handleRowClick = (item: T, index: number) => {
    if (onRowClick) {
      onRowClick(item, index);
    }
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, item: T, index: number) => {
    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onRowClick(item, index);
    }
  };

  const getSortIcon = (column: TableColumn<T>) => {
    if (!column.sortable) return null;
    
    const sortKey = column.sortKey || column.key;
    const isActive = sortConfig?.key === sortKey;
    const direction = sortConfig && isActive ? sortConfig.direction : null;
    
    return (
      <span className="table__sort-icon" aria-hidden="true">
        {direction === 'asc' ? '↑' : direction === 'desc' ? '↓' : '↕'}
      </span>
    );
  };

  const classes = [
    'table-container',
    `table-container--${mobileLayout}`,
    stickyHeader && 'table-container--sticky-header',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const tableClasses = [
    'data-table',
    size === 'compact' && 'data-table--compact',
  ]
    .filter(Boolean)
    .join(' ');

  if (data.length === 0) {
    return (
      <div className={classes} data-testid={testId}>
        <div className="table-empty">
          <div className="table-empty-icon" aria-hidden="true">📋</div>
          <div className="table-empty-message">{emptyMessage}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={classes} data-testid={testId}>
      <table className={tableClasses}>
        {caption && <caption className="visually-hidden">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.align ? `text-${column.align}` : undefined}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(column)}
                onKeyDown={(e) => {
                  if (column.sortable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleSort(column);
                  }
                }}
                tabIndex={column.sortable ? 0 : undefined}
                role={column.sortable ? 'button' : undefined}
                aria-sort={
                  column.sortable && sortConfig?.key === (column.sortKey || column.key)
                    ? sortConfig.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
                data-column={column.key}
              >
                <span className="table__header-content">
                  {column.label}
                  {getSortIcon(column)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => {
            const rowKey = getRowKey(item, index);
            const isClickable = !!onRowClick;
            
            return (
              <tr
                key={rowKey}
                onClick={() => isClickable && handleRowClick(item, index)}
                onKeyDown={(e) => isClickable && handleRowKeyDown(e, item, index)}
                tabIndex={isClickable ? 0 : undefined}
                role={isClickable ? 'button' : undefined}
                className={isClickable ? 'table__row--clickable' : undefined}
                data-row-key={rowKey}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={column.align ? `text-${column.align}` : undefined}
                    data-label={column.label}
                    data-column={column.key}
                  >
                    {column.render(item, index)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
