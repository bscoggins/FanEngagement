import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from './Tooltip';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Tooltip', () => {
  it('shows tooltip on hover after the configured delay', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Helpful hint" delay={300}>
        <button type="button">Trigger</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Trigger' });
    await user.hover(trigger);

    await act(async () => {
      await wait(200);
    });
    expect(screen.queryByRole('tooltip')).toBeNull();

    await act(async () => {
      await wait(200);
    });
    expect(await screen.findByRole('tooltip', { name: 'Helpful hint' })).toHaveTextContent('Helpful hint');
  });

  it('respects focus interactions and closes with Escape', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Focus tooltip">
        <button type="button">Focusable</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Focusable' });
    trigger.focus();

    await act(async () => {
      await wait(350);
    });
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await act(async () => {
      await wait(100);
    });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('merges existing aria-describedby values when open', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Combined" id="tooltip-id">
        <button type="button" aria-describedby="existing">Has describedby</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Has describedby' });
    await user.hover(trigger);
    await act(async () => {
      await wait(350);
    });

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.id).toBe('tooltip-id');
    const describedBy = trigger.getAttribute('aria-describedby');

    expect(describedBy?.split(' ')).toEqual(expect.arrayContaining(['existing', 'tooltip-id']));
  });
});
