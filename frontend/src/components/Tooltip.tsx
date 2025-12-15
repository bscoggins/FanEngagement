import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  autoPlacement,
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
  type Placement,
} from '@floating-ui/react';
import './Tooltip.css';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: TooltipPlacement;
  delay?: number;
  className?: string;
  maxWidth?: number | string;
  id?: string;
}

const placementMap: Record<TooltipPlacement, Placement> = {
  top: 'top',
  bottom: 'bottom',
  left: 'left',
  right: 'right',
  auto: 'top',
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  delay = 300,
  className,
  maxWidth,
  id,
}) => {
  const [open, setOpen] = useState(false);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = id ?? useId();

  const middleware = useMemo(() => {
    const base = [offset(8), shift({ padding: 8 })];
    if (placement === 'auto') {
      base.push(autoPlacement({ alignment: 'center' }));
    } else {
      base.push(flip({ fallbackAxisSideDirection: 'start' }));
    }
    return base;
  }, [placement]);

  const setOpenWithDelay = useCallback(
    (nextOpen: boolean) => {
      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }

      if (nextOpen) {
        openTimeoutRef.current = setTimeout(() => setOpen(true), delay);
      } else {
        closeTimeoutRef.current = setTimeout(() => setOpen(false), 60);
      }
    },
    [delay]
  );

  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) {
        clearTimeout(openTimeoutRef.current);
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const { refs, floatingStyles, context, placement: computedPlacement } = useFloating({
    placement: placementMap[placement],
    open,
    onOpenChange: setOpenWithDelay,
    middleware,
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, { move: false });
  const focus = useFocus(context);
  const dismiss = useDismiss(context, { escapeKey: true });
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);
  const floatingProps = getFloatingProps();

  const child = React.Children.only(children);
  const describedBy = open
    ? [child.props['aria-describedby'], tooltipId].filter(Boolean).join(' ')
    : child.props['aria-describedby'];

  return (
    <>
      {React.cloneElement(
        child,
        getReferenceProps({
          ref: refs.setReference,
          'aria-describedby': describedBy || undefined,
        })
      )}
      <FloatingPortal>
        {open && (
          <div
            {...floatingProps}
            id={tooltipId}
            ref={refs.setFloating}
            style={{ ...floatingProps.style, ...floatingStyles, maxWidth }}
            className={`tooltip ${className ?? ''} ${floatingProps.className ?? ''}`.trim()}
            data-placement={computedPlacement}
            data-open={open}
          >
            {content}
          </div>
        )}
      </FloatingPortal>
    </>
  );
};
