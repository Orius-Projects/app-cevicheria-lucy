import React, { useEffect } from 'react';
import { useTablesStore, TableItem } from '../../stores/tablesStore';
import { TableStatus } from '@cevicheria/shared';

interface TableSelectorProps {
  onSelectTable?: (table: TableItem) => void;
  selectedTableId?: string | null;
}

const statusColors: Record<TableStatus, { bg: string; text: string; border: string; label: string }> = {
  LIBRE: {
    bg: 'bg-emerald-50 hover:bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    label: 'Libre'
  },
  OCUPADA: {
    bg: 'bg-amber-50 hover:bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-300',
    label: 'Ocupada'
  },
  POR_CERRAR: {
    bg: 'bg-rose-50 hover:bg-rose-100',
    text: 'text-rose-800',
    border: 'border-rose-300',
    label: 'Por Cerrar'
  }
};

export const TableSelector: React.FC<TableSelectorProps> = ({
  onSelectTable,
  selectedTableId
}) => {
  const { tables, isLoading, error, fetchTables, selectTable } = useTablesStore();

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const handleSelect = (table: TableItem) => {
    selectTable(table);
    if (onSelectTable) {
      onSelectTable(table);
    }
  };

  if (isLoading && tables.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mr-3"></div>
        Cargando estado de mesas...
      </div>
    );
  }

  if (error && tables.length === 0) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
        <p className="font-semibold">Error al cargar mesas:</p>
        <p>{error}</p>
        <button
          onClick={() => fetchTables()}
          className="mt-2 px-4 py-2 min-h-[44px] bg-red-600 text-white rounded font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Mesas</h2>
        <button
          onClick={() => fetchTables()}
          className="text-sm text-brand-600 hover:text-brand-700 min-h-[44px] px-3 py-2"
        >
          Refrescar
        </button>
      </div>

      {/* Grid de mesas táctiles (altura mínima >= 44px) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {tables.map((table) => {
          const config = statusColors[table.state] || statusColors.LIBRE;
          const isSelected = selectedTableId === table.id;

          return (
            <button
              key={table.id}
              onClick={() => handleSelect(table)}
              className={`min-h-[80px] p-4 rounded-xl border-2 transition-all flex flex-col justify-between items-start text-left shadow-sm ${config.bg} ${config.border} ${
                isSelected ? 'ring-2 ring-brand-600 ring-offset-2' : ''
              }`}
            >
              <div className="w-full flex justify-between items-center">
                <span className="text-xl font-black text-slate-900">{table.code}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${config.bg} ${config.text} border ${config.border}`}
                >
                  {config.label}
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-600 flex justify-between w-full">
                <span>{table.zone || 'Salón'}</span>
                {table.seats && <span>{table.seats} sillas</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TableSelector;
