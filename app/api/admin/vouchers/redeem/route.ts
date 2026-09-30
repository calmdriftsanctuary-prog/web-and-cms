import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { code, amount } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Voucher code is required.' }, { status: 400 });
    }

    // 1. Fetch voucher from database
    const { data: voucher, error: fetchErr } = await supabase
      .from('vouchers')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (fetchErr || !voucher) {
      return NextResponse.json({ error: 'Voucher not found.' }, { status: 404 });
    }

    if (!voucher.is_active || voucher.remaining_value_gbp <= 0) {
      return NextResponse.json({ error: 'This voucher has already been fully redeemed or is inactive.' }, { status: 400 });
    }

    // 2. Determine redemption amount (defaults to full remaining balance if left blank)
    const requestedAmount = amount !== undefined && amount !== '' ? Number(amount) : voucher.remaining_value_gbp;

    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid redemption amount.' }, { status: 400 });
    }

    if (requestedAmount > voucher.remaining_value_gbp) {
      return NextResponse.json({ 
        error: `Redemption amount (£${requestedAmount}) exceeds remaining balance (£${voucher.remaining_value_gbp}).` 
      }, { status: 400 });
    }

    const newRemainingBalance = Number((voucher.remaining_value_gbp - requestedAmount).toFixed(2));
    const shouldDeactivate = newRemainingBalance === 0;

    // 3. Update voucher balance and active status in Supabase
    const { error: updateErr } = await supabase
      .from('vouchers')
      .update({
        remaining_value_gbp: newRemainingBalance,
        is_active: !shouldDeactivate,
        updated_at: new Date().toISOString()
      })
      .eq('id', voucher.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      code: voucher.code,
      recipientName: voucher.recipient_name,
      redeemedAmount: requestedAmount,
      remainingBalance: newRemainingBalance,
      isFullyRedeemed: shouldDeactivate
    });

  } catch (err: any) {
    console.error('Voucher Redemption Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}