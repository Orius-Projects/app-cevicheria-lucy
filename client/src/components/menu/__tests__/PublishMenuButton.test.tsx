import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PublishMenuButton } from '../PublishMenuButton';

describe('PublishMenuButton', () => {
  it('renders published badge when isPublished is true', () => {
    render(
      <PublishMenuButton
        hasActiveItems={true}
        isPublished={true}
        isLoading={false}
        onPublish={vi.fn()}
      />
    );
    expect(screen.getByText('✓ Menú Publicado')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('blocks publication and shows error when hasActiveItems is false', async () => {
    const onPublish = vi.fn();
    render(
      <PublishMenuButton
        hasActiveItems={false}
        isPublished={false}
        isLoading={false}
        onPublish={onPublish}
      />
    );

    const button = screen.getByRole('button', { name: /Publicar Menú del Día/i });
    fireEvent.click(button);

    expect(onPublish).not.toHaveBeenCalled();
    const errorMsg = await screen.findByTestId('publish-error');
    expect(errorMsg).toHaveTextContent(
      'El menú debe tener al menos un plato activo para poder ser publicado.'
    );
  });

  it('calls onPublish when hasActiveItems is true', async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined);
    render(
      <PublishMenuButton
        hasActiveItems={true}
        isPublished={false}
        isLoading={false}
        onPublish={onPublish}
      />
    );

    const button = screen.getByRole('button', { name: /Publicar Menú del Día/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(onPublish).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByTestId('publish-error')).not.toBeInTheDocument();
  });

  it('shows error message if onPublish throws', async () => {
    const onPublish = vi.fn().mockRejectedValue({
      response: { data: { error: { message: 'Error 422: No se puede publicar un menú vacío' } } }
    });

    render(
      <PublishMenuButton
        hasActiveItems={true}
        isPublished={false}
        isLoading={false}
        onPublish={onPublish}
      />
    );

    const button = screen.getByRole('button', { name: /Publicar Menú del Día/i });
    fireEvent.click(button);

    const errorMsg = await screen.findByTestId('publish-error');
    expect(errorMsg).toHaveTextContent('Error 422: No se puede publicar un menú vacío');
  });

  it('displays loading state and disables button when isLoading is true', () => {
    render(
      <PublishMenuButton
        hasActiveItems={true}
        isPublished={false}
        isLoading={true}
        onPublish={vi.fn()}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Publicando...');
  });
});
