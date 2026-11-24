import React from 'react';

interface KitchenEmptyStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export const KitchenEmptyState: React.FC<KitchenEmptyStateProps> = ({
  title = 'Sin pedidos pendientes',
  description,
  className = ''
}) => {
  return (
    <div className={`bg-white dark:bg-marine-900 border-2 border-dashed border-brand-200 dark:border-marine-700 rounded-2xl p-8 sm:p-12 text-center space-y-3 shadow-xs transition-colors ${className}`}>
      <div className="w-16 h-16 bg-brand-50 dark:bg-marine-950 text-brand-700 dark:text-brand-300 rounded-full flex items-center justify-center mx-auto border border-brand-200 dark:border-marine-700 shadow-xs">
        <svg
          className="w-8 h-8 text-brand-600 dark:text-brand-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
          <line x1="6" y1="17" x2="18" y2="17" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
      {description && (
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};

export default KitchenEmptyState;
