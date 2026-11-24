import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DishDTO, MenuItemDTO } from '@cevicheria/shared';
import { AdminLayout } from '../../layouts/AdminLayout';
import {
  getTodayLimaDate,
  useMenuAdminStore
} from '../../stores/menuAdminStore';
import { useShiftStore } from '../../stores/shiftStore';
import { CategoryTabs, CategoryTabItem } from '../../components/menu/CategoryTabs';
import { DishRationCard } from '../../components/menu/DishRationCard';
import { DishEditSheet, DishEditValues } from '../../components/menu/DishEditSheet';
import { DishPicker } from '../../components/menu/DishPicker';
import { ShiftBanner } from '../../components/menu/ShiftBanner';
import { PublishMenuButton } from '../../components/menu/PublishMenuButton';
import { SoldOutModal } from '../../components/menu/SoldOutModal';
import { AdjustmentHistory } from '../../components/menu/AdjustmentHistory';
import { UpdateMenuDayItemInput } from '../../api/menu.api';
import { deriveDishStatus } from '../../utils/dishState';

function toPayload(item: MenuItemDTO): UpdateMenuDayItemInput {
  return {
    dishId: item.dishId,
    active: item.active,
    hasRationsLimit: item.hasRationsLimit,
    totalRations: item.hasRationsLimit ? item.totalRations ?? 0 : null,
    remainingRations: item.hasRationsLimit ? item.remainingRations ?? 0 : null,
    priceCents: item.priceCents
  };
}

export const DishManagementPage: React.FC = () => {
  const {
    selectedDate,
    setSelectedDate,
    menuDay,
    dishes,
    sections,
    loading,
    error,
    loadDishesAndSections,
    loadDay,
    createDay,
    updateDay,
    publish,
    replenish,
    adjust,
    soldOut,
    reactivate,
    applyMenuItem,
    clearError
  } = useMenuAdminStore();

  const {
    currentShift,
    isOpen: isShiftOpen,
    isLoading: isShiftLoading,
    error: shiftError,
    fetchCurrentShift
  } = useShiftStore();

  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [draftItems, setDraftItems] = useState<MenuItemDTO[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [soldOutItem, setSoldOutItem] = useState<MenuItemDTO | null>(null);
  const [historyItem, setHistoryItem] = useState<MenuItemDTO | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadDishesAndSections();
  }, [loadDishesAndSections]);

  useEffect(() => {
    fetchCurrentShift();
  }, [fetchCurrentShift]);

  useEffect(() => {
    loadDay(selectedDate);
  }, [loadDay, selectedDate]);

  // La copia local del borrador se re-inicializa solo cuando cambia el día o
  // su estado. Las acciones rápidas actualizan la copia local sin pisar ediciones.
  useEffect(() => {
    setDraftItems(menuDay?.items ?? []);
    setSelectedItemId(null);
  }, [menuDay?.id, menuDay?.date, menuDay?.status]);

  const isDraft = menuDay?.status === 'BORRADOR';
  const items = isDraft ? draftItems : menuDay?.items ?? [];

  const dishesById = useMemo(() => {
    const map = new Map<string, DishDTO>();
    for (const dish of dishes) map.set(dish.id, dish);
    return map;
  }, [dishes]);

  const sectionsByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const section of sections) map.set(section.key, section.name);
    return map;
  }, [sections]);

  const selectedItem = selectedItemId ? items.find((item) => item.id === selectedItemId) ?? null : null;
  const selectedDish = selectedItem ? dishesById.get(selectedItem.dishId) : undefined;

  const categories: CategoryTabItem[] = [
    { key: 'ALL', label: 'Todos', count: items.length },
    ...sections.map((section) => ({
      key: section.key,
      label: section.name,
      count: items.filter((item) => item.sectionKey === section.key).length
    }))
  ];

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    const matchesCategory = activeCategory === 'ALL' || item.sectionKey === activeCategory;
    if (!matchesCategory) return false;
    if (!normalizedSearch) return true;
    const description = dishesById.get(item.dishId)?.description || '';
    return (
      item.dishName.toLowerCase().includes(normalizedSearch) ||
      description.toLowerCase().includes(normalizedSearch)
    );
  });

  const sortItems = (a: MenuItemDTO, b: MenuItemDTO) => {
    const orderA = dishesById.get(a.dishId)?.sortOrder ?? 999;
    const orderB = dishesById.get(b.dishId)?.sortOrder ?? 999;
    return orderA - orderB || a.dishName.localeCompare(b.dishName);
  };

  const visibleSections =
    activeCategory === 'ALL'
      ? sections
      : sections.filter((section) => section.key === activeCategory);

  const groups = visibleSections
    .map((section) => ({
      key: section.key,
      name: section.name,
      items: filteredItems.filter((item) => item.sectionKey === section.key).sort(sortItems)
    }))
    .filter((group) => group.items.length > 0);

  const orphanItems = filteredItems.filter(
    (item) => !sections.some((section) => section.key === item.sectionKey)
  );
  if (orphanItems.length > 0) {
    groups.push({ key: 'OTROS', name: 'Otros', items: orphanItems.sort(sortItems) });
  }

  const activeSection = sections.find((section) => section.key === activeCategory);
  const availableDishes = dishes.filter(
    (dish) => dish.active && !items.some((item) => item.dishId === dish.id)
  );

  const flash = (message: string) => {
    setActionError(null);
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(null), 3500);
  };

  const mergeDraftItem = (updated: MenuItemDTO) => {
    setDraftItems((previous) =>
      previous.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
    );
  };

  const runPending = async (item: MenuItemDTO, action: () => Promise<void>) => {
    setPendingIds((previous) => ({ ...previous, [item.id]: true }));
    setActionError(null);
    try {
      await action();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.error?.message || err?.message || 'No se pudo actualizar el plato.'
      );
    } finally {
      setPendingIds((previous) => {
        const next = { ...previous };
        delete next[item.id];
        return next;
      });
    }
  };

  const persistDraft = async (nextItems: MenuItemDTO[] = draftItems) => {
    const refreshed = await updateDay({ items: nextItems.map(toPayload) });
    setDraftItems(refreshed.items ?? []);
    return refreshed;
  };

  const handleIncrement = async (item: MenuItemDTO) => {
    if (!item.hasRationsLimit) return;
    const remaining = item.remainingRations ?? 0;
    if (item.totalRations !== null && item.totalRations !== undefined && remaining >= item.totalRations) {
      setActionError('El plato ya está en su total preparado. Edita el total para ampliar la producción.');
      return;
    }
    await runPending(item, async () => {
      const updated = await replenish(
        item.id,
        1,
        'Reposición rápida (+1) desde Platos y raciones'
      );
      if (isDraft) mergeDraftItem(updated);
      flash(`Se agregó 1 ración a "${item.dishName}".`);
    });
  };

  const handleDecrement = async (item: MenuItemDTO) => {
    if (!item.hasRationsLimit) return;
    const remaining = item.remainingRations ?? 0;
    if (remaining <= 0) return;
    await runPending(item, async () => {
      const updated = await adjust(
        item.id,
        remaining - 1,
        'Ajuste rápido (-1) desde Platos y raciones'
      );
      if (isDraft) mergeDraftItem(updated);
      flash(`Se quitó 1 ración a "${item.dishName}".`);
    });
  };

  const handleReactivate = async (item: MenuItemDTO) => {
    await runPending(item, async () => {
      const updated = await reactivate(item.id, 'Reactivado desde Platos y raciones');
      if (isDraft) mergeDraftItem(updated);
      flash(`"${item.dishName}" reactivado para la venta.`);
    });
  };

  const handleSaveDraft = async () => {
    if (!menuDay || !isDraft) return;
    setIsSaving(true);
    setActionError(null);
    try {
      await persistDraft();
      flash('Borrador guardado correctamente.');
    } catch (err: any) {
      setActionError(
        err?.response?.data?.error?.message || err?.message || 'No se pudo guardar el borrador.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!menuDay || !isDraft) return;
    setIsSaving(true);
    setActionError(null);
    try {
      await persistDraft();
      await publish();
      flash('Menú del día publicado. Ya está visible para el salón.');
    } catch (err: any) {
      setActionError(
        err?.response?.data?.error?.message || err?.message || 'No se pudo publicar el menú.'
      );
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateDay = async () => {
    setActionError(null);
    try {
      await createDay(selectedDate, `Menú del ${selectedDate}`);
      flash('Menú del día creado en borrador.');
    } catch (err: any) {
      setActionError(
        err?.response?.data?.error?.message || err?.message || 'No se pudo crear el menú.'
      );
    }
  };

  const handleAddDish = async (dish: DishDTO) => {
    if (!menuDay || !isDraft) return;
    const sectionKey = sections.find((section) => section.id === dish.sectionId)?.key;
    if (!sectionKey) {
      setActionError('El plato no tiene una categoría válida.');
      return;
    }
    const newItem: MenuItemDTO = {
      id: `draft-${dish.id}`,
      menuDayId: menuDay.id,
      dishId: dish.id,
      dishName: dish.name,
      sectionKey,
      priceCents: dish.priceCents,
      active: true,
      hasRationsLimit: false,
      totalRations: null,
      remainingRations: null,
      lowStockThreshold: 5,
      manuallySoldOut: false,
      updatedAt: new Date().toISOString(),
      version: 0
    };

    setIsSaving(true);
    setActionError(null);
    try {
      const refreshed = await persistDraft([...draftItems, newItem]);
      setDraftItems(refreshed.items ?? []);
      setIsPickerOpen(false);
      flash(`"${dish.name}" se agregó al menú del día.`);
    } catch (err: any) {
      setActionError(
        err?.response?.data?.error?.message || err?.message || 'No se pudo agregar el plato.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSave = async (values: DishEditValues) => {
    if (!menuDay || !isDraft || !selectedItem) return;
    const nextItems = draftItems.map((item) =>
      item.id === selectedItem.id ? { ...item, ...values } : item
    );
    const refreshed = await persistDraft(nextItems);
    setDraftItems(refreshed.items ?? []);
    flash('Cambios del plato guardados.');
  };

  const handleEditApplyRations = async (remaining: number, reason: string) => {
    if (!selectedItem) return;
    const updated = await adjust(selectedItem.id, remaining, reason);
    if (isDraft) mergeDraftItem(updated);
    flash(`Raciones actualizadas para "${selectedItem.dishName}".`);
  };

  const handleEditSoldOut = async (reason: string) => {
    if (!selectedItem) return;
    const updated = await soldOut(selectedItem.id, reason);
    if (isDraft) mergeDraftItem(updated);
    flash(`"${selectedItem.dishName}" marcado como agotado.`);
  };

  const handleEditReactivate = async (reason: string) => {
    if (!selectedItem) return;
    const updated = await reactivate(selectedItem.id, reason);
    if (isDraft) mergeDraftItem(updated);
    flash(`"${selectedItem.dishName}" reactivado para la venta.`);
  };

  const handleEditRemove = async () => {
    if (!menuDay || !isDraft || !selectedItem) return;
    const confirmed = window.confirm(
      `¿Quitar "${selectedItem.dishName}" del menú del día? Los pedidos ya registrados no se modifican.`
    );
    if (!confirmed) return;
    const nextItems = draftItems.filter((item) => item.id !== selectedItem.id);
    const refreshed = await persistDraft(nextItems);
    setDraftItems(refreshed.items ?? []);
    setSelectedItemId(null);
    flash(`"${selectedItem.dishName}" se quitó del menú del día.`);
  };

  const handleOpenHistory = () => {
    if (!selectedItem) return;
    setHistoryItem(selectedItem);
    setSelectedItemId(null);
  };

  const today = getTodayLimaDate();
  const menuStatusLabel = !menuDay ? 'SIN MENÚ' : menuDay.status === 'PUBLICADO' ? 'PUBLICADO' : 'BORRADOR';
  const menuStatusClass = !menuDay
    ? 'border-slate-300 bg-slate-100 text-slate-600'
    : menuDay.status === 'PUBLICADO'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
      : 'border-amber-300 bg-amber-50 text-amber-800';

  return (
    <AdminLayout title="Cevichería Lucy — Platos y raciones" maxWidth="max-w-7xl">
      <div className="min-w-0 space-y-4">
        {successMessage && (
          <div
            role="status"
            className="flex items-start justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <span>{successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="min-h-[44px] min-w-[44px] text-lg font-bold leading-none text-emerald-600"
              aria-label="Cerrar mensaje de éxito"
            >
              ×
            </button>
          </div>
        )}

        {(error || actionError) && (
          <div
            role="alert"
            className="flex items-start justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <span>{actionError || error}</span>
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                clearError();
              }}
              className="min-h-[44px] min-w-[44px] text-lg font-bold leading-none text-rose-600"
              aria-label="Cerrar mensaje de error"
            >
              ×
            </button>
          </div>
        )}

        {shiftError && !isShiftOpen && (
          <p className="text-xs text-slate-500">No se pudo consultar el turno actual.</p>
        )}

        {/* Cabecera compacta */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-marine-900 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-400">
                  Gestión del menú del día
                </p>
                <h1 className="mt-0.5 text-xl font-bold leading-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
                  Platos y raciones
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Actualiza la disponibilidad del salón sin salir de esta pantalla.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Link
                  to="/encargado/platos"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-brand-200 dark:border-slate-700 bg-brand-50 dark:bg-marine-800 px-3 py-2 text-xs font-bold text-brand-700 dark:text-brand-300 transition-colors hover:bg-brand-100 dark:hover:bg-marine-700"
                >
                  Catálogo maestro
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    loadDay(selectedDate);
                    fetchCurrentShift();
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-marine-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-marine-700"
                >
                  Actualizar
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-0">
                  <label
                    htmlFor="menu-date"
                    className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    Fecha del menú
                  </label>
                  <input
                    id="menu-date"
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="min-h-[44px] w-full max-w-[12rem] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-marine-950 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>

                {selectedDate === today && (
                  <span className="inline-flex h-8 items-center rounded-lg border border-brand-200 dark:border-slate-700 bg-brand-50 dark:bg-marine-800 px-2.5 text-xs font-bold text-brand-700 dark:text-brand-300">
                    Hoy (Lima)
                  </span>
                )}

                <span
                  className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-bold ${menuStatusClass}`}
                >
                  {menuStatusLabel}
                </span>

                <Link
                  to="/encargado/turnos"
                  className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-bold transition-colors ${
                    isShiftOpen
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  Turno: {isShiftLoading ? 'consultando…' : isShiftOpen ? `abierto${currentShift?.label ? ` · ${currentShift.label}` : ''}` : 'cerrado'}
                </Link>
              </div>

              {isDraft && (
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSaving || loading}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-marine-800 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-marine-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <PublishMenuButton
                    hasActiveItems={draftItems.some((item) => item.active)}
                    isPublished={false}
                    isLoading={isSaving || loading}
                    onPublish={handlePublish}
                    className="w-full sm:w-auto"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <ShiftBanner isOpen={isShiftOpen} isLoading={isShiftLoading} shiftLabel={currentShift?.label} />

        {loading && !menuDay ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-marine-900 p-10 text-center text-sm text-slate-400 dark:text-slate-500">
            Cargando platos y raciones...
          </div>
        ) : !menuDay ? (
          <section className="space-y-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-marine-900 p-8 text-center sm:p-12">
            <div className="text-4xl" aria-hidden="true">
              🍽️
            </div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              No hay menú para el {selectedDate}
            </h2>
            <p className="mx-auto max-w-md text-xs text-slate-500 dark:text-slate-400">
              Crea un borrador, elige los platos del catálogo maestro y publícalo cuando esté listo
              para el salón.
            </p>
            <button
              type="button"
              onClick={handleCreateDay}
              disabled={loading}
              className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-brand-950 shadow-sm transition-colors hover:bg-brand-400 disabled:opacity-50"
            >
              Crear menú del día
            </button>
          </section>
        ) : (
          <div className="min-w-0 space-y-4">
            {menuDay.status === 'PUBLICADO' && (
              <div className="rounded-xl border border-brand-200 dark:border-slate-800 bg-brand-50 dark:bg-marine-900 p-3 text-xs text-brand-900 dark:text-brand-300 sm:p-4">
                <span className="font-bold">Menú publicado.</span> Las raciones y la disponibilidad
                se actualizan al instante. Agregar o quitar platos requiere un menú en borrador.
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-marine-900 p-3 shadow-sm sm:p-4">
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  <CategoryTabs
                    categories={categories}
                    activeKey={activeCategory}
                    onSelect={setActiveCategory}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative min-w-0 flex-1 sm:max-w-sm">
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Buscar plato por nombre..."
                      aria-label="Buscar plato por nombre"
                      className="min-h-[44px] w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-marine-950 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                    />
                  </div>

                  {isDraft && (
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(true)}
                      disabled={isSaving || loading}
                      className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-brand-950 shadow-sm transition-colors hover:bg-brand-400 disabled:opacity-50 sm:w-auto"
                    >
                      + Agregar platos
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {items.length} platos ·{' '}
                  {items.filter((item) => deriveDishStatus(item) === 'AGOTADO').length} agotados ·{' '}
                  {items.filter((item) => deriveDishStatus(item) === 'ULTIMAS_RACIONES').length} en
                  últimas raciones
                </p>
              </div>
            </div>

            {groups.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-marine-900 p-8 text-center text-sm text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-3">
                <p>No hay platos que coincidan con la búsqueda o la categoría seleccionada.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setActiveCategory('ALL');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-marine-800 border border-brand-200 dark:border-slate-700 hover:bg-brand-100 dark:hover:bg-marine-700 transition-colors shadow-xs cursor-pointer min-h-[44px]"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span>Limpiar filtros</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {groups.map((group) => (
                  <section key={group.key} aria-labelledby={`category-${group.key}`}>
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                      <h2
                        id={`category-${group.key}`}
                        className="text-sm font-bold uppercase tracking-wider text-slate-700"
                      >
                        {group.name}
                      </h2>
                      <span className="text-xs text-slate-500">
                        {group.items.length} {group.items.length === 1 ? 'plato' : 'platos'}
                      </span>
                    </div>
                    <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {group.items.map((item) => (
                        <DishRationCard
                          key={item.id}
                          item={item}
                          dish={dishesById.get(item.dishId)}
                          sectionName={sectionsByKey.get(item.sectionKey) || item.sectionKey}
                          isPending={Boolean(pendingIds[item.id])}
                          onOpen={(selected) => setSelectedItemId(selected.id)}
                          onIncrement={handleIncrement}
                          onDecrement={handleDecrement}
                          onMarkSoldOut={(selected) => setSoldOutItem(selected)}
                          onReactivate={handleReactivate}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedItem && menuDay && (
        <DishEditSheet
          isOpen={true}
          item={selectedItem}
          dish={selectedDish}
          sectionName={sectionsByKey.get(selectedItem.sectionKey) || selectedItem.sectionKey}
          mode={menuDay.status}
          isSaving={isSaving || loading}
          onClose={() => setSelectedItemId(null)}
          onSaveDraft={handleEditSave}
          onApplyRations={handleEditApplyRations}
          onMarkSoldOut={handleEditSoldOut}
          onReactivate={handleEditReactivate}
          onOpenHistory={handleOpenHistory}
          onRemove={isDraft ? handleEditRemove : undefined}
        />
      )}

      {isPickerOpen && isDraft && (
        <DishPicker
          isOpen={true}
          onClose={() => setIsPickerOpen(false)}
          dishes={availableDishes}
          sections={sections}
          alreadyAddedDishIds={items.map((item) => item.dishId)}
          initialSectionId={activeSection?.id}
          onSelectDish={handleAddDish}
        />
      )}

      {soldOutItem && (
        <SoldOutModal
          isOpen={true}
          menuItem={soldOutItem}
          onClose={() => setSoldOutItem(null)}
          onSuccess={(updated) => {
            applyMenuItem(updated);
            if (isDraft) mergeDraftItem(updated);
            flash(`"${updated.dishName}" marcado como agotado.`);
          }}
        />
      )}

      {historyItem && (
        <AdjustmentHistory
          isOpen={true}
          menuItem={historyItem}
          onClose={() => setHistoryItem(null)}
        />
      )}
    </AdminLayout>
  );
};

export default DishManagementPage;
