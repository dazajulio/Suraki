import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET_LENGTH_' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length : 'NOT_SET';
  const restaurantId = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'NOT_SET';

  let dbResult = null;
  let dbError = null;

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, slug, name, is_active')
      .eq('is_active', true);

    if (error) {
      dbError = error;
    } else {
      dbResult = data;
    }
  } catch (err: any) {
    dbError = { message: err.message, stack: err.stack };
  }

  return NextResponse.json({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
      NEXT_PUBLIC_RESTAURANT_ID: restaurantId,
    },
    database: {
      result: dbResult,
      error: dbError,
    }
  });
}
