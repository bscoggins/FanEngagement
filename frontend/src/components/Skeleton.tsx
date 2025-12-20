import React from 'react';
import './Skeleton.css';

type SkeletonVariant = 'text' | 'rect' | 'circle';
type SkeletonAnimation = 'shimmer' | 'pulse';

interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  animation?: SkeletonAnimation;
  borderRadius?: 'sm' | 'md' | 'lg' | 'full' | number | string;
}

const resolveRadius = (variant: SkeletonVariant, borderRadius?: SkeletonProps['borderRadius']) => {
  if (typeof borderRadius === 'number') return `${borderRadius}px`;
  if (typeof borderRadius === 'string') {
    if (borderRadius.includes('var(') || borderRadius.includes('px') || borderRadius.includes('%')) {
      return borderRadius;
    }
    if (borderRadius === 'full') return 'var(--radius-full)';
    return `var(--radius-${borderRadius})`;
  }
  return variant === 'circle' ? 'var(--radius-full)' : 'var(--radius-md)';
};

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rect',
  width = '100%',
  height,
  animation = 'shimmer',
  borderRadius,
  className = '',
  style,
  ...rest
}) => {
  const resolvedHeight =
    height ??
    (variant === 'text' ? '0.875rem' : variant === 'circle' ? '2.75rem' : '1.25rem');

  const classes = [
    'skeleton',
    animation === 'pulse' && 'skeleton--pulse',
    variant === 'text' && 'skeleton--text',
    variant === 'circle' && 'skeleton--circle',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      aria-hidden="true"
      className={classes}
      style={{
        width,
        height: resolvedHeight,
        borderRadius: resolveRadius(variant, borderRadius),
        ...style,
      }}
      {...rest}
    />
  );
};

interface SkeletonTextLinesProps {
  count?: number;
  widths?: Array<number | string>;
  height?: number | string;
  gap?: number | string;
  animation?: SkeletonAnimation;
}

export const SkeletonTextLines: React.FC<SkeletonTextLinesProps> = ({
  count = 3,
  widths,
  height,
  gap = 'var(--spacing-2)',
  animation,
}) => (
  <div className="skeleton-stack" style={{ gap }} aria-hidden="true">
    {Array.from({ length: count }).map((_, index) => (
      <Skeleton
        key={index}
        variant="text"
        width={widths?.[index] ?? '100%'}
        height={height}
        animation={animation}
      />
    ))}
  </div>
);

interface SkeletonTableProps {
  columns?: number;
  rows?: number;
  headerWidths?: Array<number | string>;
  rowHeight?: number | string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  columns = 4,
  rows = 6,
  headerWidths,
  rowHeight = '1rem',
}) => (
  <div className="skeleton-table" aria-hidden="true">
    <div
      className="skeleton-table__header"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={headerWidths?.[index] ?? '80%'}
          height="0.9rem"
        />
      ))}
    </div>
    <div className="skeleton-table__body">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="skeleton-table__row"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, cellIndex) => (
            <Skeleton key={cellIndex} height={rowHeight} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

interface SkeletonListProps {
  items?: number;
  withAvatar?: boolean;
  linesPerItem?: number;
  metaWidth?: number | string;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  items = 4,
  withAvatar = true,
  linesPerItem = 2,
  metaWidth = '40%',
}) => (
  <div className="skeleton-list" aria-hidden="true">
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="skeleton-list__item">
        {withAvatar && <Skeleton variant="circle" width="2.75rem" height="2.75rem" />}
        <div style={{ flex: 1 }}>
          <SkeletonTextLines
            count={linesPerItem}
            widths={[ '70%', metaWidth ]}
          />
        </div>
      </div>
    ))}
  </div>
);

interface SkeletonCardGridProps {
  items?: number;
  linesPerCard?: number;
}

export const SkeletonCardGrid: React.FC<SkeletonCardGridProps> = ({
  items = 4,
  linesPerCard = 2,
}) => (
  <div className="skeleton-card-grid" aria-hidden="true">
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="skeleton-card">
        <SkeletonTextLines count={linesPerCard} widths={['60%', '80%']} />
        <div style={{ marginTop: 'var(--spacing-3)' }}>
          <Skeleton width="50%" height="1.5rem" />
        </div>
      </div>
    ))}
  </div>
);
