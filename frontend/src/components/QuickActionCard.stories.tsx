import type { Meta, StoryObj } from '@storybook/react';
import { QuickActionCard } from './QuickActionCard';

const meta: Meta<typeof QuickActionCard> = {
  title: 'Components/QuickActionCard',
  component: QuickActionCard,
  args: {
    to: '/some-path',
    icon: '🚀',
    title: 'Launch Project',
    description: 'Start a new project from scratch with our easy-to-use wizard.',
    actionText: 'Get Started',
  },
};

export default meta;
type Story = StoryObj<typeof QuickActionCard>;

export const Default: Story = {};

export const WithCustomIconBackground: Story = {
  args: {
    icon: '⚙️',
    iconBgClass: 'bg-light-blue', // Assuming this class exists or is handled by CSS
    title: 'Settings',
    description: 'Configure your application settings and preferences.',
    actionText: 'Manage Settings',
  },
};

export const LongDescription: Story = {
  args: {
    title: 'Complex Action',
    description: 'This action involves multiple steps and has a very long description to test how the card layout handles text wrapping and height adjustments.',
    actionText: 'Proceed',
  },
};
