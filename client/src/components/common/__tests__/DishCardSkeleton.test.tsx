import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DishCardSkeleton } from '../DishCardSkeleton';

describe('DishCardSkeleton Component (Design System Section 14)', () => {
  it('renderiza la cantidad especificada de tarjetas esqueleto con animación animate-pulse', () => {
    const { container } = render(<DishCardSkeleton count={3} />);

    const skeletonCards = container.querySelectorAll('.animate-pulse');
    expect(skeletonCards).toHaveLength(3);
  });

  it('tiene atributos de accesibilidad aria-hidden para no confundir a lectores de pantalla', () => {
    const { container } = render(<DishCardSkeleton count={1} />);

    const card = container.querySelector('[aria-hidden="true"]');
    expect(card).toBeInTheDocument();
  });
});
