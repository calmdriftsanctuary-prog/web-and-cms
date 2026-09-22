import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data: cards } = await supabase
      .from('loyalty_cards')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: history } = await supabase
      .from('loyalty_scan_history')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(50);

    return NextResponse.json({ cards: cards || [], history: history || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}