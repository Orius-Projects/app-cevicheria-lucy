import React from 'react';
import { CancellationRow } from '@cevicheria/shared';

interface CancellationsTableProps {
  cancellations: CancellationRow[];
}

export const CancellationsTable: React.FC<CancellationsTableProps> = ({
  cancellations
}) => {
  if (cancellations.length === 0) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm text-slate-500">
        No se registran pedidos cancelados en este turno.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3">
              Pedido
            </th>
            <th scope="col" className="px-4 py-3">
              Motivo
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Cancelado por
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {cancellations.map((item, idx) => (
            <tr key={`${item.orderNumber}-${idx}`} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-bold text-slate-800">
                #{item.orderNumber}
              </td>
              <td className="px-4 py-3 text-slate-600 text-xs sm:text-sm">
                {item.reason}
              </td>
              <td className="px-4 py-3 text-right text-xs font-semibold text-slate-500">
                {item.cancelledBy}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CancellationsTable;
