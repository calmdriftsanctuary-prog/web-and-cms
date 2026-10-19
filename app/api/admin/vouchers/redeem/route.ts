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
    const { code, amount } = body;

    if (!code || amount === undefined || amount === null) {
      return NextResponse.json({ error: 'Voucher code and redemption amount are required.' }, { status: 400 });
    }

    const redeemAmount = Number(amount);
    if (isNaN(redeemAmount) || redeemAmount <= 0) {
      return NextResponse.json({ error: 'Invalid redemption amount.' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch current voucher
    const { data: voucher, error: fetchErr } = await supabase
      .from('vouchers')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (fetchErr || !voucher) {
      return NextResponse.json({ error: 'Voucher not found in system.' }, { status: 404 });
    }

    if (!voucher.is_active || voucher.remaining_value_gbp <= 0) {
      return NextResponse.json({ error: 'This voucher has already been fully redeemed or is inactive.' }, { status: 400 });
    }

    if (redeemAmount > voucher.remaining_value_gbp) {
      return NextResponse.json({ error: `Redemption amount (£${redeemAmount}) exceeds remaining balance (£${voucher.remaining_value_gbp}).` }, { status: 400 });
    }

    const newRemainingBalance = Number((voucher.remaining_value_gbp - redeemAmount).toFixed(2));
    const isActive = newRemainingBalance > 0;

    // 2. Update voucher in Supabase
    const { error: updateErr } = await supabase
      .from('vouchers')
      .update({
        remaining_value_gbp: newRemainingBalance,
        is_active: isActive
      })
      .eq('id', voucher.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      redeemedAmount: redeemAmount,
      remainingBalance: newRemainingBalance,
      recipientName: voucher.recipient_name,
      isActive
    }, { status: 200 });

  } catch (err: any) {
    console.error('Voucher Redemption Exception:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}