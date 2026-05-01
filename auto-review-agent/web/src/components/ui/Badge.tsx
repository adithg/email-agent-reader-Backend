import { type ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  const variants = {
    neutral: 'border border-white/60 bg-white/55 text-[#6a5a7e]',
    success: 'border border-[#dff8eb] bg-[#dff8eb]/88 text-[#4f8b66]',
    warning: 'border border-[#fff0d9] bg-[#fff0d9]/88 text-[#9a7b3b]',
    danger: 'border border-[#ffe0e0] bg-[#ffe0e0]/88 text-[#9a5b72]',
    info: 'border border-[#d1f2ff] bg-[#d1f2ff]/88 text-[#4f6d98]',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}
