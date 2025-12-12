import React, { useId } from 'react';
import './FormControls.css';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode;
  helperText?: string;
  error?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>((props, ref) => {
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
    'choice-field',
    hasError && 'choice-field--error',
    disabled && 'choice-field--disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={wrapperClasses} htmlFor={id}>
      <input
        ref={ref}
        id={id}
        type="radio"
        className="choice-input choice-input--radio"
        aria-invalid={hasError}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        {...rest}
      />
      <div className="choice-content">
        <span className="choice-label">
          {label}
          {props.required && (
            <span className="form-field__required" aria-label="required">
              {' '}*
            </span>
          )}
        </span>
        {helperText && (
          <span id={helperId} className="choice-helper">
            {helperText}
          </span>
        )}
        {hasError && (
          <span id={errorId} className="form-field__error" role="alert">
            <span className="form-field__error-icon" aria-hidden="true">
              !
            </span>
            <span>{error}</span>
          </span>
        )}
      </div>
    </label>
  );
});

Radio.displayName = 'Radio';
