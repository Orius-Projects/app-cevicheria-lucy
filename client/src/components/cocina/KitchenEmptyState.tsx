import React from 'react';

interface KitchenEmptyStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export const KitchenEmptyState: React.FC<KitchenEmptyStateProps> = ({
  title = 'Sin pedidos pendientes',
  description = 'Todos los pedidos han sido preparados. Los nuevos pedidos aparecerán automáticamente.',
  className = ''
}) => {
  return (
    <div className={`bg-white border-2 border-dashed border-sky-200 rounded-2xl p-8 sm:p-12 text-center space-y-3 shadow-xs ${className}`}>
      <div className="w-16 h-16 bg-sky-50 text-brand-600 text-3xl rounded-full flex items-center justify-center mx-auto border border-sky-200 shadow-xs">
        👨‍🍳
      </div>
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
    </div>
  );
};

export default KitchenEmptyState;
