import type { Meta, StoryObj } from '@storybook/react';
import { useMemo, useState } from 'react';
import { Badge } from './Badge';
import { Table, type TableColumn, type TableProps } from './Table';

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'invited' | 'suspended';
};

const columns: TableColumn<UserRow>[] = [
  { key: 'name', label: 'Name', sortable: true, render: (row) => row.name },
  { key: 'email', label: 'Email', render: (row) => row.email },
  { key: 'role', label: 'Role', sortable: true, render: (row) => row.role },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (row) => (
      <Badge
        variant={row.status === 'active' ? 'success' : row.status === 'invited' ? 'info' : 'warning'}
        size="sm"
      >
        {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
      </Badge>
    ),
  },
];

const sampleData: UserRow[] = [
  { id: 1, name: 'Alex Johnson', email: 'alex@example.com', role: 'Org Admin', status: 'active' },
  { id: 2, name: 'Bianca Patel', email: 'bianca@example.com', role: 'Member', status: 'invited' },
  { id: 3, name: 'Chris Lee', email: 'chris@example.com', role: 'Member', status: 'active' },
  { id: 4, name: 'Dylan Chen', email: 'dylan@example.com', role: 'Org Admin', status: 'suspended' },
  { id: 5, name: 'Emilia Gomez', email: 'emilia@example.com', role: 'Member', status: 'active' },
];

const UserTable = (props: TableProps<UserRow>) => <Table<UserRow> {...props} />;

const meta: Meta<typeof UserTable> = {
  title: 'Components/Table',
  component: UserTable,
  args: {
    data: sampleData,
    columns,
    getRowKey: (row: UserRow) => row.id,
    caption: 'Organization members',
  },
};

export default meta;
type Story = StoryObj<typeof UserTable>;

export const Default: Story = {};

export const Sortable: Story = {
  render: (args) => {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const sortedData = useMemo(() => {
      if (!sortConfig) return args.data;
      const sorted = [...(args.data ?? [])];
      sorted.sort((a, b) => {
        const aValue = (a as Record<string, unknown>)[sortConfig.key];
        const bValue = (b as Record<string, unknown>)[sortConfig.key];
        const aComparable = typeof aValue === 'string' ? aValue.toLowerCase() : aValue ?? '';
        const bComparable = typeof bValue === 'string' ? bValue.toLowerCase() : bValue ?? '';

        if (aComparable === bComparable) return 0;
        const comparison = aComparable > bComparable ? 1 : -1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
      return sorted;
    }, [args.data, sortConfig]);

    const handleSort = (key: string) => {
      setSortConfig((prev) => {
        if (prev?.key === key) {
          return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        }
        return { key, direction: 'asc' };
      });
    };

    return (
      <UserTable
        {...args}
        data={sortedData}
        sortConfig={sortConfig}
        onSort={handleSort}
      />
    );
  },
};

export const CompactCardLayout: Story = {
  args: {
    mobileLayout: 'card',
    size: 'compact',
    stickyHeader: false,
  },
};

export const ClickableRows: Story = {
  render: (args) => (
    <UserTable
      {...args}
      onRowClick={(row) => alert(`Clicked row for ${row.name}`)}
    />
  ),
};

export const EmptyState: Story = {
  args: {
    data: [],
    emptyMessage: 'No members found for this organization.',
  },
};
