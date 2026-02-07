import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

export function Tooltip({ text, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  if (!text) return <>{children}</>;

  const handleMouseEnter = (e: React.MouseEvent) => {
    setPos({
      x: e.clientX,
      y: e.clientY - 10,
    });
    setVisible(true);
  };

  return (
    <div
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: pos.x,
              top: pos.y,
              transform: 'translate(-50%, -100%)',
              zIndex: 9999,
            }}
            className="px-2.5 py-1.5 rounded-md bg-[#333] text-text-primary
                        text-xs whitespace-nowrap pointer-events-none shadow-lg
                        border border-border-light"
          >
            {text}
          </div>,
          document.body
        )}
    </div>
  );
}
