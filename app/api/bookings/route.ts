import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: 'Invalid request body received.' }, { status: 400 });
    }

    const { treatmentId, clientName, clientEmail, clientPhone, startTime, durationMinutes, notes } = body;

    if (!clientName || !clientEmail || !clientPhone) {
      return NextResponse.json({ error: 'Please fill in all required client details.' }, { status: 400 });
    }

    const start = new Date(startTime || Date.now());
    const end = new Date(start.getTime() + (durationMinutes || 60) * 60000);

    let validTreatmentId = treatmentId;
    if (!validTreatmentId) {
      const { data: defaultTreatment } = await supabase.from('treatments').select('id').limit(1).single();
      validTreatmentId = defaultTreatment?.id;
    }

    // 1. Insert Booking into Supabase CMS Calendar
    const { data: booking, error: dbError } = await supabase
      .from('bookings')
      .insert({
        treatment_id: validTreatmentId,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        notes: notes || '',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: 'confirmed',
      })
      .select('*, treatments(title)')
      .single();

    if (dbError) {
      console.error('Supabase DB Insert Error:', dbError);
      return NextResponse.json({ error: `Database Error: ${dbError.message}` }, { status: 500 });
    }

    // 2. Dispatch Confirmation Email via Resend with Guaranteed Consultation Button
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey && resendApiKey.startsWith('re_')) {
      const consultationLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://calmdriftsanctuary.co.uk'}/consultation/${booking.id}`;

      // Fetch template from DB if available, otherwise fallback
      const { data: dbTemplate } = await supabase
        .from('email_templates')
        .select('*')
        .eq('key', 'confirmation_email')
        .single();

      const emailSubject = dbTemplate?.subject || 'Your Reservation at Calm Drift Sanctuary';
      
      let emailHtml = dbTemplate?.content;
      if (!emailHtml) {
        emailHtml = `
          <div style="font-family: sans-serif; color: #2C332B; padding: 24px; background-color: #FAF9F6; border-radius: 12px;">
            <h2 style="font-family: Georgia, serif; color: #2C332B; font-weight: 500;">Your Sanctuary Reservation is Confirmed</h2>
            <p style="font-weight: 300; color: #6B7280;">Dear ${clientName},</p>
            <p style="font-weight: 300;">We look forward to hosting you on <strong>${start.toLocaleString()}</strong>.</p>
          </div>
        `;
      }

      // Guarantee the consultation button block is attached at the bottom
      emailHtml += `
        <div style="margin-top: 24px;">
          <p style="font-weight: 300; margin-bottom: 12px;">Please complete your pre-treatment digital consultation prior to arrival:</p>
          <a href="${consultationLink}" style="background-color: #6B8E70; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 9999px; font-weight: 600; display: inline-block;">Complete Digital Consultation</a>
        </div>
      `;

      try {
        await resend.emails.send({
          from: 'Calm Drift Sanctuary <bookings@calmdriftsanctuary.co.uk>',
          to: [clientEmail],
          subject: emailSubject,
          html: emailHtml,
        });
      } catch (emailErr) {
        console.error('Resend Dispatch Error:', emailErr);
      }
    }

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    console.error('Fatal Booking Route Catch:', error);
    return NextResponse.json({ error: `Server catch error: ${error?.message || 'Unknown error'}` }, { status: 500 });
  }
}