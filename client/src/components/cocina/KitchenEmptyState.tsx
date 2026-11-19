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
    <div className={`bg-slate-900/60 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center space-y-3 ${className}`}>
      <div className="w-16 h-16 bg-slate-800 text-amber-400 text-3xl rounded-full flex items-center justify-center mx-auto border border-slate-700 shadow-inner">
        👨‍🍳
      </div>
      <h3 className="text-lg font-bold text-slate-100">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
    </div>
  );
};

export default KitchenEmptyState;
