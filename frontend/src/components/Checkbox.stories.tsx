import { Checkbox } from './Checkbox';

export default {
  title: 'Components/Form/Checkbox',
};

export const CheckboxStates = () => (
  <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '460px' }}>
    <Checkbox label="Enable notifications" defaultChecked />
    <Checkbox label="Remember this device" helperText="We will keep you signed in for 30 days." />
    <Checkbox label="Accept terms" error="You must accept the terms" />
    <Checkbox label="Disabled checkbox" disabled />
  </div>
);
