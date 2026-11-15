import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Card = ({ children, className, hover = false, ...props }) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm transition-all duration-200',
          hover && 'hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-500/50',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
