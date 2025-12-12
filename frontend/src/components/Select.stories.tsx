import { Select } from './Select';

export default {
  title: 'Components/Form/Select',
};

export const SelectStates = () => (
  <div style={{ display: 'grid', gap: '1rem', maxWidth: '420px' }}>
    <Select label="Role">
      <option value="">Choose a role</option>
      <option value="admin">Admin</option>
      <option value="orgadmin">Org Admin</option>
      <option value="member">Member</option>
    </Select>
    <Select label="Status" helperText="Used for filtering results.">
      <option value="">All statuses</option>
      <option value="open">Open</option>
      <option value="closed">Closed</option>
    </Select>
    <Select label="Error state" error="Selection is required" defaultValue="">
      <option value="" disabled>
        Select an option
      </option>
      <option value="opt-1">Option 1</option>
      <option value="opt-2">Option 2</option>
    </Select>
    <Select label="Disabled" disabled defaultValue="opt-1">
      <option value="opt-1">Read only</option>
    </Select>
  </div>
);
