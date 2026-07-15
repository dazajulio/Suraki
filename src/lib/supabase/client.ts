// ============================================================================
// CLIENTE SUPABASE — BROWSER (Client Components)
// ============================================================================
// Usar en componentes con 'use client'. Respeta RLS con el token anon.
// ============================================================================

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export const SURAKI_ID = '77bcca71-d69b-496d-831a-93ae38894645'; // UUID exacto de Suraki

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-restaurant-id': SURAKI_ID
    },
  },
});

// Para mantener compatibilidad con el resto del código y no romper nada
export function createClient() {
  return supabase;
}
