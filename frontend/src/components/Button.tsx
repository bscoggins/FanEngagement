import React from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type IconPosition = 'left' | 'right';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual variant of the button
   * @default 'primary'
   */
  variant?: ButtonVariant;
  
  /**
   * Size of the button
   * @default 'md'
   */
  size?: ButtonSize;
  
  /**
   * Icon to display (can be emoji, SVG, or component)
   */
  icon?: React.ReactNode;
  
  /**
   * Position of the icon relative to text
   * @default 'left'
   */
  iconPosition?: IconPosition;
  
  /**
   * If true, only the icon is shown (no text)
   */
  iconOnly?: boolean;
  
  /**
   * If true, shows loading spinner and disables button
   */
  isLoading?: boolean;
  
  /**
   * Additional CSS class names
   */
  className?: string;
  
  /**
   * Test ID for testing
   */
  testId?: string;
  
  /**
   * Makes button full width
   */
  fullWidth?: boolean;
  
  /**
   * Button content (text)
   */
  children?: React.ReactNode;
}

/**
 * Button component with multiple variants, sizes, states, and icon support.
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="md">Click me</Button>
 * <Button variant="outline" icon="→" iconPosition="right">Next</Button>
 * <Button variant="danger" isLoading>Deleting...</Button>
 * <Button icon="🔍" iconOnly aria-label="Search" />
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      iconOnly = false,
      isLoading = false,
      className = '',
      testId,
      fullWidth = false,
      disabled = false,
      type = 'button',
      children,
      ...rest
    },
    ref
  ) => {
    const classes = [
      'btn',
      `btn--${variant}`,
      `btn--${size}`,
      iconOnly && 'btn--icon-only',
      fullWidth && 'btn--full-width',
      isLoading && 'btn--loading',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const isDisabled = disabled || isLoading;

    // Loading spinner icon
    const loadingSpinner = (
      <span className="btn__spinner" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle
            cx="8"
            cy="8"
            r="6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="28"
            strokeDashoffset="28"
          />
        </svg>
      </span>
    );

    const iconElement = icon && !isLoading && (
      <span className="btn__icon" aria-hidden="true">
        {icon}
      </span>
    );

    const content = iconOnly ? (
      <>
        {isLoading ? loadingSpinner : iconElement}
        {children && <span className="visually-hidden">{children}</span>}
      </>
    ) : (
      <>
        {isLoading && loadingSpinner}
        {!isLoading && iconPosition === 'left' && iconElement}
        {children && <span className="btn__text">{children}</span>}
        {!isLoading && iconPosition === 'right' && iconElement}
      </>
    );

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={isDisabled}
        data-testid={testId}
        aria-busy={isLoading}
        {...rest}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';
