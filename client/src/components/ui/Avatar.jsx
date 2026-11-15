import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Avatar = ({ name = 'User', src, size = 'md', className, isOnline = false }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  };

  const colors = [
    'bg-emerald-600 text-white',
    'bg-blue-600 text-white',
    'bg-amber-600 text-white',
    'bg-purple-600 text-white',
    'bg-teal-600 text-white',
    'bg-rose-600 text-white',
  ];
  const charCodeSum = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorClass = colors[charCodeSum % colors.length];

  return (
    <div className="relative inline-block">
      {src ? (
        <img
          src={src}
          alt={name}
          className={twMerge(clsx('rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm', sizes[size], className))}
        />
      ) : (
        <div
          className={twMerge(
            clsx(
              'rounded-full flex items-center justify-center font-bold border-2 border-white dark:border-slate-800 shadow-sm select-none',
              sizes[size],
              colorClass,
              className
            )
          )}
        >
          {initials}
        </div>
      )}
      {isOnline && (
        <span
          className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
          title="Active now"
          aria-label="Active now"
        />
      )}
    </div>
  );
};
