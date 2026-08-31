import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(request: Request) {
  try {
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
          const tmpl = templatesMap['consultation_email'] || {
            subject: 'Please Complete Your Calm Drift Sanctuary Consultation Form',
            content: 'Dear [Client Name],\n\nPlease complete your consultation form prior to your upcoming visit.'
          };

          const formattedDate = new Date(booking.start_time).toLocaleString('en-GB', {
            dateStyle: 'full',
            timeStyle: 'short',
          });

          const renderedContent = tmpl.content
            .replace(/\[Client Name\]/g, booking.client_name || 'Valued Client')
            .replace(/\[Treatment Title\]/g, booking.treatments?.title || 'Holistic Session')
            .replace(/\[Date & Time\]/g, formattedDate)
            .replace(/\[Duration\]/g, `${booking.treatments?.duration_minutes || 60} mins`)
            .replace(/\[Price\]/g, `£${booking.price_override ?? booking.treatments?.price_gbp ?? 0}`);

          console.log(`Sending Consultation Reminder to ${booking.client_email}`);
        }
      }
    }

    // 2. Check for Review Requests (Appointments that ended ~24 hours ago)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const reviewWindowStart = new Date(twentyFourHoursAgo.getTime() - 30 * 60 * 1000).toISOString();
    const reviewWindowEnd = new Date(twentyFourHoursAgo.getTime() + 30 * 60 * 1000).toISOString();

    const { data: pastBookings } = await supabase
      .from('bookings')
      .select('*, treatments(*)')
      .gte('end_time', reviewWindowStart)
      .lte('end_time', reviewWindowEnd);

    if (pastBookings) {
      for (const booking of pastBookings) {
        const tmpl = templatesMap['review_email'] || {
          subject: 'Thank you for visiting Calm Drift Sanctuary',
          content: 'Dear [Client Name],\n\nWe hope you enjoyed your restorative experience. We would love your feedback.'
        };

        const formattedDate = new Date(booking.start_time).toLocaleString('en-GB', {
          dateStyle: 'full',
          timeStyle: 'short',
        });

        const renderedContent = tmpl.content
          .replace(/\[Client Name\]/g, booking.client_name || 'Valued Client')
          .replace(/\[Treatment Title\]/g, booking.treatments?.title || 'Holistic Session')
          .replace(/\[Date & Time\]/g, formattedDate)
          .replace(/\[Duration\]/g, `${booking.treatments?.duration_minutes || 60} mins`)
          .replace(/\[Price\]/g, `£${booking.price_override ?? booking.treatments?.price_gbp ?? 0}`);

        console.log(`Sending Review Request to ${booking.client_email}`);
      }
    }

    return NextResponse.json({ success: true, checkedAt: now.toISOString() });
  } catch (err: any) {
    console.error('Cron trigger error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}