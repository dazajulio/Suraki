// ============================================================================
// CLIENTE SUPABASE — ADMIN (Service Role, bypasses RLS)
// ============================================================================
// SOLO para API Routes del servidor. NUNCA exponer en el cliente.
// Bypasses RLS — usar con extremo cuidado.
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
