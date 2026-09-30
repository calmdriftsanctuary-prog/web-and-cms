import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    if (!code) {
      return NextResponse.json({ error: 'Voucher code is required.' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // 1. Fetch voucher
    const { data: voucher, error: fetchErr } = await supabase
      .from('vouchers')
      .select('*')
      .eq('code', cleanCode)
      .single();

    if (fetchErr || !voucher) {
      return NextResponse.json({ error: 'Voucher not found.' }, { status: 404 });
    }

    if (!voucher.is_active || voucher.remaining_value_gbp <= 0) {
      return NextResponse.json({ error: 'This voucher has already been fully redeemed or is inactive.' }, { status: 400 });
    }

    // Redeem the full remaining balance (or you can adjust this if partial redemption is needed)
    const redeemAmount = voucher.remaining_value_gbp;
    const newBalance = 0;

    // 2. Update voucher record
    const { error: updateErr } = await supabase
      .from('vouchers')
      .update({
        remaining_value_gbp: newBalance,
        is_active: false
      })
      .eq('id', voucher.id);

    if (updateErr) throw updateErr;

    // 3. Log redemption audit trail
    await supabase.from('voucher_redemptions').insert([{
      voucher_id: voucher.id,
      amount_redeemed: redeemAmount,
      remaining_balance: newBalance
    }]);

    return NextResponse.json({
      success: true,
      recipientName: voucher.recipient_name,
      redeemedAmount: redeemAmount,
      remainingBalance: newBalance
    });

  } catch (err: any) {
    console.error('Voucher Redemption Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}