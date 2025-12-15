import { Tooltip } from './Tooltip';

export default {
  title: 'Components/Tooltip',
};

export const Basic = () => (
  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
    <Tooltip content="Save your changes before leaving">
      <button
        type="button"
        style={{
          padding: '0.5rem 0.75rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border-default)',
          background: 'var(--color-surface)',
          cursor: 'pointer',
        }}
      >
        Hover or focus me
      </button>
    </Tooltip>

    <Tooltip content="Keyboard friendly: focus to reveal" placement="bottom">
      <span
        tabIndex={0}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.35rem 0.5rem',
          background: 'var(--color-primary-alpha-10)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-primary-700)',
          fontWeight: 600,
          cursor: 'default',
        }}
      >
        ℹ️ Accessible hint
      </span>
    </Tooltip>
  </div>
);

export const Placements = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '1rem',
      maxWidth: '640px',
    }}
  >
    <Tooltip content="Top placement (default)" placement="top">
      <button type="button" className="dropdown-trigger">
        Top
      </button>
    </Tooltip>

    <Tooltip content="Bottom placement" placement="bottom">
      <button type="button" className="dropdown-trigger">
        Bottom
      </button>
    </Tooltip>

    <Tooltip content="Left placement" placement="left">
      <button type="button" className="dropdown-trigger">
        Left
      </button>
    </Tooltip>

    <Tooltip content="Right placement" placement="right">
      <button type="button" className="dropdown-trigger">
        Right
      </button>
    </Tooltip>

    <Tooltip content="Auto placement chooses the best fit" placement="auto">
      <button type="button" className="dropdown-trigger">
        Auto
      </button>
    </Tooltip>
  </div>
);

export const CustomDelay = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 360 }}>
    <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
      Tooltips wait before appearing. This example uses a 600ms delay.
    </p>
    <Tooltip content="Opens after 600ms" delay={600}>
      <button type="button" className="dropdown-trigger">
        Hover me (600ms delay)
      </button>
    </Tooltip>
  </div>
);

export const TruncatedText = () => (
  <div style={{ maxWidth: 320 }}>
    <p style={{ marginBottom: '0.25rem', color: 'var(--color-text-secondary)' }}>Truncated label</p>
    <Tooltip content="This is the full text that may be truncated in the layout">
      <span className="text-truncate text-truncate-md" style={{ display: 'inline-block' }}>
        This is the full text that may be truncated in the layout
      </span>
    </Tooltip>
  </div>
);
