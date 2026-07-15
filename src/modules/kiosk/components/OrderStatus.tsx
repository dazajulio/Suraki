'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, Clock, ChefHat, PackageCheck, Banknote } from 'lucide-react';
import type { Order } from '@/types/database';

interface OrderStatusProps {
  orderId: string;
  restaurantId: string;
}

export function OrderStatus({ orderId, restaurantId }: OrderStatusProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // 1. Cargar estado inicial
    async function fetchOrder() {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (data) setOrder(data);
      setIsLoading(false);
    }
    fetchOrder();

    // 2. Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel(`order-tracker-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          setOrder(payload.new as Order);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, supabase]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-12 bg-white">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return <div className="text-center text-gray-400 p-6 bg-white">No se encontró la orden.</div>;
  }

  const isPaid = order.payment_status === 'paid';

  const steps = [
    {
      id: 'pending',
      label: isPaid ? 'Orden Pagada' : 'Por Pagar',
      description: isPaid ? 'Hemos recibido tu orden y pago' : 'Acércate a caja o espera la terminal',
      icon: isPaid ? Clock : Banknote,
      isActive: order.status === 'pending',
      isCompleted: ['preparing', 'ready', 'delivered'].includes(order.status)
    },
    {
      id: 'preparing',
      label: 'En Preparación',
      description: 'Nuestros colaboradores están trabajando',
      icon: ChefHat,
      isActive: order.status === 'preparing',
      isCompleted: ['ready', 'delivered'].includes(order.status)
    },
    {
      id: 'ready',
      label: '¡Listo!',
      description: 'Tu pedido está listo para entregar',
      icon: PackageCheck,
      isActive: order.status === 'ready',
      isCompleted: order.status === 'delivered'
    }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 animate-fade-in w-full max-w-md mx-auto shadow-2xl">
      <div className="text-center mb-10">
        <p className="text-gray-400 text-sm uppercase tracking-widest font-bold mb-1">Orden #</p>
        <h2 className="text-5xl font-black text-gray-900">{order.order_number}</h2>
      </div>

      <div className="relative">
        {/* Line connection */}
        <div className="absolute left-8 top-8 bottom-8 w-1 bg-gray-100 rounded-full -translate-x-1/2 z-0" />
        
        <div className="space-y-8 relative z-10">
          {steps.map((step, index) => {
            const Icon = step.icon;
            let iconColor = 'text-gray-400';
            let bgColor = 'bg-white border-2 border-gray-200';
            
            if (step.isCompleted) {
              iconColor = 'text-green-500';
              bgColor = 'bg-green-500/10 border-2 border-green-500';
            } else if (step.isActive) {
              iconColor = 'text-red-600';
              bgColor = 'bg-red-500/10 border-2 border-red-600';
            }

            return (
              <div key={step.id} className="flex items-start gap-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors duration-500 ${bgColor}`}>
                  {step.isCompleted && !step.isActive ? (
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  ) : (
                    <Icon className="w-8 h-8 text-red-600" />
                  )}
                </div>
                <div className="pt-2">
                  <h3 className={`text-xl font-bold ${step.isActive ? 'text-red-600 font-semibold' : step.isCompleted ? 'text-gray-700' : 'text-zinc-600'}`}>
                    {step.label}
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
