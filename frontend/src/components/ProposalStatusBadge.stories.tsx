import type { Meta, StoryObj } from '@storybook/react';
import { ProposalStatusBadge } from './ProposalStatusBadge';

const meta: Meta<typeof ProposalStatusBadge> = {
  title: 'Components/ProposalStatusBadge',
  component: ProposalStatusBadge,
  args: {
    status: 'Draft',
  },
  argTypes: {
    status: {
      control: { type: 'select' },
      options: ['Draft', 'Open', 'Closed', 'Finalized'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ProposalStatusBadge>;

export const Draft: Story = {
  args: {
    status: 'Draft',
  },
};

export const Open: Story = {
  args: {
    status: 'Open',
  },
};

export const Closed: Story = {
  args: {
    status: 'Closed',
  },
};

export const Finalized: Story = {
  args: {
    status: 'Finalized',
  },
};
