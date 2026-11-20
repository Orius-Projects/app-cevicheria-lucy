import React, { useEffect, useState } from 'react';
import { useMenuAdminStore, getTodayLimaDate } from '../../stores/menuAdminStore';
import { AdminLayout } from '../../layouts/AdminLayout';
import { AvailabilityBadge } from '../../components/menu/AvailabilityBadge';
import { RationBadge } from '../../components/menu/RationBadge';
import { ReplenishRationsModal } from '../../components/menu/ReplenishRationsModal';
import { AdjustRationsModal } from '../../components/menu/AdjustRationsModal';
import { SoldOutModal } from '../../components/menu/SoldOutModal';
import { AdjustmentHistory } from '../../components/menu/AdjustmentHistory';
import { MenuItemDTO } from '@cevicheria/shared';
import { deriveDishStatus } from '../../utils/dishState';
import { Link } from 'react-router-dom';

export const RationAdjustmentsPage: React.FC = () => {
  const {
    selectedDate,
    setSelectedDate,
    menuDay,
    loading,
    error,
    loadDay,
    reactivate,
    clearError
  } = useMenuAdminStore();

  const [activeModal, setActiveModal] = useState<
    'replenish' | 'adjust' | 'soldOut' | 'history' | null
  >(null);
  const [selectedItem, setSelectedItem] = useState<MenuItemDTO | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDay(selectedDate);
  }, [loadDay, selectedDate]);

  const handleOpenModal = (
    type: 'replenish' | 'adjust' | 'soldOut' | 'history',
    item: MenuItemDTO
  ) => {
    setSelectedItem(item);
    setActiveModal(type);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setSelectedItem(null);
  };

  const handleReactivate = async (item: MenuItemDTO) => {
    try {
      await reactivate(item.id, 'Insumo reabastecido por encargado');
      setSuccessMessage(`Plato "${item.dishName}" reactivado.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      // Manejado en store
    }
  };

  const items = menuDay?.items || [];
  const filteredItems = items.filter(
    (item) =>
      item.dishName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sectionKey || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout maxWidth="max-w-6xl">
      <div className="space-y-4">
        {/* Feedback messages */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex justify-between items-center">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 font-bold ml-2">×</button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={clearError} className="text-rose-600 font-bold ml-2">×</button>
          </div>
        )}

        {/* Toolbar de Fecha y Búsqueda */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Fecha del Menú
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold min-h-[44px] bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {selectedDate === getTodayLimaDate() && (
              <span className="text-xs px-2.5 py-1 bg-brand-50 text-brand-700 font-bold rounded-lg border border-brand-200 mt-2 sm:mt-5">
                Hoy (Lima)
              </span>
            )}
          </div>

          <div className="w-full sm:w-auto">
            <input
              type="text"
              placeholder="Buscar plato en raciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-h-[44px] w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Estado del Menú del Día */}
        {!menuDay && !loading ? (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
            <div className="text-4xl">🥘</div>
            <h3 className="text-base font-bold text-slate-800">No hay menú registrado para el {selectedDate}</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Primero debes crear y configurar el menú en la pestaña de Menú del Día.
            </p>
            <Link
              to="/encargado/menu"
              className="inline-block mt-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold min-h-[44px] shadow-sm"
            >
              Ir a Menú del Día →
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
            El menú de este día no tiene platos agregados aún.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const derivedStatus = deriveDishStatus({
                active: item.active,
                manuallySoldOut: item.manuallySoldOut,
                hasRationsLimit: item.hasRationsLimit,
                remainingRations: item.remainingRations,
                lowStockThreshold: item.lowStockThreshold
              });

              return (
                <div
                  key={item.id}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{item.dishName}</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        {item.sectionKey}
                      </span>
                      <AvailabilityBadge status={derivedStatus} />
                      <RationBadge
                        hasRationsLimit={item.hasRationsLimit}
                        remainingRations={item.remainingRations}
                        totalRations={item.totalRations}
                        showTotal={true}
                      />
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-500">
                      <span>Precio: <strong>S/ {(item.priceCents / 100).toFixed(2)}</strong></span>
                      {item.manuallySoldOut && (
                        <span className="text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Agotado manualmente por insumo: {item.soldOutReason || 'Falta insumo'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones de Control de Raciones */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {/* Botón Reponer */}
                    {item.hasRationsLimit && (
                      <button
                        type="button"
                        onClick={() => handleOpenModal('replenish', item)}
                        className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold min-h-[44px] flex items-center shadow-sm"
                      >
                        + Reponer
                      </button>
                    )}

                    {/* Botón Ajustar Conteo */}
                    {item.hasRationsLimit && (
                      <button
                        type="button"
                        onClick={() => handleOpenModal('adjust', item)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold min-h-[44px] flex items-center shadow-sm"
                      >
                        Ajustar Conteo
                      </button>
                    )}

                    {/* Botón Agotar / Reactivar Insumo */}
                    {item.manuallySoldOut ? (
                      <button
                        type="button"
                        onClick={() => handleReactivate(item)}
                        className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold min-h-[44px] flex items-center shadow-sm"
                      >
                        Reactivar Insumo
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenModal('soldOut', item)}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold min-h-[44px] flex items-center shadow-sm"
                      >
                        Marcar Agotado
                      </button>
                    )}

                    {/* Botón Historial */}
                    {item.hasRationsLimit && (
                      <button
                        type="button"
                        onClick={() => handleOpenModal('history', item)}
                        className="px-3 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg text-xs font-medium min-h-[44px] flex items-center"
                        title="Ver auditoría de ajustes"
                      >
                        Historial
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modales */}
      {activeModal === 'replenish' && selectedItem && (
        <ReplenishRationsModal
          isOpen={true}
          onClose={handleCloseModal}
          menuItem={selectedItem}
          onSuccess={() => {
            setSuccessMessage(`Raciones repuestas para "${selectedItem.dishName}".`);
            setTimeout(() => setSuccessMessage(null), 3000);
            loadDay(selectedDate);
          }}
        />
      )}

      {activeModal === 'adjust' && selectedItem && (
        <AdjustRationsModal
          isOpen={true}
          onClose={handleCloseModal}
          menuItem={selectedItem}
          onSuccess={() => {
            setSuccessMessage(`Conteo ajustado para "${selectedItem.dishName}".`);
            setTimeout(() => setSuccessMessage(null), 3000);
            loadDay(selectedDate);
          }}
        />
      )}

      {activeModal === 'soldOut' && selectedItem && (
        <SoldOutModal
          isOpen={true}
          onClose={handleCloseModal}
          menuItem={selectedItem}
          onSuccess={() => {
            setSuccessMessage(`Plato "${selectedItem.dishName}" marcado como agotado.`);
            setTimeout(() => setSuccessMessage(null), 3000);
            loadDay(selectedDate);
          }}
        />
      )}

      {activeModal === 'history' && selectedItem && (
        <AdjustmentHistory
          isOpen={true}
          onClose={handleCloseModal}
          menuItem={selectedItem}
        />
      )}
    </AdminLayout>
  );
};

export default RationAdjustmentsPage;
