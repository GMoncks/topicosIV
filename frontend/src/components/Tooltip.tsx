import React, { useState } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  align?: 'center' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  align = 'center',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!content) {
    return <>{children}</>;
  }

  let alignClasses = 'left-1/2 -translate-x-1/2';
  let arrowAlignClasses = 'left-1/2 -translate-x-1/2';

  if (align === 'left') {
    alignClasses = 'left-0';
    arrowAlignClasses = 'left-4';
  } else if (align === 'right') {
    alignClasses = 'right-0';
    arrowAlignClasses = 'right-4';
  }

  const positionClasses =
    position === 'top'
      ? `bottom-full ${alignClasses} mb-2.5`
      : `top-full ${alignClasses} mt-2.5`;

  const arrowClasses =
    position === 'top'
      ? `-bottom-1.5 ${arrowAlignClasses} border-r border-b border-brand-purple/40 bg-[#0b0f19]`
      : `-top-1.5 ${arrowAlignClasses} border-l border-t border-brand-purple/40 bg-[#0b0f19]`;

  const textContent = typeof content === 'string' ? content : undefined;

  return (
    <div
      className={`group/tooltip relative inline-flex w-full ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      title={textContent}
    >
      {children}

      {isVisible && (
        <div
          role="tooltip"
          className={`absolute ${positionClasses} z-50 pointer-events-none w-max max-w-[280px] sm:max-w-xs md:max-w-sm px-3.5 py-2.5 rounded-xl bg-[#0b0f19]/95 backdrop-blur-md text-xs font-normal text-gray-100 border border-brand-purple/40 shadow-[0_10px_25px_rgba(0,0,0,0.6)] leading-relaxed animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="flex items-start gap-2">
            <i className="fa-solid fa-circle-info text-brand-purpleLight text-xs mt-0.5 shrink-0" />
            <div className="text-left select-none break-words">{content}</div>
          </div>
          {/* Setinha direcional */}
          <div className={`absolute w-3 h-3 rotate-45 ${arrowClasses}`} />
        </div>
      )}
    </div>
  );
};
