import React, { useId } from 'react';
import './FormControls.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const {
    label,
    helperText,
    error,
    leftIcon,
    rightIcon,
    className = '',
    id: providedId,
    ...rest
  } = props;

  const generatedId = useId();
  const id = providedId ?? generatedId;
  const hasError = Boolean(error);
  const helperId = helperText ? `${id}-helper` : undefined;
  const errorId = hasError ? `${id}-error` : undefined;
  const ariaDescribedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;

  const controlClassName = [
    'form-control',
    leftIcon && 'form-control--with-left-icon',
    rightIcon && 'form-control--with-right-icon',
    hasError && 'form-control--error',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="form-field">
      {label && (
        <label className="form-field__label" htmlFor={id}>
          {label}
          {props.required && (
            <span className="form-field__required" aria-label="required">
              *
            </span>
          )}
        </label>
      )}

      <div className="form-field__control">
        {leftIcon && (
          <span className="form-field__icon form-field__icon--left" aria-hidden="true">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={id}
          className={controlClassName}
          aria-invalid={hasError}
          aria-describedby={ariaDescribedBy}
          {...rest}
        />

        {rightIcon && (
          <span className="form-field__icon form-field__icon--right" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </div>

      <div className="form-field__messages">
        {helperText && (
          <div id={helperId} className="form-field__helper">
            {helperText}
          </div>
        )}

        {hasError && (
          <div id={errorId} className="form-field__error" role="alert">
            <span className="form-field__error-icon" aria-hidden="true">
              !
            </span>
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
});

Input.displayName = 'Input';
