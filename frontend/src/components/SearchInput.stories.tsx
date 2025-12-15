import type { Meta, StoryObj } from '@storybook/react';
import { SearchInput } from './SearchInput';

const meta: Meta<typeof SearchInput> = {
  title: 'Components/SearchInput',
  component: SearchInput,
  args: {
    value: '',
    placeholder: 'Search items...',
    debounceMs: 300,
  },
  argTypes: {
    onChange: { action: 'changed' },
  },
};

export default meta;
type Story = StoryObj<typeof SearchInput>;

export const Default: Story = {};

export const WithValue: Story = {
  args: {
    value: 'Initial search term',
  },
};

export const CustomPlaceholder: Story = {
  args: {
    placeholder: 'Filter by name, email, or role...',
  },
};

export const NoDebounce: Story = {
  args: {
    debounceMs: 0,
  },
};
