'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PinAuthModal } from '@/components/shared/PinAuthModal';
import { BarChart3, Building2, Save, Lock, TrendingUp, Users, Package, DollarSign, Calendar } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { Product, OrderWithItems, Customer } from '@/types/database';

export default function SettingsAdminPage() {
  const router = useRouter();
  const supabase = createClient();

  // --- Auth ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPinModal, setShowPinModal] = useState(true);

  // --- Settings State ---
  const [restaurant, setRestaurant] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [upsell1, setUpsell1] = useState('');
  const [upsell2, setUpsell2] = useState('');
  
  // --- Reports State ---
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const restaurantId = process.env.NEXT_PUBLIC_RESTAURANT_ID || '';

  // --- Auth Handlers ---
  const handleAuthSuccess = () => {
    setShowPinModal(false);
    setIsAuthenticated(true);
  };

  const handleAuthClose = () => {
    router.push('/gerente/kitchen');
  };

  // --- Load Data ---
  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadAll() {
      setIsLoading(true);
      
      // Restaurant settings
      const { data: restData } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();
        
      if (restData) {
        setRestaurant(restData);
        setUpsell1(restData.upsell_item_1_id || '');
        setUpsell2(restData.upsell_item_2_id || '');
      }
      
      // Products for upsell selection
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true);
        
      if (prodData) {
        setProducts(prodData as Product[]);
      }

      // Orders for reports
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`*, order_items (*)`)
        .eq('status', 'delivered');
        
      const { data: customersData } = await supabase
        .from('customers')
        .select('*');

      if (ordersData) setOrders(ordersData as OrderWithItems[]);
      if (customersData) setCustomers(customersData as Customer[]);
      
      setIsLoading(false);
    }
    
    loadAll();
  }, [isAuthenticated, restaurantId]);

  const saveSettings = async () => {
    setIsSaving(true);
    
    await supabase
      .from('restaurants')
      .update({
        upsell_item_1_id: upsell1 || null,
        upsell_item_2_id: upsell2 || null
      } as any)
      .eq('id', restaurantId);
      
    setIsSaving(false);
    alert('Configuración guardada correctamente.');
  };

  // --- PIN Auth Screen ---
  if (!isAuthenticated) {
    return (
      <PinAuthModal 
        isOpen={showPinModal} 
        onClose={handleAuthClose} 
        onSuccess={handleAuthSuccess}
        title="Acceso de Administrador" 
      />
    );
  }

  if (isLoading) {
    return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin"/></div>;
  }

  // --- Reports Calculations ---
  const now = new Date();
  
  let todaySales = 0;
  let weekSales = 0;
  let monthSales = 0;

  orders.forEach(order => {
    if (order.payment_status !== 'paid') return;
    const orderDate = new Date(order.created_at);
    const amount = Number(order.total_amount) || 0;
    
    if (orderDate.toDateString() === now.toDateString()) {
      todaySales += amount;
    }
    
    const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
    if (diffDays <= 7) {
      weekSales += amount;
    }
    
    if (orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear()) {
      monthSales += amount;
    }
  });

  // Best selling products
  const productSales: Record<string, { name: string, qty: number, revenue: number }> = {};
  orders.forEach(order => {
    if (order.payment_status !== 'paid') return;
    order.order_items.forEach(item => {
      if (!productSales[item.product_id]) {
        productSales[item.product_id] = { name: item.product_name, qty: 0, revenue: 0 };
      }
      productSales[item.product_id].qty += item.quantity;
      productSales[item.product_id].revenue += Number(item.subtotal);
    });
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5);

  // Best customers
  const customerSales: Record<string, { name: string, totalSpent: number, ordersCount: number }> = {};
  orders.forEach(order => {
    if (order.payment_status !== 'paid' || !order.customer_id) return;
    const cid = order.customer_id;
    if (!customerSales[cid]) {
      const c = customers.find(x => x.id === cid);
      customerSales[cid] = { name: c ? c.name : 'Desconocido', totalSpent: 0, ordersCount: 0 };
    }
    customerSales[cid].totalSpent += Number(order.total_amount);
    customerSales[cid].ordersCount += 1;
  });
  const topCustomers = Object.values(customerSales).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-12 animate-fade-in bg-white">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-8 h-8 text-red-600" />
          <h1 className="text-3xl font-bold text-gray-900">Administrador</h1>
        </div>
        <p className="text-gray-500 text-lg">Reportes financieros, configuración del negocio y opciones del Kiosco.</p>
      </div>

      {/* ============================================================ */}
      {/* SECTION 1: REPORTES FINANCIEROS (Previously the Reports page) */}
      {/* ============================================================ */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-red-600/10 text-red-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Reportes Financieros</h2>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5"><DollarSign className="w-24 h-24 text-gray-300" /></div>
            <p className="text-gray-500 font-medium flex items-center gap-2 mb-2"><Calendar className="w-4 h-4"/> Ventas Hoy</p>
            <h2 className="text-4xl font-bold text-gray-900">{formatPrice(todaySales, 'USD')}</h2>
          </div>
          <div className="bg-white border border-gray-200 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5"><TrendingUp className="w-24 h-24 text-gray-300" /></div>
            <p className="text-gray-500 font-medium flex items-center gap-2 mb-2"><Calendar className="w-4 h-4"/> Ventas Semana</p>
            <h2 className="text-4xl font-bold text-gray-900">{formatPrice(weekSales, 'USD')}</h2>
          </div>
          <div className="bg-white border border-gray-200 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5"><TrendingUp className="w-24 h-24 text-gray-300" /></div>
            <p className="text-gray-500 font-medium flex items-center gap-2 mb-2"><Calendar className="w-4 h-4"/> Ventas Mes</p>
            <h2 className="text-4xl font-bold text-gray-900">{formatPrice(monthSales, 'USD')}</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Package className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-bold text-gray-900">Productos más vendidos</h3>
            </div>
            <div className="space-y-4">
              {topProducts.length === 0 && <p className="text-gray-400 text-sm">No hay datos suficientes.</p>}
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white border border-gray-200/50">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-sm">
                      {i + 1}
                    </div>
                    <span className="font-medium text-gray-900">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-red-600 font-bold">{p.qty} unid.</p>
                    <p className="text-xs text-gray-400">{formatPrice(p.revenue, 'USD')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Customers */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-5 h-5 text-emerald-500" />
              <h3 className="text-lg font-bold text-gray-900">Mejores Clientes</h3>
            </div>
            <div className="space-y-4">
              {topCustomers.length === 0 && <p className="text-gray-400 text-sm">No hay clientes registrados con compras.</p>}
              {topCustomers.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white border border-gray-200/50">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 block">{c.name}</span>
                      <span className="text-xs text-gray-400">{c.ordersCount} pedidos</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-500 font-bold">{formatPrice(c.totalSpent, 'USD')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <hr className="border-gray-200" />

      {/* ============================================================ */}
      {/* SECTION 2: CONFIGURACIÓN (Upsell + Datos del Negocio)       */}
      {/* ============================================================ */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-red-600/10 text-red-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Venta Sugerida */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xl h-fit">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-red-600">💰</span> Venta Sugerida (Upsell)
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Selecciona los 2 productos que se ofrecerán al cliente justo antes de finalizar su pago en el kiosco.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Producto Sugerido 1</label>
                <select 
                  value={upsell1} 
                  onChange={(e) => setUpsell1(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="" className="text-gray-900">-- Seleccionar producto --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} className="text-gray-900">{p.name} (${p.base_price})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Producto Sugerido 2</label>
                <select 
                  value={upsell2} 
                  onChange={(e) => setUpsell2(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="" className="text-gray-900">-- Seleccionar producto --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} className="text-gray-900">{p.name} (${p.base_price})</option>
                  ))}
                </select>
              </div>
              
              <button 
                onClick={saveSettings}
                disabled={isSaving}
                className="w-full mt-4 bg-red-600 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-5 h-5" />
                {isSaving ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>

          {/* Datos del Negocio (Solo Lectura) */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-4 right-4 bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Lock className="w-3 h-3" /> Solo lectura
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-red-600" /> Datos del Negocio
            </h2>
            
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-white border border-gray-100 rounded-xl overflow-hidden flex items-center justify-center shadow-sm">
                  <img src="/logo-suraki.png" alt="Logo" className="w-full h-full object-contain p-1" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Nombre de la Empresa</p>
                  <p className="text-lg font-bold text-gray-900">Suraki</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Identificación Fiscal</p>
                  <p className="text-sm font-medium text-gray-800">{restaurant?.tax_id || 'No registrada'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Teléfono</p>
                  <p className="text-sm font-medium text-gray-800">{restaurant?.phone || 'No registrado'}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Dirección</p>
                <p className="text-sm font-medium text-gray-800">{restaurant?.address || 'No registrada'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Licencia de Uso</p>
                  <p className="text-sm font-mono text-red-500 truncate" title={restaurant?.license_code}>
                    {restaurant?.license_code || 'No registrada'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Fecha de Corte</p>
                  <p className="text-sm font-medium text-gray-800">
                    {restaurant?.license_valid_until 
                      ? new Date(restaurant.license_valid_until).toLocaleDateString() 
                      : 'No registrada'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
