import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SURAKI_ID } from '@/lib/supabase/client';
// import { stripe } from '@/lib/stripe'; // In a real app we'd use stripe

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, restaurantId, tableId, customer, paymentMethod, total } = body;

    const supabaseAdmin = createAdminClient();

    // 1. Upsert customer
    let customerId = null;
    if (customer && customer.email) {
      const { data: custData, error: custErr } = await supabaseAdmin
        .from('customers')
        .upsert({
          restaurant_id: SURAKI_ID,
          email: customer.email,
          name: customer.name,
          phone: customer.phone,
          last_visit_at: new Date().toISOString()
        } as any, { onConflict: 'restaurant_id, email' })
        .select('id')
        .single() as any;
        
      if (custData) {
        customerId = custData.id;
      }
    }

    // 2. Create Order
    // Generate simple order number
    const orderNumber = Math.floor(100 + Math.random() * 900).toString();

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        restaurant_id: SURAKI_ID,
        table_id: tableId,
        customer_id: customerId,
        order_number: parseInt(orderNumber),
        status: 'pending',
        total_amount: total,
        payment_status: paymentMethod === 'cash' ? 'pending' : 'paid',
        payment_method: paymentMethod
      } as any)
      .select('id, order_number')
      .single() as any;

    if (orderError) throw orderError;

    // 3. Create Order Items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.subtotal,
      modifiers_snapshot: item.selectedModifiers || []
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems as any);

    if (itemsError) throw itemsError;

    // Simulate Stripe payment intent creation if needed
    let clientSecret = null;
    if (paymentMethod === 'stripe') {
      // In real implementation:
      // const paymentIntent = await stripe.paymentIntents.create({
      //   amount: Math.round(total * 100),
      //   currency: 'usd',
      //   metadata: { orderId: order.id }
      // });
      // clientSecret = paymentIntent.client_secret;
      
      clientSecret = 'dummy_client_secret_for_demo';
    }

    return NextResponse.json({ 
      success: true, 
      orderId: order.id, 
      orderNumber: order.orderNumber,
      clientSecret 
    });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
