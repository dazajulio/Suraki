'use client';

// ============================================================================
// PÁGINA: /gerente/kitchen — Kitchen Display System
// ============================================================================

import { KDSBoard } from '@/modules/kds/components/KDSBoard';

// In production, restaurantId comes from auth context / session.
// For now, we read it from an env var or use a placeholder.
const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? '';

export default function KitchenPage() {
  if (!RESTAURANT_ID) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-gray-700">
            Configuración requerida
          </p>
          <p className="text-sm text-gray-400 max-w-md">
            Define la variable de entorno{' '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
              NEXT_PUBLIC_RESTAURANT_ID
            </code>{' '}
            para conectar el KDS a tu restaurante.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-white">
      <KDSBoard restaurantId={RESTAURANT_ID} />
    </main>
  );
}
