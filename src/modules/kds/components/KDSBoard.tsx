'use client';

// ============================================================================
// COMPONENTE: KDSBoard — Tablero Kanban del Kitchen Display System
// ============================================================================

import { useCallback, useEffect, useRef } from 'react';
import {
  Flame,
  ChefHat,
  CircleCheckBig,
  Loader2,
  UtensilsCrossed,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRealtimeOrders } from '@/modules/kds/hooks/use-realtime-orders';
import { OrderCard } from '@/modules/kds/components/OrderCard';
import {
  ShiftStartButton,
  type ShiftStartButtonHandle,
} from '@/modules/kds/components/ShiftStartButton';
import type { OrderWithItems, OrderStatus } from '@/types/database';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface KDSBoardProps {
  restaurantId: string;
}

interface ColumnConfig {
  key: 'pending' | 'preparing' | 'ready';
  label: string;
  icon: React.ReactNode;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  emptyMessage: string;
}

// ----------------------------------------------------------------------------
// Column definitions
// ----------------------------------------------------------------------------

const COLUMNS: ColumnConfig[] = [
  {
    key: 'pending',
    label: 'Nuevos',
    icon: <Flame className="h-5 w-5" />,
    accentColor: 'text-amber-500',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-400',
    emptyMessage: 'Sin pedidos nuevos',
  },
  {
    key: 'preparing',
    label: 'En Preparación',
    icon: <ChefHat className="h-5 w-5" />,
    accentColor: 'text-blue-500',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-400',
    emptyMessage: 'Nada en preparación',
  },
  {
    key: 'ready',
    label: 'Listos',
    icon: <CircleCheckBig className="h-5 w-5" />,
    accentColor: 'text-emerald-500',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-400',
    emptyMessage: 'Sin pedidos listos',
  },
];

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function KDSBoard({ restaurantId }: KDSBoardProps) {
  const shiftButtonRef = useRef<ShiftStartButtonHandle>(null);

  // Refs for auto-scrolling columns
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Callback when a new order arrives via realtime
  const handleNewOrder = useCallback((_order: OrderWithItems) => {
    // Play notification sound
    shiftButtonRef.current?.playNewOrderSound();

    // Auto-scroll the "pending" column to the bottom to show the new order
    const pendingCol = columnRefs.current['pending'];
    if (pendingCol) {
      requestAnimationFrame(() => {
        pendingCol.scrollTo({
          top: pendingCol.scrollHeight,
          behavior: 'smooth',
        });
      });
    }
  }, []);

  const {
    pendingOrders,
    preparingOrders,
    readyOrders,
    updateOrderStatus,
    updateOrderPaymentStatus,
    cancelOrder,
    isLoading,
  } = useRealtimeOrders({
    restaurantId,
    onNewOrder: handleNewOrder,
  });

  // Map column keys to their order arrays
  const ordersByColumn: Record<string, OrderWithItems[]> = {
    pending: pendingOrders,
    preparing: preparingOrders,
    ready: readyOrders,
  };

  // Status change handler
  const handleStatusChange = useCallback(
    (orderId: string, newStatus: OrderStatus) => {
      updateOrderStatus(orderId, newStatus);
    },
    [updateOrderStatus]
  );

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="flex h-full flex-col bg-white">
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-gray-200/60 bg-white/90 backdrop-blur-md px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="h-6 w-6 text-gray-500" />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900">
              Piso de Ventas
            </h1>
            <p className="text-xs text-gray-500">
              Gestión de Pedidos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Order count summary */}
          <div className="hidden items-center gap-2 sm:flex">
            {COLUMNS.map((col) => (
              <span
                key={col.key}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium',
                  col.badgeBg,
                  col.badgeText
                )}
              >
                {col.icon}
                <span>{ordersByColumn[col.key].length}</span>
              </span>
            ))}
          </div>

          <ShiftStartButton ref={shiftButtonRef} />
        </div>
      </header>

      {/* ── Loading state ───────────────────────────────────────── */}
      {isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Cargando pedidos…</p>
          </div>
        </div>
      )}

      {/* ── Kanban Columns ──────────────────────────────────────── */}
      {!isLoading && (
        <div className="flex flex-1 gap-0 overflow-hidden md:flex-row flex-col">
          {COLUMNS.map((col) => {
            const columnOrders = ordersByColumn[col.key];

            return (
              <div
                key={col.key}
                className="flex flex-1 flex-col border-r border-gray-200/40 last:border-r-0 min-h-0"
              >
                {/* Column header */}
                <div className="flex items-center gap-2 border-b border-gray-200/40 bg-white/50 px-4 py-3">
                  <span className={cn('shrink-0', col.accentColor)}>
                    {col.icon}
                  </span>
                  <h2 className="text-sm font-semibold text-gray-800">
                    {col.label}
                  </h2>
                  <span
                    className={cn(
                      'ml-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                      col.badgeBg,
                      col.badgeText
                    )}
                  >
                    {columnOrders.length}
                  </span>
                </div>

                {/* Cards container */}
                <div
                  ref={(el) => {
                    columnRefs.current[col.key] = el;
                  }}
                  className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-track-zinc-900 scrollbar-thumb-zinc-700"
                >
                  {columnOrders.length === 0 ? (
                    <div className="flex h-32 items-center justify-center">
                      <p className="text-sm text-zinc-600">{col.emptyMessage}</p>
                    </div>
                  ) : (
                    columnOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onStatusChange={handleStatusChange}
                        onPaymentValidate={updateOrderPaymentStatus}
                        onCancel={cancelOrder}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
