import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  args: {
    children: 'Label',
    variant: 'default',
    size: 'md',
    shape: 'rounded',
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: '0.5rem', maxWidth: 360 }}>
      {(['default', 'success', 'warning', 'error', 'info', 'neutral'] as const).map((variant) => (
        <Badge key={variant} {...args} variant={variant}>
          {variant.charAt(0).toUpperCase() + variant.slice(1)}
        </Badge>
      ))}
    </div>
  ),
};

export const SizesAndShapes: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 420 }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Badge {...args} size={size} shape="rounded">
            {size.toUpperCase()} Rounded
          </Badge>
          <Badge {...args} size={size} shape="pill">
            {size.toUpperCase()} Pill
          </Badge>
        </div>
      ))}
    </div>
  ),
};

export const WithIndicators: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <Badge {...args} icon="✅" variant="success">
        With icon
      </Badge>
      <Badge {...args} dot variant="info">
        Dot indicator
      </Badge>
      <Badge {...args} icon="⚠️" variant="warning">
        Warning
      </Badge>
    </div>
  ),
};
