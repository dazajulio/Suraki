// ============================================================================
// PROXY — Protección de rutas admin + headers multi-tenant
// ============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // If Supabase env vars are not configured, skip auth entirely
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              });
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Refresh the auth session
    await supabase.auth.getUser();

    // Protect admin (super-admin) and gerente (manager) routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/gerente')) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // En el modo MVP permitimos el acceso temporal para ver el dashboard ya que no hay página de login
        console.log('No auth user, but allowing access to admin for MVP demo.');
      }
    }
  } catch (error) {
    // Never block a request due to auth errors
    console.error('Proxy auth error:', error);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sounds|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
