import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST() {
  try {
    const walletApiKey = process.env.WALLETWALLET_API_KEY || process.env.WALLET_API_KEY;
    if (!walletApiKey) {
      return NextResponse.json(
        { error: 'Wallet API key is missing on server environment.' },
        { status: 500 }
      );
    }

    // Fetch all loyalty cards with an active pass_serial
    const { data: cards, error: fetchErr } = await supabase
      .from('loyalty_cards')
      .select('id, client_name, pass_serial, stamps_count')
      .not('pass_serial', 'is', null)
      .neq('pass_serial', '');

    if (fetchErr) throw fetchErr;

    if (!cards || cards.length === 0) {
      return NextResponse.json({
        success: true,
        total: 0,
        synced: 0,
        failed: 0,
        message: 'No active loyalty passes found to sync.'
      });
    }

    let synced = 0;
    let failed = 0;
    const errors: { serial: string; status?: number; reason: string }[] = [];

    for (const card of cards) {
      const stamps = card.stamps_count ?? 0;
      const passDisplayValue = stamps >= 8 ? '🎉 50% off unlocked!' : `${stamps}/8 stamps`;

      try {
        const putRes = await fetch(`https://api.walletwallet.dev/api/passes/${card.pass_serial}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${walletApiKey}`
          },
          body: JSON.stringify({
            barcodeValue: card.pass_serial,
            barcodeFormat: 'QR',
            logoText: 'Calm Drift Sanctuary',
            organizationName: 'Calm Drift Sanctuary',
            colorPreset: 'dark',
            primaryFields: [{ label: 'CARD', value: 'Loyalty Card' }],
            secondaryFields: [
              { label: 'MEMBER', value: card.client_name },
              { label: 'VISITS', value: passDisplayValue }
            ]
          })
        });

        if (putRes.ok) {
          synced++;
        } else {
          failed++;
          const errText = await putRes.text();
          errors.push({
            serial: card.pass_serial,
            status: putRes.status,
            reason: errText
          });
        }
      } catch (err: any) {
        failed++;
        errors.push({
          serial: card.pass_serial,
          reason: err?.message || 'Network error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: cards.length,
      synced,
      failed,
      errors
    });
  } catch (err: any) {
    console.error('Bulk Loyalty Sync Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to sync wallet passes' },
      { status: 500 }
    );
  }
}
