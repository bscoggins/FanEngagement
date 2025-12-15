import type { Meta, StoryObj } from '@storybook/react';
import { useMemo, useState } from 'react';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { Input } from './Input';
import { Radio } from './Radio';
import { Select } from './Select';

const FormPlayground = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: '',
    updates: true,
    access: 'member',
  });

  const errors = useMemo(
    () => ({
      name: submitted && !form.name ? 'Name is required' : undefined,
      email: submitted && !form.email ? 'Email is required' : undefined,
      role: submitted && !form.role ? 'Select a role' : undefined,
    }),
    [form.email, form.name, form.role, submitted]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!errors.name && !errors.email && !errors.role) {
      alert(`Saved ${form.name} (${form.role || 'unassigned'})`);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', maxWidth: 520 }}>
      <Input
        label="Full name"
        placeholder="Alex Johnson"
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        required
        error={errors.name}
      />

      <Input
        label="Email"
        type="email"
        placeholder="alex@example.com"
        value={form.email}
        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
        helperText="We will send notifications to this address."
        required
        error={errors.email}
      />

      <Select
        label="Role"
        value={form.role}
        onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
        required
        error={errors.role}
      >
        <option value="">Choose a role</option>
        <option value="platform-admin">Platform Admin</option>
        <option value="org-admin">Org Admin</option>
        <option value="member">Member</option>
      </Select>

      <div style={{ display: 'grid', gap: '0.5rem' }}>
        <span style={{ fontWeight: 600 }}>Access level</span>
        <Radio
          name="access"
          label="Member (default)"
          value="member"
          checked={form.access === 'member'}
          onChange={(e) => setForm((prev) => ({ ...prev, access: e.target.value }))}
        />
        <Radio
          name="access"
          label="Org Admin"
          value="org-admin"
          helperText="Can manage organizations and members."
          checked={form.access === 'org-admin'}
          onChange={(e) => setForm((prev) => ({ ...prev, access: e.target.value }))}
        />
        <Radio
          name="access"
          label="Platform Admin"
          value="platform-admin"
          checked={form.access === 'platform-admin'}
          onChange={(e) => setForm((prev) => ({ ...prev, access: e.target.value }))}
        />
      </div>

      <Checkbox
        label="Send product updates"
        checked={form.updates}
        onChange={(e) => setForm((prev) => ({ ...prev, updates: e.target.checked }))}
        helperText="We only send one or two updates per month."
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <Button type="button" variant="secondary" onClick={() => setForm({ name: '', email: '', role: '', updates: true, access: 'member' })}>
          Reset
        </Button>
        <Button type="submit" isLoading={submitted && (!!errors.name || !!errors.email || !!errors.role)}>
          Save changes
        </Button>
      </div>
    </form>
  );
};

const FieldStates = () => (
  <div style={{ display: 'grid', gap: '1rem', maxWidth: 520 }}>
    <Input label="Disabled" placeholder="Disabled input" disabled />
    <Input label="Error state" placeholder="Something went wrong" error="Validation error" defaultValue="Invalid value" />
    <Select label="Helper text" helperText="Use this to filter proposals.">
      <option value="">All proposals</option>
      <option value="open">Open</option>
      <option value="closed">Closed</option>
    </Select>
    <Checkbox label="Checked by default" defaultChecked />
    <Radio name="demo-radio" value="default" label="Default radio" defaultChecked />
    <Radio name="demo-radio" value="disabled" label="Disabled radio" disabled />
  </div>
);

const meta: Meta<typeof FormPlayground> = {
  title: 'Components/Form',
  component: FormPlayground,
};

export default meta;
type Story = StoryObj<typeof FormPlayground>;

export const Playground: Story = {};

export const FieldStatesShowcase: Story = {
  render: () => <FieldStates />,
};
