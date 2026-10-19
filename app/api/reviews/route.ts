import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ reviews });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { client_name, rating, comment } = body;

    const { data, error } = await supabase
      .from('reviews')
      .insert([
        {
          client_name: client_name || 'Anonymous',
          rating: rating || 5,
          comment: comment || '',
          is_visible: false, // Default to hidden until approved in admin CMS
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Send email notification to calmdriftsanctuary@gmail.com via Resend
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      try {
        const resendClient = new Resend(apiKey);
        await resendClient.emails.send({
          from: 'Calm Drift Sanctuary <bookings@calmdriftsanctuary.co.uk>',
          to: ['calmdriftsanctuary@gmail.com'],
          subject: `New Client Review Submitted (${rating || 5} Stars)`,
          html: `
            <div style="font-family:sans-serif; color:#2C332B; padding:30px; background:#FAF9F6; border-radius:16px; max-width:600px; margin:0 auto; line-height: 1.6;">
              <h2 style="color:#693F00; margin-top:0; text-transform:lowercase;">new client review received</h2>
              <p style="text-transform:lowercase;"><strong>rating:</strong> ${rating || 5} / 5 stars</p>
              <p style="text-transform:lowercase;"><strong>client name:</strong> ${client_name || 'Anonymous'}</p>
              <p style="text-transform:lowercase;"><strong>comment:</strong> "${comment || ''}"</p>
              <p style="font-size:12px; color:#6b7280; margin-top:30px; border-top:1px solid #E5E7EB; padding-top:15px; text-transform:lowercase;">log in to your admin portal to approve and display this review on your website.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Failed to send review notification email:', emailErr);
      }
    }

    return NextResponse.json({ success: true, review: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, is_visible } = await request.json();

    const { error } = await supabase
      .from('reviews')
      .update({ is_visible })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}