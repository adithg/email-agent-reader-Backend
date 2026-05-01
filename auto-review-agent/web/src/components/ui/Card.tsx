import React, { type ReactNode, type HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle, ...props }) => {
  return (
    <div className={`candy-glass rounded-[24px] overflow-hidden ${className}`} {...props}>
      {(title || subtitle) && (
        <div className="border-b border-white/45 px-6 py-4">
          {title && <h3 className="text-lg font-semibold text-[#453857]">{title}</h3>}
          {subtitle && <p className="text-sm text-[#6f6281]">{subtitle}</p>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};
