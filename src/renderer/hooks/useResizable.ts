import { useCallback, useRef, useEffect } from 'react';

type Direction = 'horizontal' | 'vertical';

interface UseResizableOptions {
  direction: Direction;
  /** Current size in px */
  size: number;
  /** Min size in px */
  minSize: number;
  /** Max size in px */
  maxSize: number;
  /** Whether dragging from the "end" side (right edge of left panel, or bottom edge of top panel) */
  reverse?: boolean;
  /** Called continuously during drag */
  onResize: (newSize: number) => void;
}

/**
 * Hook that provides mouse-drag resizing for panels.
 * Returns a `handleMouseDown` to attach to the drag handle element.
 */
export function useResizable({
  direction,
  size,
  minSize,
  maxSize,
  reverse = false,
  onResize,
}: UseResizableOptions) {
  const draggingRef = useRef(false);
  const startPosRef = useRef(0);
  const startSizeRef = useRef(0);
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();

      const currentPos =
        direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPosRef.current;
      const newSize = reverse
        ? startSizeRef.current + delta
        : startSizeRef.current - delta;

      const clamped = Math.max(minSize, Math.min(maxSize, newSize));
      onResizeRef.current(clamped);
    },
    [direction, minSize, maxSize, reverse]
  );

  const handleMouseUp = useCallback(() => {
    draggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    // Remove overlay that prevents iframe/xterm from stealing events
    const overlay = document.getElementById('resize-overlay');
    if (overlay) overlay.remove();
  }, []);

  useEffect(() => {
    // Always listen so we catch mouseup even if mouse leaves the handle
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      startPosRef.current =
        direction === 'horizontal' ? e.clientX : e.clientY;
      startSizeRef.current = size;
      document.body.style.cursor =
        direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';

      // Add a transparent overlay to prevent iframes/xterm from stealing mouse events
      const overlay = document.createElement('div');
      overlay.id = 'resize-overlay';
      overlay.style.cssText =
        'position:fixed;inset:0;z-index:9999;cursor:' +
        (direction === 'horizontal' ? 'col-resize' : 'row-resize');
      document.body.appendChild(overlay);
    },
    [direction, size]
  );

  return { handleMouseDown };
}
