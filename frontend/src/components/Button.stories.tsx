import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  args: {
    children: 'Click me',
    variant: 'primary',
    size: 'md',
  },
  argTypes: {
    onClick: { action: 'clicked' },
    icon: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Playground: Story = {};

export const Variants: Story = {
  args: {
    children: undefined,
  },
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      {(['primary', 'secondary', 'outline', 'ghost', 'danger'] as const).map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant === 'danger' ? 'Danger' : variant.charAt(0).toUpperCase() + variant.slice(1)}
        </Button>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  args: {
    children: 'Size label',
  },
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <Button key={size} {...args} size={size}>
          {size.toUpperCase()}
        </Button>
      ))}
    </div>
  ),
};

export const WithIcons: Story = {
  args: {
    children: 'Next step',
    icon: '➡️',
  },
  render: (args) => (
    <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 360 }}>
      <Button {...args} />
      <Button {...args} icon="⬅️" iconPosition="left">
        Back
      </Button>
      <Button {...args} iconOnly aria-label="Open search" variant="ghost" />
    </div>
  ),
};

export const States: Story = {
  args: {
    children: 'Submit',
  },
  render: (args) => (
    <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 360 }}>
      <Button {...args} isLoading>
        Loading
      </Button>
      <Button {...args} disabled variant="secondary">
        Disabled
      </Button>
      <Button {...args} fullWidth>
        Full width
      </Button>
    </div>
  ),
};
