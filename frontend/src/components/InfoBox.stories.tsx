import type { Meta, StoryObj } from '@storybook/react';
import { InfoBox } from './InfoBox';

const meta: Meta<typeof InfoBox> = {
  title: 'Components/InfoBox',
  component: InfoBox,
  args: {
    children: 'This is an informational message.',
  },
};

export default meta;
type Story = StoryObj<typeof InfoBox>;

export const Default: Story = {};

export const WithHTML: Story = {
  args: {
    children: (
      <span>
        <strong>Note:</strong> You can use <em>HTML</em> inside the InfoBox.
      </span>
    ),
  },
};

export const LongContent: Story = {
  args: {
    children: 'This is a much longer message that demonstrates how the InfoBox handles multiple lines of text. It should wrap comfortably and maintain good readability regardless of the length of the content provided.',
  },
};
