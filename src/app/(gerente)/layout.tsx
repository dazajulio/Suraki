'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChefHat, UtensilsCrossed, QrCode, ClipboardList, BarChart3 } from 'lucide-react';
import { WaiterNotificationBell } from './components/WaiterNotificationBell';

export default function GerenteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [restaurantName, setRestaurantName] = useState('Cargando...');
  const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRestaurant() {
      const supabase = createClient();
      const { data } = await supabase
        .from('restaurants')
        .select('name, logo_url')
        .eq('is_active', true)
        .single();
      
      if (data) {
        setRestaurantName(data.name);
        setRestaurantLogo(data.logo_url);
      } else {
        setRestaurantName('Dashboard');
      }
    }
    fetchRestaurant();
  }, []);

  const links = [
    { href: '/gerente/kitchen', label: 'Pedidos', icon: ChefHat },
    { href: '/gerente/menu', label: 'Productos', icon: UtensilsCrossed },
    { href: '/gerente/history', label: 'Registro', icon: ClipboardList },
    { href: '/gerente/settings', label: 'Administrador', icon: BarChart3 },
    { href: '/gerente/qr', label: 'Códigos QR', icon: QrCode },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm overflow-hidden shrink-0">
            <img src="/logo-suraki.png" alt="Suraki Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-gray-900 text-lg leading-tight truncate">Suraki</h1>
            <span className="text-xs text-gray-500 truncate block">Piso de Ventas</span>
          </div>
        </div>
        
        <nav className="space-y-2 flex-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-red-600/10 text-red-600 font-medium' 
                    : 'text-gray-600 hover:text-red-600 hover:bg-red-50/50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-red-600' : 'text-gray-500'}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-white min-h-screen overflow-y-auto pb-20 md:pb-0 relative">
        <WaiterNotificationBell />
        {children}
      </main>

      {/* Bottom Nav (Mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white pb-safe z-50">
        <nav className="flex justify-around p-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center p-2 rounded-lg min-w-[72px] ${
                  isActive ? 'text-red-600' : 'text-gray-500'
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-medium">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
