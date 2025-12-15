import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';
import { Button } from './Button';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  args: {
    elevation: 'md',
    padding: 'default',
    variant: 'default',
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

const SampleContent = () => (
  <div style={{ display: 'grid', gap: '0.35rem' }}>
    <h3 style={{ margin: 0 }}>Card title</h3>
    <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
      Supporting text that explains the purpose of this card.
    </p>
  </div>
);

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: '1rem', maxWidth: 720 }}>
      <Card {...args}>
        <SampleContent />
      </Card>
      <Card {...args} variant="bordered">
        <SampleContent />
      </Card>
      <Card
        {...args}
        variant="interactive"
        onClick={() => alert('Card clicked')}
        aria-label="Interactive card"
      >
        <SampleContent />
      </Card>
    </div>
  ),
};

export const Elevation: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
      {(['none', 'sm', 'md', 'lg', 'xl'] as const).map((elevation) => (
        <Card key={elevation} {...args} elevation={elevation}>
          <h4 style={{ marginTop: 0, marginBottom: '0.35rem' }}>Elevation {elevation}</h4>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            Use higher elevation for emphasis and hover states.
          </p>
        </Card>
      ))}
    </div>
  ),
};

export const PaddingOptions: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {(['compact', 'default', 'spacious'] as const).map((padding) => (
        <Card key={padding} {...args} padding={padding}>
          <h4 style={{ marginTop: 0, marginBottom: '0.35rem' }}>Padding: {padding}</h4>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            Adjust padding to match the density of surrounding content.
          </p>
        </Card>
      ))}
    </div>
  ),
};

export const WithActions: Story = {
  render: (args) => (
    <Card {...args} variant="bordered">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <SampleContent />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="secondary" size="sm">
            Secondary
          </Button>
          <Button size="sm">Primary</Button>
        </div>
      </div>
    </Card>
  ),
};
