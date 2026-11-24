import React, { useEffect } from 'react';
import { AppRoutes } from './routes/AppRoutes';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export const App: React.FC = () => {
  const { checkAuth } = useAuthStore();
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
    checkAuth();
  }, [initTheme, checkAuth]);

  return (
    <ErrorBoundary fallbackTitle="Error en la aplicación">
      <AppRoutes />
    </ErrorBoundary>
  );
};

export default App;
