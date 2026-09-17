import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Fetch site templates from database
    const { data: templates } = await supabase.from('site_templates').select('*');
    const templatesMap = (templates || []).reduce((acc: any, item: any) => {
      acc[item.key] = item;
      return acc;
    }, {});

    // 1. Check for Consultation Reminders (Appointments starting in ~1 hour)
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const windowStart = new Date(oneHourFromNow.getTime() - 15 * 60 * 1000).toISOString();
    const windowEnd = new Date(oneHourFromNow.getTime() + 15 * 60 * 1000).toISOString();

    const { data: upcomingBookings } = await supabase
      .from('bookings')
      .select('*, treatments(*), consultations(*)')
      .gte('start_time', windowStart)
      .lte('start_time', windowEnd);

    if (upcomingBookings) {
      for (const booking of upcomingBookings) {
        if (!booking.consultations || booking.consultations.length === 0) {
          if (!booking.client_email) continue;

          const tmpl = templatesMap['consultation_email'] || {
            subject: 'Please Complete Your Calm Drift Sanctuary Consultation Form',
            content: 'Dear [Client Name],\n\nPlease complete your consultation form prior to your upcoming visit.'
          };

          const formattedDate = new Date(booking.start_time).toLocaleString('en-GB', {
            dateStyle: 'full',
            timeStyle: 'short',
            timeZone: 'Europe/London'
          });

          const renderedContent = tmpl.content
            .replace(/\[Client Name\]/g, booking.client_name || 'Valued Client')
            .replace(/\[Treatment Title\]/g, booking.treatments?.title || 'Holistic Session')
            .replace(/\[Date & Time\]/g, formattedDate)
            .replace(/\[Duration\]/g, `${booking.treatments?.duration_minutes || 60} mins`)
            .replace(/\[Price\]/g, `£${booking.price_override ?? booking.treatments?.price_gbp ?? 0}`);

          const consultationUrl = `https://calmdriftsanctuary.co.uk/consultation/${booking.id}`;

          await resend.emails.send({
            from: 'Calm Drift Sanctuary <bookings@calmdriftsanctuary.co.uk>',
            to: [booking.client_email],
            subject: tmpl.subject,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #2C332B;">
                <h2 style="color: #693F00;">Consultation Form Reminder</h2>
                <div style="white-space: pre-line; line-height: 1.6;">${renderedContent}</div>
                <div style="margin: 15px 0; padding: 15px; background: #FAF9F6; border-radius: 8px; border: 1px solid #E5E7EB;">
                  <p style="margin: 0; font-size: 13px;"><strong>Location / what3words:</strong> ///converged.archives.downturn</p>
                </div>
                <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center;">
                  <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                    <tr>
                      <td align="center" bgcolor="#693F00" style="border-radius: 9999px;">
                        <a href="${consultationUrl}" target="_blank" style="font-size: 15px; font-family: sans-serif; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 9999px; border: 1px solid #693F00; display: inline-block; font-weight: 600; background-color: #693F00;">Complete Digital Consultation</a>
                      </td>
                    </tr>
                  </table>
                </div>
                <br/>
                <p>Warm regards,<br/><strong>Calm Drift Sanctuary Team</strong></p>
              </div>
            `,
          });
        }
      }
    }

    // 2. Check for Review Requests (Appointments that ended ~2 hours ago)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const reviewWindowStart = new Date(twoHoursAgo.getTime() - 45 * 60 * 1000).toISOString();
    const reviewWindowEnd = new Date(twoHoursAgo.getTime() + 45 * 60 * 1000).toISOString();

    const { data: pastBookings } = await supabase
      .from('bookings')
      .select('*, treatments(*)')
      .eq('status', 'completed')
      .eq('review_email_sent', false)
      .gte('end_time', reviewWindowStart)
      .lte('end_time', reviewWindowEnd);

    if (pastBookings) {
      for (const booking of pastBookings) {
        if (!booking.client_email) continue;

        const tmpl = templatesMap['review_email'] || {
          subject: 'Thank you for visiting Calm Drift Sanctuary',
          content: 'Dear [Client Name],\n\nWe hope you enjoyed your restorative experience at Calm Drift Sanctuary. We would love your feedback.'
        };

        const formattedDate = new Date(booking.start_time).toLocaleString('en-GB', {
          dateStyle: 'full',
          timeStyle: 'short',
          timeZone: 'Europe/London'
        });

        const renderedContent = tmpl.content
          .replace(/\[Client Name\]/g, booking.client_name || 'Valued Client')
          .replace(/\[Treatment Title\]/g, booking.treatments?.title || 'Holistic Session')
          .replace(/\[Date & Time\]/g, formattedDate)
          .replace(/\[Duration\]/g, `${booking.treatments?.duration_minutes || 60} mins`)
          .replace(/\[Price\]/g, `£${booking.price_override ?? booking.treatments?.price_gbp ?? 0}`);

        await resend.emails.send({
          from: 'Calm Drift Sanctuary <admin@calmdriftsanctuary.co.uk>',
          to: [booking.client_email],
          subject: tmpl.subject,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #2C332B; background: #FAF9F6; border-radius: 12px;">
              <div style="white-space: pre-line; line-height: 1.6;">${renderedContent}</div>
              <br/>
              <div style="text-align: center; margin-top: 30px;">
                <a href="https://calmdriftsanctuary.co.uk/review" style="background-color: #693F00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 9999px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; font-weight: bold;">Leave a Review</a>
              </div>
            </div>
          `,
        });

        await supabase
          .from('bookings')
          .update({ review_email_sent: true })
          .eq('id', booking.id);
      }
    }

    return NextResponse.json({ success: true, checkedAt: now.toISOString() });
  } catch (err: any) {
    console.error('Cron trigger error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}