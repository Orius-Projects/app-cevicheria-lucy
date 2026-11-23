import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectionBanner } from '../ConnectionBanner';
import { useRealtimeStore } from '../../../stores/realtimeStore';

describe('ConnectionBanner Component (Design System Section 15)', () => {
  beforeEach(() => {
    useRealtimeStore.setState({ status: 'connected', isConnected: true });
  });

  it('no renderiza nada cuando status es connected', () => {
    const { container } = render(<ConnectionBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza banner ámbar con texto de reconexión cuando status es connecting', () => {
    useRealtimeStore.setState({ status: 'connecting', isConnected: false });
    render(<ConnectionBanner />);

    expect(screen.getByText('Reconectando con el servidor...')).toBeInTheDocument();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-amber-50');
    expect(alert).toHaveClass('text-amber-900');
  });

  it('renderiza banner de error con botón de reintento cuando status es disconnected', () => {
    const handleRetry = vi.fn();
    useRealtimeStore.setState({ status: 'disconnected', isConnected: false });
    render(<ConnectionBanner onRetry={handleRetry} />);

    expect(screen.getByText(/Sin conexión con el servidor/i)).toBeInTheDocument();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-rose-50');
    expect(alert).toHaveClass('text-rose-900');

    const retryButton = screen.getByRole('button', { name: 'Reintentar conexión' });
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).toHaveClass('min-h-[44px]');

    fireEvent.click(retryButton);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
