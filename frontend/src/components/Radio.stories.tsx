import { Radio } from './Radio';

export default {
  title: 'Components/Form/Radio',
};

export const RadioStates = () => (
  <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '460px' }}>
    <Radio name="access" value="read" label="Read only" defaultChecked />
    <Radio name="access" value="write" label="Read & write" helperText="Allows editing organization settings." />
    <Radio name="access-required" value="required" label="Required option" required />
    <Radio name="access" value="owner" label="Owner" error="Owner role is restricted" />
    <Radio name="access-disabled" value="disabled" label="Disabled option" disabled />
  </div>
);
