import React, { useEffect, useRef, useMemo } from 'react';
import './KeyboardShortcutOverlay.css';

interface Shortcut {
  key: string;
  description: string;
  category?: string;
}

interface KeyboardShortcutOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts?: Shortcut[];
}

export const KeyboardShortcutOverlay: React.FC<KeyboardShortcutOverlayProps> = ({
  isOpen,
  onClose,
  shortcuts,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Platform detection for displaying correct modifier key
  const isMac = useMemo(() => {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    if (nav.userAgentData?.platform) {
      return nav.userAgentData.platform.toUpperCase().includes('MAC');
    }
    if (navigator.platform) {
      return navigator.platform.toUpperCase().includes('MAC');
    }
    return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  }, []);

  const modifierKey = isMac ? '⌘' : 'Ctrl';

  // Default shortcuts if none provided
  const defaultShortcuts: Shortcut[] = useMemo(() => [
    { key: '?', description: 'Show keyboard shortcuts', category: 'General' },
    { key: `${modifierKey}+K`, description: 'Focus global search', category: 'General' },
    { key: 'Escape', description: 'Close overlay or dialog', category: 'General' },
    { key: '↑ ↓', description: 'Navigate search results', category: 'Search' },
    { key: 'Enter', description: 'Select result', category: 'Search' },
    { key: `${modifierKey}+1-6`, description: 'Navigate org admin pages (when applicable)', category: 'Navigation' },
  ], [modifierKey]);

  const displayShortcuts = shortcuts || defaultShortcuts;

  // Group shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, Shortcut[]> = {};
    displayShortcuts.forEach(shortcut => {
      const category = shortcut.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(shortcut);
    });
    return groups;
  }, [displayShortcuts]);

  // Focus close button when opened
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      const timeout = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !overlayRef.current) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const overlay = overlayRef.current;
      if (!overlay) return;

      const focusableElements = overlay.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const focusableArray = Array.from(focusableElements);

      if (focusableArray.length === 0) return;

      const firstElement = focusableArray[0];
      const lastElement = focusableArray[focusableArray.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
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
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="keyboard-shortcut-overlay-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={overlayRef}
        className="keyboard-shortcut-overlay-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-shortcuts-title"
      >
        <div className="keyboard-shortcut-overlay-header">
          <h2 id="keyboard-shortcuts-title" className="keyboard-shortcut-overlay-title">
            Keyboard Shortcuts
          </h2>
          <button
            ref={closeButtonRef}
            className="keyboard-shortcut-overlay-close"
            onClick={onClose}
            aria-label="Close keyboard shortcuts overlay"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="keyboard-shortcut-overlay-body">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <div key={category} className="keyboard-shortcut-category">
              <h3 className="keyboard-shortcut-category-title">{category}</h3>
              <div className="keyboard-shortcut-list">
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className="keyboard-shortcut-item">
                    <div className="keyboard-shortcut-key">
                      {shortcut.key.split('+').map((part, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="keyboard-shortcut-plus">+</span>}
                          <kbd className="keyboard-shortcut-kbd">{part.trim()}</kbd>
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="keyboard-shortcut-description">{shortcut.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="keyboard-shortcut-overlay-footer">
          <p>Press <kbd>Escape</kbd> or <kbd>?</kbd> to close</p>
        </div>
      </div>
    </div>
  );
};
