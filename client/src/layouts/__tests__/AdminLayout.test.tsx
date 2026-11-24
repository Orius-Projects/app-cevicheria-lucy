/** @vitest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminLayout } from '../AdminLayout';
import { useAuthStore } from '../../stores/authStore';

afterEach(cleanup);

describe('AdminLayout Component', () => {
  it('renders sidebar with branding and modules, but without user card at bottom', () => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        username: 'sebastian.chicata',
        displayName: 'sebastian.chicata',
        role: 'ENCARGADO'
      },
      isAuthenticated: true
    });

    render(
      <MemoryRouter initialEntries={['/encargado']}>
        <AdminLayout>
          <div data-testid="test-content">Contenido de prueba</div>
        </AdminLayout>
      </MemoryRouter>
    );

    // Sidebar Branding & Navigation
    expect(within(screen.getByRole('complementary')).getByText('Cevichería Lucy')).toBeInTheDocument();
    expect(screen.getByText('Módulos de Gestión')).toBeInTheDocument();
    expect(screen.getByText('Platos y raciones')).toBeInTheDocument();
    expect(screen.getByText('Turno')).toBeInTheDocument();
    expect(screen.getByText('Cierre de turno')).toBeInTheDocument();
    expect(screen.queryByText('Menú del Día')).not.toBeInTheDocument();
    expect(screen.queryByText('Platos Maestros')).not.toBeInTheDocument();
    expect(screen.queryByText('Raciones y Agotados')).not.toBeInTheDocument();

    // Top action buttons (gear icon removed as it is redundant)
    expect(screen.getByLabelText(/Notificaciones/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Ayuda')).toBeInTheDocument();
    expect(screen.queryByLabelText('Configuración')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Menú de usuario')).toBeInTheDocument();

    // Dropdown is closed initially
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens user menu dropdown on avatar click and renders all requested options', () => {
    const logoutMock = vi.fn();
    useAuthStore.setState({
      user: {
        id: 'u1',
        username: 'sebastian.chicata',
        displayName: 'sebastian.chicata',
        role: 'ENCARGADO'
      },
      isAuthenticated: true,
      logout: logoutMock
    });

    render(
      <MemoryRouter initialEntries={['/encargado']}>
        <AdminLayout>
          <div>Main</div>
        </AdminLayout>
      </MemoryRouter>
    );

    const avatarBtn = screen.getByLabelText('Menú de usuario');
    expect(avatarBtn).toBeInTheDocument();

    // Click avatar button to toggle dropdown
    fireEvent.click(avatarBtn);

    // Dropdown window should appear
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('sebastian.chicata@gmail.com')).toBeInTheDocument();

    // Check menu options
    expect(screen.getByRole('menuitem', { name: /Perfil/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Configuración de la cuenta/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Theme/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Cambiar de cuenta/i })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Cerrar sesión/i })).toBeInTheDocument();

    // "Mejora versión" must NOT be in the document
    expect(screen.queryByText(/Mejora versión/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Mejorar versión/i)).not.toBeInTheDocument();

    // Click "Cerrar sesión"
    fireEvent.click(screen.getByRole('menuitem', { name: /Cerrar sesión/i }));
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', () => {
    render(
      <MemoryRouter initialEntries={['/encargado']}>
        <AdminLayout>
          <div data-testid="outside-area">Outside</div>
        </AdminLayout>
      </MemoryRouter>
    );

    const avatarBtn = screen.getByLabelText('Menú de usuario');
    fireEvent.click(avatarBtn);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside-area'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
