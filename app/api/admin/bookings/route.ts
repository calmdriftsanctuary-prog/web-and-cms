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
    const { searchParams } = new URL(request.url);
    const includeBookings = searchParams.get('bookings');
    const statusFilter = searchParams.get('status');
    const searchQuery = searchParams.get('search');

    const { data: treatments, error: treatmentError } = await supabase
      .from('treatments')
      .select('*')
      .order('price_gbp', { ascending: true });

    if (treatmentError) throw treatmentError;

    const { data: pageContent } = await supabase.from('page_content').select('*');
    const { data: templates } = await supabase.from('email_templates').select('*');
    const { data: gallery } = await supabase.from('gallery_images').select('*').order('created_at', { ascending: false });
    const { data: socialLinks } = await supabase.from('social_links').select('*').order('display_order', { ascending: true });
    const { data: popup } = await supabase.from('site_popup').select('*').single();
    const { data: customFields } = await supabase.from('custom_fields').select('*');
    const { data: fieldConfigs } = await supabase.from('field_configs').select('*');

    let bookings = [];
    if (includeBookings === 'true' || includeBookings === '1') {
      let query = supabase
        .from('bookings')
        .select('*, treatments(title, price_gbp, duration_minutes), consultations(*)')
        .order('start_time', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: bookingData, error: bookingError } = await query;
      if (bookingError) throw bookingError;

      bookings = bookingData || [];

      if (searchQuery) {
        const queryLower = searchQuery.toLowerCase();
        bookings = bookings.filter((b: any) => 
          b.client_name?.toLowerCase().includes(queryLower) ||
          b.client_email?.toLowerCase().includes(queryLower) ||
          b.client_phone?.toLowerCase().includes(queryLower)
        );
      }
    }

    return NextResponse.json({ 
      success: true,
      treatments: treatments || [], 
      bookings: bookings || [],
      pageContent: pageContent || [],
      templates: templates || [],
      gallery: gallery || [],
      socialLinks: socialLinks || [],
      popup: popup || null,
      customFields: customFields || [],
      fieldConfigs: fieldConfigs || [],
      count: bookings.length 
    });
  } catch (error: any) {
    console.error('Admin Bookings GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch admin data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, id, status, treatment_id, start_time, end_time, notes, trigger_email } = body;

    if (type === 'page_content') {
      const { key, value } = body;
      const { error } = await supabase
        .from('page_content')
        .upsert({ key, value }, { onConflict: 'key' });

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === 'template') {
      const { key, subject, content, button_text, button_url } = body;
      const finalButtonUrl = button_url && button_url.trim() !== '' ? button_url : 'https://calmdriftsanctuary.co.uk';
      
      const { error } = await supabase
        .from('email_templates')
        .upsert({ 
          key, 
          subject, 
          content, 
          button_text: button_text || 'Complete Digital Consultation', 
          button_url: finalButtonUrl 
        }, { onConflict: 'key' });

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === 'treatment' || (body.title && body.price_gbp !== undefined && !type)) {
      const treatmentData = {
        title: body.title,
        description: body.description,
        duration_minutes: body.duration_minutes,
        price_gbp: body.price_gbp,
      };

      if (body.id) {
        const { error } = await supabase.from('treatments').update(treatmentData).eq('id', body.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('treatments').insert([treatmentData]);
        if (error) throw error;
      }
      return NextResponse.json({ success: true });
    }

    if (type === 'update_client_profile') {
      const { old_email, old_name, new_name, new_email, new_phone } = body;
      let query = supabase
        .from('bookings')
        .update({ client_name: new_name, client_email: new_email, client_phone: new_phone })
        .eq('client_email', old_email);

      if (old_name) {
        query = query.ilike('client_name', old_name);
      }

      const { error } = await query;
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === 'merge_client_profiles') {
      const { source_email, source_name, target_email } = body;
      if (!source_email || !target_email) {
        return NextResponse.json({ error: 'Source and target emails are required' }, { status: 400 });
      }

      let query = supabase
        .from('bookings')
        .update({ client_email: target_email.toLowerCase().trim() })
        .eq('client_email', source_email.toLowerCase().trim());

      if (source_name) {
        query = query.ilike('client_name', source_name.trim());
      }

      const { error } = await query;
      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Client profiles successfully merged' });
    }

    if (type === 'delete_client') {
      const { email } = body;
      if (!email) {
        return NextResponse.json({ error: 'Client email is required for deletion' }, { status: 400 });
      }

      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('client_email', email.toLowerCase().trim());

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Client record and associated bookings deleted successfully' });
    }

    if (type === 'delete_booking') {
      const { error } = await supabase.from('bookings').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === 'send_consultation_email') {
      const { email, name, bookingId } = body;
      const consultationUrl = bookingId ? `https://calmdriftsanctuary.co.uk/consultation/${bookingId}` : 'https://calmdriftsanctuary.co.uk';

      await resend.emails.send({
        from: 'Calm Drift Sanctuary <bookings@calmdriftsanctuary.co.uk>',
        to: [email],
        subject: 'Please Complete Your Sanctuary Consultation Form',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #2C332B;">
            <h2 style="color: #6B8E70;">Consultation Form Request</h2>
            <p>Dear ${name},</p>
            <p>As part of your preparation for your upcoming visit, please complete your intake consultation form.</p>
            <p>You can fill it out securely online prior to your arrival by clicking below:</p>
            <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center;">
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" bgcolor="#6B8E70" style="border-radius: 9999px;">
                    <a href="${consultationUrl}" target="_blank" style="font-size: 15px; font-family: sans-serif; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 9999px; border: 1px solid #6B8E70; display: inline-block; font-weight: 600; background-color: #6B8E70;">Complete Digital Consultation</a>
                  </td>
                </tr>
              </table>
            </div>
            <br/>
            <p>Warm regards,<br/><strong>Sanctuary Team</strong></p>
          </div>
        `,
      });
      return NextResponse.json({ success: true });
    }

    if (type === 'site_popup') {
      const { is_active, title, description, button_text, link_url } = body;
      const { error } = await supabase
        .from('site_popup')
        .upsert({ id: 1, is_active, title, description, button_text, link_url });

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === 'gallery_image') {
      const { title, image_url } = body;
      const { error } = await supabase.from('gallery_images').insert([{ title, image_url }]);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === 'delete_gallery_image') {
      const { error } = await supabase.from('gallery_images').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === 'social_link') {
      const { platform, url, icon_url, is_active } = body;
      if (id) {
        const { error } = await supabase.from('social_links').update({ platform, url, icon_url, is_active }).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('social_links').insert([{ platform, url, icon_url, is_active }]);
        if (error) throw error;
      }
      return NextResponse.json({ success: true });
    }

    if (type === 'delete_social_link') {
      const { error } = await supabase.from('social_links').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === 'custom_field') {
      const { form_type, field_label, field_type, options, is_required } = body;
      const { error } = await supabase.from('custom_fields').insert([{ form_type, field_label, field_type, options, is_required }]);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === 'delete_custom_field') {
      const { error } = await supabase.from('custom_fields').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === 'field_config') {
      const { error } = await supabase.from('field_configs').update({
        field_label: body.field_label,
        is_required: body.is_required,
        is_active: body.is_active
      }).eq('id', body.id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === 'update_booking_status') {
      const { data: booking, error: fetchErr } = await supabase
        .from('bookings')
        .select('*, treatments(title, price_gbp, duration_minutes)')
        .eq('id', id)
        .single();

      if (fetchErr || !booking) {
        return NextResponse.json({ error: 'Booking record not found' }, { status: 404 });
      }

      const { error: updateErr } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', id);

      if (updateErr) throw updateErr;

      if (booking.client_email) {
        if (status === 'cancelled' || trigger_email === 'cancellation') {
          await resend.emails.send({
            from: 'Calm Drift Sanctuary <bookings@calmdriftsanctuary.co.uk>',
            to: [booking.client_email],
            subject: 'Appointment Cancelled - Sanctuary',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #2C332B;">
                <h2 style="color: #991B1B;">Appointment Cancelled</h2>
                <p>Dear ${booking.client_name},</p>
                <p>We are writing to confirm that your appointment for <strong>${booking.treatments?.title || 'Treatment'}</strong> scheduled for ${new Date(booking.start_time).toLocaleString()} has been cancelled.</p>
                <p>If you have any questions or would like to arrange an alternative time, please visit our sanctuary booking page.</p>
                <br/>
                <p>Warm regards,<br/><strong>Sanctuary Team</strong></p>
              </div>
            `,
          });
        } else if (status === 'confirmed' || trigger_email === 'confirmation') {
          const absoluteConsultationUrl = `https://calmdriftsanctuary.co.uk/consultation/${booking.id}`;

          const { data: dbTemplate } = await supabase
            .from('email_templates')
            .select('*')
            .eq('key', 'confirmation_email')
            .single();

          const clientName = booking.client_name || 'Client';
          const treatmentTitle = booking.treatments?.title || 'Treatment';
          const startTimeFormatted = new Date(booking.start_time).toLocaleString();

          let emailSubject = dbTemplate?.subject || 'Your [Treatment Title] at Calm Drift Sanctuary Confirmed';
          emailSubject = emailSubject
            .replace(/\[Client Name\]/g, clientName)
            .replace(/\[Treatment Title\]/g, treatmentTitle)
            .replace(/\[Date & Time\]/g, startTimeFormatted);

          let rawContent = dbTemplate?.content || `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #2C332B;">
              <h2 style="color: #6B8E70;">Appointment Confirmed</h2>
              <p>Dear [Client Name],</p>
              <p>Your appointment for <strong>[Treatment Title]</strong> on [Date & Time] has been officially confirmed.</p>
            </div>
          `;

          let emailHtml = rawContent
            .replace(/\[Client Name\]/g, clientName)
            .replace(/\[Treatment Title\]/g, treatmentTitle)
            .replace(/\[Date & Time\]/g, startTimeFormatted)
            .replace(/\n/g, '<br/>');

          const buttonText = dbTemplate?.button_text && dbTemplate.button_text.trim() !== '' ? dbTemplate.button_text : 'Complete Digital Consultation';
          
          const rawDbUrl = dbTemplate?.button_url;
          let finalUrl = absoluteConsultationUrl;
          
          if (rawDbUrl && typeof rawDbUrl === 'string' && rawDbUrl.trim() !== '') {
            const trimmedUrl = rawDbUrl.trim();
            if (trimmedUrl.includes('calmdriftsanctuary.co.uk/consultation')) {
              finalUrl = `https://calmdriftsanctuary.co.uk/consultation/${booking.id}`;
            } else {
              finalUrl = trimmedUrl;
            }
          }

          if (buttonText) {
            emailHtml += `
              <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center;">
                <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                  <tr>
                    <td align="center" bgcolor="#6B8E70" style="border-radius: 9999px;">
                      <a href="${finalUrl}" target="_blank" style="font-size: 15px; font-family: sans-serif; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 9999px; border: 1px solid #6B8E70; display: inline-block; font-weight: 600; background-color: #6B8E70;">${buttonText}</a>
                    </td>
                  </tr>
                </table>
              </div>
            `;
          }

          await resend.emails.send({
            from: 'Calm Drift Sanctuary <bookings@calmdriftsanctuary.co.uk>',
            to: [booking.client_email],
            subject: emailSubject,
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #2C332B;">${emailHtml}</div>`,
          });
        }
      }

      return NextResponse.json({ success: true, message: 'Booking status updated and email processed successfully' });
    }

    if (type === 'update_booking_details') {
      const updateData: any = {};
      if (treatment_id) updateData.treatment_id = treatment_id;
      if (start_time) updateData.start_time = start_time;
      if (end_time) updateData.end_time = end_time;
      if (notes !== undefined) updateData.notes = notes;

      const { data: booking, error: fetchErr } = await supabase
        .from('bookings')
        .select('*, treatments(title, price_gbp, duration_minutes)')
        .eq('id', id)
        .single();

      if (fetchErr || !booking) {
        return NextResponse.json({ error: 'Booking record not found' }, { status: 404 });
      }

      const { error: updateErr } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', id);

      if (updateErr) throw updateErr;

      let treatmentTitle = booking.treatments?.title;
      if (treatment_id && treatment_id !== booking.treatment_id) {
        const { data: newTr } = await supabase.from('treatments').select('title').eq('id', treatment_id).single();
        if (newTr) treatmentTitle = newTr.title;
      }

      if (booking.client_email) {
        const newTimeFormatted = start_time ? new Date(start_time).toLocaleString() : new Date(booking.start_time).toLocaleString();
        
        await resend.emails.send({
          from: 'Calm Drift Sanctuary <bookings@calmdriftsanctuary.co.uk>',
          to: [booking.client_email],
          subject: 'Appointment Rescheduled - Sanctuary',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #2C332B;">
              <h2 style="color: #6B8E70;">Appointment Rescheduled</h2>
              <p>Dear ${booking.client_name},</p>
              <p>Your appointment has been successfully updated to a new time slot:</p>
              <p style="background: #FAF9F6; padding: 15px; border-radius: 8px; border-left: 4px solid #6B8E70;">
                <strong>New Date & Time:</strong> ${newTimeFormatted}<br/>
                <strong>Treatment:</strong> ${treatmentTitle || 'Treatment'}
              </p>
              <p>If you need to make any further adjustments, please feel free to contact us.</p>
              <br/>
              <p>Warm regards,<br/><strong>Sanctuary Team</strong></p>
            </div>
          `,
        });
      }

      return NextResponse.json({ success: true, message: 'Booking successfully rescheduled and email sent' });
    }

    return NextResponse.json({ error: 'Invalid operation type specified in request payload' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin Bookings POST Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process admin modification' }, { status: 500 });
  }
}