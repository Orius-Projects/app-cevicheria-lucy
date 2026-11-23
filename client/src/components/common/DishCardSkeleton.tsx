import React from 'react';

interface DishCardSkeletonProps {
  count?: number;
  className?: string;
}

export const DishCardSkeleton: React.FC<DishCardSkeletonProps> = ({
  count = 1,
  className = ''
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`dish-skeleton-${index}`}
          aria-hidden="true"
          className={`bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4 animate-pulse ${className}`}
        >
          <div className="flex justify-between items-start gap-3">
            <div className="space-y-2 flex-1">
              <div className="w-16 h-4 bg-slate-200 rounded-md" />
              <div className="w-3/4 h-5 bg-slate-200 rounded-md" />
              <div className="w-1/2 h-3 bg-slate-100 rounded-md" />
            </div>
            <div className="w-16 h-6 bg-slate-200 rounded-lg shrink-0" />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="w-24 h-4 bg-slate-100 rounded-full" />
            <div className="w-20 h-9 bg-slate-200 rounded-xl" />
          </div>
        </div>
      ))}
    </>
  );
};

export default DishCardSkeleton;
