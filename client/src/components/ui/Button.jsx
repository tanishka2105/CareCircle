import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  className,
  isLoading = false,
  disabled = false,
  type = 'button',
  onClick,
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] tap-target';

  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-700/20 focus-visible:outline-emerald-600',
    secondary: 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 focus-visible:outline-slate-500',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-700/20 focus-visible:outline-rose-600',
    outline: 'border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 focus-visible:outline-emerald-500',
    ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 focus-visible:outline-emerald-500',
    elder: 'bg-emerald-600 hover:bg-emerald-700 text-white text-2xl font-bold py-6 px-8 rounded-2xl shadow-lg border-2 border-emerald-400 focus-visible:outline-emerald-500',
    sos: 'bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-2xl py-6 px-10 rounded-2xl shadow-xl border-4 border-rose-300 animate-pulse focus-visible:outline-rose-600',
  };

  const sizes = {
    sm: 'text-sm px-3 py-1.5 min-h-[44px]',
    md: 'text-base px-5 py-2.5 min-h-[48px]',
    lg: 'text-lg px-6 py-3 min-h-[54px]',
    elder: 'text-2xl px-8 py-5 min-h-[72px]',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center space-x-2">
          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
});

Button.displayName = 'Button';
