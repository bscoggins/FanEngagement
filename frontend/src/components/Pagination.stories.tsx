import type { Meta, StoryObj } from '@storybook/react';
import { Pagination } from './Pagination';

const meta: Meta<typeof Pagination> = {
  title: 'Components/Pagination',
  component: Pagination,
  args: {
    currentPage: 1,
    totalPages: 10,
    hasPreviousPage: false,
    hasNextPage: true,
  },
  argTypes: {
    onPageChange: { action: 'page changed' },
  },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const FirstPage: Story = {};

export const MiddlePage: Story = {
  args: {
    currentPage: 5,
    hasPreviousPage: true,
    hasNextPage: true,
  },
};

export const LastPage: Story = {
  args: {
    currentPage: 10,
    hasPreviousPage: true,
    hasNextPage: false,
  },
};

export const FewPages: Story = {
  args: {
    currentPage: 1,
    totalPages: 3,
    hasPreviousPage: false,
    hasNextPage: true,
  },
};

export const ManyPages: Story = {
  args: {
    currentPage: 50,
    totalPages: 100,
    hasPreviousPage: true,
    hasNextPage: true,
  },
};
