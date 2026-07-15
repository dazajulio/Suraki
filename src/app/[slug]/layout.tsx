import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface SlugLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SlugLayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  
  const { data } = await supabase
    .from('restaurants')
    .select('name')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  const restaurant = data as { name: string } | null;

  return {
    title: restaurant ? `${restaurant.name} - Pedidos Móviles` : 'Restaurante no encontrado',
  };
}

export default async function SlugLayout({ children, params }: SlugLayoutProps) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('restaurants')
    .select('id, name, logo_url, brand_color_primary, brand_color_secondary')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  const restaurant = data as any;

  if (!restaurant) {
    notFound();
  }

  // Inject CSS variables for white-label styling
  const brandStyle = {
    '--brand-primary': '#E32626',
    '--brand-secondary': '#F9FAFB',
  } as React.CSSProperties;

  return (
    <div 
      className="min-h-screen bg-white text-gray-800 selection:bg-brand-primary/30"
      style={brandStyle}
    >
      {/* Elegant Header */}
      <header className="w-full flex flex-col items-center justify-center py-6 border-b border-gray-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <img src="/logo-suraki.png" alt="Suraki" className="h-14 object-contain mb-2" />
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Suraki</h1>
        <p className="text-xs text-gray-500 tracking-widest uppercase mt-1">Piso de Ventas</p>
      </header>
      
      <main className="w-full max-w-2xl mx-auto min-h-screen relative shadow-2xl bg-white pb-32">
        {children}
      </main>
    </div>
  );
}
