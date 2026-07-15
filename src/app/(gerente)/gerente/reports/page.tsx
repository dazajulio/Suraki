'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PinAuthModal } from '@/components/shared/PinAuthModal';
import { BarChart3, TrendingUp, Users, Package, DollarSign, Calendar } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { OrderWithItems, Customer } from '@/types/database';

export default function ReportsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPinModal, setShowPinModal] = useState(true);
  
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('status', 'delivered');
        
      const { data: customersData } = await supabase
        .from('customers')
        .select('*');

      if (ordersData) setOrders(ordersData as OrderWithItems[]);
      if (customersData) setCustomers(customersData as Customer[]);
      setIsLoading(false);
    };

    fetchData();
  }, [isAuthenticated, supabase]);

  const handleAuthSuccess = () => {
    setShowPinModal(false);
    setIsAuthenticated(true);
  };

  const handleAuthClose = () => {
    router.push('/gerente/kitchen');
  };

  if (!isAuthenticated) {
    return (
      <PinAuthModal 
        isOpen={showPinModal} 
        onClose={handleAuthClose} 
        onSuccess={handleAuthSuccess}
        title="Acceso a Reportes Financieros" 
      />
    );
  }

  // --- CALCULATION LOGIC ---
  const now = new Date();
  
  // 1. Sales (Today, Week, Month)
  let todaySales = 0;
  let weekSales = 0;
  let monthSales = 0;

  orders.forEach(order => {
    if (order.payment_status !== 'paid') return;
    const orderDate = new Date(order.created_at);
    const amount = Number(order.total_amount) || 0;
    
    // Today
    if (orderDate.toDateString() === now.toDateString()) {
      todaySales += amount;
    }
    
    // This week (approx past 7 days)
    const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
    if (diffDays <= 7) {
      weekSales += amount;
    }
    
    // This month
    if (orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear()) {
      monthSales += amount;
    }
  });

  // 2. Best selling products
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

  // 3. Best customers
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
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in bg-white">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-red-600/10 text-red-600 flex items-center justify-center">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reportes Financieros</h1>
          <p className="text-gray-500">Resumen de desempeño y ventas</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-gray-400 bg-white">Calculando métricas...</div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        </>
      )}
    </div>
  );
}
