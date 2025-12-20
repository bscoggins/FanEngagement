import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Skeleton, SkeletonCardGrid, SkeletonList, SkeletonTable, SkeletonTextLines } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'Components/Skeleton',
  component: Skeleton,
  args: {
    variant: 'rect',
    width: '100%',
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['text', 'rect', 'circle'],
    },
    animation: {
      control: { type: 'select' },
      options: ['shimmer', 'pulse'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Shapes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 520 }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Skeleton variant="circle" width="48px" height="48px" />
        <Skeleton variant="rect" width="120px" height="48px" />
        <Skeleton variant="text" width="160px" />
      </div>
      <SkeletonTextLines count={3} widths={['90%', '80%', '60%']} />
    </div>
  ),
};

export const TablePlaceholder: Story = {
  render: () => (
    <div style={{ padding: '1rem' }}>
      <SkeletonTable columns={4} rows={4} />
    </div>
  ),
};

export const ListPlaceholder: Story = {
  render: () => (
    <div style={{ padding: '1rem' }}>
      <SkeletonList items={4} withAvatar linesPerItem={2} />
    </div>
  ),
};

export const CardGrid: Story = {
  render: () => (
    <div style={{ padding: '1rem' }}>
      <SkeletonCardGrid items={4} linesPerCard={2} />
    </div>
  ),
};
