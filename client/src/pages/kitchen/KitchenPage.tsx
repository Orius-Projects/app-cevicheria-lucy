import React from 'react';
import { useAuthStore } from '../../stores/authStore';

export const KitchenPage: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-amber-400">Cevichería Lucy — Cocina</h1>
          <p className="text-xs text-slate-400">{user?.displayName} ({user?.role})</p>
        </div>
        <button
          onClick={() => logout()}
          className="text-xs px-3 py-2 min-h-[44px] bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200"
        >
          Cerrar sesión
        </button>
      </header>

      <main className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <div className="max-w-md bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl space-y-4">
          <div className="text-4xl">👨‍🍳</div>
          <h2 className="text-xl font-bold">Tablero de Cocina (KDS)</h2>
          <p className="text-slate-400 text-sm">
            La cola FIFO y el botón “Marcar listo” se habilitarán en la Fase 6 (pedidos y cocina).
          </p>
        </div>
      </main>
    </div>
  );
};

export default KitchenPage;
