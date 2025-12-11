# Table Component

Enhanced table component with responsive layouts, sortable columns, and design system tokens.

## Features

- **Responsive Layouts**: Choose between horizontal scroll or card layout on mobile
- **Sortable Columns**: Optional sorting with visual indicators
- **Sticky Header**: Keep headers visible while scrolling
- **Design System Integration**: Uses all design tokens for consistency
- **Dark Mode Support**: Full dark mode with dual activation pattern
- **Accessibility**: Full keyboard navigation, ARIA labels, and screen reader support
- **Hover States**: Smooth transitions using design tokens
- **Empty State**: Built-in empty state with customizable message
- **Clickable Rows**: Optional row click handlers with keyboard support

## Usage

### Basic Table

```tsx
import { Table, type TableColumn } from '../components/Table';

interface User {
  id: string;
  name: string;
  email: string;
}

const columns: TableColumn<User>[] = [
  {
    key: 'name',
    label: 'Name',
    render: (user) => user.name,
  },
  {
    key: 'email',
    label: 'Email',
    render: (user) => user.email,
  },
];

<Table
  data={users}
  columns={columns}
  getRowKey={(user) => user.id}
/>
```

### Sortable Columns

```tsx
const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
  key: 'name',
  direction: 'asc',
});

const handleSort = (key: string) => {
  setSortConfig({
    key,
    direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
  });
};

const columns: TableColumn<User>[] = [
  {
    key: 'name',
    label: 'Name',
    render: (user) => user.name,
    sortable: true,
  },
  {
    key: 'email',
    label: 'Email',
    render: (user) => user.email,
    sortable: true,
  },
];

<Table
  data={users}
  columns={columns}
  getRowKey={(user) => user.id}
  sortConfig={sortConfig}
  onSort={handleSort}
/>
```

### Card Layout on Mobile

```tsx
<Table
  data={users}
  columns={columns}
  getRowKey={(user) => user.id}
  mobileLayout="card"
/>
```

### With Badges and Buttons

```tsx
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';

const columns: TableColumn<User>[] = [
  {
    key: 'name',
    label: 'Name',
    render: (user) => user.name,
  },
  {
    key: 'status',
    label: 'Status',
    align: 'center',
    render: (user) => (
      <Badge variant={user.isActive ? 'success' : 'neutral'}>
        {user.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    key: 'actions',
    label: 'Actions',
    align: 'center',
    render: (user) => (
      <div className="table-actions">
        <Button size="sm" variant="primary" onClick={() => handleEdit(user)}>
          Edit
        </Button>
        <Button size="sm" variant="secondary" onClick={() => handleView(user)}>
          View
        </Button>
      </div>
    ),
  },
];
```

### Clickable Rows

```tsx
<Table
  data={users}
  columns={columns}
  getRowKey={(user) => user.id}
  onRowClick={(user) => navigate(`/users/${user.id}`)}
/>
```

### Compact Size

```tsx
<Table
  data={users}
  columns={columns}
  getRowKey={(user) => user.id}
  size="compact"
/>
```

### Empty State

```tsx
<Table
  data={[]}
  columns={columns}
  getRowKey={(user) => user.id}
  emptyMessage="No users found. Create one to get started."
/>
```

## Props

### TableProps<T>

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `T[]` | required | Array of data items to display |
| `columns` | `TableColumn<T>[]` | required | Column definitions |
| `getRowKey` | `(item: T, index: number) => string \| number` | required | Unique key extractor for each row |
| `mobileLayout` | `'scroll' \| 'card'` | `'scroll'` | Layout mode on mobile |
| `size` | `'default' \| 'compact'` | `'default'` | Table size variant |
| `stickyHeader` | `boolean` | `true` | Enable sticky header |
| `sortConfig` | `{ key: string; direction: 'asc' \| 'desc' } \| null` | `null` | Current sort configuration |
| `onSort` | `(key: string) => void` | - | Sort change handler |
| `emptyMessage` | `string` | `'No data available'` | Message when data is empty |
| `className` | `string` | `''` | Additional CSS class names |
| `testId` | `string` | - | Test ID for testing |
| `caption` | `string` | - | Optional caption for accessibility |
| `onRowClick` | `(item: T, index: number) => void` | - | Click handler for row |

### TableColumn<T>

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `key` | `string` | required | Unique identifier for the column |
| `label` | `string` | required | Column header label |
| `render` | `(item: T, index: number) => React.ReactNode` | required | Render function for cell content |
| `align` | `'left' \| 'center' \| 'right'` | `'left'` | Text alignment for this column |
| `sortable` | `boolean` | `false` | If true, this column is sortable |
| `sortKey` | `string` | - | Sort key (defaults to column key) |
| `width` | `string` | - | Optional width for this column |
| `hideOnMobile` | `boolean` | `false` | Hide on mobile (for card layout) |

## Responsive Behavior

### Scroll Layout (Default)

On mobile devices (below 768px), the table becomes horizontally scrollable. This is the default behavior and works well for tables with many columns.

### Card Layout

On mobile devices, each table row transforms into a card with vertical layout. Column labels are shown inline with values. This works better for tables with fewer columns or when you want a more mobile-friendly experience.

## Accessibility

- Full keyboard navigation support
- ARIA labels and roles for sortable headers
- Screen reader support with optional caption
- Focus indicators on interactive elements
- Semantic HTML structure

## Design Tokens

The Table component uses design system tokens exclusively:

- Colors: `--color-surface`, `--color-neutral-*`, `--color-primary-*`, etc.
- Spacing: `--spacing-*`
- Typography: `--font-size-*`, `--font-weight-*`
- Borders: `--color-border-*`, `--radius-*`
- Shadows: `--shadow-*`
- Transitions: `--duration-*`, `--ease-*`

## Dark Mode

The component supports dark mode through dual activation:
- `@media (prefers-color-scheme: dark)`
- `body.theme-dark` class

Both methods work independently, ensuring dark mode activates in any scenario.

## Examples

See `Table.showcase.html` for live examples of all features and configurations.

## Testing

The component has comprehensive test coverage including:
- Basic rendering
- Column alignment
- Sortable columns
- Row interaction
- Responsive layouts
- Accessibility
- Custom rendering

Run tests with:
```bash
npm test -- Table.test.tsx
```

## Migration from Inline Tables

### Before
```tsx
<div style={{ backgroundColor: 'white', borderRadius: '8px', ... }}>
  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead>
      <tr style={{ backgroundColor: '#f8f9fa', ... }}>
        <th style={{ padding: '1rem', ... }}>Name</th>
        {/* ... */}
      </tr>
    </thead>
    <tbody>
      {users.map(user => (
        <tr key={user.id} style={{ borderBottom: '1px solid #dee2e6' }}>
          <td style={{ padding: '1rem' }}>{user.name}</td>
          {/* ... */}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### After
```tsx
<Table
  data={users}
  columns={[
    { key: 'name', label: 'Name', render: (user) => user.name },
    // ...
  ]}
  getRowKey={(user) => user.id}
  mobileLayout="card"
/>
```

## Performance

- Virtual scrolling: Not currently implemented (suitable for tables with < 1000 rows)
- Row keys: Required for optimal React reconciliation
- Memoization: Consider wrapping column definitions in useMemo for large datasets

## Future Enhancements

- Virtual scrolling for large datasets
- Column resizing
- Column reordering
- Inline editing
- Bulk selection
- Export to CSV
- Advanced filtering UI
