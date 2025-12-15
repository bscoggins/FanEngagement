import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table, type TableColumn } from './Table';

interface TestData {
  id: string;
  name: string;
  email: string;
  role: string;
}

const mockData: TestData[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'Member' },
  { id: '3', name: 'Carol Davis', email: 'carol@example.com', role: 'Member' },
];

const baseColumns: TableColumn<TestData>[] = [
  { key: 'name', label: 'Name', render: (item) => item.name },
  { key: 'email', label: 'Email', render: (item) => item.email },
  { key: 'role', label: 'Role', render: (item) => item.role },
];

describe('Table', () => {
  describe('Basic Rendering', () => {
    it('should render table with data', () => {
      render(
        <Table
          data={mockData}
          columns={baseColumns}
          getRowKey={(item) => item.id}
        />
      );

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
      expect(screen.getAllByText('Member')).toHaveLength(2);
    });

    it('should render column headers', () => {
      render(
        <Table
          data={mockData}
          columns={baseColumns}
          getRowKey={(item) => item.id}
        />
      );

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
    });

    it('should render with testId', () => {
      render(
        <Table
          data={mockData}
          columns={baseColumns}
          getRowKey={(item) => item.id}
          testId="users-table"
        />
      );

      expect(screen.getByTestId('users-table')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <Table
          data={mockData}
          columns={baseColumns}
          getRowKey={(item) => item.id}
          className="custom-table"
        />
      );

      expect(container.querySelector('.custom-table')).toBeInTheDocument();
    });

    it('should render with accessibility caption', () => {
      render(
        <Table
          data={mockData}
          columns={baseColumns}
          getRowKey={(item) => item.id}
          caption="List of users in the system"
        />
      );

      expect(screen.getByText('List of users in the system')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render empty state when no data', () => {
      render(
        <Table
          data={[]}
          columns={baseColumns}
          getRowKey={(item) => item.id}
        />
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should render custom empty message', () => {
      render(
        <Table
          data={[]}
          columns={baseColumns}
          getRowKey={(item) => item.id}
          emptyMessage="No users found"
        />
      );

      expect(screen.getByText('No users found')).toBeInTheDocument();
    });

    it('should render empty state icon', () => {
      const { container } = render(
        <Table
          data={[]}
          columns={baseColumns}
          getRowKey={(item) => item.id}
        />
      );

      expect(container.querySelector('.table-empty-icon')).toBeInTheDocument();
    });
  });

  describe('Column Alignment', () => {
    it('should apply left alignment', () => {
      const columns: TableColumn<TestData>[] = [
        { key: 'name', label: 'Name', render: (item) => item.name, align: 'left' },
      ];

      const { container } = render(
        <Table
          data={mockData}
          columns={columns}
          getRowKey={(item) => item.id}
        />
      );

      const header = container.querySelector('th[data-column="name"]');
      expect(header).toHaveClass('text-left');
    });

    it('should apply center alignment', () => {
      const columns: TableColumn<TestData>[] = [
        { key: 'role', label: 'Role', render: (item) => item.role, align: 'center' },
      ];

      const { container } = render(
        <Table
          data={mockData}
          columns={columns}
          getRowKey={(item) => item.id}
        />
      );

      const header = container.querySelector('th[data-column="role"]');
      expect(header).toHaveClass('text-center');
    });

    it('should apply right alignment', () => {
      const columns: TableColumn<TestData>[] = [
        { key: 'email', label: 'Email', render: (item) => item.email, align: 'right' },
      ];

      const { container } = render(
        <Table
          data={mockData}
          columns={columns}
          getRowKey={(item) => item.id}
        />
      );

      const header = container.querySelector('th[data-column="email"]');
      expect(header).toHaveClass('text-right');
    });
  });

  describe('Sortable Columns', () => {
    it('should render sortable column header as button', () => {
      const columns: TableColumn<TestData>[] = [
        { key: 'name', label: 'Name', render: (item) => item.name, sortable: true },
      ];

      render(
        <Table
          data={mockData}
          columns={columns}
          getRowKey={(item) => item.id}
        />
      );

      const nameHeader = screen.getByRole('button', { name: /Name/i });
      expect(nameHeader).toBeInTheDocument();
    });

    it('should call onSort when sortable header is clicked', async () => {
      const user = userEvent.setup();
      const handleSort = vi.fn();
      const columns: TableColumn<TestData>[] = [
        { key: 'name', label: 'Name', render: (item) => item.name, sortable: true },
      ];

      render(
        <Table
          data={mockData}
          columns={columns}
          getRowKey={(item) => item.id}
          onSort={handleSort}
        />
      );

      const nameHeader = screen.getByRole('button', { name: /Name/i });
      await user.click(nameHeader);

      expect(handleSort).toHaveBeenCalledWith('name');
    });

    it('should call onSort with custom sortKey', async () => {
      const user = userEvent.setup();
      const handleSort = vi.fn();
      const columns: TableColumn<TestData>[] = [
        {
          key: 'name',
          label: 'Name',
          render: (item) => item.name,
          sortable: true,
          sortKey: 'displayName',
        },
      ];

      render(
        <Table
          data={mockData}
          columns={columns}
          getRowKey={(item) => item.id}
          onSort={handleSort}
        />
      );

      const nameHeader = screen.getByRole('button', { name: /Name/i });
      await user.click(nameHeader);

      expect(handleSort).toHaveBeenCalledWith('displayName');
    });

    it('should support keyboard navigation on sortable headers', async () => {
      const user = userEvent.setup();
      const handleSort = vi.fn();
      const columns: TableColumn<TestData>[] = [
        { key: 'name', label: 'Name', render: (item) => item.name, sortable: true },
      ];

      render(
        <Table
          data={mockData}
          columns={columns}
          getRowKey={(item) => item.id}
          onSort={handleSort}
        />
      );

      const nameHeader = screen.getByRole('button', { name: /Name/i });
      nameHeader.focus();
      await user.keyboard('{Enter}');

      expect(handleSort).toHaveBeenCalledWith('name');
    });

    it('should support keyboard navigation on sortable headers with Space key', async () => {
      const user = userEvent.setup();
      const handleSort = vi.fn();
      const columns: TableColumn<TestData>[] = [
        { key: 'name', label: 'Name', render: (item) => item.name, sortable: true },
      ];

      render(
        <Table
          data={mockData}
          columns={columns}
          getRowKey={(item) => item.id}
          onSort={handleSort}
        />
      );

      const nameHeader = screen.getByRole('button', { name: /Name/i });
      nameHeader.focus();
      await user.keyboard(' ');

      expect(handleSort).toHaveBeenCalledWith('name');
    });

    it('should display ascending sort icon', () => {
      const columns: TableColumn<TestData>[] = [
        { key: 'name', label: 'Name', render: (item) => item.name, sortable: true },
      ];

      const { container } = render(
        <Table
          data={mockData}
          columns={columns}
          getRowKey={(item) => item.id}
          sortConfig={{ key: 'name', direction: 'asc' }}
        />
      );

      const sortIcon = container.querySelector('.table__sort-icon');
      expect(sortIcon).toHaveTextContent('↑');
    });

    it('should display descending sort icon', () => {
      const columns: TableColumn<TestData>[] = [
        { key: 'name', label: 'Name', render: (item) => item.name, sortable: true },
      ];

      const { container } = render(
        <Table
          data={mockData}
          columns={columns}
          getRowKey={(item) => item.id}
          sortConfig={{ key: 'name', direction: 'desc' }}
        />
      );

      const sortIcon = container.querySelector('.table__sort-icon');
      expect(sortIcon).toHaveTextContent('↓');
    });

    it('should display neutral sort icon when not sorted', () => {
      const columns: TableColumn<TestData>[] = [
        { key: 'name', label: 'Name', render: (item) => item.name, sortable: true },
      ];

      const { container } = render(
        <Table
          data={mockData}
          columns={columns}
          getRowKey={(item) => item.id}
        />
      );

      const sortIcon = container.querySelector('.table__sort-icon');
      expect(sortIcon).toHaveTextContent('↕');
    });

    it('should set aria-sort attribute on sorted column', () => {
      const columns: TableColumn<TestData>[] = [
        { key: 'name', label: 'Name', render: (item) => item.name, sortable: true },
      ];

      const { container } = render(
        <Table
          data={mockData}
          columns={columns}
          getRowKey={(item) => item.id}
          sortConfig={{ key: 'name', direction: 'asc' }}
        />
      );

      const header = container.querySelector('th[data-column="name"]');
      expect(header).toHaveAttribute('aria-sort', 'ascending');
    });

    it('should have descriptive aria-label for unsorted sortable column', () => {
      const columns: TableColumn<TestData>[] = [
        { key: 'name', label: 'Name', render: (item) => item.name, sortable: true },
      ];

      const { container } = render(
        <Table
          data={mockData}
          columns={columns}
          getRowKey={(item) => item.id}
        />
      );

      const header = container.querySelector('th[data-column="name"]');
      expect(header).toHaveAttribute('aria-label', 'Name, not sorted. Click to sort ascending.');
    });

    it('should have descriptive aria-label for ascending sorted column', () => {
      const columns: TableColumn<TestData>[] = [
        { key: 'name', label: 'Name', render: (item) => item.name, sortable: true },
      ];

      const { container } = render(
        <Table
          data={mockData}
          columns={columns}
          getRowKey={(item) => item.id}
          sortConfig={{ key: 'name', direction: 'asc' }}
        />
      );

      const header = container.querySelector('th[data-column="name"]');
      expect(header).toHaveAttribute('aria-label', 'Name, sorted ascending. Click to sort descending.');
    });

    it('should have descriptive aria-label for descending sorted column', () => {
      const columns: TableColumn<TestData>[] = [
        { key: 'name', label: 'Name', render: (item) => item.name, sortable: true },
      ];

      const { container } = render(
        <Table
          data={mockData}
          columns={columns}
          getRowKey={(item) => item.id}
          sortConfig={{ key: 'name', direction: 'desc' }}
        />
      );

      const header = container.querySelector('th[data-column="name"]');
      expect(header).toHaveAttribute('aria-label', 'Name, sorted descending. Click to sort ascending.');
    });

    it('should not have aria-label for non-sortable column', () => {
      const columns: TableColumn<TestData>[] = [
        { key: 'name', label: 'Name', render: (item) => item.name, sortable: false },
      ];

      const { container } = render(
        <Table
          data={mockData}
          columns={columns}
          getRowKey={(item) => item.id}
        />
      );

      const header = container.querySelector('th[data-column="name"]');
      expect(header).not.toHaveAttribute('aria-label');
    });
  });

  describe('Row Interaction', () => {
    it('should call onRowClick when row is clicked', async () => {
      const user = userEvent.setup();
      const handleRowClick = vi.fn();

      render(
        <Table
          data={mockData}
          columns={baseColumns}
          getRowKey={(item) => item.id}
          onRowClick={handleRowClick}
        />
      );

      const firstRow = screen.getByRole('button', { name: /Alice Johnson/i });
      await user.click(firstRow);

      expect(handleRowClick).toHaveBeenCalledWith(mockData[0], 0);
    });

    it('should support keyboard navigation on clickable rows', async () => {
      const user = userEvent.setup();
      const handleRowClick = vi.fn();

      render(
        <Table
          data={mockData}
          columns={baseColumns}
          getRowKey={(item) => item.id}
          onRowClick={handleRowClick}
        />
      );

      const firstRow = screen.getByRole('button', { name: /Alice Johnson/i });
      firstRow.focus();
      await user.keyboard('{Enter}');

      expect(handleRowClick).toHaveBeenCalledWith(mockData[0], 0);
    });

    it('should support keyboard navigation on clickable rows with Space key', async () => {
      const user = userEvent.setup();
      const handleRowClick = vi.fn();

      render(
        <Table
          data={mockData}
          columns={baseColumns}
          getRowKey={(item) => item.id}
          onRowClick={handleRowClick}
        />
      );

      const firstRow = screen.getByRole('button', { name: /Alice Johnson/i });
      firstRow.focus();
      await user.keyboard(' ');

      expect(handleRowClick).toHaveBeenCalledWith(mockData[0], 0);
    });

    it('should not make rows clickable when onRowClick is not provided', () => {
      const { container } = render(
        <Table
          data={mockData}
          columns={baseColumns}
          getRowKey={(item) => item.id}
        />
      );

      const row = container.querySelector('tbody tr');
      expect(row).not.toHaveAttribute('role', 'button');
      expect(row).not.toHaveAttribute('tabIndex');
    });
  });

  describe('Layout Modes', () => {
    it('should apply scroll layout class by default', () => {
      const { container } = render(
        <Table
          data={mockData}
          columns={baseColumns}
          getRowKey={(item) => item.id}
        />
      );

      expect(container.querySelector('.table-container--scroll')).toBeInTheDocument();
    });

    it('should apply card layout class when specified', () => {
      const { container } = render(
        <Table
          data={mockData}
          columns={baseColumns}
          getRowKey={(item) => item.id}
          mobileLayout="card"
        />
      );

      expect(container.querySelector('.table-container--card')).toBeInTheDocument();
    });

    it('should apply sticky header class when enabled', () => {
      const { container } = render(
        <Table
          data={mockData}
          columns={baseColumns}
          getRowKey={(item) => item.id}
          stickyHeader={true}
        />
      );

      expect(container.querySelector('.table-container--sticky-header')).toBeInTheDocument();
    });

    it('should not apply sticky header class when disabled', () => {
      const { container } = render(
        <Table
          data={mockData}
          columns={baseColumns}
          getRowKey={(item) => item.id}
          stickyHeader={false}
        />
      );

      expect(container.querySelector('.table-container--sticky-header')).not.toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render default size', () => {
      const { container } = render(
        <Table
          data={mockData}
          columns={baseColumns}
          getRowKey={(item) => item.id}
          size="default"
        />
      );

      const table = container.querySelector('.data-table');
      expect(table).not.toHaveClass('data-table--compact');
    });

    it('should render compact size', () => {
      const { container } = render(
        <Table
          data={mockData}
          columns={baseColumns}
          getRowKey={(item) => item.id}
          size="compact"
        />
      );

      const table = container.querySelector('.data-table');
      expect(table).toHaveClass('data-table--compact');
    });
  });

  describe('Data Attributes', () => {
    it('should add data-label attribute to cells for card layout', () => {
      const { container } = render(
        <Table
          data={mockData}
          columns={baseColumns}
          getRowKey={(item) => item.id}
        />
      );

      const cell = container.querySelector('td[data-label="Name"]');
      expect(cell).toBeInTheDocument();
    });

    it('should add data-column attribute to headers and cells', () => {
      const { container } = render(
        <Table
          data={mockData}
          columns={baseColumns}
          getRowKey={(item) => item.id}
        />
      );

      expect(container.querySelector('th[data-column="name"]')).toBeInTheDocument();
      expect(container.querySelector('td[data-column="email"]')).toBeInTheDocument();
    });

    it('should add data-row-key attribute to rows', () => {
      const { container } = render(
        <Table
          data={mockData}
          columns={baseColumns}
          getRowKey={(item) => item.id}
        />
      );

      expect(container.querySelector('tr[data-row-key="1"]')).toBeInTheDocument();
      expect(container.querySelector('tr[data-row-key="2"]')).toBeInTheDocument();
    });
  });

  describe('Custom Rendering', () => {
    it('should support custom cell rendering', () => {
      const columns: TableColumn<TestData>[] = [
        {
          key: 'name',
          label: 'Name',
          render: (item) => <strong data-testid={`custom-name-${item.id}`}>{item.name.toUpperCase()}</strong>,
        },
      ];

      render(
        <Table
          data={mockData}
          columns={columns}
          getRowKey={(item) => item.id}
        />
      );

      expect(screen.getByTestId('custom-name-1')).toHaveTextContent('ALICE JOHNSON');
    });

    it('should pass item index to render function', () => {
      const columns: TableColumn<TestData>[] = [
        {
          key: 'name',
          label: 'Name',
          render: (item, index) => `${index + 1}. ${item.name}`,
        },
      ];

      render(
        <Table
          data={mockData}
          columns={columns}
          getRowKey={(item) => item.id}
        />
      );

      expect(screen.getByText('1. Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('2. Bob Smith')).toBeInTheDocument();
    });
  });

  describe('Column Width', () => {
    it('should apply custom column width', () => {
      const columns: TableColumn<TestData>[] = [
        { key: 'name', label: 'Name', render: (item) => item.name, width: '40%' },
        { key: 'email', label: 'Email', render: (item) => item.email, width: '60%' },
      ];

      const { container } = render(
        <Table
          data={mockData}
          columns={columns}
          getRowKey={(item) => item.id}
        />
      );

      const nameHeader = container.querySelector('th[data-column="name"]');
      expect(nameHeader).toHaveStyle({ width: '40%' });
    });
  });
});
