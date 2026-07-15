import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurantName, contactName, email, phone, businessType } = body;

    if (!restaurantName || !contactName || !email) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert({
        restaurant_name: restaurantName,
        contact_name: contactName,
        email,
        phone: phone || null,
        business_type: businessType || 'other',
      } as any)
      .select('id')
      .single() as any;

    if (error) throw error;

    return NextResponse.json({ success: true, leadId: data.id });
  } catch (error: any) {
    console.error('Lead capture error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
