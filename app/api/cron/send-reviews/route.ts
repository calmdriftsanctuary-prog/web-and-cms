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
    const now = new Date();
    
    // Look for bookings that ended roughly 2 hours ago (+/- 45 mins window)
    // Using your actual database columns: end_time or start_time
    const { data: bookings, error: fetchErr } = await supabase
      .from('bookings')
      .select('*, treatments(duration_minutes)')
      .eq('status', 'confirmed'); // or completed if your workflow sets them to completed

    if (fetchErr) {
      console.error('Failed to fetch bookings for review automation:', fetchErr);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: true, message: 'no pending review emails found.' });
    }

    let sentCount = 0;

    for (const booking of bookings) {
      // Determine end time: use booking.end_time, or calculate from start_time + treatment duration
      let endTimeStr = booking.end_time;
      if (!endTimeStr && booking.start_time) {
        const durationMins = booking.treatments?.duration_minutes || 60;
        const startDate = new Date(booking.start_time);
        endTimeStr = new Date(startDate.getTime() + durationMins * 60000).toISOString();
      }

      if (!endTimeStr || !booking.client_email) continue;

      const appointmentEndTime = new Date(endTimeStr).getTime();
      const targetTime = now.getTime() - (2 * 60 * 60 * 1000); // 2 hours ago
      const diffMinutes = Math.abs(appointmentEndTime - targetTime) / (1000 * 60);

      // If appointment concluded roughly 2 hours ago (+/- 45 minutes tolerance)
      if (diffMinutes <= 45) {
        try {
          await resend.emails.send({
            from: 'Calm Drift Sanctuary <bookings@calmdriftsanctuary.co.uk>',
            to: [booking.client_email],
            subject: 'How was your experience at Calm Drift Sanctuary?',
            html: `
              <div style="font-family:sans-serif; color:#2C332B; padding:25px; background:#FAF9F6; border-radius:12px; max-width:600px; margin:0 auto;">
                <h2 style="color:#693F00; margin-top:0; text-transform:lowercase;">we hope you feel restored</h2>
                <p style="text-transform:lowercase;">dear ${booking.client_name || 'guest'},</p>
                <p style="text-transform:lowercase;">thank you for visiting calm drift sanctuary today. we would love to hear your thoughts on your experience:</p>
                
                <div style="text-align:center; margin:30px 0;">
                  <a href="https://g.page/r/your-google-review-link" style="background-color:#693F00; color:#ffffff; padding:12px 24px; text-decoration:none; border-radius:50px; font-size:12px; font-weight:bold; display:inline-block; text-transform:uppercase;">leave a review</a>
                </div>

                <p style="font-size:12px; color:#6b7280; margin-top:30px; border-top:1px solid #E5E7EB; padding-top:15px; text-transform:lowercase;">warm regards,<br>the calm drift sanctuary team</p>
              </div>
            `,
          });

          // Update booking status or flag so it doesn't send twice
          await supabase
            .from('bookings')
            .update({ status: 'completed' })
            .eq('id', booking.id);

          sentCount++;
        } catch (emailErr) {
          console.error(`Failed to send review email to ${booking.client_email}:`, emailErr);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      checked: bookings.length, 
      sent: sentCount 
    });

  } catch (err: any) {
    console.error('Review Automation Cron Error:', err);
    return NextResponse.json({ error: err.message || 'internal server error' }, { status: 500 });
  }
}
