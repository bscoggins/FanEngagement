import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  autoPlacement,
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingList,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
  type Placement,
} from '@floating-ui/react';
import './Dropdown.css';

export type DropdownPlacement = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'auto';

export interface DropdownItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  divider?: boolean;
  onSelect?: () => void;
  role?: 'menuitem' | 'menuitemradio' | 'menuitemcheckbox';
}

interface DropdownTriggerRenderProps {
  ref: (node: HTMLElement | null) => void;
  open: boolean;
  ariaControls: string;
  getReferenceProps: <T extends React.HTMLProps<HTMLElement>>(userProps?: T) => T;
}

interface DropdownItemRenderState {
  ref: (node: HTMLElement | null) => void;
  active: boolean;
  focused: boolean;
  close: () => void;
  getItemProps: <T extends React.HTMLProps<HTMLElement>>(userProps?: T) => T;
  index: number;
}

interface DropdownProps {
  label?: string;
  triggerLabel?: string;
  triggerIcon?: React.ReactNode;
  renderTrigger?: (props: DropdownTriggerRenderProps) => React.ReactNode;
  items?: DropdownItem[];
  renderItem?: (item: DropdownItem, state: DropdownItemRenderState) => React.ReactNode;
  children?: React.ReactNode;
  placement?: DropdownPlacement;
  className?: string;
  menuClassName?: string;
  testId?: string;
  selectedId?: string;
  closeOnSelect?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect?: (item: DropdownItem) => void;
}

const placementMap: Record<DropdownPlacement, Placement> = {
  'bottom-left': 'bottom-start',
  'bottom-right': 'bottom-end',
  'top-left': 'top-start',
  'top-right': 'top-end',
  auto: 'bottom-start',
};

const mergeRefs = <T extends HTMLElement>(
  ...refs: Array<React.Ref<T> | undefined>
) => {
  return (node: T | null) => {
    refs.forEach(ref => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(node);
      } else {
        (ref as React.MutableRefObject<T | null>).current = node;
      }
    });
  };
};

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  triggerLabel = 'Open menu',
  triggerIcon,
  renderTrigger,
  items,
  renderItem,
  children,
  placement = 'bottom-left',
  className,
  menuClassName,
  testId,
  selectedId,
  closeOnSelect = true,
  onOpenChange,
  onSelect,
}) => {
  const MENU_OFFSET = 8;
  const MENU_SHIFT_PADDING = 8;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const listRef = useRef<Array<HTMLElement | null>>([]);

  const focusableItems = useMemo(
    () => (items ?? []).filter(item => !item.divider && !item.disabled),
    [items]
  );

  // Ensure listRef length matches focusable items
  useEffect(() => {
    listRef.current.length = focusableItems.length;
  }, [focusableItems.length]);

  const selectedIndex = useMemo(() => {
    if (!selectedId) return null;
    return focusableItems.findIndex(item => item.id === selectedId);
  }, [focusableItems, selectedId]);

  const middleware = useMemo(() => {
    const base = [offset(MENU_OFFSET), shift({ padding: MENU_SHIFT_PADDING })];
    if (placement === 'auto') {
      base.push(autoPlacement({ alignment: 'start' }));
    } else {
      base.push(flip({ fallbackAxisSideDirection: 'start' }));
    }
    return base;
  }, [placement]);

  const { refs, floatingStyles, context, placement: computedPlacement } = useFloating({
    placement: placementMap[placement],
    open,
    onOpenChange: nextOpen => {
      setOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    whileElementsMounted: autoUpdate,
    middleware,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context, {
    outsidePressEvent: 'mousedown',
  });
  const role = useRole(context, { role: 'menu' });
  const listNavigation = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    loop: true,
    selectedIndex: selectedIndex ?? undefined,
    focusItemOnOpen: focusableItems.length > 0,
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    click,
    dismiss,
    role,
    listNavigation,
  ]);

  useEffect(() => {
    if (open && selectedIndex !== null && selectedIndex >= 0) {
      setActiveIndex(selectedIndex);
    }
    if (!open) {
      setActiveIndex(null);
    }
  }, [open, selectedIndex]);

  const menuId = useMemo(() => (testId ? `${testId}-menu` : 'dropdown-menu'), [testId]);

  const selectItem = (item: DropdownItem) => {
    if (item.disabled) return;
    item.onSelect?.();
    onSelect?.(item);
    if (closeOnSelect) {
      setOpen(false);
    }
  };

  const getFocusableIndex = (itemId: string) => {
    return focusableItems.findIndex(item => item.id === itemId);
  };

  const handleTriggerKeyDown: React.KeyboardEventHandler<HTMLElement> = event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);

      if (focusableItems.length === 0) {
        return;
      }

      const targetIndex =
        selectedIndex !== null && selectedIndex >= 0
          ? selectedIndex
          : event.key === 'ArrowDown'
            ? 0
            : focusableItems.length - 1;

      setActiveIndex(Math.max(0, Math.min(focusableItems.length - 1, targetIndex)));
    }
  };

  const getReferencePropsWithKeydown = <T extends React.HTMLProps<HTMLElement>>(userProps?: T): T => {
    return getReferenceProps({
      ...userProps,
      ref: mergeRefs(refs.setReference, userProps?.ref as React.Ref<HTMLElement> | undefined),
      onKeyDown: (event) => {
        userProps?.onKeyDown?.(event);
        if (!event.defaultPrevented) {
          handleTriggerKeyDown(event);
        }
      },
    } as T);
  };

  const getItemInteractionProps = <T extends React.HTMLProps<HTMLElement>>(
    item: DropdownItem,
    userProps?: T
  ): T => {
    const focusIndex = getFocusableIndex(item.id);

    if (focusIndex === -1) {
      return {
        ...userProps,
        role: item.role ?? 'menuitem',
        tabIndex: -1,
        'aria-disabled': item.disabled || undefined,
      } as T;
    }

    const handleClick: React.MouseEventHandler<HTMLElement> = event => {
      userProps?.onClick?.(event);
      if (!event.defaultPrevented) {
        selectItem(item);
      }
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLElement> = event => {
      userProps?.onKeyDown?.(event);
      if (!event.defaultPrevented && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        selectItem(item);
      }
    };

    return getItemProps({
      ...userProps,
      role: item.role ?? 'menuitem',
      tabIndex: activeIndex === focusIndex ? 0 : -1,
      'aria-disabled': item.disabled || undefined,
      ref: mergeRefs(
        (node: HTMLElement | null) => {
          listRef.current[focusIndex] = node;
        },
        userProps?.ref as React.Ref<HTMLElement> | undefined
      ),
      onClick: handleClick,
      onKeyDown: handleKeyDown,
    } as T);
  };

  const referenceProps = getReferencePropsWithKeydown({
    ref: refs.setReference,
    'aria-controls': menuId,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
  });

  const rawFloatingProps = getFloatingProps({
    role: 'menu',
    id: menuId,
    'aria-label': label,
  }) as Record<string, unknown>;
  const { ['aria-labelledby']: floatingAriaLabelledby, ...floatingMenuProps } = rawFloatingProps;
  const ariaAttributes = label
    ? { 'aria-label': label }
    : { 'aria-labelledby': floatingAriaLabelledby as string | undefined };

  const defaultTrigger = (
    <button
      type="button"
      className="dropdown-trigger"
      {...referenceProps}
    >
      {triggerIcon && <span className="dropdown-trigger-icon" aria-hidden="true">{triggerIcon}</span>}
      <span className="dropdown-trigger-label">{triggerLabel}</span>
      <span className="dropdown-trigger-caret" aria-hidden="true">▾</span>
    </button>
  );

  const defaultItemRenderer = (item: DropdownItem, focusIndex: number) => {
    const isActive = item.id === selectedId;
    const isFocused = activeIndex === focusIndex;

    return (
      <li key={item.id} role="none">
        <button
          type="button"
          className={`dropdown-item ${isActive ? 'dropdown-item--active' : ''} ${item.disabled ? 'dropdown-item--disabled' : ''}`}
          data-focused={isFocused || undefined}
          disabled={item.disabled}
          {...getItemInteractionProps(item, {
            'aria-checked': item.role === 'menuitemradio' ? isActive : undefined,
          })}
        >
          {item.icon && (
            <span className="dropdown-item-icon" aria-hidden="true">
              {item.icon}
            </span>
          )}
          <span className="dropdown-item-content">
            <span className="dropdown-item-label">{item.label}</span>
            {item.description && (
              <span className="dropdown-item-description">{item.description}</span>
            )}
          </span>
          {isActive && <span className="dropdown-item-check" aria-hidden="true">✓</span>}
        </button>
      </li>
    );
  };

  return (
    <div className={`dropdown ${className ?? ''}`} data-testid={testId}>
      {renderTrigger ? (
        renderTrigger({
          ref: refs.setReference,
          open,
          ariaControls: menuId,
          getReferenceProps: getReferencePropsWithKeydown,
        })
      ) : (
        defaultTrigger
      )}

      {open && (
        <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
          <FloatingList elementsRef={listRef} labels={focusableItems.map(item => String(item.label))}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className={`dropdown-menu ${menuClassName ?? ''}`}
              data-open={open}
              data-placement={computedPlacement}
              data-testid={testId ? `${testId}-menu` : undefined}
              {...floatingMenuProps}
              {...ariaAttributes}
            >
              {items ? (
                <ul className="dropdown-list" role="none">
                  {items.map((item, index) => {
                    if (item.divider) {
                      return <li key={`${item.id}-divider`} className="dropdown-divider" role="separator" />;
                    }

                    const focusIndex = getFocusableIndex(item.id);

                    if (renderItem) {
                      // Only track focusable options in the list navigation ref set
                      const listNavigationRef =
                        focusIndex >= 0
                          ? (node: HTMLElement | null) => {
                              listRef.current[focusIndex] = node;
                            }
                          : undefined;

                      return renderItem(item, {
                        ref: listNavigationRef,
                        active: item.id === selectedId,
                        focused: focusIndex >= 0 && focusIndex === activeIndex,
                        close: () => setOpen(false),
                        getItemProps: (userProps) => getItemInteractionProps(item, userProps),
                        index,
                      });
                    }

                    return defaultItemRenderer(item, focusIndex);
                  })}
                </ul>
              ) : (
                <div className="dropdown-custom-content">
                  {children}
                </div>
              )}
            </div>
          </FloatingList>
        </FloatingFocusManager>
      )}
    </div>
  );
};
