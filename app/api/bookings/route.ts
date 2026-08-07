import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      treatmentId,
      clientName,
      clientEmail,
      clientPhone,
      startTime,
      durationMinutes,
      notes,
      marketingOptIn,
    } = body;

    if (!treatmentId || !clientName || !clientEmail || !startTime) {
      return NextResponse.json({ error: 'Missing required booking fields' }, { status: 400 });
    }

    const startDateTime = new Date(startTime);
    const endDateTime = new Date(startDateTime.getTime() + (durationMinutes || 60) * 60000);

    // 1. Insert booking into Supabase database
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .insert([
        {
          treatment_id: treatmentId,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone || '',
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          notes: notes || '',
          marketing_opt_in: !!marketingOptIn,
          marketing_opt_in_at: marketingOptIn ? new Date().toISOString() : null,
          status: 'confirmed',
        },
      ])
      .select('id, client_name, client_email, client_phone, start_time')
      .single();

    if (bookingError) throw bookingError;

    // 2. Fetch treatment details for email & confirmation
    const { data: treatmentData } = await supabase
      .from('treatments')
      .select('title, price_gbp')
      .eq('id', treatmentId)
      .single();

    const treatment = treatmentData || { title: 'Sanctuary Treatment', price_gbp: 0 };

    // 3. Send automated notification email to admin via Resend API
    try {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.error('RESEND_API_KEY is missing from environment variables.');
      } else {
        const emailPayload = {
          from: 'Calm Drift Sanctuary <admin@calmdriftsanctuary.co.uk>',
          to: ['calmdriftsanctuary@gmail.com'],
          subject: `New Booking: ${clientName} - ${treatment.title}`,
          html: `
            <div style="font-family:sans-serif; color:#2C332B; padding:20px; background:#FAF9F6; border-radius:12px;">
              <h2 style="color:#6B8E70;">New Sanctuary Reservation</h2>
              <p>A new appointment has been booked through the website.</p>
              <hr style="border:none; border-top:1px solid #E5E7EB; margin:15px 0;" />
              <p><strong>Client:</strong> ${clientName}</p>
              <p><strong>Email:</strong> ${clientEmail}</p>
              <p><strong>Phone:</strong> ${clientPhone || 'Not provided'}</p>
              <p><strong>Treatment:</strong> ${treatment.title} (£${treatment.price_gbp})</p>
              <p><strong>Date & Time:</strong> ${startDateTime.toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' }) + ' BST'}</p>
              <p><strong>Marketing Opt-In:</strong> <span style="color: ${marketingOptIn ? '#047857' : '#6b7280'}; font-weight:bold;">${marketingOptIn ? 'Yes (Consented)' : 'No Consent'}</span></p>
              ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            </div>
          `,
        };

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify(emailPayload),
        });

        const emailResultText = await emailRes.text();
        if (!emailRes.ok) {
          console.error('Resend API Error Response:', emailResultText);
        } else {
          console.log('Admin notification email sent successfully:', emailResultText);
        }
      }
    } catch (emailErr) {
      console.error('Failed to dispatch admin notification email exception:', emailErr);
    }

    return NextResponse.json({ success: true, booking: bookingData }, { status: 200 });
  } catch (err: any) {
    console.error('Booking API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}