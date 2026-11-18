import React, { useEffect } from 'react';
import { AppRoutes } from './routes';
import { useAuthStore } from './stores/authStore';

export const App: React.FC = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return <AppRoutes />;
};

export default App;
