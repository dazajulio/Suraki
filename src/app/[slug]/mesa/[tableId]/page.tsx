'use client';

import { useState, useEffect, use } from 'react';
import { createClient, SURAKI_ID } from '@/lib/supabase/client';
import type { Category, ProductWithModifiers, Product } from '@/types/database';
import { CategoryNav } from '@/modules/kiosk/components/CategoryNav';
import { ProductCard } from '@/modules/kiosk/components/ProductCard';
import { CartDrawer } from '@/modules/kiosk/components/CartDrawer';
import { CustomerForm } from '@/modules/kiosk/components/CustomerForm';
import { UpsellModal } from '@/modules/kiosk/components/UpsellModal';
import { CheckoutForm } from '@/modules/kiosk/components/CheckoutForm';
import { OrderStatus } from '@/modules/kiosk/components/OrderStatus';
import { ProductCustomizationModal } from '@/modules/kiosk/components/ProductCustomizationModal';
import { useCartStore } from '@/modules/kiosk/stores/cart-store';
import { ShoppingBag, ChevronLeft } from 'lucide-react';
import { t } from '@/lib/i18n';
import { formatPrice } from '@/lib/utils';

type FlowStep = 'browse' | 'customer' | 'upsell' | 'checkout' | 'success' | 'order_status';

interface KioskPageProps {
  params: Promise<{ slug: string; tableId: string }>;
}

export default function KioskPage({ params }: KioskPageProps) {
  const { slug, tableId } = use(params);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductWithModifiers[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Flow state
  const [step, setStep] = useState<FlowStep>('browse');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'cash' | 'terminal' | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customizingProduct, setCustomizingProduct] = useState<ProductWithModifiers | null>(null);
  const [lastTotal, setLastTotal] = useState(0);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [upsellProducts, setUpsellProducts] = useState<ProductWithModifiers[]>([]);
  const [isCallingWaiter, setIsCallingWaiter] = useState(false);
  
  const { addItem, getItemCount, getTotal, setContext, items, clearCart, restaurantId } = useCartStore();
  
  // Currency from restaurant (hardcoded USD for now, could be fetched)
  const currency = 'USD';

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      
      // Get restaurant ID from slug
      const { data } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();
        
      const restaurant = data as any;
      if (!restaurant) return;
      
      setContext(restaurant.id, tableId);
      
      // Load categories
      const { data: catsData } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true)
        .order('order_index');
        
      const cats = catsData as any[];
      if (cats && cats.length > 0) {
        setCategories(cats);
        setActiveCategoryId(cats[0].id);
      }
      
      // Load products with modifiers
      const { data: prods } = await supabase
        .from('products')
        .select('*, modifier_groups(*, modifiers(*))')
        .eq('restaurant_id', restaurant.id)
        .eq('is_available', true)
        .order('order_index');
        
      if (prods) {
        setProducts(prods as ProductWithModifiers[]);
        
        // Find upsell products based on restaurant settings, fallback to featured
        const upsells = prods.filter(p => 
          p.id === restaurant.upsell_item_1_id || p.id === restaurant.upsell_item_2_id
        );
        
        if (upsells.length > 0) {
           setUpsellProducts(upsells as ProductWithModifiers[]);
        } else {
           setUpsellProducts(prods.filter(p => p.is_featured) as ProductWithModifiers[]);
        }
      }
      
      setIsLoading(false);
    }
    
    loadData();
  }, [slug, tableId, setContext]);
  
  // Scroll spy effect simplified for demo
  const scrollToCategory = (id: string) => {
    setActiveCategoryId(id);
    const element = document.getElementById(`category-${id}`);
    if (element) {
      // Offset for sticky nav
      const y = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleAddToCart = (product: ProductWithModifiers) => {
    if (product.modifier_groups && product.modifier_groups.length > 0) {
      setCustomizingProduct(product);
    } else {
      addItem({
        product: product as Product,
        quantity: 1,
        selectedModifiers: [],
        unitPrice: product.base_price
      });
    }
  };

  const handleModalAddToCart = (product: ProductWithModifiers, selectedModifiers: any[], unitPrice: number) => {
    addItem({
      product: product as Product,
      quantity: 1,
      selectedModifiers,
      unitPrice
    });
  };

  const handleCheckoutClick = () => {
    setIsCartOpen(false);
    setStep('customer');
    window.scrollTo(0, 0);
  };

  const handleCustomerSubmit = async (data: { name: string; email: string; phone?: string }) => {
    setIsProcessing(true);
    const supabase = createClient();
    
    // Check if customer exists or create new
    let newCustomerId = '';
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('restaurant_id', restaurantId || '')
      .eq('email', data.email)
      .maybeSingle() as any;
      
    if (existing) {
      newCustomerId = existing.id;
    } else {
      const { data: newCust, error } = await supabase
        .from('customers')
        .insert({
          restaurant_id: SURAKI_ID,
          name: data.name,
          email: data.email,
          phone: data.phone || null
        } as any)
        .select('id')
        .single() as any;
      if (!error && newCust) newCustomerId = newCust.id;
    }
    
    setCustomerId(newCustomerId);
    setIsProcessing(false);
    
    // Check if we should show upsell
    if (upsellProducts.length > 0) {
      setStep('upsell');
    } else {
      setStep('checkout');
    }
  };

  const handleUpsellAdd = (product: ProductWithModifiers) => {
    handleAddToCart(product);
  };
  
  const handleUpsellProceed = () => {
    setStep('checkout');
  };

  const handleProcessPayment = async (method: 'stripe' | 'cash' | 'terminal') => {
    setIsProcessing(true);
    setPaymentMethod(method);
    const supabase = createClient();
    
    // Save total before processing
    const currentTotal = getTotal();
    setLastTotal(currentTotal);
    
    // Insert into orders
    const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: SURAKI_ID,
        table_id: (tableId && tableId !== 'takeaway' && isValidUUID(tableId)) ? tableId : null,
        customer_id: customerId || null,
        status: 'pending',
        total_amount: getTotal(),
        payment_method: method,
        payment_status: 'pending'
      } as any)
      .select()
      .single() as any;
      
    if (orderError) {
      console.error('Error creating order:', orderError);
    } else if (order) {
      // Insert order items
      const itemsToInsert = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.unitPrice * item.quantity,
        modifiers_snapshot: item.selectedModifiers
      }));
      
      await supabase.from('order_items').insert(itemsToInsert as any);
      setLastOrderId(order.id);
    }
    
    // Wait slightly so the UI shows success and realtime fires
    await new Promise(r => setTimeout(r, 1000));
    
    if (method === 'cash' || method === 'terminal') {
      clearCart();
    }
    setIsProcessing(false);
    setStep('success');
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin"/>
    </div>;
  }

  // --- RENDERING FLOW STEPS ---

  if (step === 'customer') {
    return (
      <div className="p-6 pb-32 animate-fade-in">
        <button onClick={() => setStep('browse')} className="flex items-center text-gray-500 mb-8">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Volver al menú
        </button>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Tus Datos</h2>
          <p className="text-gray-500">Ingresa tus datos para vincular el pedido a tu mesa.</p>
        </div>
        <CustomerForm onSubmit={handleCustomerSubmit} isLoading={isProcessing} />
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="p-6 pb-32 animate-fade-in flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            ✓
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">¡Pedido Confirmado!</h2>
        <p className="text-gray-500 mb-8 max-w-sm">
          {paymentMethod === 'cash' 
            ? 'Tu orden ha sido enviada a la cocina. Paga en caja.' 
            : paymentMethod === 'terminal' 
              ? 'Tu orden está en cocina. El mesero traerá la terminal de pago.'
              : 'El pago ha sido exitoso y la cocina ya prepara tu pedido.'}
        </p>
        
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm mb-8 border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Total pagado:</p>
          <p className="text-3xl font-bold brand-text">{formatPrice(lastTotal, currency)}</p>
        </div>
        
        <div className="w-full max-w-sm space-y-4">
          <button 
            onClick={() => setStep('order_status')}
            className="w-full brand-bg text-white font-bold py-4 rounded-xl hover:brightness-110 shadow-lg shadow-red-600/20 transition-all flex items-center justify-center"
          >
            VER MI ORDEN
          </button>
          
          <button 
            onClick={() => {
              setPaymentMethod(null);
              setStep('browse');
              window.scrollTo(0, 0);
            }}
            className="w-full bg-gray-100 text-gray-900 font-bold py-4 rounded-xl hover:bg-gray-200 transition-all"
          >
            Hacer un nuevo pedido
          </button>
        </div>
      </div>
    );
  }

  if (step === 'order_status' && lastOrderId) {
    return (
      <div className="p-6 pb-32 animate-fade-in">
        <button onClick={() => setStep('success')} className="flex items-center text-gray-500 mb-8 hover:text-red-600 transition-colors">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Volver
        </button>
        <OrderStatus orderId={lastOrderId} restaurantId={restaurantId || ''} />
      </div>
    );
  }

  if (step === 'checkout') {
    return (
      <div className="p-6 pb-32 animate-fade-in">
        <button onClick={() => setStep('customer')} className="flex items-center text-gray-500 mb-8" disabled={isProcessing}>
          <ChevronLeft className="w-5 h-5 mr-1" />
          Volver
        </button>
        <CheckoutForm 
          total={getTotal()} 
          currency={currency} 
          onPayWithCard={() => handleProcessPayment('stripe')}
          onPayAtCounter={() => handleProcessPayment('cash')}
          onPayWithTerminal={() => handleProcessPayment('terminal')}
          isProcessing={isProcessing}
          paymentMethod={paymentMethod}
        />
      </div>
    );
  }

  return (
    <>

      <div className="pb-8">
        <CategoryNav 
          categories={categories} 
          activeId={activeCategoryId} 
          onSelect={scrollToCategory} 
        />
      
      <div className="p-4 space-y-12 animate-fade-in">
        {categories.map(category => {
          const categoryProducts = products.filter(p => p.category_id === category.id);
          if (categoryProducts.length === 0) return null;
          
          return (
            <div key={category.id} id={`category-${category.id}`} className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{category.name}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categoryProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onAdd={handleAddToCart}
                    currency={currency}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      </div>

      {/* Floating Cart Button */}
      {getItemCount() > 0 && step === 'browse' && (
        <div className="fixed bottom-6 left-0 right-0 z-40 px-4 max-w-2xl mx-auto animate-slide-up">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full brand-bg hover:brightness-110 text-white shadow-2xl shadow-red-600/20 rounded-2xl py-4 px-6 flex items-center justify-between font-bold text-lg active:scale-95 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 px-3 py-1 rounded-full text-sm">
                {getItemCount()}
              </div>
              <span>Ver Pedido</span>
            </div>
            <span>{formatPrice(getTotal(), currency)}</span>
          </button>
        </div>
      )}

      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        onCheckout={handleCheckoutClick}
        currency={currency}
      />

      <UpsellModal 
        isOpen={step === 'upsell'}
        products={upsellProducts}
        onAdd={handleUpsellAdd}
        onSkip={handleUpsellProceed}
        currency={currency}
      />

      <ProductCustomizationModal 
        isOpen={!!customizingProduct}
        product={customizingProduct}
        onClose={() => setCustomizingProduct(null)}
        onAddToCart={handleModalAddToCart}
        currency={currency}
      />
    </>
  );
}
