import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useMenuAdminStore, getTodayLimaDate } from '../../stores/menuAdminStore';
import { AdminNavigation } from '../../components/menu/AdminNavigation';
import { MenuSectionTabs } from '../../components/menu/MenuSectionTabs';
import { DishPicker } from '../../components/menu/DishPicker';
import { RationInput } from '../../components/menu/RationInput';
import { PublishMenuButton } from '../../components/menu/PublishMenuButton';
import { AvailabilityBadge } from '../../components/menu/AvailabilityBadge';
import { RationBadge } from '../../components/menu/RationBadge';
import { DishDTO, MenuItemDTO } from '@cevicheria/shared';
import { UpdateMenuDayItemInput } from '../../api/menu.api';
import { deriveDishStatus } from '../../utils/dishState';
import { Link } from 'react-router-dom';

interface DraftItemState {
  dishId: string;
  dishName: string;
  sectionKey: string;
  priceCents: number;
  active: boolean;
  hasRationsLimit: boolean;
  totalRations: number | null;
  remainingRations: number | null;
  manuallySoldOut: boolean;
  lowStockThreshold: number;
}

export const MenuDayPage: React.FC = () => {
  const { user, logout } = useAuthStore();
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
    clearError
  } = useMenuAdminStore();

  const [activeSectionKey, setActiveSectionKey] = useState<string>('ALL');
  const [draftItems, setDraftItems] = useState<DraftItemState[]>([]);
  const [notes, setNotes] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadDishesAndSections();
    loadDay(selectedDate);
  }, [loadDishesAndSections, loadDay, selectedDate]);

  // Sincroniza draftItems cuando cambia menuDay
  useEffect(() => {
    if (menuDay) {
      setNotes(menuDay.notes || '');
      const mapped: DraftItemState[] = (menuDay.items || []).map((item: MenuItemDTO) => {
        const dish = dishes.find((d) => d.id === item.dishId);
        return {
          dishId: item.dishId,
          dishName: item.dishName || dish?.name || 'Plato',
          sectionKey: item.sectionKey || 'MARINO',
          priceCents: item.priceCents || dish?.priceCents || 0,
          active: item.active ?? true,
          hasRationsLimit: item.hasRationsLimit ?? false,
          totalRations: item.totalRations ?? null,
          remainingRations: item.remainingRations ?? null,
          manuallySoldOut: item.manuallySoldOut ?? false,
          lowStockThreshold: item.lowStockThreshold ?? 5
        };
      });
      setDraftItems(mapped);
    } else {
      setDraftItems([]);
      setNotes('');
    }
  }, [menuDay, dishes]);

  const handleCreateDraft = async () => {
    try {
      await createDay(selectedDate, `Menú del ${selectedDate}`);
      setSuccessMessage('Borrador de menú creado.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      // Error manejado en store
    }
  };

  const handleAddDish = (dish: DishDTO) => {
    const sec = sections.find((s) => s.id === dish.sectionId);
    const newItem: DraftItemState = {
      dishId: dish.id,
      dishName: dish.name,
      sectionKey: sec?.key || 'MARINO',
      priceCents: dish.priceCents,
      active: true,
      hasRationsLimit: false,
      totalRations: null,
      remainingRations: null,
      manuallySoldOut: false,
      lowStockThreshold: 5
    };
    setDraftItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, updates: Partial<DraftItemState>) => {
    setDraftItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const handleSaveDraft = async (): Promise<boolean> => {
    if (!menuDay) return false;
    setIsSaving(true);
    clearError();
    try {
      const itemsPayload: UpdateMenuDayItemInput[] = draftItems.map((item) => ({
        dishId: item.dishId,
        active: item.active,
        hasRationsLimit: item.hasRationsLimit,
        totalRations: item.totalRations,
        remainingRations: item.remainingRations,
        priceCents: item.priceCents
      }));

      await updateDay({
        notes,
        items: itemsPayload
      });
      setSuccessMessage('Borrador guardado correctamente.');
      setTimeout(() => setSuccessMessage(null), 3000);
      return true;
    } catch {
      // Manejado en store
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    // Primero guarda el borrador
    const saved = await handleSaveDraft();
    if (!saved) {
      throw new Error('No se pudo guardar el borrador antes de publicar el menú.');
    }
    await publish();
    setSuccessMessage('¡Menú del día publicado exitosamente!');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const hasActiveItems = draftItems.some((item) => item.active);
  const isPublished = menuDay?.status === 'PUBLICADO';

  const filteredDraftItems = draftItems.filter((item) => {
    if (activeSectionKey === 'ALL') return true;
    return item.sectionKey === activeSectionKey;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-brand-700">Cevichería Lucy — Administración</h1>
          <p className="text-xs text-slate-500">{user?.displayName} ({user?.role})</p>
        </div>
        <button
          onClick={() => logout()}
          className="text-xs px-3 py-2 min-h-[44px] text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg"
        >
          Cerrar sesión
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-4">
        <AdminNavigation />

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

        {/* Date Selector & Day Status Header */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
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

          <div className="flex items-center space-x-3">
            {menuDay ? (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500">Estado:</span>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    isPublished
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  {isPublished ? 'PUBLICADO' : 'BORRADOR'}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCreateDraft}
                disabled={loading}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold min-h-[44px] shadow-sm disabled:opacity-50"
              >
                + Crear Borrador para esta Fecha
              </button>
            )}
          </div>
        </div>

        {/* Menú no existente */}
        {!menuDay && !loading && (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
            <div className="text-4xl">📋</div>
            <h3 className="text-base font-bold text-slate-800">No hay menú configurado para el {selectedDate}</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Crea un borrador para seleccionar los platos maestros que se ofrecerán en el salón este día.
            </p>
            <button
              onClick={handleCreateDraft}
              className="mt-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold min-h-[44px]"
            >
              Crear Menú en Borrador
            </button>
          </div>
        )}

        {/* Menú existente */}
        {menuDay && (
          <div className="space-y-4">
            {/* Aviso si ya está publicado */}
            {isPublished && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <span className="font-bold">Menú Publicado y en venta en el Salón.</span> Los platos están visibles para los mozos. Para modificar raciones físicas o marcar agotados, dirígete al panel de control de raciones.
                </div>
                <Link
                  to="/encargado/raciones"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold min-h-[40px] whitespace-nowrap flex items-center shadow-sm"
                >
                  Ir a Raciones y Agotados →
                </Link>
              </div>
            )}

            {/* Toolbar con Secciones y Botón Agregar Plato */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <MenuSectionTabs
                sections={sections}
                activeSectionKey={activeSectionKey}
                onSelectSection={setActiveSectionKey}
                showAllOption={true}
              />

              {!isPublished && (
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="w-full sm:w-auto px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold min-h-[44px] whitespace-nowrap shadow-sm"
                >
                  + Agregar Platos al Menú
                </button>
              )}
            </div>

            {/* Lista de platos en el Menú */}
            {filteredDraftItems.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
                No hay platos en esta sección del menú.{' '}
                {!isPublished && (
                  <button
                    onClick={() => setIsPickerOpen(true)}
                    className="text-brand-600 font-bold underline ml-1"
                  >
                    Agregar platos ahora
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDraftItems.map((item) => {
                  const actualIndex = draftItems.findIndex((d) => d.dishId === item.dishId);
                  const derivedStatus = deriveDishStatus({
                    active: item.active,
                    manuallySoldOut: item.manuallySoldOut,
                    hasRationsLimit: item.hasRationsLimit,
                    remainingRations: item.remainingRations,
                    lowStockThreshold: item.lowStockThreshold
                  });

                  return (
                    <div
                      key={item.dishId}
                      className={`bg-white p-4 rounded-xl border transition-shadow shadow-sm ${
                        item.active ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-base font-bold text-slate-900">{item.dishName}</span>
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
                          <p className="text-xs text-slate-600 font-bold">
                            S/ {(item.priceCents / 100).toFixed(2)}
                          </p>
                        </div>

                        {!isPublished && (
                          <div className="flex items-center space-x-3">
                            <label className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-700 cursor-pointer min-h-[44px]">
                              <input
                                type="checkbox"
                                checked={item.active}
                                onChange={(e) =>
                                  handleUpdateItem(actualIndex, { active: e.target.checked })
                                }
                                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                              />
                              <span>Activo para venta</span>
                            </label>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(actualIndex)}
                              className="text-xs px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded min-h-[38px]"
                            >
                              Quitar
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Configuración de Raciones (solo editable en Borrador) */}
                      {!isPublished && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <RationInput
                            hasRationsLimit={item.hasRationsLimit}
                            totalRations={item.totalRations}
                            remainingRations={item.remainingRations}
                            onChangeLimit={(limit) =>
                              handleUpdateItem(actualIndex, { hasRationsLimit: limit })
                            }
                            onChangeTotal={(tot) =>
                              handleUpdateItem(actualIndex, { totalRations: tot })
                            }
                            onChangeRemaining={(rem) =>
                              handleUpdateItem(actualIndex, { remainingRations: rem })
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Barra de Guardado y Publicación (solo en Borrador) */}
            {!isPublished && (
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
                <div>
                  <p className="text-xs text-slate-500">
                    Total de platos en el borrador: <strong className="text-slate-800">{draftItems.length}</strong> (
                    {draftItems.filter((d) => d.active).length} activos).
                  </p>
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold min-h-[44px] shadow-sm disabled:opacity-50"
                  >
                    {isSaving ? 'Guardando...' : 'Guardar Borrador'}
                  </button>

                  <PublishMenuButton
                    hasActiveItems={hasActiveItems}
                    isPublished={isPublished}
                    isLoading={loading}
                    onPublish={handlePublish}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal DishPicker */}
      <DishPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        dishes={dishes}
        sections={sections}
        alreadyAddedDishIds={draftItems.map((d) => d.dishId)}
        onSelectDish={handleAddDish}
      />
    </div>
  );
};

export default MenuDayPage;
