import { describe, it, expect, beforeEach } from 'vitest';
import { useOrderDraftStore } from '../orderDraftStore';

describe('orderDraftStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useOrderDraftStore.getState().clearDraft();
  });

  it('initializes with a valid clientRequestId and empty draft', () => {
    const state = useOrderDraftStore.getState();
    expect(state.tableId).toBeNull();
    expect(state.tableCode).toBeNull();
    expect(state.items).toEqual([]);
    expect(state.notes).toBe('');
    expect(typeof state.clientRequestId).toBe('string');
    expect(state.clientRequestId.length).toBeGreaterThan(10);
    expect(state.totalCents()).toBe(0);
    expect(state.canSubmit()).toBe(false);
  });

  it('sets table correctly and keeps clientRequestId stable', () => {
    const initialRequestId = useOrderDraftStore.getState().clientRequestId;
    useOrderDraftStore.getState().setTable('tbl-1', 'M-01');

    const state = useOrderDraftStore.getState();
    expect(state.tableId).toBe('tbl-1');
    expect(state.tableCode).toBe('M-01');
    expect(state.clientRequestId).toBe(initialRequestId);
  });

  it('adds items, calculates total in centavos, and preserves variations', () => {
    useOrderDraftStore.getState().setTable('tbl-1', 'M-01');
    useOrderDraftStore.getState().addItem({
      dishId: 'dish-ceviche',
      dishName: 'Ceviche Clásico',
      priceCents: 3500,
      quantity: 2,
      variationIds: ['var-sin-aji'],
      variations: [{ id: 'var-sin-aji', name: 'Sin ají' }],
      remainingRations: 10
    });

    const state = useOrderDraftStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].dishName).toBe('Ceviche Clásico');
    expect(state.items[0].quantity).toBe(2);
    expect(state.items[0].variationIds).toEqual(['var-sin-aji']);
    expect(state.totalCents()).toBe(7000);
    expect(state.canSubmit()).toBe(true);
  });

  it('merges identical dish additions with identical variations', () => {
    useOrderDraftStore.getState().addItem({
      dishId: 'dish-1',
      dishName: 'Arroz con Mariscos',
      priceCents: 3800,
      quantity: 1,
      variationIds: ['v1'],
      variations: [{ id: 'v1', name: 'Picante' }],
      remainingRations: 5
    });

    useOrderDraftStore.getState().addItem({
      dishId: 'dish-1',
      dishName: 'Arroz con Mariscos',
      priceCents: 3800,
      quantity: 2,
      variationIds: ['v1'],
      variations: [{ id: 'v1', name: 'Picante' }],
      remainingRations: 5
    });

    const items = useOrderDraftStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
    expect(useOrderDraftStore.getState().totalCents()).toBe(11400);
  });

  it('clamps quantity to remainingRations when available', () => {
    useOrderDraftStore.getState().addItem({
      dishId: 'dish-tiradito',
      dishName: 'Tiradito',
      priceCents: 3200,
      quantity: 1,
      remainingRations: 3
    });

    // Try to update quantity beyond available raciones
    useOrderDraftStore.getState().updateItemQuantity(0, 10);

    const item = useOrderDraftStore.getState().items[0];
    expect(item.quantity).toBe(3); // Clamped to remainingRations
  });

  it('enforces notes limits: item notes <= 140 chars and general notes <= 280 chars', () => {
    useOrderDraftStore.getState().addItem({
      dishId: 'dish-1',
      dishName: 'Ceviche',
      priceCents: 3500,
      quantity: 1
    });

    const longItemNote = 'A'.repeat(200);
    useOrderDraftStore.getState().updateItemNotes(0, longItemNote);
    expect(useOrderDraftStore.getState().items[0].notes?.length).toBe(140);

    const longGeneralNote = 'B'.repeat(350);
    useOrderDraftStore.getState().setGeneralNotes(longGeneralNote);
    expect(useOrderDraftStore.getState().notes.length).toBe(280);
  });

  it('syncWithMenu adjusts quantities and removes sold-out items', () => {
    useOrderDraftStore.getState().addItem({
      dishId: 'dish-1',
      dishName: 'Pescado Frito',
      priceCents: 3000,
      quantity: 4,
      remainingRations: 5
    });

    useOrderDraftStore.getState().addItem({
      dishId: 'dish-2',
      dishName: 'Chicharrón',
      priceCents: 4000,
      quantity: 2,
      remainingRations: 2
    });

    // Menu updates: dish-1 now only has 2 rations; dish-2 is AGOTADO (0 rations)
    const mockMenuItems = [
      {
        dishId: 'dish-1',
        remainingRations: 2,
        status: 'ULTIMAS_RACIONES'
      },
      {
        dishId: 'dish-2',
        remainingRations: 0,
        status: 'AGOTADO'
      }
    ];

    useOrderDraftStore.getState().syncWithMenu(mockMenuItems);

    const items = useOrderDraftStore.getState().items;
    // dish-2 was completely sold out, dish-1 was clamped to 2
    expect(items).toHaveLength(1);
    expect(items[0].dishId).toBe('dish-1');
    expect(items[0].quantity).toBe(2);
    expect(items[0].remainingRations).toBe(2);
  });

  it('clears draft and regenerates clientRequestId', () => {
    const initialRequestId = useOrderDraftStore.getState().clientRequestId;
    useOrderDraftStore.getState().setTable('tbl-1', 'M-01');
    useOrderDraftStore.getState().addItem({
      dishId: 'dish-1',
      dishName: 'Ceviche',
      priceCents: 3500,
      quantity: 1
    });

    useOrderDraftStore.getState().clearDraft();

    const state = useOrderDraftStore.getState();
    expect(state.tableId).toBeNull();
    expect(state.items).toEqual([]);
    expect(state.notes).toBe('');
    expect(state.clientRequestId).not.toBe(initialRequestId);
  });
});
