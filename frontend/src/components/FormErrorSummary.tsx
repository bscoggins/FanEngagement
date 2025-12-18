import React, { useCallback, useEffect, useRef } from 'react';
import './FormControls.css';

export interface FormErrorItem {
  fieldId: string;
  message: string;
}

interface FormErrorSummaryProps {
  errors: FormErrorItem[];
  title?: string;
  focusOnRender?: boolean;
}

export const FormErrorSummary: React.FC<FormErrorSummaryProps> = ({
  errors,
  title = 'Please fix the following:',
  focusOnRender = true,
}) => {
  const summaryRef = useRef<HTMLDivElement>(null);

  const focusFieldById = useCallback((fieldId?: string) => {
    if (!fieldId) return;
    const target = document.getElementById(fieldId) as HTMLElement | null;
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  useEffect(() => {
    if (!focusOnRender || errors.length === 0) return;

    requestAnimationFrame(() => {
      if (summaryRef.current) {
        try {
          summaryRef.current.focus();
        } catch {
          // Some environments (or assistive tech) may block programmatic focus
        }
        summaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }, [errors, focusOnRender]);

  if (errors.length === 0) {
    return null;
  }

  const handleLinkClick = (fieldId: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    focusFieldById(fieldId);
  };

  return (
    <div
      ref={summaryRef}
      className="form-error-summary"
      role="alert"
      aria-live="assertive"
      tabIndex={-1}
      data-testid="form-error-summary"
    >
      <h3 className="form-error-summary__title">{title}</h3>
      <ul className="form-error-summary__list">
        {errors.map(({ fieldId, message }) => (
          <li key={fieldId}>
            <a
              className="form-error-summary__link"
              href={`#${fieldId}`}
              onClick={handleLinkClick(fieldId)}
            >
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};
