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
    if (!identifier) {
      return NextResponse.json({ error: 'identifier is required.' }, { status: 400 });
    }

    let cleanId = identifier.trim().toLowerCase();
    if (cleanId.includes('/p/')) {
      const parts = cleanId.split('/p/');
      cleanId = parts[parts.length - 1].trim();
    }

    // Cooldown check: prevent double scanning the same pass within 3 seconds
    const now = Date.now();
    if (recentScans.has(cleanId) && now - recentScans.get(cleanId)! < 3000) {
      return NextResponse.json({ error: 'scan already processed a moment ago. please wait.' }, { status: 429 });
    }
    recentScans.set(cleanId, now);

    // Query matching pass serial, email, or phone
    const { data: client, error: fetchErr } = await supabase
      .from('loyalty_cards')
      .select('*')
      .or(`pass_serial.eq.${cleanId},client_email.eq.${cleanId},client_phone.eq.${cleanId}`)
      .single();

    if (fetchErr || !client) {
      return NextResponse.json({ error: `client pass not found in crm (scanned: ${cleanId})` }, { status: 404 });
    }

    const currentStamps = client.stamps_count;
    let newStamps = currentStamps + 1;
    let actionType = 'stamp_added';
    let passDisplayValue = '';

    // 9th visit check (8 stamps complete, 9th scan triggers reward)
    if (currentStamps >= 8) {
      newStamps = 0;
      actionType = 'reward_redeemed';
      passDisplayValue = 'reward redeemed! card reset to 0/8';

      await supabase
        .from('loyalty_cards')
        .update({ 
          stamps_count: 0, 
          total_visits: client.total_visits + 1,
          rewards_redeemed: client.rewards_redeemed + 1 
        })
        .eq('id', client.id);

    } else {
      passDisplayValue = `${newStamps}/8 stamps`;

      await supabase
        .from('loyalty_cards')
        .update({ 
          stamps_count: newStamps,
          total_visits: client.total_visits + 1
        })
        .eq('id', client.id);
    }

    // Write audit history log
    await supabase.from('loyalty_scan_history').insert([{
      pass_serial: client.pass_serial,
      client_email: client.client_email,
      action_type: actionType,
      previous_stamps: currentStamps,
      new_stamps: newStamps
    }]);

    // Push live update to Apple/Google Wallet pass
    if (process.env.WALLET_API_KEY) {
      await fetch(`https://api.walletwallet.dev/api/passes/${client.pass_serial}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WALLET_API_KEY}`
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
            { label: 'VISITS', value: actionType === 'reward_redeemed' ? '🎉 50% off redeemed!' : passDisplayValue }
          ]
        })
      });
    }

    return NextResponse.json({ 
      success: true, 
      clientName: client.client_name,
      action: actionType,
      newStamps, 
      totalVisits: client.total_visits + 1,
      rewardsRedeemed: actionType === 'reward_redeemed' ? client.rewards_redeemed + 1 : client.rewards_redeemed
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}