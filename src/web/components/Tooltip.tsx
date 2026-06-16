import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show && ref.current && tooltipRef.current) {
      const rect = ref.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      let x = 0;
      let y = 0;

      switch (position) {
        case 'top':
          x = rect.left + rect.width / 2 - tooltipRect.width / 2;
          y = rect.top - tooltipRect.height - 8;
          break;
        case 'bottom':
          x = rect.left + rect.width / 2 - tooltipRect.width / 2;
          y = rect.bottom + 8;
          break;
        case 'left':
          x = rect.left - tooltipRect.width - 8;
          y = rect.top + rect.height / 2 - tooltipRect.height / 2;
          break;
        case 'right':
          x = rect.right + 8;
          y = rect.top + rect.height / 2 - tooltipRect.height / 2;
          break;
      }

      setCoords({ x, y });
    }
  }, [show, position]);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      className="inline-block"
    >
      {children}
      {show && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] px-2 py-1 text-xs font-medium text-white bg-slate-900 dark:bg-slate-700 rounded-md shadow-lg whitespace-nowrap animate-fade-in pointer-events-none"
          style={{
            left: coords.x,
            top: coords.y,
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
