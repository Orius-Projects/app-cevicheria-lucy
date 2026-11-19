import React, { useState } from 'react';

interface PublishMenuButtonProps {
  hasActiveItems: boolean;
  isPublished: boolean;
  isLoading: boolean;
  onPublish: () => Promise<void>;
  className?: string;
}

export const PublishMenuButton: React.FC<PublishMenuButtonProps> = ({
  hasActiveItems,
  isPublished,
  isLoading,
  onPublish,
  className = ''
}) => {
  const [localError, setLocalError] = useState<string | null>(null);

  const handleClick = async () => {
    setLocalError(null);
    if (!hasActiveItems) {
      setLocalError('El menú debe tener al menos un plato activo para poder ser publicado.');
      return;
    }

    try {
      await onPublish();
    } catch (err: any) {
      setLocalError(
        err.response?.data?.error?.message || err.message || 'Error al publicar el menú del día'
      );
    }
  };

  if (isPublished) {
    return (
      <div className="flex items-center space-x-2">
        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          ✓ Menú Publicado
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start sm:items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={`px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold min-h-[44px] shadow-sm flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 ${className}`}
      >
        <span>{isLoading ? 'Publicando...' : 'Publicar Menú del Día'}</span>
      </button>

      {localError && (
        <p data-testid="publish-error" className="text-xs text-rose-600 font-semibold mt-1">
          {localError}
        </p>
      )}
    </div>
  );
};

export default PublishMenuButton;
