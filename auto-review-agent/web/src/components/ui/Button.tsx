import React, { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  isLoading?: boolean;
  className?: string; // Explicitly add it
}

export const Button: React.FC<ButtonProps> = (props) => {
  const {
    variant = 'primary',
    size = 'md',
    children,
    className = '',
    isLoading,
    ...rest
  } = props;
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    primary: 'border border-white/60 bg-[linear-gradient(135deg,#ebb1ff_0%,#ffc6e9_52%,#d1f2ff_100%)] text-[#4a3d5b] shadow-[0_12px_30px_rgba(171,131,208,0.22)] hover:brightness-[1.03] focus:ring-[#8d69b3]/40',
    secondary: 'border border-white/55 bg-white/42 text-[#5d4e70] hover:bg-white/62 focus:ring-[#8d69b3]/30',
    outline: 'border border-white/55 bg-white/24 text-[#5d4e70] hover:bg-white/50 focus:ring-[#8d69b3]/30',
    danger: 'border border-[#f0b7c7] bg-[linear-gradient(135deg,#f6b7ca_0%,#ffd2dd_100%)] text-[#84455b] hover:brightness-[1.03] focus:ring-[#9a5b72]/35',
    ghost: 'bg-transparent text-[#5d4e70] hover:bg-white/35 focus:ring-[#8d69b3]/25',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || rest.disabled}
      {...rest}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
}
