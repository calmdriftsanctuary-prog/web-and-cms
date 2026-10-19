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
    const { firstName, lastName, email } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'First name, last name, and email are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    // Check if a record already exists matching the email address
    const { data: existingRecords, error: fetchError } = await supabase
      .from('bookings')
      .select('id, client_email, client_name')
      .ilike('client_email', cleanEmail);

    if (fetchError) {
      console.error('CRM lookup error:', fetchError);
      return NextResponse.json({ error: 'Database error during lookup.' }, { status: 500 });
    }

    // Filter precisely to match the exact email and first/last name combination
    const matchedRecord = existingRecords?.find((record) => {
      const dbName = (record.client_name || '').trim().toLowerCase();
      const targetName = fullName.toLowerCase();
      return dbName === targetName;
    });

    const now = new Date().toISOString();

    if (matchedRecord) {
      // If user exists, update their marketing consent flags
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          marketing_opt_in: true,
          marketing_opt_in_at: now,
        })
        .eq('id', matchedRecord.id);

      if (updateError) {
        console.error('CRM update error:', updateError);
        return NextResponse.json({ error: 'Failed to update marketing consent.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'updated' }, { status: 200 });
    } else {
      // If user doesn't exist, create a new record
      const { error: insertError } = await supabase
        .from('bookings')
        .insert([
          {
            client_name: fullName,
            client_email: cleanEmail,
            marketing_opt_in: true,
            marketing_opt_in_at: now,
            status: 'enquiry',
          },
        ]);

      if (insertError) {
        console.error('CRM insert error:', insertError);
        return NextResponse.json({ error: 'Failed to create new CRM record.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'created' }, { status: 200 });
    }
  } catch (err: any) {
    console.error('Campaign signup exception:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}