import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Simple memory cache to block duplicate rapid scans within 3 seconds
const recentScans = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const { identifier } = await request.json();
    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json({ error: 'identifier is required.' }, { status: 400 });
    }

    let rawId = identifier.trim();
    if (rawId.includes('/p/')) {
      const parts = rawId.split('/p/');
      rawId = parts[parts.length - 1].trim();
    }

    const lowerId = rawId.toLowerCase();
    const cleanPhone = rawId.replace(/\s+/g, '');

    // Cooldown check: prevent double scanning the same pass within 3 seconds
    const now = Date.now();
    if (recentScans.has(lowerId) && now - recentScans.get(lowerId)! < 3000) {
      return NextResponse.json({ error: 'scan already processed a moment ago. please wait.' }, { status: 429 });
    }
    recentScans.set(lowerId, now);

    // Query matching pass serial (preserving case), email, or phone
    const { data: client, error: fetchErr } = await supabase
      .from('loyalty_cards')
      .select('*')
      .or(`pass_serial.eq.${rawId},pass_serial.eq.${lowerId},client_email.eq.${lowerId},client_phone.eq.${cleanPhone}`)
      .maybeSingle();

    if (fetchErr || !client) {
      return NextResponse.json({ error: `client pass not found in crm (scanned: ${rawId})` }, { status: 404 });
    }

    const currentStamps = client.stamps_count ?? 0;
    const currentTotalVisits = client.total_visits ?? 0;
    const currentRewardsRedeemed = client.rewards_redeemed ?? 0;

    let newStamps = currentStamps + 1;
    let newTotalVisits = currentTotalVisits + 1;
    let newRewardsRedeemed = currentRewardsRedeemed;
    let actionType = 'stamp_added';
    let passDisplayValue = `${newStamps}/8 stamps`;

    // 9th visit check (8 stamps complete, 9th scan triggers reward)
    if (currentStamps >= 8) {
      newStamps = 0;
      newRewardsRedeemed = currentRewardsRedeemed + 1;
      actionType = 'reward_redeemed';
      passDisplayValue = '🎉 50% off redeemed!';

      const { error: updateErr } = await supabase
        .from('loyalty_cards')
        .update({
          stamps_count: 0,
          total_visits: newTotalVisits,
          rewards_redeemed: newRewardsRedeemed
        })
        .eq('id', client.id);

      if (updateErr) throw updateErr;
    } else {
      const { error: updateErr } = await supabase
        .from('loyalty_cards')
        .update({
          stamps_count: newStamps,
          total_visits: newTotalVisits
        })
        .eq('id', client.id);

      if (updateErr) throw updateErr;
    }

    // Write audit history log
    const { error: historyErr } = await supabase.from('loyalty_scan_history').insert([{
      pass_serial: client.pass_serial,
      client_email: client.client_email,
      action_type: actionType,
      previous_stamps: currentStamps,
      new_stamps: newStamps
    }]);

    if (historyErr) {
      console.error('Failed to log loyalty scan history:', historyErr);
    }

    // Push live update to Apple/Google Wallet pass
    const walletApiKey = process.env.WALLETWALLET_API_KEY || process.env.WALLET_API_KEY;
    let walletSynced = false;
    let walletError: string | null = null;

    if (walletApiKey && client.pass_serial) {
      try {
        const putRes = await fetch(`https://api.walletwallet.dev/api/passes/${client.pass_serial}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${walletApiKey}`
          },
          body: JSON.stringify({
            barcodeValue: client.pass_serial,
            barcodeFormat: 'QR',
            logoText: 'Calm Drift Sanctuary',
            organizationName: 'Calm Drift Sanctuary',
            colorPreset: 'dark',
            primaryFields: [{ label: 'CARD', value: 'Loyalty Card' }],
            secondaryFields: [
              { label: 'MEMBER', value: client.client_name },
              { label: 'VISITS', value: passDisplayValue }
            ]
          })
        });

        if (putRes.ok) {
          walletSynced = true;
        } else {
          const errBody = await putRes.text();
          walletError = `WalletWallet PUT failed (${putRes.status}): ${errBody}`;
          console.error(walletError);
        }
      } catch (walletErr: any) {
        walletError = walletErr?.message || 'WalletWallet sync background error';
        console.error('WalletWallet sync background error:', walletErr);
      }
    } else {
      walletError = 'Missing WALLETWALLET_API_KEY / WALLET_API_KEY or pass_serial';
    }

    return NextResponse.json({
      success: true,
      clientName: client.client_name,
      action: actionType,
      newStamps,
      totalVisits: newTotalVisits,
      rewardsRedeemed: newRewardsRedeemed,
      walletSynced,
      walletError
    });

  } catch (err: any) {
    console.error('Loyalty Scan Error:', err);
    return NextResponse.json({ error: err.message || 'internal server error' }, { status: 500 });
  }
}
