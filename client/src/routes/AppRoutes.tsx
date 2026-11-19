import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LoginPage } from '../pages/LoginPage';
import { WaiterDashboardPage } from '../pages/waiter/WaiterDashboardPage';
import { NewOrderPage } from '../pages/waiter/NewOrderPage';
import { ActiveOrdersPage } from '../pages/waiter/ActiveOrdersPage';
import { OrderDetailPage } from '../pages/waiter/OrderDetailPage';
import { KitchenPage } from '../pages/kitchen/KitchenPage';
import { AdminPage } from '../pages/admin/AdminPage';
import { DishesPage } from '../pages/encargado/DishesPage';
import { MenuDayPage } from '../pages/encargado/MenuDayPage';
import { RationAdjustmentsPage } from '../pages/encargado/RationAdjustmentsPage';
import { MenuView } from '../pages/shared/MenuView';
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

        {/* Rutas Mozo */}
        <Route
          path="/mozo"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['MOZO', 'ENCARGADO']}>
                <WaiterDashboardPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mozo/pedido/nuevo"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['MOZO', 'ENCARGADO']}>
                <NewOrderPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mozo/pedidos"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['MOZO', 'ENCARGADO']}>
                <ActiveOrdersPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mozo/pedidos/:id"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['MOZO', 'ENCARGADO']}>
                <OrderDetailPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mozo/menu"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['MOZO', 'ENCARGADO']}>
                <MenuView />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        {/* Rutas Cocina */}
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

        {/* Rutas Encargado */}
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
        <Route
          path="/encargado/menu"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['ENCARGADO']}>
                <MenuDayPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/encargado/platos"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['ENCARGADO']}>
                <DishesPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/encargado/raciones"
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['ENCARGADO']}>
                <RationAdjustmentsPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        {/* Menú compartido público / consulta */}
        <Route
          path="/menu"
          element={
            <ProtectedRoute>
              <MenuView />
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
