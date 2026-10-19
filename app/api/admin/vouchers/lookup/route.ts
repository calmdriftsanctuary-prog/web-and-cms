import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const rawCode = body.code || '';
    const code = String(rawCode).trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ error: 'Voucher code is required.' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: voucher, error: fetchErr } = await supabase
      .from('vouchers')
      .select('*')
      .eq('code', code)
      .single();

    if (fetchErr || !voucher) {
      return NextResponse.json({ error: `Voucher not found: ${code}` }, { status: 404 });
    }

    if (!voucher.is_active || voucher.remaining_value_gbp <= 0) {
      return NextResponse.json({ error: 'This voucher has already been fully redeemed or is inactive.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, voucher }, { status: 200 });
  } catch (err: any) {
    console.error('Voucher Lookup Exception:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}