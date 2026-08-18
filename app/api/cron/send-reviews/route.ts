import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const targetStart = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
    const targetEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data: bookings, error: fetchErr } = await supabase
      .from('bookings')
      .select('*, treatments(title)')
      .eq('status', 'completed')
      .eq('review_email_sent', false)
      .gte('end_time', targetStart)
      .lte('end_time', targetEnd);

    if (fetchErr) throw fetchErr;
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: true, sentCount: 0, message: 'No pending review emails to send.' });
    }

    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('key', 'review_email')
      .single();

    const subject = template?.subject || 'Thank you for visiting Calm Drift Sanctuary!';
    let content = template?.content || 'Dear {{client_name}},\n\nThank you for visiting us for your {{treatment_title}}. We would love to hear your feedback!';

    let sentCount = 0;

    for (const booking of bookings) {
      if (!booking.client_email) continue;

      const personalisedContent = content
        .replace(/{{client_name}}/g, booking.client_name)
        .replace(/{{treatment_title}}/g, booking.treatments?.title || 'treatment');

      await resend.emails.send({
        from: 'Calm Drift Sanctuary <admin@calmdriftsanctuary.co.uk>',
        to: [booking.client_email],
        subject: subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #2C332B; background: #FAF9F6; border-radius: 12px;">
            <div style="white-space: pre-line; line-height: 1.6;">${personalisedContent}</div>
            <br/>
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://calmdriftsanctuary.co.uk/review" style="background-color: #6B8E70; color: white; padding: 12px 24px; text-decoration: none; border-radius: 9999px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; font-weight: bold;">Leave a Review</a>
            </div>
          </div>
        `,
      });

      await supabase
        .from('bookings')
        .update({ review_email_sent: true })
        .eq('id', booking.id);

      sentCount++;
    }

    return NextResponse.json({ success: true, sentCount });
  } catch (err: any) {
    console.error('Cron Review Email Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}