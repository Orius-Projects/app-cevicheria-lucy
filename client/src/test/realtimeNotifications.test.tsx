import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, act, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToastContainer } from '../components/notifications/ToastContainer';
import { NotificationCenter } from '../components/notifications/NotificationCenter';
import { useNotificationsStore } from '../stores/notificationsStore';

describe('Realtime Notifications (Spec 005 UI)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationsStore.getState().clearAll();
  });

  afterEach(() => {
    cleanup();
  });

  it('order:ready displays visual toast and updates badge counter', async () => {
    render(
      <div>
        <NotificationCenter />
        <ToastContainer />
      </div>
    );

    // No hay badge al inicio
    expect(screen.queryByTestId('notification-badge')).toBeNull();

    // Llega evento order:ready
    act(() => {
      useNotificationsStore.getState().push({
        eventId: 'evt-ready-101',
        type: 'order:ready',
        message: '¡Pedido #101 para Mesa M-01 está LISTO para recoger!',
        tableCode: 'M-01',
        orderNumber: 101,
        playSound: false
      });
    });

    // Toast visible en pantalla
    await waitFor(() => {
      expect(
        screen.getByText(/¡Pedido #101 para Mesa M-01 está LISTO para recoger!/i)
      ).toBeInTheDocument();
    });
    expect(screen.getByText('Mesa M-01')).toBeInTheDocument();

    // Badge visible en campana con contador 1
    const badge = screen.getByTestId('notification-badge');
    expect(badge).toHaveTextContent('1');
  });

  it('audio context error / policy blockage does not crash notification flow', async () => {
    // Simular que AudioContext lanza un error (bloqueo de reproducción automática del navegador)
    const originalAudioContext = window.AudioContext;
    (window as any).AudioContext = vi.fn().mockImplementation(() => {
      throw new Error('NotAllowedError: play() failed because the user didn\'t interact first');
    });

    const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    render(
      <div>
        <NotificationCenter />
        <ToastContainer />
      </div>
    );

    // Asegurar que el sonido esté habilitado para que intente reproducir
    act(() => {
      useNotificationsStore.getState().setSoundEnabled(true);
    });

    // Empujar notificación de pedido listo
    expect(() => {
      act(() => {
        useNotificationsStore.getState().push({
          eventId: 'evt-audio-blocked',
          type: 'order:ready',
          message: '¡Pedido #102 para Mesa M-02 está LISTO!',
          tableCode: 'M-02',
          orderNumber: 102,
          playSound: true
        });
      });
    }).not.toThrow();

    // El aviso visual permanece intacto a pesar del error de audio
    await waitFor(() => {
      expect(
        screen.getByText(/¡Pedido #102 para Mesa M-02 está LISTO!/i)
      ).toBeInTheDocument();
    });

    // Restaurar AudioContext original
    (window as any).AudioContext = originalAudioContext;
    consoleDebugSpy.mockRestore();
  });

  it('two distinct events produce two separate toasts and badge increments to 2', async () => {
    render(
      <div>
        <NotificationCenter />
        <ToastContainer />
      </div>
    );

    const store = useNotificationsStore.getState();

    // Primer evento
    act(() => {
      store.push({
        eventId: 'evt-1',
        type: 'order:ready',
        message: 'Pedido #101 listo para Mesa M-01',
        tableCode: 'M-01',
        playSound: false
      });
    });

    // Segundo evento distinto
    act(() => {
      store.push({
        eventId: 'evt-2',
        type: 'order:ready',
        message: 'Pedido #102 listo para Mesa M-02',
        tableCode: 'M-02',
        playSound: false
      });
    });

    // Ambos toasts visibles
    await waitFor(() => {
      expect(screen.getByText('Pedido #101 listo para Mesa M-01')).toBeInTheDocument();
      expect(screen.getByText('Pedido #102 listo para Mesa M-02')).toBeInTheDocument();
    });

    // Badge muestra 2
    const badge = screen.getByTestId('notification-badge');
    expect(badge).toHaveTextContent('2');

    // Al abrir el panel de notificaciones, se marcan como leídas y el badge desaparece
    const bellBtn = screen.getByRole('button', { name: /Avisos y notificaciones/i });
    act(() => {
      fireEvent.click(bellBtn);
    });

    expect(screen.queryByTestId('notification-badge')).toBeNull();
  });

  it('automatically hides floating toast after 5 seconds and does not reappear on remount/navigation, while keeping it in NotificationCenter', () => {
    vi.useFakeTimers();
    try {
      const { unmount } = render(<ToastContainer />);

      act(() => {
        useNotificationsStore.getState().push({
          eventId: 'evt-auto-hide',
          type: 'order:ready',
          message: '¡Pedido #105 para Mesa M-05 está LISTO para recoger!',
          tableCode: 'M-05',
          playSound: false
        });
      });

      expect(
        screen.queryByText(/¡Pedido #105 para Mesa M-05 está LISTO para recoger!/i)
      ).not.toBeNull();

      // Simular cambio de vista a los 2 segundos (desmonta y vuelve a montar ToastContainer)
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      unmount();
      const { unmount: unmount2 } = render(<ToastContainer />);

      // Aún quedan 3 segundos, sigue visible
      expect(
        screen.queryByText(/¡Pedido #105 para Mesa M-05 está LISTO para recoger!/i)
      ).not.toBeNull();

      // Avanzar los 3 segundos restantes para completar los 5 segundos
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Ya desapareció el toast flotante
      expect(
        screen.queryByText(/¡Pedido #105 para Mesa M-05 está LISTO para recoger!/i)
      ).toBeNull();

      // Si cambia a otra vista del mesero (remount), NO debe volver a aparecer el toast flotante
      unmount2();
      render(
        <div>
          <NotificationCenter />
          <ToastContainer />
        </div>
      );

      expect(
        screen.queryByText(/¡Pedido #105 para Mesa M-05 está LISTO para recoger!/i)
      ).toBeNull();

      // Pero el aviso sigue disponible en la campanita (badge = 1)
      expect(screen.getByTestId('notification-badge')).toHaveTextContent('1');
    } finally {
      vi.useRealTimers();
    }
  });
});
