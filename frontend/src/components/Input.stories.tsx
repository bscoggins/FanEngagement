import { Input } from './Input';

export default {
  title: 'Components/Form/Input',
};

export const InputStates = () => (
  <div style={{ display: 'grid', gap: '1rem', maxWidth: '420px' }}>
    <Input label="Email" type="email" placeholder="you@example.com" />
    <Input label="Password" type="password" placeholder="••••••••" helperText="Use at least 8 characters." />
    <Input label="Required field" type="text" placeholder="This field is required" required />
    <Input label="Search" type="search" placeholder="Search proposals" leftIcon="🔍" />
    <Input label="With error" error="This field is required" defaultValue="Needs attention" />
    <Input label="Disabled" placeholder="Disabled input" disabled />
  </div>
);
