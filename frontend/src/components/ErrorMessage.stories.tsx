import type { Meta, StoryObj } from '@storybook/react';
import { ErrorMessage } from './ErrorMessage';

const meta: Meta<typeof ErrorMessage> = {
  title: 'Components/ErrorMessage',
  component: ErrorMessage,
  args: {
    message: 'Something went wrong.',
  },
  argTypes: {
    onRetry: { action: 'retry clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof ErrorMessage>;

export const Default: Story = {};

export const WithRetry: Story = {
  args: {
    message: 'Failed to load user data.',
    onRetry: () => console.log('Retry clicked'),
  },
};

export const LongMessage: Story = {
  args: {
    message: 'This is a very long error message that might wrap to multiple lines depending on the container width. It is important to test how the component handles large amounts of text.',
    onRetry: () => console.log('Retry clicked'),
  },
};
