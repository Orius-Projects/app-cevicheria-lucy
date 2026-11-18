import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LoginPage } from '../pages/LoginPage';
import { WaiterPage } from '../pages/waiter/WaiterPage';
import { KitchenPage } from '../pages/kitchen/KitchenPage';
import { AdminPage } from '../pages/admin/AdminPage';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGuard } from './RoleGuard';

const RootRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'ENCARGADO':
      return <Navigate to="/encargado" replace />;
    case 'COCINERO':
      return <Navigate to="/cocina" replace />;
    case 'MOZO':
    default:
      return <Navigate to="/mozo" replace />;
  }
};

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Ruta protegida Mozo */}
        <Route
          path="/mozo"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['MOZO', 'ENCARGADO']}>
                <WaiterPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        {/* Ruta protegida Cocina */}
        <Route
          path="/cocina"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['COCINERO', 'ENCARGADO']}>
                <KitchenPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        {/* Ruta protegida Encargado */}
        <Route
          path="/encargado"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['ENCARGADO']}>
                <AdminPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
