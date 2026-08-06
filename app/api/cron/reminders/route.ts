import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const resend = new Resend(process.env.RESND_API_KEY || process.env.RESEND_API_KEY);

export async function GET() {
  try {
    // 1. Fetch template from your site_templates CMS
    const { data: template } = await supabase
      .from('site_templates')
      .select('*')
      .eq('key', 'reminder')
      .single();

    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*, treatments(title)')
      .eq('reminder_sent', false)
      .eq('status', 'confirmed')
      .gte('start_time', tomorrowStart.toISOString())
      .lte('start_time', tomorrowEnd.toISOString());

    if (error) throw error;

    for (const b of bookings || []) {
      if (b.client_email) {
        const appointmentTime = new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const treatmentTitle = b.treatments?.title || 'Treatment';

        // Use template content or fallback
        let htmlContent = template?.content || '<p>Reminder for your appointment tomorrow.</p>';
        htmlContent = htmlContent
          .replace(/{{client_name}}/g, b.client_name)
          .replace(/{{treatment_title}}/g, treatmentTitle)
          .replace(/{{appointment_time}}/g, appointmentTime);

        const subject = template?.title || 'Reminder: Your Sanctuary Appointment Tomorrow';

        await resend.emails.send({
          from: 'Sanctuary <onboarding@resend.dev>',
          to: [b.client_email],
          subject: subject,
          html: htmlContent,
        });

        await supabase.from('bookings').update({ reminder_sent: true }).eq('id', b.id);
      }
    }

    return NextResponse.json({ success: true, remindersSent: bookings?.length || 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}