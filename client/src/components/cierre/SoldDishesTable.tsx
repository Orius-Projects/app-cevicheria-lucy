import React from 'react';
import { SoldDishRow } from '@cevicheria/shared';
import { formatSoles } from '../../utils/money';

interface SoldDishesTableProps {
  soldDishes: SoldDishRow[];
}

export const SoldDishesTable: React.FC<SoldDishesTableProps> = ({ soldDishes }) => {
  if (soldDishes.length === 0) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm text-slate-500">
        No se registran platos vendidos en pedidos entregados de este turno.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3">
              Plato
            </th>
            <th scope="col" className="px-4 py-3 text-center">
              Cantidad
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Total informativo
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {soldDishes.map((dish) => (
            <tr key={dish.dishId} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-800">
                {dish.dishName}
              </td>
              <td className="px-4 py-3 text-center text-slate-600 font-semibold">
                {dish.quantity}
              </td>
              <td className="px-4 py-3 text-right font-bold text-slate-800">
                {formatSoles(dish.amountCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SoldDishesTable;
