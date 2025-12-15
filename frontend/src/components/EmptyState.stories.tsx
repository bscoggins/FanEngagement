import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './EmptyState';

const meta: Meta<typeof EmptyState> = {
  title: 'Components/EmptyState',
  component: EmptyState,
  args: {
    message: 'No items found',
    icon: '🔍',
  },
  argTypes: {
    action: { control: 'object' },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    message: 'No projects created yet',
    icon: '📁',
    action: {
      label: 'Create Project',
      onClick: () => alert('Create clicked'),
    },
  },
};

export const Simple: Story = {
  args: {
    message: 'Nothing to see here',
    icon: undefined,
  },
};
