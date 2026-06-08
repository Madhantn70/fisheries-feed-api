import React from 'react';
import { cn } from '../../lib/utils';

export const Select = React.forwardRef(({ className, label, error, options, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          error && "border-red-500 focus:ring-red-500",
          className
        )}
        {...props}
      >
        <option value="" disabled className="bg-white dark:bg-gray-700 text-gray-500">Select an option</option>
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
});
Select.displayName = 'Select';
