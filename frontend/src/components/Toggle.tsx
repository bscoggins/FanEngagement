import React, { useId } from 'react';
import './Toggle.css';

export interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  helperText?: string;
  error?: string;
}

export const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>((props, ref) => {
  const {
    label,
    helperText,
    error,
    className = '',
    id: providedId,
    disabled,
    ...rest
  } = props;

  const generatedId = useId();
  const id = providedId ?? generatedId;
  const hasError = Boolean(error);
  const helperId = helperText ? `${id}-helper` : undefined;
  const errorId = hasError ? `${id}-error` : undefined;
  const ariaDescribedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;

  const wrapperClasses = [
    'toggle-switch',
    disabled && 'toggle-switch--disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="form-field">
      <label className={wrapperClasses} htmlFor={id}>
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="toggle-switch__input"
          aria-invalid={hasError}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
          {...rest}
        />
        <span className="toggle-switch__track">
          <span className="toggle-switch__thumb" />
        </span>
        {label && <span className="toggle-switch__label">{label}</span>}
      </label>
      
      <div className="form-field__messages">
        {helperText && !hasError && (
          <div id={helperId} className="form-field__helper">
            {helperText}
          </div>
        )}
        {hasError && (
          <div id={errorId} className="form-field__error" role="alert">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="form-field__error-icon"
              aria-hidden="true"
              width="16"
              height="16"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}
      </div>
    </div>
  );
});

Toggle.displayName = 'Toggle';
