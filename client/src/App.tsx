import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 border border-slate-200">
        <h1 className="text-2xl font-bold text-brand-700 mb-2">Cevichería Lucy</h1>
        <p className="text-slate-600 mb-4">
          Sistema web responsive de pedidos y cocina en tiempo real.
        </p>
        <div className="bg-slate-100 rounded-lg p-4 text-sm text-slate-700">
          <p className="font-semibold mb-1">Estado de la plataforma:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Workspaces configurados</li>
            <li>TypeScript Strict activo</li>
            <li>Tailwind CSS integrado</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default App;
