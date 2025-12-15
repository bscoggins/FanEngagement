import type { Meta, StoryObj } from '@storybook/react';
import { Breadcrumb } from './Breadcrumb';

const meta: Meta<typeof Breadcrumb> = {
  title: 'Components/Breadcrumb',
  component: Breadcrumb,
  args: {
    items: [
      { label: 'Home', path: '/' },
      { label: 'Section', path: '/section' },
      { label: 'Current Page' },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

export const Default: Story = {};

export const TwoLevels: Story = {
  args: {
    items: [
      { label: 'Home', path: '/' },
      { label: 'Current Page' },
    ],
  },
};

export const DeepHierarchy: Story = {
  args: {
    items: [
      { label: 'Home', path: '/' },
      { label: 'Admin', path: '/admin' },
      { label: 'Organizations', path: '/admin/orgs' },
      { label: 'Settings', path: '/admin/orgs/settings' },
      { label: 'General' },
    ],
  },
};

export const TextOnly: Story = {
  args: {
    items: [
      { label: 'Step 1' },
      { label: 'Step 2' },
      { label: 'Step 3' },
    ],
  },
};
