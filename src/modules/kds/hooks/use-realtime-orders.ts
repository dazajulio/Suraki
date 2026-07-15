'use client';

// ============================================================================
// HOOK: useRealtimeOrders — Suscripción en tiempo real a pedidos
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  OrderWithItems,
  OrderStatus,
  OrderItem,
  Table,
  Customer,
} from '@/types/database';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface UseRealtimeOrdersOptions {
  restaurantId: string;
  onNewOrder?: (order: OrderWithItems) => void;
}

interface UseRealtimeOrdersReturn {
  orders: OrderWithItems[];
  pendingOrders: OrderWithItems[];
  preparingOrders: OrderWithItems[];
  readyOrders: OrderWithItems[];
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  updateOrderPaymentStatus: (orderId: string, reference: string) => Promise<void>;
  cancelOrder: (orderId: string, reason: string) => Promise<void>;
  isLoading: boolean;
}

type OrderRow = {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  customer_id: string | null;
  order_number: number;
  status: OrderStatus;
  total_amount: number;
  payment_method: string | null;
  payment_status: string;
  stripe_payment_intent_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// KDS-relevant statuses — we never load delivered/cancelled
const KDS_STATUSES: OrderStatus[] = ['pending', 'preparing', 'ready'];

// ----------------------------------------------------------------------------
// Helper: get today's date at midnight (local) as ISO string
// ----------------------------------------------------------------------------
function getTodayStart(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return start.toISOString();
}

// ----------------------------------------------------------------------------
// Hook
// ----------------------------------------------------------------------------

export function useRealtimeOrders({
  restaurantId,
  onNewOrder,
}: UseRealtimeOrdersOptions): UseRealtimeOrdersReturn {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Keep a ref of the onNewOrder callback so the realtime listener
  // always uses the latest version without re-subscribing.
  const onNewOrderRef = useRef(onNewOrder);
  useEffect(() => {
    onNewOrderRef.current = onNewOrder;
  }, [onNewOrder]);

  // Keep a set of known order IDs to differentiate INSERT from UPDATE
  const knownOrderIds = useRef(new Set<string>());

  // Supabase client (stable across renders for browser client)
  const supabase = useMemo(() => createClient(), []);

  // ------------------------------------------------------------------
  // Fetch initial orders (today, not delivered/cancelled)
  // ------------------------------------------------------------------
  const fetchInitialOrders = useCallback(async () => {
    setIsLoading(true);
    const todayStart = getTodayStart();

    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        *,
        order_items (*),
        table:tables (*),
        customer:customers (*)
      `
      )
      .eq('restaurant_id', restaurantId)
      .in('status', KDS_STATUSES)
      .gte('created_at', todayStart)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[KDS] Error fetching orders:', error.message);
      setIsLoading(false);
      return;
    }

    const fetched = (data ?? []) as OrderWithItems[];

    // Populate known IDs
    knownOrderIds.current = new Set(fetched.map((o) => o.id));

    setOrders(fetched);
    setIsLoading(false);
  }, [supabase, restaurantId]);

  // ------------------------------------------------------------------
  // Fetch a single full order by ID (with joins)
  // ------------------------------------------------------------------
  const fetchFullOrder = useCallback(
    async (orderId: string): Promise<OrderWithItems | null> => {
      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          order_items (*),
          table:tables (*),
          customer:customers (*)
        `
        )
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('[KDS] Error fetching full order:', error.message);
        return null;
      }

      return data as OrderWithItems;
    },
    [supabase]
  );

  // ------------------------------------------------------------------
  // Handle realtime payload
  // ------------------------------------------------------------------
  const handleRealtimeChange = useCallback(
    async (
      payload: RealtimePostgresChangesPayload<OrderRow>
    ) => {
      const newRecord = payload.new as OrderRow | undefined;
      if (!newRecord || !newRecord.id) return;

      const orderId = newRecord.id;
      const newStatus = newRecord.status as OrderStatus;

      // If the order moved to delivered/cancelled, remove from KDS
      if (!KDS_STATUSES.includes(newStatus)) {
        knownOrderIds.current.delete(orderId);
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        return;
      }

      const isNew = !knownOrderIds.current.has(orderId);

      if (isNew) {
        // ── INSERT (new order) ──────────────────────────────────────
        const fullOrder = await fetchFullOrder(orderId);
        if (!fullOrder) return;

        knownOrderIds.current.add(orderId);
        setOrders((prev) => [...prev, fullOrder]);

        // Trigger audio callback
        onNewOrderRef.current?.(fullOrder);
      } else {
        // ── UPDATE (status change, etc.) ────────────────────────────
        // Re-fetch to get full joined data for accuracy
        const fullOrder = await fetchFullOrder(orderId);
        if (!fullOrder) return;

        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? fullOrder : o))
        );
      }
    },
    [fetchFullOrder]
  );

  // ------------------------------------------------------------------
  // Subscribe to Supabase Realtime
  // ------------------------------------------------------------------
  useEffect(() => {
    fetchInitialOrders();

    const channel = supabase
      .channel(`kds-orders-${restaurantId}`)
      .on<OrderRow>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => handleRealtimeChange(payload)
      )
      .on<OrderRow>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => handleRealtimeChange(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, restaurantId, fetchInitialOrders, handleRealtimeChange]);

  // ------------------------------------------------------------------
  // Update order status (optimistic + DB write)
  // ------------------------------------------------------------------
  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      // Optimistic update
      setOrders((prev) =>
        prev
          .map((o) =>
            o.id === orderId
              ? { ...o, status: newStatus, updated_at: new Date().toISOString() }
              : o
          )
          // Remove from KDS view if moved to delivered/cancelled
          .filter((o) => KDS_STATUSES.includes(o.status))
      );

      // If we optimistically removed it, clean up the known set
      if (!KDS_STATUSES.includes(newStatus)) {
        knownOrderIds.current.delete(orderId);
      }

      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus } as any)
        .eq('id', orderId);

      if (error) {
        console.error('[KDS] Error updating order status:', error.message);
        // Revert: re-fetch all
        await fetchInitialOrders();
      }
    },
    [supabase, fetchInitialOrders]
  );

  // ------------------------------------------------------------------
  // Update order payment status
  // ------------------------------------------------------------------
  const updateOrderPaymentStatus = useCallback(
    async (orderId: string, reference: string) => {
      // Optimistic update
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, payment_status: 'paid', stripe_payment_intent_id: reference, updated_at: new Date().toISOString() }
            : o
        )
      );

      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'paid', stripe_payment_intent_id: 'terminal' } as any)
        .eq('id', orderId);

      if (error) {
        console.error('[KDS] Error updating payment status:', error.message);
        await fetchInitialOrders();
      }
    },
    [supabase, fetchInitialOrders]
  );

  // ------------------------------------------------------------------
  // Cancel Order (Security feature)
  // ------------------------------------------------------------------
  const cancelOrder = useCallback(
    async (orderId: string, reason: string) => {
      // Optimistic update: Remove from KDS
      knownOrderIds.current.delete(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));

      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled', notes: reason } as any)
        .eq('id', orderId);

      if (error) {
        console.error('[KDS] Error cancelling order:', error.message);
        await fetchInitialOrders();
      }
    },
    [supabase, fetchInitialOrders]
  );

  // ------------------------------------------------------------------
  // Derived state: group by status
  // ------------------------------------------------------------------
  const pendingOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'pending')
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
    [orders]
  );

  const preparingOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'preparing')
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
    [orders]
  );

  const readyOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'ready')
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
    [orders]
  );

  return {
    orders,
    pendingOrders,
    preparingOrders,
    readyOrders,
    updateOrderStatus,
    updateOrderPaymentStatus,
    cancelOrder,
    isLoading,
  };
}
