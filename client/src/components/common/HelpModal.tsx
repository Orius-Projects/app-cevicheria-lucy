import React, { useEffect, useState } from 'react';

export interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: string;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  initialRole = 'MOZO'
}) => {
  const [activeTab, setActiveTab] = useState<'MOZO' | 'COCINERO' | 'ENCARGADO'>(
    initialRole === 'COCINERO' ? 'COCINERO' : initialRole === 'ENCARGADO' ? 'ENCARGADO' : 'MOZO'
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-marine-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between bg-slate-50/80 dark:bg-marine-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-700 dark:text-brand-400 flex items-center justify-center font-black text-xl border border-brand-500/20">
              ?
            </div>
            <div>
              <h2 id="help-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Centro de Ayuda Operativa
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Guía de uso rápido para el personal de Cevichería Lucy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition cursor-pointer text-xl font-bold"
            aria-label="Cerrar modal de ayuda"
          >
            ×
          </button>
        </div>

        {/* Tabs de roles */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-marine-900/30 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('MOZO')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'MOZO'
                ? 'border-brand-500 text-brand-700 dark:text-brand-300 bg-white dark:bg-marine-800 shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            🍽️ Rol Mozo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('COCINERO')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'COCINERO'
                ? 'border-brand-500 text-brand-700 dark:text-brand-300 bg-white dark:bg-marine-800 shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            🔥 Rol Cocina
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ENCARGADO')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'ENCARGADO'
                ? 'border-brand-500 text-brand-700 dark:text-brand-300 bg-white dark:bg-marine-800 shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            📋 Rol Encargado
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 dark:text-slate-300">
          {activeTab === 'MOZO' && (
            <div className="space-y-4">
              <div className="bg-brand-50/70 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800/50 rounded-2xl p-4">
                <h4 className="font-bold text-brand-900 dark:text-brand-200 text-sm mb-1.5 flex items-center gap-1.5">
                  <span>📱</span> Toma de Comandas en Celular y Tablet
                </h4>
                <ul className="space-y-1.5 list-disc list-inside">
                  <li><strong>Borradores independientes por mesa:</strong> Cada mesa guarda su propio borrador. Si cambias de mesa, tu pedido previo se conserva sin mezclarse.</li>
                  <li><strong>Barra flotante inferior:</strong> Al agregar platos en móviles, una barra flotante en la parte inferior muestra el total y te permite abrir la comanda sin scrollear hasta abajo.</li>
                  <li><strong>Envío directo:</strong> Al pulsar "Enviar a Cocina", el pedido viaja de inmediato al KDS de cocina y la app te regresa a tus pedidos activos.</li>
                </ul>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  🚦 Estados de Mesas en el Salón
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300">
                    <span className="font-bold block text-xs">🟢 LIBRE</span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400">Mesa disponible para recibir comensales.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300">
                    <span className="font-bold block text-xs">🟡 OCUPADA</span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-400">Tiene comandas enviadas a cocina en preparación.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300">
                    <span className="font-bold block text-xs">🔴 POR CERRAR</span>
                    <span className="text-[11px] text-rose-700 dark:text-rose-400">Todos los pedidos entregados. Lista para cerrar sesión.</span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-1.5">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  🔔 Avisos Sonoros y Táctiles (Hápticos)
                </h4>
                <p>
                  Cuando la cocina marca un plato como <strong>LISTO</strong>, la campana de notificaciones emite un aviso sonoro (si está activado) y una vibración suave en celulares compatibles para que sirvas de inmediato el ceviche fresco.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'COCINERO' && (
            <div className="space-y-4">
              <div className="bg-brand-50/70 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800/50 rounded-2xl p-4">
                <h4 className="font-bold text-brand-900 dark:text-brand-200 text-sm mb-1.5">
                  🔥 Pantalla KDS de Cocina
                </h4>
                <ul className="space-y-1.5 list-disc list-inside">
                  <li><strong>Cola de pedidos:</strong> Los pedidos aparecen ordenados por turno de llegada desde el salón.</li>
                  <li><strong>Notas de preparación:</strong> Las indicaciones del mozo (ej. "sin ají", "bien cocido") se destacan con fondo ámbar.</li>
                  <li><strong>Marcar como LISTO:</strong> Al terminar la preparación, pulsa "Marcar Listo" para alertar inmediatamente al mozo correspondiente.</li>
                </ul>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-1.5">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  🌙 Modo Mar Profundo (Tema Oscuro)
                </h4>
                <p>
                  Para evitar el cansancio visual frente a las pantallas en cocinas de ritmo acelerado, puedes activar el <strong>Tema Oscuro</strong> desde el menú de usuario (esquina superior derecha).
                </p>
              </div>
            </div>
          )}

          {activeTab === 'ENCARGADO' && (
            <div className="space-y-4">
              <div className="bg-brand-50/70 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800/50 rounded-2xl p-4">
                <h4 className="font-bold text-brand-900 dark:text-brand-200 text-sm mb-1.5">
                  ⚙️ Gestión Integral del Restaurante
                </h4>
                <ul className="space-y-1.5 list-disc list-inside">
                  <li><strong>Platos y raciones:</strong> Define el menú del día, ajusta raciones con los botones +/- o marca platos como agotados si se termina la pesca del día.</li>
                  <li><strong>Gestión de Mesas:</strong> Puedes agregar nuevas mesas (ej. M13, M14) en el Primer Piso, Segundo Piso o Terraza, y definir su capacidad de sillas.</li>
                  <li><strong>Control de Turnos:</strong> Apertura de turno matutino/almuerzo y cierre consolidado con cuadre de platos servidos.</li>
                </ul>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-1.5">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  🛡️ Principio Constitucional del Sistema
                </h4>
                <p className="text-slate-500 dark:text-slate-400">
                  El sistema se enfoca exclusivamente en la operativa de comandas y control de raciones, garantizando máxima agilidad en el despacho de ceviches frescos.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-marine-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-400 text-brand-950 dark:text-slate-950 rounded-xl font-bold text-xs shadow-xs min-h-[44px] cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
