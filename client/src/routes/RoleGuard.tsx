import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '@cevicheria/shared';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactElement;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    // Redirige al destino natural según su propio rol
    switch (user.role) {
      case 'ENCARGADO':
        return <Navigate to="/encargado" replace />;
      case 'COCINERO':
        return <Navigate to="/cocina" replace />;
      case 'MOZO':
      default:
        return <Navigate to="/mozo" replace />;
    }
  }

  return children;
};

export default RoleGuard;
