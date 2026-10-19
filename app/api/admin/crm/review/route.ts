import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const { clientEmail, clientName, treatmentTitle, bookingDate } = body;

    if (!clientEmail) {
      return NextResponse.json({ error: 'Client email is required to send a review request.' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY is missing from environment variables.' }, { status: 500 });
    }

    const resendClient = new Resend(apiKey);

    const treatmentDisplay = treatmentTitle ? `your recent ${treatmentTitle} session` : `your recent visit`;
    const dateDisplay = bookingDate ? ` on ${bookingDate}` : ``;

    // Send Review Request Email via Resend
    const emailResponse = await resendClient.emails.send({
      from: 'Calm Drift Sanctuary <bookings@calmdriftsanctuary.co.uk>',
      to: [clientEmail.trim().toLowerCase()],
      subject: `We hope you enjoyed your visit - Calm Drift Sanctuary`,
      html: `
        <div style="font-family:sans-serif; color:#2C332B; padding:30px; background:#FAF9F6; border-radius:16px; max-width:650px; margin:0 auto; line-height: 1.6;">
          <div style="text-align: center; border-bottom: 1px solid #E5E7EB; padding-bottom: 20px; margin-bottom: 20px;">
            <h1 style="font-family: serif; color:#693F00; margin:0 0 5px 0; text-transform: lowercase; font-size: 24px;">calm drift sanctuary</h1>
            <p style="font-size: 12px; color: #6b7280; margin: 0; text-transform: lowercase;">stoke-on-trent, staffordshire<br>website: calmdriftsanctuary.co.uk</p>
          </div>

          <h2 style="color:#693F00; font-size: 18px; text-transform: lowercase; margin-top: 0;">how was your experience?</h2>
          
          <p style="text-transform: lowercase;">dear ${clientName || 'valued client'},</p>
          <p style="text-transform: lowercase;">thank you for joining us for ${treatmentDisplay}${dateDisplay} at calm drift sanctuary. we hope you felt completely relaxed and refreshed during your time with us.</p>

          <p style="text-transform: lowercase;">as a small independent studio, word of mouth means everything to us. if you have a spare moment, we would love to hear your feedback.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://calmdriftsanctuary.co.uk/review" style="background-color: #693F00; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 50px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">leave us a review</a>
          </div>

          <p style="text-transform: lowercase; font-size: 13px;">if there is anything we could have done to make your visit even better, please feel free to reply directly to this email.</p>

          <p style="font-size:12px; color:#6b7280; margin-top:30px; border-top:1px solid #E5E7EB; padding-top:15px; text-transform:lowercase;">warm regards,<br>the calm drift sanctuary team</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, emailResponse }, { status: 200 });

  } catch (err: any) {
    console.error('CRM Review Email Exception:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}