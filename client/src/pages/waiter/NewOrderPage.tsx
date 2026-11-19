import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useShiftStore } from '../../stores/shiftStore';
import { useMenuPublicStore } from '../../stores/menuPublicStore';
import { useTablesStore } from '../../stores/tablesStore';
import { useOrderDraftStore } from '../../stores/orderDraftStore';
import { ordersApi, extractApiError } from '../../api/orders.api';
import { MenuSectionTabs } from '../../components/menu/MenuSectionTabs';
import { DishCard } from '../../components/menu/DishCard';
import { OrderCart } from '../../components/mozo/OrderCart';
import { OrderSummary } from '../../components/mozo/OrderSummary';
import { VariationSheet } from '../../components/mozo/VariationSheet';
import { OrderDTO, DishStatus, DishVariation } from '@cevicheria/shared';
import { TodayMenuItem } from '../../api/menu.api';

export const NewOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isOpen: isShiftOpen, fetchCurrentShift } = useShiftStore();
  const { todayMenu, loading: isMenuLoading, error: menuError, loadToday } = useMenuPublicStore();
  const { tables, fetchTables } = useTablesStore();

  const {
    tableId,
    tableCode,
    items,
    notes,
    clientRequestId,
    setTable,
    addItem,
    clearDraft,
    syncWithMenu
  } = useOrderDraftStore();

  const [activeSectionKey, setActiveSectionKey] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para modal de variaciones al agregar plato
  const [selectedDishForVariation, setSelectedDishForVariation] = useState<TodayMenuItem | null>(null);

  // Estados para modal de confirmación y envío
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderDTO | null>(null);

  // Selector de mesa móvil / dropdown
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);

  useEffect(() => {
    fetchCurrentShift();
    loadToday();
    fetchTables();
  }, [fetchCurrentShift, loadToday, fetchTables]);

  // Secciones del menú
  const sections = (todayMenu?.sections || []).map((sec, idx) => ({
    id: `sec_${sec.key}_${idx}`,
    key: sec.key,
    name: sec.name
  }));

  // Todos los ítems del menú
  const allMenuItems = (todayMenu?.sections || []).flatMap((sec) =>
    sec.items.map((it) => ({
      ...it,
      sectionKey: it.sectionKey || sec.key
    }))
  );

  const filteredItems = allMenuItems.filter((item) => {
    const matchesSection = activeSectionKey === 'ALL' || item.sectionKey === activeSectionKey;
    const desc = item.description ?? item.dish?.description ?? '';
    const matchesSearch =
      item.dishName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      desc.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSection && matchesSearch;
  });

  const handleSelectItem = (item: TodayMenuItem) => {
    const rawVariations = item.variations ?? item.dish?.variations ?? [];
    const activeVariations = rawVariations.filter(
      (v: DishVariation | { id: string; name: string; active?: boolean }) => v.active !== false
    );

    // Si tiene variaciones, abrir modal para seleccionarlas
    if (activeVariations.length > 0) {
      setSelectedDishForVariation(item);
    } else {
      // Agregar directamente con cantidad 1
      const res = addItem({
        dishId: item.dishId,
        dishName: item.dishName,
        priceCents: item.priceCents,
        quantity: 1,
        remainingRations: item.remainingRations
      });
      if (!res.success && res.reason) {
        setSubmissionError(res.reason);
      }
    }
  };

  const handleConfirmOrder = () => {
    setSubmissionError(null);

    if (!isShiftOpen) {
      setSubmissionError('No hay turno abierto. Pide al encargado que abra el turno.');
      return;
    }

    if (!todayMenu || menuError) {
      setSubmissionError(menuError || 'No hay menú publicado para el día de hoy.');
      return;
    }

    if (!tableId) {
      setIsTableModalOpen(true);
      return;
    }
    if (items.length === 0) return;
    setIsConfirmModalOpen(true);
  };

  const handleSendOrder = async () => {
    if (!isShiftOpen) {
      setSubmissionError('No hay turno abierto. Pide al encargado que abra el turno.');
      return;
    }

    if (!todayMenu || menuError) {
      setSubmissionError(menuError || 'No hay menú publicado para el día de hoy.');
      return;
    }

    if (!tableId || items.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setSubmissionError(null);

    const payload = {
      tableId,
      items: items.map((i) => ({
        dishId: i.dishId,
        quantity: i.quantity,
        variationIds: i.variationIds,
        notes: i.notes
      })),
      notes: notes.trim() || undefined,
      clientRequestId
    };

    try {
      const order = await ordersApi.create(payload);
      setCreatedOrder(order);
      clearDraft();
      setIsConfirmModalOpen(false);
    } catch (err: any) {
      const apiErr = extractApiError(err);

      // Si falla por falta de raciones o plato no disponible, sincronizar con el menú actualizado
      if (apiErr.code === 'DISH_UNAVAILABLE' || apiErr.code === 'RATION_UNAVAILABLE') {
        await loadToday();
        const freshDishes = new Map<string, { remainingRations?: number | null; status?: string }>();
        const freshMenu = useMenuPublicStore.getState().todayMenu;
        if (freshMenu) {
          for (const sec of freshMenu.sections) {
            for (const it of sec.items) {
              freshDishes.set(it.dishId, {
                remainingRations: it.remainingRations,
                status: it.status || (it.state as DishStatus)
              });
            }
          }
        }
        const { adjusted, removedCount } = syncWithMenu(freshDishes);
        if (adjusted || removedCount > 0) {
          setSubmissionError(
            `El plato solicitado ya no tiene raciones suficientes. Se ajustó el contenido de tu carrito (${apiErr.message}).`
          );
        } else {
          setSubmissionError(apiErr.message);
        }
      } else {
        setSubmissionError(apiErr.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex justify-between items-center shadow-sm sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <Link
            to="/mozo"
            className="text-xs px-3 py-2 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center border border-slate-200"
          >
            ← Salón
          </Link>
          <div>
            <h1 className="text-lg font-black text-slate-900">Nueva Comanda</h1>
            <p className="text-xs text-slate-500">
              {user?.displayName} • {tableCode ? `Mesa ${tableCode}` : 'Sin mesa asignada'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsTableModalOpen(true)}
            className="px-3.5 py-2 min-h-[44px] bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 rounded-xl text-xs font-bold flex items-center space-x-1.5"
          >
            <span>🏷️</span>
            <span>{tableCode ? `Mesa: ${tableCode}` : 'Elegir Mesa'}</span>
          </button>
        </div>
      </header>

      {/* Main Container: 2 columnas en Desktop (Carta a la izq, Carrito a la der) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Carta de Platos (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Alertas críticas */}
          {!isShiftOpen && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs">
              <strong>Turno cerrado:</strong> No se pueden registrar comandas hasta que el encargado abra el turno de atención.
            </div>
          )}

          {submissionError && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-800 text-xs font-medium" aria-live="assertive">
              {submissionError}
            </div>
          )}

          {menuError && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-800 text-xs">
              {menuError}
            </div>
          )}

          {/* Filtros de Secciones y Búsqueda */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <MenuSectionTabs
              sections={sections}
              activeSectionKey={activeSectionKey}
              onSelectSection={setActiveSectionKey}
              showAllOption={true}
            />

            <input
              type="text"
              placeholder="Buscar en carta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl text-sm min-h-[44px] w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Grid de Platos */}
          {isMenuLoading && allMenuItems.length === 0 ? (
            <div className="text-center py-16 text-slate-400">Cargando carta del día...</div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
              No hay platos disponibles en este momento para la sección seleccionada.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => (
                <DishCard
                  key={item.id}
                  item={item}
                  showAddButton={true}
                  onAdd={() => handleSelectItem(item)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Columna Derecha: Carrito / Comanda actual (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-20">
          <OrderCart
            onConfirmOrder={handleConfirmOrder}
            isSubmitting={isSubmitting}
          />
        </div>
      </main>

      {/* Modal para selección de Variaciones */}
      {selectedDishForVariation && (
        <VariationSheet
          isOpen={true}
          dishName={selectedDishForVariation.dishName}
          availableVariations={(selectedDishForVariation.variations || []).map((v) => ({
            id: v.id,
            name: v.name
          }))}
          selectedVariationIds={[]}
          onClose={() => setSelectedDishForVariation(null)}
          onSave={(selectedIds, selectedObjects) => {
            addItem({
              dishId: selectedDishForVariation.dishId,
              dishName: selectedDishForVariation.dishName,
              priceCents: selectedDishForVariation.priceCents,
              quantity: 1,
              variationIds: selectedIds,
              variations: selectedObjects,
              remainingRations: selectedDishForVariation.remainingRations
            });
            setSelectedDishForVariation(null);
          }}
        />
      )}

      {/* Modal Selector de Mesa */}
      {isTableModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Seleccionar Mesa para Comanda</h2>
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold min-h-[44px]"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {tables.map((t) => {
                const isCurrent = tableId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTable(t.id, t.code);
                      setIsTableModalOpen(false);
                    }}
                    className={`p-3.5 rounded-xl border text-left min-h-[56px] transition-all ${
                      isCurrent
                        ? 'border-brand-600 bg-brand-50 text-brand-900 font-black'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-base font-black">Mesa {t.code}</div>
                    <div className="text-[11px] text-slate-500">{t.state}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación y Resumen Pre-Envío */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Confirmar Envío a Cocina</h2>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold min-h-[44px]"
              >
                ×
              </button>
            </div>

            <OrderSummary
              tableCode={tableCode}
              items={items}
              notes={notes}
            />

            <p className="text-xs text-slate-500 italic">
              Al confirmar, los platos se enviarán de forma inmediata a la pantalla de cocina y se descontarán las raciones disponibles.
            </p>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 min-h-[44px]"
              >
                Volver a editar
              </button>
              <button
                type="button"
                onClick={handleSendOrder}
                disabled={isSubmitting || !isShiftOpen || !todayMenu}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-black min-h-[44px] shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Enviando comanda...' : '✓ Enviar a Cocina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Éxito al Crear Pedido */}
      {createdOrder && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 text-center shadow-2xl border border-slate-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 text-3xl rounded-full flex items-center justify-center mx-auto">
              ✓
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900">¡Comanda Enviada!</h2>
              <p className="text-base font-bold text-brand-700">Pedido #{createdOrder.orderNumber}</p>
              <p className="text-xs text-slate-500">Mesa {createdOrder.tableCode} • Estado ENVIADO</p>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              El pedido ha ingresado exitosamente a la cola de preparación en cocina.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCreatedOrder(null)}
                className="flex-1 py-3 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs min-h-[44px] hover:bg-slate-50"
              >
                + Nueva Comanda
              </button>
              <button
                type="button"
                onClick={() => navigate('/mozo/pedidos')}
                className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs min-h-[44px] shadow-sm"
              >
                Ver Activos →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewOrderPage;
