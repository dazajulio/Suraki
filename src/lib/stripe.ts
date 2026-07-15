// ============================================================================
// STRIPE — Configuración del servidor
// ============================================================================

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn(
    '⚠️ STRIPE_SECRET_KEY no configurada. Los pagos con tarjeta no funcionarán.'
  );
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-06-24.dahlia',
  typescript: true,
});
