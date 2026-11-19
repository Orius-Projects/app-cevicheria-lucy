import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useMenuAdminStore } from '../../stores/menuAdminStore';
import { AdminNavigation } from '../../components/menu/AdminNavigation';
import { VariationEditor } from '../../components/menu/VariationEditor';
import { DishDTO, DishCourse, DishVariation, CreateDishInput } from '@cevicheria/shared';

const COURSES: { value: DishCourse; label: string }[] = [
  { value: 'ENTRADA', label: 'Entrada' },
  { value: 'FONDO', label: 'Segundo / Fondo' },
  { value: 'PLATO', label: 'Plato único' },
  { value: 'BEBIDA', label: 'Bebida' },
  { value: 'OTRO', label: 'Otro' }
];

export const DishesPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const {
    dishes,
    sections,
    loading,
    error,
    loadDishesAndSections,
    createDish,
    updateDish,
    deactivateDish,
    clearError
  } = useMenuAdminStore();

  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<DishDTO | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [priceSoles, setPriceSoles] = useState('25.00');
  const [course, setCourse] = useState<DishCourse>('FONDO');
  const [isFixed, setIsFixed] = useState(false);
  const [isRotating, setIsRotating] = useState(true);
  const [variations, setVariations] = useState<DishVariation[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDishesAndSections();
  }, [loadDishesAndSections]);

  const openCreateModal = () => {
    setEditingDish(null);
    setName('');
    setDescription('');
    setSectionId(sections[0]?.id || '');
    setPriceSoles('20.00');
    setCourse('FONDO');
    setIsFixed(false);
    setIsRotating(true);
    setVariations([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (dish: DishDTO) => {
    setEditingDish(dish);
    setName(dish.name);
    setDescription(dish.description || '');
    setSectionId(dish.sectionId);
    setPriceSoles((dish.priceCents / 100).toFixed(2));
    setCourse(dish.course);
    setIsFixed(dish.isFixed);
    setIsRotating(dish.isRotating);
    setVariations(dish.variations || []);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('El nombre del plato es obligatorio.');
      return;
    }

    if (!sectionId) {
      setFormError('Debe seleccionar una sección.');
      return;
    }

    const priceNum = parseFloat(priceSoles);
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError('El precio debe ser un número válido mayor o igual a 0.');
      return;
    }

    const priceCents = Math.round(priceNum * 100);

    const payload: CreateDishInput = {
      sectionId,
      name: trimmedName,
      description: description.trim() || undefined,
      priceCents,
      course,
      isFixed,
      isRotating,
      variations: variations.map((v, i) => ({
        id: v.id,
        name: v.name.trim(),
        sortOrder: i,
        active: v.active ?? true
      }))
    };

    try {
      if (editingDish) {
        await updateDish(editingDish.id, payload);
        setSuccessMessage(`Plato "${trimmedName}" actualizado correctamente.`);
      } else {
        await createDish(payload);
        setSuccessMessage(`Plato "${trimmedName}" creado con éxito.`);
      }
      setIsModalOpen(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || err.message || 'Error al guardar el plato.');
    }
  };

  const handleDeactivate = async (dish: DishDTO) => {
    if (!window.confirm(`¿Estás seguro de desactivar el plato "${dish.name}"? Podrás reactivarlo luego.`)) {
      return;
    }
    try {
      await deactivateDish(dish.id);
      setSuccessMessage(`Plato "${dish.name}" dado de baja.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error al desactivar plato');
    }
  };

  const handleReactivate = async (dish: DishDTO) => {
    try {
      await updateDish(dish.id, { active: true });
      setSuccessMessage(`Plato "${dish.name}" reactivado.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error al reactivar plato');
    }
  };

  const filteredDishes = dishes.filter((dish) => {
    const matchesSection = selectedSection === 'all' || dish.sectionId === selectedSection;
    const matchesSearch =
      dish.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dish.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSection && matchesSearch;
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

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-h-[44px] bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="all">Todas las secciones ({dishes.length})</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({dishes.filter((d) => d.sectionId === s.id).length})
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Buscar plato por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-h-[44px] flex-1 sm:w-64 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="w-full sm:w-auto px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold min-h-[44px] shadow-sm flex items-center justify-center space-x-1"
          >
            <span>+ Nuevo Plato</span>
          </button>
        </div>

        {/* Dishes list */}
        {loading && dishes.length === 0 ? (
          <div className="text-center py-12 text-slate-400">Cargando catálogo de platos...</div>
        ) : filteredDishes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
            No se encontraron platos registrados con los filtros seleccionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDishes.map((dish) => {
              const sec = sections.find((s) => s.id === dish.sectionId);
              return (
                <div
                  key={dish.id}
                  className={`bg-white rounded-xl border p-4 flex flex-col justify-between shadow-sm transition-shadow ${
                    dish.active ? 'border-slate-200 hover:shadow-md' : 'border-slate-300 bg-slate-50 opacity-75'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs px-2 py-0.5 rounded bg-brand-50 text-brand-700 font-medium">
                        {sec?.name || 'Sección'}
                      </span>
                      <span className="text-base font-bold text-slate-900">
                        S/ {(dish.priceCents / 100).toFixed(2)}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      {dish.name}
                      {!dish.active && (
                        <span className="ml-2 text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                          Inactivo
                        </span>
                      )}
                    </h3>

                    {dish.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {dish.description}
                      </p>
                    )}

                    {dish.variations && dish.variations.length > 0 && (
                      <div className="pt-1">
                        <p className="text-xs text-slate-400 mb-1 font-medium">
                          Variaciones permitidas:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {dish.variations.map((v, i) => (
                            <span
                              key={v.id || i}
                              className={`text-[11px] px-2 py-0.5 rounded border ${
                                v.active ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-50 text-slate-400 line-through border-slate-100'
                              }`}
                            >
                              {v.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-3 flex justify-end space-x-2">
                    <button
                      onClick={() => openEditModal(dish)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded min-h-[38px]"
                    >
                      Editar
                    </button>
                    {dish.active ? (
                      <button
                        onClick={() => handleDeactivate(dish)}
                        className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 rounded min-h-[38px]"
                      >
                        Dar de baja
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(dish)}
                        className="px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded min-h-[38px]"
                      >
                        Reactivar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Alta / Edición de Plato */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                {editingDish ? 'Editar Plato Maestro' : 'Nuevo Plato Maestro'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold min-h-[44px] px-2"
              >
                ×
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre del Plato *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Ceviche mixto"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm min-h-[44px] focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Sección *
                  </label>
                  <select
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm min-h-[44px] bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Precio (S/) *
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    required
                    value={priceSoles}
                    onChange={(e) => setPriceSoles(e.target.value)}
                    placeholder="25.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm min-h-[44px] focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">Precio final al cliente en soles.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ingredientes principales, acompañamientos..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tipo de plato
                  </label>
                  <select
                    value={course}
                    onChange={(e) => setCourse(e.target.value as DishCourse)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm min-h-[44px] bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {COURSES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-4 pt-6">
                  <label className="inline-flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFixed}
                      onChange={(e) => setIsFixed(e.target.checked)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span>Fijo de carta</span>
                  </label>

                  <label className="inline-flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRotating}
                      onChange={(e) => setIsRotating(e.target.checked)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span>Rotativo del día</span>
                  </label>
                </div>
              </div>

              {/* Editor de variaciones */}
              <div className="border-t border-slate-100 pt-3">
                <VariationEditor
                  variations={variations}
                  onChange={setVariations}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold min-h-[44px] disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : editingDish ? 'Actualizar Plato' : 'Crear Plato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DishesPage;
