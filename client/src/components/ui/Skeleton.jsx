import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={twMerge(
        clsx('animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700/60', className)
      )}
      {...props}
    />
  );
};
