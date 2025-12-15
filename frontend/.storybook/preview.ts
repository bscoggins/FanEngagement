import type { Preview } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import '../src/index.css';

const preview: Preview = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'padded',
    backgrounds: {
      default: 'surface',
      values: [
        { name: 'surface', value: 'var(--color-surface, #ffffff)' },
        { name: 'muted', value: 'var(--color-surface-muted, #f5f7fb)' },
        { name: 'dark', value: 'var(--color-surface-dark, #1a1a1a)' },
      ],
    },
    a11y: {
      element: '#root',
    },
  },
};

export default preview;
