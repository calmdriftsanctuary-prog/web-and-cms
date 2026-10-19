import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Update all matching records for this email to opt out of marketing
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        marketing_opt_in: false,
      })
      .ilike('client_email', cleanEmail);

    if (updateError) {
      console.error('Unsubscribe update error:', updateError);
      return NextResponse.json({ error: 'Failed to process unsubscribe request.' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('Unsubscribe exception:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}