import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      const user = await login(username, password);
      // Redirección según rol
      switch (user.role) {
        case 'ENCARGADO':
          navigate('/encargado', { replace: true });
          break;
        case 'COCINERO':
          navigate('/cocina', { replace: true });
          break;
        case 'MOZO':
        default:
          navigate('/mozo', { replace: true });
          break;
      }
    } catch {
      // El error ya queda guardado en authStore
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-marine-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4 transition-colors duration-200 relative">
      {/* Botón flotante para cambiar tema */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-marine-900 border border-slate-200 dark:border-marine-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-100 dark:hover:bg-marine-850 transition-colors min-h-[44px] cursor-pointer"
          title={`Cambiar a tema ${theme === 'dark' ? 'Brisa Marina' : 'Mar Profundo'}`}
        >
          {theme === 'dark' ? (
            <>
              <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              <span>Brisa Marina</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              <span>Mar Profundo</span>
            </>
          )}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-3xl font-extrabold text-brand-700 dark:text-brand-300 tracking-tight">
          Cevichería Lucy
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
          Sistema de pedidos y gestión de salón
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-marine-900 py-8 px-6 shadow-md rounded-2xl border border-slate-200 dark:border-marine-800 sm:px-10 transition-colors">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Usuario
              </label>
              <div className="mt-1.5">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 bg-white dark:bg-marine-950 border border-slate-300 dark:border-marine-700 rounded-xl shadow-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium text-base focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 min-h-[44px] transition-colors"
                  placeholder="ej. mozo1"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Contraseña
              </label>
              <div className="mt-1.5">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 bg-white dark:bg-marine-950 border border-slate-300 dark:border-marine-700 rounded-xl shadow-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium text-base focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 min-h-[44px] transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-base font-bold text-slate-950 bg-brand-400 hover:bg-brand-300 dark:bg-brand-400 dark:hover:bg-brand-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 min-h-[48px] items-center disabled:opacity-50 transition-all cursor-pointer active:scale-[0.99]"
              >
                {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
