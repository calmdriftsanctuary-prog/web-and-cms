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
    const hasConsented = Boolean(marketingOptIn);

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
          marketing_opt_in: hasConsented,
          marketing_opt_in_at: hasConsented ? new Date().toISOString() : null,
          status: 'confirmed',
        },
      ])
      .select('id, client_name, client_email, client_phone, start_time, marketing_opt_in')
      .single();

    if (bookingError) throw bookingError;

    // 2. Fetch treatment details for email & confirmation
    const { data: treatmentData } = await supabase
      .from('treatments')
      .select('title, price_gbp')
      .eq('id', treatmentId)
      .single();

    const treatment = treatmentData || { title: 'Sanctuary Treatment', price_gbp: 0 };
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error('RESEND_API_KEY is missing from environment variables.');
    } else {
      const consultationUrl = `https://calmdriftsanctuary.co.uk/consultation/${bookingData.id}`;
      const formattedDate = startDateTime.toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' }) + ' BST';

      // 3. Send Admin Notification Email to calmdriftsanctuary@gmail.com
      try {
        const adminEmailPayload = {
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
              <p><strong>Date & Time:</strong> ${formattedDate}</p>
              <p><strong>Marketing Opt-In:</strong> <span style="color: ${hasConsented ? '#047857' : '#6b7280'}; font-weight:bold;">${hasConsented ? 'Yes (Consented)' : 'No Consent'}</span></p>
              ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            </div>
          `,
        };

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
          body: JSON.stringify(adminEmailPayload),
        });
      } catch (adminErr) {
        console.error('Failed to send admin notification email:', adminErr);
      }

      // 4. Send Client Confirmation Email (With what3words and Consultation Button)
      try {
        const clientEmailPayload = {
          from: 'Calm Drift Sanctuary <admin@calmdriftsanctuary.co.uk>',
          to: [clientEmail],
          subject: `Booking Confirmed: ${treatment.title} at Calm Drift Sanctuary`,
          html: `
            <div style="font-family:sans-serif; color:#2C332B; padding:25px; background:#FAF9F6; border-radius:12px; max-width:600px; margin:0 auto;">
              <h2 style="color:#6B8E70; margin-top:0;">Your Session is Confirmed</h2>
              <p>Dear ${clientName},</p>
              <p>Thank you for booking with Calm Drift Sanctuary. We look forward to welcoming you.</p>
              
              <div style="background:#ffffff; padding:20px; border-radius:8px; border:1px solid #E5E7EB; margin:20px 0;">
                <p style="margin:5px 0;"><strong>Treatment:</strong> ${treatment.title} (£${treatment.price_gbp})</p>
                <p style="margin:5px 0;"><strong>Date & Time:</strong> ${formattedDate}</p>
                <p style="margin:5px 0;"><strong>Location:</strong> Calm Drift Sanctuary</p>
                <p style="margin:5px 0;"><strong>what3words:</strong> ///converged.archives.downturn</p>
              </div>

              <p style="margin-bottom:15px;">Before your visit, please complete your mandatory digital consultation form by clicking the button below:</p>
              
              <div style="text-align:center; margin:30px 0;">
                <a href="${consultationUrl}" style="background-color:#6B8E70; color:#ffffff; padding:12px 24px; text-decoration:none; border-radius:50px; font-size:14px; font-weight:bold; display:inline-block;">Complete Consultation Form</a>
              </div>

              <p style="font-size:12px; color:#6b7280; margin-top:30px; border-top:1px solid #E5E7EB; pt-15px;">If you have any questions or need to reschedule, please reply directly to this email.</p>
            </div>
          `,
        };

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
          body: JSON.stringify(clientEmailPayload),
        });
      } catch (clientErr) {
        console.error('Failed to send client confirmation email:', clientErr);
      }
    }

    return NextResponse.json({ success: true, booking: bookingData }, { status: 200 });
  } catch (err: any) {
    console.error('Booking API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}