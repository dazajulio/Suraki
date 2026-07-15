'use client';

// ============================================================================
// COMPONENTE: OrderCard — Tarjeta de pedido para el KDS
// ============================================================================

import { useEffect, useState } from 'react';
import {
  Clock,
  User,
  Hash,
  MapPin,
  StickyNote,
  ChefHat,
  CircleCheckBig,
  Truck,
  Trash2,
} from 'lucide-react';
import { cn, formatElapsedTime } from '@/lib/utils';
import type { OrderWithItems, OrderStatus, ModifierSnapshot } from '@/types/database';
import { PinAuthModal } from '@/components/shared/PinAuthModal';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface OrderCardProps {
  order: OrderWithItems;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onPaymentValidate?: (orderId: string, reference: string) => void;
  onCancel?: (orderId: string, reason: string) => void;
}

// Status transition map for the main action button
const NEXT_STATUS: Record<string, { status: OrderStatus; label: string }> = {
  pending: { status: 'preparing', label: 'Preparar' },
  preparing: { status: 'ready', label: '¡Listo!' },
  ready: { status: 'delivered', label: 'Entregado' },
};

// Urgency thresholds in minutes
const URGENCY_WARN_MINUTES = 10;
const URGENCY_CRITICAL_MINUTES = 20;

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function getElapsedMinutes(dateString: string): number {
  return Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 60_000
  );
}

function getActionButtonStyles(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white';
    case 'preparing':
      return 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white';
    case 'ready':
      return 'bg-zinc-600 hover:bg-zinc-500 active:bg-gray-200 text-white';
    default:
      return 'bg-gray-200 text-gray-500';
  }
}

function getActionIcon(status: OrderStatus) {
  switch (status) {
    case 'pending':
      return <ChefHat className="h-5 w-5" />;
    case 'preparing':
      return <CircleCheckBig className="h-5 w-5" />;
    case 'ready':
      return <Truck className="h-5 w-5" />;
    default:
      return null;
  }
}

function getCardBorderClass(status: OrderStatus, elapsedMinutes: number): string {
  if (status === 'pending') {
    if (elapsedMinutes >= URGENCY_CRITICAL_MINUTES) {
      return 'border-red-500/80 shadow-red-500/20 shadow-lg';
    }
    if (elapsedMinutes >= URGENCY_WARN_MINUTES) {
      return 'border-amber-500/70 shadow-amber-500/15 shadow-md';
    }
    return 'border-amber-500/30';
  }
  if (status === 'preparing') return 'border-blue-500/30';
  if (status === 'ready') return 'border-emerald-500/30';
  return 'border-gray-300/50';
}

function getTimeBadgeClass(status: OrderStatus, elapsedMinutes: number): string {
  if (status === 'pending' && elapsedMinutes >= URGENCY_CRITICAL_MINUTES) {
    return 'text-red-400 animate-pulse';
  }
  if (status === 'pending' && elapsedMinutes >= URGENCY_WARN_MINUTES) {
    return 'text-amber-400';
  }
  return 'text-gray-500';
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function OrderCard({ order, onStatusChange, onPaymentValidate, onCancel }: OrderCardProps) {
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  // Refresh elapsed time every 30 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const elapsedMinutes = getElapsedMinutes(order.created_at);
  const elapsed = formatElapsedTime(order.created_at);
  const action = NEXT_STATUS[order.status];
  const tableLabel =
    order.table?.label ?? (order.table ? `Mesa ${order.table.table_number}` : null);
  const customerName = order.customer?.name ?? null;

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border bg-white/80 backdrop-blur-sm transition-all duration-300',
        getCardBorderClass(order.status, elapsedMinutes)
      )}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        {/* Order number */}
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-gray-400" />
          <span className="text-2xl font-bold tracking-tight text-gray-900">
            {order.order_number}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Elapsed time */}
          <div
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium',
              getTimeBadgeClass(order.status, elapsedMinutes)
            )}
          >
            <Clock className="h-4 w-4" />
            <span>{elapsed}</span>
          </div>

          {/* Delete Button (Only if pending & not paid) */}
          {order.status === 'pending' && order.payment_status !== 'paid' && onCancel && (
            <button
              onClick={() => setIsPinModalOpen(true)}
              className="p-1.5 text-red-500 hover:text-white hover:bg-red-500/80 rounded-lg transition-colors"
              title="Cancelar Pedido"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Meta row (table + customer) ─────────────────────────── */}
      {(tableLabel || customerName) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-200/60 px-4 py-2 text-sm">
          {tableLabel && (
            <span className="flex items-center gap-1.5 text-gray-700">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              {tableLabel}
            </span>
          )}
          {customerName && (
            <span className="flex items-center gap-1.5 text-gray-700">
              <User className="h-3.5 w-3.5 text-gray-400" />
              {customerName}
            </span>
          )}
        </div>
      )}

      {/* ── Items list ──────────────────────────────────────────── */}
      <div className="flex-1 space-y-1 px-4 py-3">
        {order.order_items.map((item) => (
          <div key={item.id} className="py-1">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-900 text-xs font-bold text-white">
                {item.quantity}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 leading-snug">
                  {item.product_name}
                </p>
                {/* Modifier snapshots */}
                {item.modifiers_snapshot.length > 0 && (
                  <div className="mt-0.5 space-y-0.5">
                    {item.modifiers_snapshot.map(
                      (mod: ModifierSnapshot, idx: number) => (
                        <p
                          key={`${item.id}-mod-${idx}`}
                          className="text-xs text-gray-500 leading-tight"
                        >
                          <span className="text-gray-400">{mod.group}:</span>{' '}
                          {mod.items.map((m) => m.name).join(', ')}
                        </p>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Notes ───────────────────────────────────────────────── */}
      {order.notes && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-lg bg-gray-100/60 px-3 py-2">
          <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500/70" />
          <p className="text-xs text-amber-800 leading-snug">{order.notes}</p>
        </div>
      )}

      {/* ── Action button ───────────────────────────────────────── */}
      {order.status === 'pending' && order.payment_status === 'pending' && order.payment_method !== 'stripe' ? (
        <div className="p-3 pt-0">
          <button
            type="button"
            onClick={() => {
              const ref = window.prompt('Ingrese referencia de pago (Ej. Tarjeta 1234 o Efectivo):');
              if (ref && onPaymentValidate) {
                onPaymentValidate(order.id, ref);
              }
            }}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-4 text-base font-semibold transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
              'active:scale-[0.98] transform shadow-lg',
              order.payment_method === 'terminal' ? 'bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-yellow-950 shadow-yellow-500/20' :
              order.payment_method === 'cash' ? 'bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white shadow-blue-500/20' :
              'bg-red-600 hover:bg-red-600 active:bg-red-700 text-white shadow-red-600/20'
            )}
          >
            <StickyNote className="h-5 w-5" />
            {order.payment_method === 'terminal' ? 'ENVIAR TERMINAL DE PAGO' :
             order.payment_method === 'cash' ? 'CLIENTE PAGA EN CAJA' :
             'VALIDAR PAGO'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-3 pt-0">
          {/* Legend for Paid / Stripe Orders */}
          {(order.payment_status === 'paid' || order.payment_method === 'stripe') && order.status === 'pending' && (
             <div className="w-full bg-green-500/20 text-green-400 font-bold text-center py-2.5 rounded-lg text-sm border border-green-500/30 flex items-center justify-center gap-2">
               <CircleCheckBig className="w-4 h-4" />
               PEDIDO PAGADO
             </div>
          )}
          {action && (
            <button
              type="button"
              onClick={() => onStatusChange(order.id, action.status)}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-4 text-base font-semibold transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                'active:scale-[0.98] transform',
                getActionButtonStyles(order.status)
              )}
            >
              {getActionIcon(order.status)}
              {action.label}
            </button>
          )}
        </div>
      )}

      {/* Pin Modal for Cancellation */}
      {isPinModalOpen && (
        <PinAuthModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          onSuccess={() => {
            setIsPinModalOpen(false);
            const reason = window.prompt('Especifique el motivo de cancelación:');
            if (reason && onCancel) {
              onCancel(order.id, reason);
            }
          }}
          title="Autorizar Cancelación"
        />
      )}
    </div>
  );
}
