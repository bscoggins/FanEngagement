import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageTransition } from './PageTransition';

describe('PageTransition', () => {
  it('wraps children in a transition container', () => {
    render(
      <PageTransition transitionKey="first">
        <div>Transitioned Content</div>
      </PageTransition>
    );

    const content = screen.getByText('Transitioned Content');
    const wrapper = content.parentElement;

    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveClass('page-transition');
    expect(wrapper).toHaveAttribute('data-transition-key', 'first');
  });

  it('remounts when the transition key changes', () => {
    const { rerender } = render(
      <PageTransition transitionKey="initial">
        <div>Dynamic Content</div>
      </PageTransition>
    );

    const firstWrapper = screen.getByText('Dynamic Content').parentElement;

    rerender(
      <PageTransition transitionKey="next">
        <div>Dynamic Content</div>
      </PageTransition>
    );

    const secondWrapper = screen.getByText('Dynamic Content').parentElement;

    expect(firstWrapper).not.toBe(secondWrapper);
  });
});
