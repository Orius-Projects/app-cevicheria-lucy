import React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionText,
  onAction,
  className = ''
}) => {
  return (
    <div
      role="region"
      aria-label={title}
      className={`bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-xs ${className}`}
    >
      <div className="w-16 h-16 bg-brand-50 text-brand-700 rounded-full flex items-center justify-center mx-auto border border-brand-200 shadow-xs">
        {icon ? (
          icon
        ) : (
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
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-base sm:text-lg font-semibold text-slate-800">{title}</h3>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actionText && onAction && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center justify-center px-4 py-2 bg-brand-500 hover:bg-brand-400 text-brand-950 font-semibold text-sm rounded-xl min-h-[44px] shadow-xs transition-colors"
          >
            {actionText}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
