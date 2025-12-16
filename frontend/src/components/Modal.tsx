import React, { useEffect, useRef } from 'react';
import './Modal.css';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  /**
   * @deprecated Use size prop instead
   */
  maxWidth?: string;
  /**
   * Modal size variant
   * @default 'md'
   */
  size?: ModalSize;
  /**
   * Whether clicking the backdrop closes the modal
   * @default true
   */
  closeOnBackdropClick?: boolean;
  /**
   * Optional header content (overrides title if provided)
   */
  header?: React.ReactNode;
  /**
   * Optional footer content
   */
  footer?: React.ReactNode;
  /**
   * Animation variant
   * @default 'slide'
   */
  animation?: 'slide' | 'fade';
}

/**
 * Modal component with focus trap and keyboard navigation
 * Implements WCAG 2.1 AA compliant modal dialog pattern
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  maxWidth,
  size = 'md',
  closeOnBackdropClick = true,
  header,
  footer,
  animation = 'slide',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle focus management when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element to restore focus later
      previouslyFocusedElement.current = document.activeElement as HTMLElement;

      // Focus the close button when modal opens
      focusTimeoutRef.current = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    } else {
      // Restore focus to the element that opened the modal
      if (previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
    }

    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Manage body scroll lock
  useEffect(() => {
    if (isOpen) {
      // Store original overflow value
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Restore on cleanup
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Focus trap: keep focus within the modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;

      // Get all focusable elements within the modal
      const focusableArray = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => el.getAttribute('aria-hidden') !== 'true');

      if (focusableArray.length === 0) return;

      const firstElement = focusableArray[0];
      const lastElement = focusableArray[focusableArray.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;
      const isFocusedInside = activeElement ? modal.contains(activeElement) : false;

      if (!isFocusedInside) {
        e.preventDefault();
        (e.shiftKey ? lastElement : firstElement).focus();
        return;
      }

      // Trap focus within modal
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={`modal-backdrop modal-backdrop--${animation}`}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={`modal-content modal-content--${size} modal-content--${animation}`}
        style={maxWidth ? { maxWidth } : undefined}
        role="dialog"
        aria-modal="true"
        // Only set aria-labelledby when using title prop (which creates element with id='modal-title')
        // Custom headers should provide their own id if they want aria-labelledby support
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header slot */}
        {header ? (
          <div className="modal-header">
            {header}
            <button
              ref={closeButtonRef}
              className="modal-close-button"
              onClick={onClose}
              aria-label="Close modal"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        ) : title ? (
          <div className="modal-header">
            <h2 id="modal-title" className="modal-title">
              {title}
            </h2>
            <button
              ref={closeButtonRef}
              className="modal-close-button"
              onClick={onClose}
              aria-label="Close modal"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        ) : (
          <button
            ref={closeButtonRef}
            className="modal-close-button modal-close-button-only"
            onClick={onClose}
            aria-label="Close modal"
          >
            <span aria-hidden="true">×</span>
          </button>
        )}

        {/* Body slot */}
        <div className="modal-body">{children}</div>

        {/* Footer slot */}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};
