import React, { useEffect, useState } from 'react';
import { DishDTO, MenuDayStatus, MenuItemDTO } from '@cevicheria/shared';
import { AvailabilityBadge } from './AvailabilityBadge';
import { deriveDishStatus } from '../../utils/dishState';

export interface DishEditValues {
  active: boolean;
  hasRationsLimit: boolean;
  totalRations: number | null;
  remainingRations: number | null;
  priceCents: number;
}

export interface DishEditSheetProps {
  isOpen: boolean;
  item: MenuItemDTO;
  dish?: DishDTO;
  sectionName: string;
  mode: MenuDayStatus;
  isSaving?: boolean;
  onClose: () => void;
  onSaveDraft: (values: DishEditValues) => Promise<void>;
  onApplyRations: (remaining: number, reason: string) => Promise<void>;
  onMarkSoldOut: (reason: string) => Promise<void>;
  onReactivate: (reason: string) => Promise<void>;
  onOpenHistory: () => void;
  onRemove?: () => Promise<void>;
}

const fieldClass =
  'w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600';

const primaryButtonClass =
  'inline-flex min-h-[44px] items-center justify-center rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-brand-950 shadow-sm transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50';

const secondaryButtonClass =
  'inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

export const DishEditSheet: React.FC<DishEditSheetProps> = ({
  isOpen,
  item,
  dish,
  sectionName,
  mode,
  isSaving = false,
  onClose,
  onSaveDraft,
  onApplyRations,
  onMarkSoldOut,
  onReactivate,
  onOpenHistory,
  onRemove
}) => {
  const [active, setActive] = useState(item.active);
  const [hasRationsLimit, setHasRationsLimit] = useState(item.hasRationsLimit);
  const [totalRations, setTotalRations] = useState<number | null>(item.totalRations ?? null);
  const [remainingRations, setRemainingRations] = useState<number | null>(
    item.remainingRations ?? null
  );
  const [priceSoles, setPriceSoles] = useState((item.priceCents / 100).toFixed(2));
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isDraft = mode === 'BORRADOR';
  const busy = isSaving || submitting;

  useEffect(() => {
    if (!isOpen) return;
    setActive(item.active);
    setHasRationsLimit(item.hasRationsLimit);
    setTotalRations(item.totalRations ?? null);
    setRemainingRations(item.remainingRations ?? null);
    setPriceSoles((item.priceCents / 100).toFixed(2));
    setReason('');
    setLocalError(null);
    setSubmitting(false);
  }, [isOpen, item.id, item.active, item.hasRationsLimit, item.totalRations, item.remainingRations, item.priceCents]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const status = deriveDishStatus({
    active: item.active,
    manuallySoldOut: item.manuallySoldOut,
    hasRationsLimit: item.hasRationsLimit,
    remainingRations: item.remainingRations,
    lowStockThreshold: item.lowStockThreshold
  });

  const validateRations = (): string | null => {
    if (hasRationsLimit) {
      if (totalRations === null || !Number.isInteger(totalRations) || totalRations < 0) {
        return 'El total de raciones debe ser un entero mayor o igual a 0.';
      }
      if (remainingRations === null || !Number.isInteger(remainingRations) || remainingRations < 0) {
        return 'Las raciones restantes deben ser un entero mayor o igual a 0.';
      }
      if (remainingRations > totalRations) {
        return 'Las raciones restantes no pueden superar el total preparado.';
      }
    }
    const price = Number(priceSoles);
    if (!Number.isFinite(price) || price < 0) {
      return 'El precio debe ser un número mayor o igual a 0.';
    }
    return null;
  };

  const handleToggleLimit = (checked: boolean) => {
    setHasRationsLimit(checked);
    if (checked) {
      if (totalRations === null) {
        setTotalRations(30);
        setRemainingRations(30);
      } else if (remainingRations === null) {
        setRemainingRations(totalRations);
      }
    }
  };

  const handleTotalChange = (value: string) => {
    const parsed = value === '' ? null : Math.max(0, parseInt(value, 10) || 0);
    setTotalRations(parsed);
    if (parsed !== null && remainingRations !== null && remainingRations > parsed) {
      setRemainingRations(parsed);
    }
  };

  const handleSaveDraft = async () => {
    setLocalError(null);
    const validationError = validateRations();
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    const price = Number(priceSoles);
    setSubmitting(true);
    try {
      await onSaveDraft({
        active,
        hasRationsLimit,
        totalRations: hasRationsLimit ? totalRations : null,
        remainingRations: hasRationsLimit ? remainingRations : null,
        priceCents: Math.round(price * 100)
      });
      onClose();
    } catch (err: any) {
      setLocalError(
        err?.response?.data?.error?.message || err?.message || 'No se pudieron guardar los cambios.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyRations = async () => {
    setLocalError(null);
    const trimmedReason = reason.trim();
    if (!hasRationsLimit || remainingRations === null) {
      setLocalError('Este plato no tiene un conteo de raciones activo.');
      return;
    }
    if (!Number.isInteger(remainingRations) || remainingRations < 0) {
      setLocalError('Las raciones restantes deben ser un entero mayor o igual a 0.');
      return;
    }
    if (!trimmedReason) {
      setLocalError('Indica el motivo del ajuste para dejar la auditoría correspondiente.');
      return;
    }

    setSubmitting(true);
    try {
      await onApplyRations(remainingRations, trimmedReason);
      setReason('');
      onClose();
    } catch (err: any) {
      setLocalError(
        err?.response?.data?.error?.message || err?.message || 'No se pudo registrar el ajuste.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSoldOut = async () => {
    setLocalError(null);
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setLocalError('Indica el motivo por el cual el plato queda agotado.');
      return;
    }
    setSubmitting(true);
    try {
      await onMarkSoldOut(trimmedReason);
      onClose();
    } catch (err: any) {
      setLocalError(
        err?.response?.data?.error?.message || err?.message || 'No se pudo marcar como agotado.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    setLocalError(null);
    setSubmitting(true);
    try {
      await onReactivate(reason.trim() || 'Insumo restablecido desde Platos y raciones');
      onClose();
    } catch (err: any) {
      setLocalError(
        err?.response?.data?.error?.message || err?.message || 'No se pudo reactivar el plato.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setLocalError(null);
    setSubmitting(true);
    try {
      await onRemove();
      onClose();
    } catch (err: any) {
      setLocalError(
        err?.response?.data?.error?.message || err?.message || 'No se pudo quitar el plato.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dish-edit-title"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-xl sm:my-8 sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                {sectionName}
              </span>
              <AvailabilityBadge status={status} />
            </div>
            <h2
              id="dish-edit-title"
              className="mt-1.5 break-words text-lg font-bold leading-snug text-slate-900"
            >
              {item.dishName}
            </h2>
            <p className="text-xs text-slate-500">
              {isDraft ? 'Borrador editable' : 'Menú publicado · ajustes en caliente'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel de edición"
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-xl font-bold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        {dish?.description && (
          <p className="mt-3 text-xs leading-relaxed text-slate-500">{dish.description}</p>
        )}

        {localError && (
          <div role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {localError}
          </div>
        )}

        {isDraft ? (
          <div className="mt-4 space-y-4">
            <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-sm font-semibold text-slate-800">Activo para venta</span>
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
              />
            </label>

            <div>
              <label htmlFor="dish-price" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Precio de venta (S/)
              </label>
              <input
                id="dish-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.50"
                value={priceSoles}
                onChange={(event) => setPriceSoles(event.target.value)}
                className={fieldClass}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Precio provisional editable; se guarda en el menú del día.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-800">Controlar límite de raciones</span>
                <input
                  type="checkbox"
                  checked={hasRationsLimit}
                  onChange={(event) => handleToggleLimit(event.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
                />
              </label>

              {hasRationsLimit && (
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="dish-total-rations" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Total preparado
                    </label>
                    <input
                      id="dish-total-rations"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      value={totalRations ?? ''}
                      onChange={(event) => handleTotalChange(event.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="dish-remaining-rations" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Restantes
                    </label>
                    <input
                      id="dish-remaining-rations"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      max={totalRations ?? undefined}
                      value={remainingRations ?? ''}
                      onChange={(event) =>
                        setRemainingRations(
                          event.target.value === '' ? null : Math.max(0, parseInt(event.target.value, 10) || 0)
                        )
                      }
                      className={fieldClass}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="dish-reason" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Motivo del ajuste de raciones
              </label>
              <textarea
                id="dish-reason"
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ej. Conteo físico en cocina a mitad del servicio."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Obligatorio para “Registrar ajuste ahora”; deja auditoría en el historial.
              </p>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={handleApplyRations}
                disabled={busy || !hasRationsLimit}
                className={secondaryButtonClass}
              >
                Registrar ajuste ahora
              </button>
              <div className="flex flex-col gap-2 sm:flex-row">
                {onRemove && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={busy}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
                  >
                    Quitar del menú
                  </button>
                )}
                <button type="button" onClick={handleSaveDraft} disabled={busy} className={primaryButtonClass}>
                  {busy ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Precio</span>
                <span className="font-bold text-slate-900">S/ {(item.priceCents / 100).toFixed(2)}</span>
              </div>
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Activo para venta</span>
                <span className="font-bold text-slate-900">{item.active ? 'Sí' : 'No'}</span>
              </div>
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Límite de raciones</span>
                <span className="font-bold text-slate-900">{item.hasRationsLimit ? 'Sí' : 'Sin límite'}</span>
              </div>
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Restantes / total</span>
                <span className="font-bold text-slate-900">
                  {item.hasRationsLimit
                    ? `${item.remainingRations ?? 0} / ${item.totalRations ?? '—'}`
                    : 'Sin límite'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-xs text-brand-900">
              El menú está publicado: puedes ajustar raciones y disponibilidad en caliente. Para
              agregar o quitar platos, la regla actual exige un menú en borrador.
            </div>

            {item.hasRationsLimit && (
              <div>
                <label htmlFor="published-remaining" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Nuevo conteo de raciones restantes
                </label>
                <input
                  id="published-remaining"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={remainingRations ?? ''}
                  onChange={(event) =>
                    setRemainingRations(
                      event.target.value === '' ? null : Math.max(0, parseInt(event.target.value, 10) || 0)
                    )
                  }
                  className={fieldClass}
                />
              </div>
            )}

            <div>
              <label htmlFor="published-reason" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Motivo del ajuste
              </label>
              <textarea
                id="published-reason"
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ej. Conteo físico: quedan 8 porciones listas."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>

            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {item.hasRationsLimit && (
                <button
                  type="button"
                  onClick={handleApplyRations}
                  disabled={busy}
                  className={primaryButtonClass}
                >
                  Aplicar ajuste de raciones
                </button>
              )}
              {item.manuallySoldOut ? (
                <button
                  type="button"
                  onClick={handleReactivate}
                  disabled={busy}
                  className={secondaryButtonClass}
                >
                  Reactivar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSoldOut}
                  disabled={busy}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
                >
                  Marcar agotado
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onOpenHistory}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
          >
            Historial de ajustes
          </button>
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DishEditSheet;
