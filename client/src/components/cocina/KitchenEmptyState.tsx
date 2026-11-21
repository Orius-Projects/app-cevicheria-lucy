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
    <div className={`bg-white border-2 border-dashed border-brand-200 rounded-2xl p-8 sm:p-12 text-center space-y-3 shadow-xs ${className}`}>
      <div className="w-16 h-16 bg-brand-50 text-brand-700 rounded-full flex items-center justify-center mx-auto border border-brand-200 shadow-xs">
        <svg
          className="w-8 h-8 text-brand-700"
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
      <h3 className="text-lg font-medium text-slate-800">{title}</h3>
      {description && (
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};

export default KitchenEmptyState;
