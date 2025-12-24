import React from 'react';
import { render } from '@testing-library/react';
import { Skeleton, SkeletonList, SkeletonTable } from './Skeleton';

describe('Skeleton', () => {
  it('renders shimmer skeleton with correct variant', () => {
    const { container } = render(<Skeleton variant="circle" width="48px" height="48px" />);
    const skeleton = container.querySelector('.skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('skeleton--circle');
  });

  it('renders skeleton table with configured rows and columns', () => {
    const { container } = render(<SkeletonTable columns={3} rows={2} />);
    const rows = container.querySelectorAll('.skeleton-table__row');
    expect(rows).toHaveLength(2);
    expect(rows[0].children).toHaveLength(3);
  });

  it('renders skeleton list items', () => {
    const { container } = render(<SkeletonList items={3} />);
    const items = container.querySelectorAll('.skeleton-list__item');
    expect(items).toHaveLength(3);
  });
});
