import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { identifier } = await request.json(); // email, phone, or pass_serial
    const cleanId = identifier.trim().toLowerCase();

    const { data: client, error: fetchErr } = await supabase
      .from('loyalty_cards')
      .select('*')
      .or(`client_email.eq.${cleanId},client_phone.eq.${cleanId},pass_serial.eq.${cleanId}`)
      .single();

    if (fetchErr || !client) {
      return NextResponse.json({ error: 'client pass not found in crm' }, { status: 404 });
    }

    const currentStamps = client.stamps_count;
    let newStamps = currentStamps + 1;
    let actionType = 'stamp_added';
    let passDisplayValue = '';

    // Check if they reached the 9th scan (8 stamps completed, 9th visit triggers reward)
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

    // Write permanent record to audit history log
    await supabase.from('loyalty_scan_history').insert([{
      pass_serial: client.pass_serial,
      client_email: client.client_email,
      action_type: actionType,
      previous_stamps: currentStamps,
      new_stamps: newStamps
    }]);

    // Push live update to Apple/Google Wallet pass via provider API
    if (process.env.WALLET_API_KEY) {
      await fetch(`https://api.walletwallet.dev/api/passes/${client.pass_serial}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WALLET_API_KEY}`
        },
        body: JSON.stringify({
          primaryFields: [
            { 
              key: 'stamps', 
              label: 'stamps', 
              value: actionType === 'reward_redeemed' ? '🎉 50% off redeemed!' : passDisplayValue 
            }
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