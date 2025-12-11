import React from 'react';
import './Card.css';

export type CardVariant = 'default' | 'interactive' | 'bordered';
export type CardPadding = 'compact' | 'default' | 'spacious';
export type CardElevation = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps {
  /**
   * Visual variant of the card
   * @default 'default'
   */
  variant?: CardVariant;
  
  /**
   * Padding size of the card
   * @default 'default'
   */
  padding?: CardPadding;
  
  /**
   * Elevation level using shadow tokens
   * @default 'md'
   */
  elevation?: CardElevation;
  
  /**
   * Additional CSS class names
   */
  className?: string;
  
  /**
   * Additional inline styles
   */
  style?: React.CSSProperties;
  
  /**
   * Test ID for testing
   */
  testId?: string;
  
  /**
   * Card content
   */
  children?: React.ReactNode;
  
  /**
   * Click handler (only for interactive variant)
   */
  onClick?: () => void;
  
  /**
   * ARIA label (required for interactive cards without text)
   */
  'aria-label'?: string;
  
  /**
   * Tab index (for keyboard navigation on interactive cards)
   */
  tabIndex?: number;
  
  /**
   * Link href (makes card a link, alternative to onClick)
   */
  href?: string;
}

/**
 * Card component for grouping related content with elevation and hover states.
 * 
 * @example
 * ```tsx
 * <Card>Basic card content</Card>
 * <Card variant="interactive" onClick={handleClick}>Clickable card</Card>
 * <Card variant="bordered" padding="compact" elevation="sm">Compact bordered card</Card>
 * <Card variant="interactive" href="/details">Card as link</Card>
 * ```
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'default',
      elevation = 'md',
      className = '',
      style,
      testId,
      children,
      onClick,
      href,
      tabIndex,
      'aria-label': ariaLabel,
      ...rest
    },
    ref
  ) => {
    const isInteractive = variant === 'interactive' || onClick || href;
    
    const classes = [
      'card',
      `card--${variant}`,
      `card--padding-${padding}`,
      `card--elevation-${elevation}`,
      isInteractive && 'card--clickable',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const role = isInteractive && !href ? 'button' : undefined;
    const effectiveTabIndex = isInteractive ? (tabIndex !== undefined ? tabIndex : 0) : undefined;

    const content = (
      <div
        ref={ref}
        className={classes}
        style={style}
        data-testid={testId}
        role={role}
        {...(!href && {
          onClick,
          tabIndex: effectiveTabIndex,
          'aria-label': ariaLabel,
          onKeyDown:
            isInteractive && onClick
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                  }
                }
              : undefined,
        })}
        {...rest}
      >
        {children}
      </div>
    );

    // If href is provided, wrap in an anchor tag
    if (href) {
      return (
        <a href={href} className="card-link" style={{ textDecoration: 'none', color: 'inherit' }}>
          {content}
        </a>
      );
    }

    return content;
  }
);

Card.displayName = 'Card';
