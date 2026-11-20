import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useShiftCloseStore } from '../../stores/shiftCloseStore';
import { AdminLayout } from '../../layouts/AdminLayout';
import {
  OpenOrdersList,
  OpenTablesList,
  SummaryCards,
  SoldDishesTable,
  RemainingRationsTable,
  SoldOutList,
  CancellationsTable,
  ObservationForm,
  CloseShiftButton,
  ManualCloseModal,
  ManualRecordForm,
  AdjustRationsModal
} from '../../components/cierre';
import { OrderDTO, TableWithSession } from '@cevicheria/shared';
import { formatLima } from '../../utils/datetime';
import { formatSoles } from '../../utils/money';

export const ShiftClosePage: React.FC = () => {
  const {
    shift,
    openOrders,
    openTables,
    summary,
    todayMenuItems,
    loading,
    error,
    highlightedTableCode,
    loadAll,
    closeTable,
    closeShift,
    manualCloseOrder,
    addManualRecord,
    adjustRations,
    setHighlightedTableCode,
    clearError
  } = useShiftCloseStore();

  const [observations, setObservations] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modals state
  const [manualCloseTarget, setManualCloseTarget] = useState<OrderDTO | null>(null);
  const [showManualRecordModal, setShowManualRecordModal] = useState(false);
  const [adjustDishTarget, setAdjustDishTarget] = useState<{
    dishId: string;
    dishName: string;
    remainingRations: number;
  } | null>(null);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Sync initial observations from summary or shift if available
  useEffect(() => {
    if (summary?.observations) {
      setObservations(summary.observations);
    }
  }, [summary?.observations]);

  const isClosed = shift?.status === 'CERRADO';
  const hasPending = openOrders.length > 0 || openTables.length > 0;

  const handleCloseTable = async (table: TableWithSession) => {
    clearError();
    setFeedback(null);
    try {
      await closeTable(table.openSessionId!);
      setFeedback(`Mesa ${table.code} cerrada correctamente.`);
      setHighlightedTableCode(null);
    } catch (err: any) {
      const code = err?.response?.data?.error?.code || err?.code;
      if (code === 'TABLE_HAS_ACTIVE_ORDERS') {
        setHighlightedTableCode(table.code);
      }
      throw err;
    }
  };

  const handleConfirmCloseShift = async () => {
    clearError();
    setFeedback(null);
    const result = await closeShift(observations);
    setFeedback(
      `Turno cerrado exitosamente. Total informativo: ${formatSoles(result.totalAmountCents)}`
    );
  };

  const handleManualCloseOrderConfirm = async (
    orderId: string,
    reason: string
  ) => {
    clearError();
    setFeedback(null);
    await manualCloseOrder(orderId, reason);
    setFeedback('Pedido cerrado manualmente con éxito.');
  };

  const handleAdjustRationsConfirm = async (
    dishId: string,
    newRemaining: number,
    reason: string
  ) => {
    clearError();
    setFeedback(null);
    // Find matching menuItemId from todayMenuItems if present
    const menuItem = todayMenuItems.find((m) => m.dishId === dishId);
    const targetId = menuItem ? menuItem.id : dishId;
    await adjustRations(targetId, newRemaining, reason);
    setFeedback('Raciones ajustadas exitosamente.');
  };

  return (
    <AdminLayout
      title="Cevichería Lucy — Cierre de Turno"
      headerExtra={
        shift && (
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              isClosed
                ? 'bg-slate-200 text-slate-800 border border-slate-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}
          >
            {shift.status}
          </span>
        )
      }
      maxWidth="max-w-5xl"
    >
      <div className="space-y-6">
        {/* Anchor Navigation Bar */}
        <nav aria-label="Navegación de secciones" className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm flex gap-2 overflow-x-auto text-xs font-semibold">
          <a
            href="#pendientes"
            className="px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap min-h-[44px] flex items-center"
          >
            1. Pendientes {hasPending && `(${openOrders.length + openTables.length})`}
          </a>
          <a
            href="#resumen"
            className="px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap min-h-[44px] flex items-center"
          >
            2. Resumen
          </a>
          <a
            href="#registros-manuales"
            className="px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap min-h-[44px] flex items-center"
          >
            3. Registros Manuales ({summary?.manualRecords?.length || 0})
          </a>
          <a
            href="#cierre"
            className="px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap min-h-[44px] flex items-center"
          >
            4. Cierre
          </a>
        </nav>

        {/* Global Feedback and Error Alerts */}
        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium"
          >
            {feedback}
          </div>
        )}

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium"
          >
            {error}
          </div>
        )}

        {loading && (
          <div className="p-8 text-center text-slate-500 text-sm">
            Cargando información del turno...
          </div>
        )}

        {!loading && !shift && (
          <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">
              No hay ningún turno abierto
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Para realizar operaciones o visualizar el cierre de turno, primero debes iniciar un turno en el módulo de turnos.
            </p>
            <Link
              to="/encargado"
              className="inline-block min-h-[44px] px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl transition-colors"
            >
              Ir al Control de Turnos
            </Link>
          </div>
        )}

        {shift && (
          <>
            {/* Shift Header Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Turno Activo
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  {shift.label} — {shift.date}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Apertura: {formatLima(shift.openedAt)}
                  {shift.closedAt && ` | Cierre: ${formatLima(shift.closedAt)}`}
                </p>
              </div>

              {isClosed && (
                <div className="bg-slate-100 border border-slate-300 p-3 rounded-xl text-xs text-slate-700">
                  <span className="font-bold">Turno CERRADO</span>
                  <p className="text-slate-500 mt-0.5">
                    Modo solo lectura: visualizando snapshot histórico.
                  </p>
                </div>
              )}
            </div>

            {/* SECCIÓN 1: PENDIENTES */}
            <section
              id="pendientes"
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    1. Verificación de Pendientes
                  </h2>
                  <p className="text-xs text-slate-500">
                    Revisa que no existan pedidos en preparación ni mesas con sesión abierta antes de proceder al cierre.
                  </p>
                </div>

                {!hasPending && (
                  <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full">
                    Todo cerrado
                  </span>
                )}
              </div>

              {!hasPending ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                  <p className="text-sm font-bold text-emerald-900">
                    Todo cerrado
                  </p>
                  <p className="text-xs text-emerald-700">
                    No existen pedidos activos ni mesas abiertas. El turno está listo para ser cerrado.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pedidos activos */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Pedidos Activos ({openOrders.length})
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        ENVIADO o LISTO
                      </span>
                    </div>
                    <OpenOrdersList
                      orders={openOrders}
                      highlightedTableCode={highlightedTableCode}
                      onManualClose={(ord) => setManualCloseTarget(ord)}
                      disabled={isClosed}
                    />
                  </div>

                  {/* Mesas abiertas */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Mesas Abiertas ({openTables.length})
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        Sesiones activas
                      </span>
                    </div>
                    <OpenTablesList
                      tables={openTables}
                      onCloseTable={handleCloseTable}
                      disabled={isClosed}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* SECCIÓN 2: RESUMEN */}
            <section
              id="resumen"
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6"
            >
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  2. Resumen Operativo del Turno
                </h2>
                <p className="text-xs text-slate-500">
                  Consolidado de platos vendidos, disponibilidad de raciones, agotados y cancelaciones.
                </p>
              </div>

              {/* Tarjetas resumen */}
              <SummaryCards summary={summary} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                {/* Platos vendidos */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Platos Vendidos (Solo Entregados)
                  </h3>
                  <SoldDishesTable soldDishes={summary?.soldDishes || []} />
                </div>

                {/* Raciones restantes */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Raciones Restantes
                  </h3>
                  <RemainingRationsTable
                    remainingRations={summary?.remainingRations || []}
                    onAdjust={(dish) => setAdjustDishTarget(dish)}
                    isReadOnly={isClosed}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
                {/* Agotados */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Platos Agotados
                  </h3>
                  <SoldOutList soldOutDishes={summary?.soldOutDishes || []} />
                </div>

                {/* Cancelaciones */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Pedidos Cancelados
                  </h3>
                  <CancellationsTable
                    cancellations={summary?.cancellations || []}
                  />
                </div>
              </div>
            </section>

            {/* SECCIÓN 3: REGISTROS MANUALES (PAPER) */}
            <section
              id="registros-manuales"
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    3. Registros Manuales por Contingencia (PAPER)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Consumos atendidos en físico durante corte o falla de red. Se registran de forma independiente sin afectar cocina.
                  </p>
                </div>

                {!isClosed && (
                  <button
                    type="button"
                    onClick={() => setShowManualRecordModal(true)}
                    className="min-h-[44px] px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 rounded-xl text-xs font-bold transition-colors shrink-0"
                  >
                    + Registrar en papel
                  </button>
                )}
              </div>

              {(!summary?.manualRecords || summary.manualRecords.length === 0) ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm text-slate-500">
                  No hay registros manuales en papel para este turno.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th scope="col" className="px-4 py-3">
                          Mesa
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Ítems
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Notas
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          Total informativo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.manualRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-800">
                            {rec.tableCode}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              Origen: {rec.source}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {rec.items
                              .map(
                                (it) =>
                                  `${it.quantity}x ${it.name} (${formatSoles(it.amountCents)})`
                              )
                              .join(', ')}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {rec.notes || '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-800">
                            {formatSoles(rec.totalCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* SECCIÓN 4: CIERRE DE TURNO */}
            <section
              id="cierre"
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6"
            >
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  4. Finalización y Cierre de Turno
                </h2>
                <p className="text-xs text-slate-500">
                  Ingresa observaciones operativas y genera el snapshot inmutable del turno.
                </p>
              </div>

              <ObservationForm
                value={observations}
                onChange={setObservations}
                disabled={isClosed}
              />

              <div className="pt-2">
                <CloseShiftButton
                  hasPending={hasPending}
                  isClosed={isClosed}
                  onConfirmClose={handleConfirmCloseShift}
                />
              </div>
            </section>
          </>
        )}
      </div>

      {/* MODALS */}
      <ManualCloseModal
        order={manualCloseTarget}
        isOpen={Boolean(manualCloseTarget)}
        onClose={() => setManualCloseTarget(null)}
        onConfirm={handleManualCloseOrderConfirm}
      />

      <ManualRecordForm
        isOpen={showManualRecordModal}
        onClose={() => setShowManualRecordModal(false)}
        onSubmit={async (data) => {
          await addManualRecord(data);
          setFeedback('Registro manual guardado correctamente.');
        }}
      />

      <AdjustRationsModal
        isOpen={Boolean(adjustDishTarget)}
        dish={adjustDishTarget}
        onClose={() => setAdjustDishTarget(null)}
        onConfirm={handleAdjustRationsConfirm}
      />
    </AdminLayout>
  );
};

export default ShiftClosePage;
