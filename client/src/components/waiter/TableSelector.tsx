import React, { useEffect, useState, useMemo } from 'react';
import { useTablesStore, TableItem } from '../../stores/tablesStore';
import { TableStatus } from '@cevicheria/shared';

interface TableSelectorProps {
  onSelectTable?: (table: TableItem) => void;
  selectedTableId?: string | null;
}

export type ZoneKey = 'TODOS' | 'PRIMER_PISO' | 'SEGUNDO_PISO' | 'AFUERA';

/**
 * Ícono vectorial para "Todo el Local" (Layout en cuadrícula)
 */
export const LocalOverviewIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

/**
 * Ícono vectorial para "Primer Piso" (Edificio / Salón Principal)
 */
export const FloorOneIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 21h18" />
    <path d="M4 21V9l8-6 8 6v12" />
    <path d="M9 21v-5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5" />
    <line x1="9" y1="10" x2="15" y2="10" />
  </svg>
);

/**
 * Ícono vectorial para "Segundo Piso" (Escalera hacia nivel superior)
 */
export const FloorTwoIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 19h4.5v-4h4.5v-4h4.5V7H21" />
    <polyline points="18 4 21 7 18 10" />
  </svg>
);

/**
 * Ícono vectorial para "Afuera del Local / Terraza" (Parasol exterior de terraza)
 */
export const OutdoorIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 22V12" />
    <path d="M2 12c0-5.5 4.5-10 10-10s10 4.5 10 10H2z" />
    <path d="M12 2v2" />
    <path d="M12 18a2 2 0 1 1-2-2" />
  </svg>
);

/**
 * Ícono vectorial de Mesa de restaurante con sillas.
 */
export const TableIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5 text-emerald-600' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {/* Tablero de mesa */}
    <rect x="5" y="8" width="14" height="4" rx="1" fill="currentColor" fillOpacity="0.2" />
    <line x1="7" y1="12" x2="7" y2="19" strokeWidth="2.5" />
    <line x1="17" y1="12" x2="17" y2="19" strokeWidth="2.5" />
    {/* Respaldo silla izquierda */}
    <path d="M3 11V6a1 1 0 0 1 1-1h1" />
    {/* Respaldo silla derecha */}
    <path d="M21 11V6a1 1 0 0 0-1-1h-1" />
  </svg>
);

/**
 * Ícono vectorial de Banderita para indicar mesa ocupada.
 */
export const FlagIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5 text-amber-600' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {/* Asta de la bandera */}
    <line x1="4" y1="21" x2="4" y2="3" strokeWidth="2.5" />
    {/* Banderola triangular/pabellón */}
    <path
      d="M4 4h14l-3 4.5 3 4.5H4z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

interface ZoneDefinition {
  key: ZoneKey;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  expectedCount: number;
}

const ZONES: ZoneDefinition[] = [
  {
    key: 'TODOS',
    label: 'Todo el Local',
    sublabel: 'Vista General (12 Mesas)',
    icon: LocalOverviewIcon,
    expectedCount: 12
  },
  {
    key: 'PRIMER_PISO',
    label: 'Primer Piso',
    sublabel: 'Salón Principal',
    icon: FloorOneIcon,
    expectedCount: 4
  },
  {
    key: 'SEGUNDO_PISO',
    label: 'Segundo Piso',
    sublabel: 'Nivel Superior',
    icon: FloorTwoIcon,
    expectedCount: 4
  },
  {
    key: 'AFUERA',
    label: 'Afuera del Local',
    sublabel: 'Terraza al Aire Libre',
    icon: OutdoorIcon,
    expectedCount: 4
  }
];

const statusColors: Record<TableStatus, { bg: string; text: string; border: string; label: string }> = {
  LIBRE: {
    bg: 'bg-emerald-50/80 hover:bg-emerald-100/90',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    label: 'Libre'
  },
  OCUPADA: {
    bg: 'bg-amber-50/90 hover:bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-300',
    label: 'Ocupada'
  },
  POR_CERRAR: {
    bg: 'bg-rose-50/90 hover:bg-rose-100',
    text: 'text-rose-800',
    border: 'border-rose-300',
    label: 'Por Cerrar'
  }
};

/**
 * Mesas predeterminadas para Afuera del Local (M09 a M12) en caso de que la base
 * de datos del cliente aún no las haya sincronizado.
 */
const DEFAULT_AFUERA_TABLES: TableItem[] = [
  { id: 'tbl-m09', code: 'M09', zone: 'Afuera (Terraza)', seats: 4, state: 'LIBRE', openSessionId: null },
  { id: 'tbl-m10', code: 'M10', zone: 'Afuera (Terraza)', seats: 4, state: 'LIBRE', openSessionId: null },
  { id: 'tbl-m11', code: 'M11', zone: 'Afuera (Terraza)', seats: 4, state: 'LIBRE', openSessionId: null },
  { id: 'tbl-m12', code: 'M12', zone: 'Afuera (Terraza)', seats: 4, state: 'LIBRE', openSessionId: null }
];

/**
 * Categoriza una mesa en una de las 3 zonas físicas del restaurante:
 * 1. Primer Piso (M01-M04)
 * 2. Segundo Piso (M05-M08)
 * 3. Afuera del Local / Terraza (M09-M12)
 */
export function getTableZoneKey(table?: TableItem | null): 'PRIMER_PISO' | 'SEGUNDO_PISO' | 'AFUERA' {
  if (!table || !table.code) return 'PRIMER_PISO';
  const z = (table.zone || '').toLowerCase();
  const c = String(table.code).toUpperCase().replace('-', '');

  if (
    z.includes('segundo') ||
    z.includes('piso 2') ||
    ['M05', 'M06', 'M07', 'M08'].includes(c)
  ) {
    return 'SEGUNDO_PISO';
  }
  if (
    z.includes('afuera') ||
    z.includes('terraza') ||
    z.includes('exterior') ||
    ['M09', 'M10', 'M11', 'M12'].includes(c)
  ) {
    return 'AFUERA';
  }
  return 'PRIMER_PISO';
}

export const TableSelector: React.FC<TableSelectorProps> = ({
  onSelectTable,
  selectedTableId
}) => {
  const { tables, isLoading, error, fetchTables, selectTable } = useTablesStore();
  const [activeZone, setActiveZone] = useState<ZoneKey>('TODOS');

  const safeTables = Array.isArray(tables) ? tables : [];

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const handleSelect = (table: TableItem) => {
    selectTable(table);
    if (onSelectTable) {
      onSelectTable(table);
    }
  };

  if (isLoading && safeTables.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mr-3"></div>
        Cargando estado de mesas...
      </div>
    );
  }

  if (error && safeTables.length === 0) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
        <p className="font-semibold">Error al cargar mesas:</p>
        <p>{error}</p>
        <button
          onClick={() => fetchTables()}
          className="mt-2 px-4 py-2 min-h-[44px] bg-red-600 text-white rounded font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Agrupación de mesas del Primer y Segundo Piso
  const primerPisoTables = safeTables.filter((t) => getTableZoneKey(t) === 'PRIMER_PISO');
  const segundoPisoTables = safeTables.filter((t) => getTableZoneKey(t) === 'SEGUNDO_PISO');

  // Para Afuera del Local: asegura que siempre se muestren las 4 mesas (M09 a M12)
  const afueraTables = useMemo(() => {
    const backendAfuera = safeTables.filter((t) => getTableZoneKey(t) === 'AFUERA');
    if (backendAfuera.length >= 4) {
      return backendAfuera.slice(0, 4);
    }
    const existingCodes = new Set(backendAfuera.map((t) => t?.code).filter(Boolean));
    const missing = DEFAULT_AFUERA_TABLES.filter((t) => !existingCodes.has(t.code));
    return [...backendAfuera, ...missing].slice(0, 4);
  }, [safeTables]);

  const totalTablesCount = primerPisoTables.length + segundoPisoTables.length + afueraTables.length;

  const renderTableCard = (table: TableItem) => {
    if (!table) return null;
    const stateKey = (table.state || 'LIBRE').toUpperCase() as TableStatus;
    const config = statusColors[stateKey] || statusColors.LIBRE;
    const isSelected = selectedTableId === table.id;
    const isOccupied = stateKey !== 'LIBRE';
    const zoneKey = getTableZoneKey(table);
    const zoneLabel =
      zoneKey === 'PRIMER_PISO'
        ? 'Primer Piso'
        : zoneKey === 'SEGUNDO_PISO'
        ? 'Segundo Piso'
        : 'Afuera (Terraza)';

    return (
      <button
        key={table.id}
        type="button"
        onClick={() => handleSelect(table)}
        className={`relative min-h-[96px] p-4 rounded-2xl border-2 transition-all flex flex-col justify-between items-start text-left shadow-xs hover:shadow-md cursor-pointer active:scale-[0.98] ${config.bg} ${config.border} ${
          isSelected ? 'ring-2 ring-brand-600 ring-offset-2 border-brand-500' : ''
        }`}
      >
        {/* Cabecera de la mesa: Código + Ícono (Mesa si libre, Banderita si ocupada) */}
        <div className="w-full flex justify-between items-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/80 border border-slate-200/60 flex items-center justify-center shrink-0 shadow-xs">
              {isOccupied ? (
                <FlagIcon className="w-5 h-5 text-amber-600" />
              ) : (
                <TableIcon className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <div>
              <span className="text-xl font-black text-slate-900 tracking-tight leading-none block">
                {table.code}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {table.seats || 4} sillas
              </span>
            </div>
          </div>

          {/* Badge de estado */}
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${config.bg} ${config.text} ${config.border}`}
          >
            {isOccupied && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />}
            {config.label}
          </span>
        </div>

        {/* Pie de tarjeta: Indicador contextual de zona y acción */}
        <div className="mt-3 text-xs text-slate-600 flex justify-between items-center w-full pt-2 border-t border-slate-200/50">
          <span className="text-[11px] font-semibold text-slate-500 truncate">
            {zoneLabel}
          </span>
          <span className="text-[11px] font-bold text-brand-700">
            {isOccupied ? 'Ver comanda →' : 'Tocar para abrir'}
          </span>
        </div>
      </button>
    );
  };

  const renderZoneSection = (
    title: string,
    subtitle: string,
    IconComponent: React.ComponentType<{ className?: string }>,
    zoneTables: TableItem[]
  ) => (
    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3.5">
      {/* Cabecera del espacio (sin etiqueta de conteo en la parte superior derecha) */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-200/80 flex items-center justify-center text-brand-700 shadow-xs shrink-0">
            <IconComponent className="w-5 h-5 text-brand-700" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 leading-tight">{title}</h3>
            <p className="text-xs text-slate-500">{subtitle} • {zoneTables.length} mesas</p>
          </div>
        </div>
      </div>

      {zoneTables.length === 0 ? (
        <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
          No hay mesas configuradas en este ambiente.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {zoneTables.map((table) => renderTableCard(table))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Selector Interactivo de Ambientes / Pisos */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Pestañas de filtrado interactivo */}
        <div
          role="tablist"
          aria-label="Filtrar por ambientes"
          className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto max-w-full"
        >
          {ZONES.map((zone) => {
            const isActive = activeZone === zone.key;
            const ZoneIcon = zone.icon;
            let countBadge = `${totalTablesCount}`;
            if (zone.key === 'PRIMER_PISO') countBadge = `${primerPisoTables.length}`;
            if (zone.key === 'SEGUNDO_PISO') countBadge = `${segundoPisoTables.length}`;
            if (zone.key === 'AFUERA') countBadge = `${afueraTables.length}`;

            return (
              <button
                key={zone.key}
                role="tab"
                aria-selected={isActive}
                aria-label={`Pestaña ${zone.label}`}
                type="button"
                onClick={() => setActiveZone(zone.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold min-h-[40px] flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                <ZoneIcon className="w-4 h-4 shrink-0" />
                <span>{zone.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {countBadge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Botón Refrescar */}
        <button
          type="button"
          onClick={() => fetchTables()}
          className="text-xs font-bold text-brand-600 hover:text-brand-800 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2 min-h-[40px] flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer ml-auto"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          <span>Refrescar</span>
        </button>
      </div>

      {/* Contenido según la zona seleccionada */}
      <div className="space-y-4">
        {(activeZone === 'TODOS' || activeZone === 'PRIMER_PISO') &&
          renderZoneSection(
            'Primer Piso',
            'Salón Principal',
            FloorOneIcon,
            primerPisoTables
          )}

        {(activeZone === 'TODOS' || activeZone === 'SEGUNDO_PISO') &&
          renderZoneSection(
            'Segundo Piso',
            'Nivel Superior',
            FloorTwoIcon,
            segundoPisoTables
          )}

        {(activeZone === 'TODOS' || activeZone === 'AFUERA') &&
          renderZoneSection(
            'Afuera del Local',
            'Terraza Exterior',
            OutdoorIcon,
            afueraTables
          )}
      </div>
    </div>
  );
};

export default TableSelector;
