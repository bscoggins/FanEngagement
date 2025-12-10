import React from 'react';
import './Badge.css';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md' | 'lg';
export type BadgeShape = 'rounded' | 'pill';

export interface BadgeProps {
  /**
   * Visual variant of the badge
   * @default 'default'
   */
  variant?: BadgeVariant;
  
  /**
   * Size of the badge
   * @default 'md'
   */
  size?: BadgeSize;
  
  /**
   * Shape of the badge
   * @default 'rounded'
   */
  shape?: BadgeShape;
  
  /**
   * Optional icon to display before the text
   */
  icon?: React.ReactNode;
  
  /**
   * Optional dot indicator before the text (mutually exclusive with icon)
   */
  dot?: boolean;
  
  /**
   * Additional CSS class names
   */
  className?: string;
  
  /**
   * Test ID for testing
   */
  testId?: string;
  
  /**
   * Badge content (text)
   */
  children?: React.ReactNode;
}

/**
 * Badge component for displaying status indicators and labels.
 * 
 * @example
 * ```tsx
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning" size="sm" icon="⚠️">Warning</Badge>
 * <Badge variant="error" dot>Error</Badge>
 * <Badge variant="info" shape="pill">New Feature</Badge>
 * ```
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      shape = 'rounded',
      icon,
      dot = false,
      className = '',
      testId,
      children,
    },
    ref
  ) => {
    const classes = [
      'badge',
      `badge--${variant}`,
      `badge--${size}`,
      `badge--${shape}`,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span
        ref={ref}
        className={classes}
        data-testid={testId}
      >
        {icon && <span className="badge__icon" aria-hidden="true">{icon}</span>}
        {!icon && dot && <span className="badge__dot" aria-hidden="true" />}
        {children && <span className="badge__text">{children}</span>}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
