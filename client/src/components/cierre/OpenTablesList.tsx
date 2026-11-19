import React, { useState } from 'react';
import { TableWithSession } from '@cevicheria/shared';
import { formatLimaTime } from '../../utils/datetime';

interface OpenTablesListProps {
  tables: (TableWithSession & { openedAt?: string | Date })[];
  onCloseTable: (table: TableWithSession) => Promise<void>;
  disabled?: boolean;
}

export const OpenTablesList: React.FC<OpenTablesListProps> = ({
  tables,
  onCloseTable,
  disabled = false
}) => {
  const [closingId, setClosingId] = useState<string | null>(null);
  const [tableError, setTableError] = useState<{
    tableId: string;
    message: string;
  } | null>(null);

  if (tables.length === 0) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm text-slate-500">
        No hay mesas con sesión abierta
      </div>
    );
  }

  const handleClose = async (table: TableWithSession) => {
    if (!table.openSessionId) return;
    setClosingId(table.id);
    setTableError(null);
    try {
      await onCloseTable(table);
    } catch (err: any) {
      const code = err?.response?.data?.error?.code || err?.code;
      const msg =
        code === 'TABLE_HAS_ACTIVE_ORDERS'
          ? 'No se puede cerrar la mesa: existen pedidos activos en cocina o listos'
          : err?.response?.data?.error?.message ||
            err?.message ||
            'Error al cerrar la mesa';
      setTableError({ tableId: table.id, message: msg });
    } finally {
      setClosingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {tables.map((table) => {
        const isClosing = closingId === table.id;
        const hasError = tableError?.tableId === table.id;

        return (
          <div
            key={table.id}
            className={`p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              hasError
                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-800 text-sm">
                  {table.code}
                </span>
                {table.zone && (
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {table.zone}
                  </span>
                )}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                    table.state === 'POR_CERRAR'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-sky-100 text-sky-800 border border-sky-300'
                  }`}
                >
                  {table.state}
                </span>
                {table.openedAt && (
                  <span className="text-xs text-slate-500">
                    Apertura: {formatLimaTime(table.openedAt)}
                  </span>
                )}
              </div>

              {hasError && (
                <p
                  role="alert"
                  className="text-xs font-semibold text-rose-700 mt-1"
                >
                  {tableError.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleClose(table)}
                disabled={disabled || isClosing}
                className="min-h-[44px] px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg disabled:opacity-50 transition-colors"
              >
                {isClosing ? 'Cerrando...' : 'Cerrar mesa'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OpenTablesList;
