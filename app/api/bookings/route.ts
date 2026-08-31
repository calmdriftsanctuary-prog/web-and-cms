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
      type,
      treatmentId,
      clientName,
      clientEmail,
      clientPhone,
      startTime,
      endTime,
      durationMinutes,
      notes,
      message,
      marketingOptIn,
      isAdminBypass,
    } = body;

    const resolvedName = clientName || body.name;
    const resolvedEmail = clientEmail || body.email;
    const resolvedPhone = clientPhone || body.phone;
    const resolvedNotes = notes || message;

    // Handle Contact / Inquiry Form Submissions
    if (type === 'contact' || (!startTime && !treatmentId)) {
      if (!resolvedName || !resolvedEmail) {
        return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        try {
          const contactEmailPayload = {
            from: 'Calm Drift Sanctuary <bookings@calmdriftsanctuary.co.uk>',
            to: ['calmdriftsanctuary@gmail.com'],
            subject: `New Contact Inquiry: ${resolvedName}`,
            html: `
              <div style="font-family:sans-serif; color:#2C332B; padding:20px; background:#FAF9F6; border-radius:12px;">
                <h2 style="color:#6B8E70;">New Website Contact Inquiry</h2>
                <p>A new inquiry was submitted via the homepage contact form.</p>
                <hr style="border:none; border-top:1px solid #E5E7EB; margin:15px 0;" />
                <p><strong>Name:</strong> ${resolvedName}</p>
                <p><strong>Email:</strong> ${resolvedEmail}</p>
                <p><strong>Phone:</strong> ${resolvedPhone || 'Not provided'}</p>
                <p><strong>Message / Notes:</strong></p>
                <p style="background:#ffffff; padding:15px; border-radius:8px; border:1px solid #E5E7EB;">${resolvedNotes || 'No message provided.'}</p>
              </div>
            `,
          };

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
            body: JSON.stringify(contactEmailPayload),
          });
        } catch (contactErr) {
          console.error('Failed to send contact inquiry email notification:', contactErr);
        }
      }

      return NextResponse.json({ success: true, message: 'Inquiry submitted successfully.' }, { status: 200 });
    }

    if (!resolvedName || !resolvedEmail || !startTime) {
      return NextResponse.json({ error: 'Missing required booking fields' }, { status: 400 });
    }

    const startDateTime = new Date(startTime);
    const dateString = startDateTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeString = startDateTime.toTimeString().split(' ')[0]; // HH:MM:SS

    // Only enforce strict availability rules if it's NOT an admin-bypassed custom link booking
    if (!isAdminBypass) {
      if (!treatmentId) {
        return NextResponse.json({ error: 'Treatment ID is required for standard bookings.' }, { status: 400 });
      }

      // 1. Check if this date is explicitly opened by the admin (Closed by default)
      const { data: rules, error: ruleError } = await supabase
        .from('availability_rules')
        .select('*')
        .eq('date', dateString);

      if (ruleError) {
        console.error('Availability Check Error:', ruleError);
        return NextResponse.json({ error: 'Failed to verify availability.' }, { status: 500 });
      }

      if (!rules || rules.length === 0) {
        return NextResponse.json({ error: 'Selected date is closed for bookings.' }, { status: 400 });
      }

      // 2. Validate if the requested time falls within an open window or full day
      let isAllowed = false;
      for (const rule of rules) {
        if (rule.is_full_day) {
          isAllowed = true;
          break;
        } else if (rule.start_time && rule.end_time) {
          if (timeString >= rule.start_time && timeString <= rule.end_time) {
            isAllowed = true;
            break;
          }
        }
      }

      if (!isAllowed) {
        return NextResponse.json({ error: 'The selected time slot is outside your open working hours.' }, { status: 400 });
      }
    }

    const calculatedEndTime = endTime 
      ? new Date(endTime) 
      : new Date(startDateTime.getTime() + (durationMinutes || 60) * 60000);
    const hasConsented = Boolean(marketingOptIn);

    // 3. Check for double bookings / overlaps
    const { data: existingBookings, error: overlapError } = await supabase
      .from('bookings')
      .select('id')
      .neq('status', 'cancelled')
      .lt('start_time', calculatedEndTime.toISOString())
      .gt('end_time', startDateTime.toISOString());

    if (overlapError) throw overlapError;

    if (existingBookings && existingBookings.length > 0) {
      return NextResponse.json({ error: 'This time slot is already booked.' }, { status: 400 });
    }

    // 4. Insert booking into Supabase database (supporting optional treatment_id)
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .insert([
        {
          treatment_id: treatmentId || null,
          client_name: resolvedName,
          client_email: resolvedEmail,
          client_phone: resolvedPhone || '',
          start_time: startDateTime.toISOString(),
          end_time: calculatedEndTime.toISOString(),
          appointment_date: dateString,
          notes: resolvedNotes || '',
          marketing_opt_in: hasConsented,
          marketing_opt_in_at: hasConsented ? new Date().toISOString() : null,
          status: 'confirmed',
        },
      ])
      .select('id, client_name, client_email, client_phone, start_time, marketing_opt_in')
      .single();

    if (bookingError) throw bookingError;

    // 5. Fetch treatment details for email & confirmation (if treatmentId exists)
    let treatment = { title: 'Sanctuary Experience', price_gbp: 0 };
    if (treatmentId) {
      const { data: treatmentData } = await supabase
        .from('treatments')
        .select('title, price_gbp')
        .eq('id', treatmentId)
        .single();
      if (treatmentData) {
        treatment = treatmentData;
      }
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error('RESEND_API_KEY is missing from environment variables.');
    } else {
      const consultationUrl = `https://calmdriftsanctuary.co.uk/consultation/${bookingData.id}`;
      const formattedDate = startDateTime.toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' }) + ' BST';

      // 6. Send Admin Notification Email to calmdriftsanctuary@gmail.com
      try {
        const adminEmailPayload = {
          from: 'Calm Drift Sanctuary <bookings@calmdriftsanctuary.co.uk>',
          to: ['calmdriftsanctuary@gmail.com'],
          subject: `New Booking: ${resolvedName} - ${treatment.title}`,
          html: `
            <div style="font-family:sans-serif; color:#2C332B; padding:20px; background:#FAF9F6; border-radius:12px;">
              <h2 style="color:#6B8E70;">New Sanctuary Reservation</h2>
              <p>A new appointment has been booked.</p>
              <hr style="border:none; border-top:1px solid #E5E7EB; margin:15px 0;" />
              <p><strong>Client:</strong> ${resolvedName}</p>
              <p><strong>Email:</strong> ${resolvedEmail}</p>
              <p><strong>Phone:</strong> ${resolvedPhone || 'Not provided'}</p>
              <p><strong>Treatment:</strong> ${treatment.title} (£${treatment.price_gbp})</p>
              <p><strong>Date & Time:</strong> ${formattedDate}</p>
              <p><strong>Marketing Opt-In:</strong> <span style="color: ${hasConsented ? '#047857' : '#6b7280'}; font-weight:bold;">${hasConsented ? 'Yes (Consented)' : 'No Consent'}</span></p>
              ${resolvedNotes ? `<p><strong>Notes / Special Requests:</strong> ${resolvedNotes}</p>` : ''}
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

      // 7. Send Client Confirmation Email (With what3words and Consultation Button)
      try {
        const clientEmailPayload = {
          from: 'Calm Drift Sanctuary <bookings@calmdriftsanctuary.co.uk>',
          to: [resolvedEmail],
          subject: `Booking Confirmed: ${treatment.title} at Calm Drift Sanctuary`,
          html: `
            <div style="font-family:sans-serif; color:#2C332B; padding:25px; background:#FAF9F6; border-radius:12px; max-width:600px; margin:0 auto;">
              <h2 style="color:#6B8E70; margin-top:0;">Your Session is Confirmed</h2>
              <p>Dear ${resolvedName},</p>
              <p>Thank you for booking with Calm Drift Sanctuary. We look forward to welcoming you.</p>
              
              <div style="background:#ffffff; padding:20px; border-radius:8px; border:1px solid #E5E7EB; margin:20px 0;">
                <p style="margin:5px 0;"><strong>Treatment:</strong> ${treatment.title} (£${treatment.price_gbp})</p>
                <p style="margin:5px 0;"><strong>Date & Time:</strong> ${formattedDate}</p>
                <p style="margin:5px 0;"><strong>Location:</strong> Calm Drift Sanctuary</p>
                <p style="margin:5px 0;"><strong>what3words:</strong> ///converged.archives.downturn</p>
                ${resolvedNotes ? `<p style="margin:5px 0;"><strong>Special Requests / Notes:</strong> ${resolvedNotes}</p>` : ''}
              </div>

              <p style="margin-bottom:15px;">Before your visit, please complete your mandatory digital consultation form by clicking the button below:</p>
              
              <div style="text-align:center; margin:30px 0;">
                <a href="${consultationUrl}" style="background-color:#6B8E70; color:#ffffff; padding:12px 24px; text-decoration:none; border-radius:50px; font-size:14px; font-weight:bold; display:inline-block;">Complete Consultation Form</a>
              </div>

              <p style="font-size:12px; color:#6b7280; margin-top:30px; border-top:1px solid #E5E7EB; padding-top:15px;">If you have any questions or need to reschedule, please reply directly to this email.</p>
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