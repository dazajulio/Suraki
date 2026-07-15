// ============================================================================
// ZUSTAND STORE — Carrito de Pedidos
// ============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, CartState, Product, ModifierSnapshot } from '@/types/database';
import { generateCartItemId } from '@/lib/utils';

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,
      tableId: null,

      setContext: (restaurantId: string, tableId: string) => {
        const current = get();
        // Si cambia de restaurante, limpiar carrito
        if (current.restaurantId && current.restaurantId !== restaurantId) {
          set({ items: [], restaurantId, tableId });
        } else {
          set({ restaurantId, tableId });
        }
      },

      addItem: (item: Omit<CartItem, 'id' | 'subtotal'>) => {
        const id = generateCartItemId();
        const subtotal = item.unitPrice * item.quantity;
        set((state) => ({
          items: [...state.items, { ...item, id, subtotal }],
        }));
      },

      removeItem: (id: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      updateQuantity: (id: string, quantity: number) => {
        if (quantity < 1) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, quantity, subtotal: item.unitPrice * quantity }
              : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotal: () => {
        return get().items.reduce((total, item) => total + item.subtotal, 0);
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'foodtech-cart',
      // Solo persistir items, restaurantId, tableId
      partialize: (state) => ({
        items: state.items,
        restaurantId: state.restaurantId,
        tableId: state.tableId,
      }),
    }
  )
);
