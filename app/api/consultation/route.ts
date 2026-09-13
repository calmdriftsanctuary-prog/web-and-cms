import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { consultationId, bookingId, clientName, clientEmail, clientPhone, dateOfBirth, responses } = body;

    const formattedResponses = {
      ...(responses || {}),
      date_of_birth: dateOfBirth || responses?.date_of_birth || responses?.['Date of Birth'] || null,
    };

    if (bookingId) {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          date_of_birth: dateOfBirth || null,
          consultation_responses: formattedResponses,
          consultation_status: 'completed',
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error('Failed to update booking consultation details:', updateError);
      }
    }

    if (!consultationId && !bookingId) {
      return NextResponse.json({ error: 'Missing consultation or booking reference' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('consultation_submissions')
      .insert([
        {
          consultation_id: consultationId || null,
          booking_id: bookingId || null,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          date_of_birth: dateOfBirth || null,
          responses: formattedResponses,
          status: 'submitted',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error inserting consultation:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, submission: data });
  } catch (err: any) {
    console.error('Server error processing consultation submission:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (!bookingError && bookingData) {
      const { data: templateData } = await supabase
        .from('consultations')
        .select('*, consultation_questions(*)')
        .limit(1)
        .single();

      return NextResponse.json({
        consultation: {
          id: templateData?.id || id,
          title: templateData?.title || 'Client Consultation Form',
          description: templateData?.description || 'Please complete your pre-treatment consultation details below.',
          consultation_questions: templateData?.consultation_questions || [],
        },
        booking: bookingData,
      });
    }

    const { data, error } = await supabase
      .from('consultations')
      .select('*, consultation_questions(*)')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Consultation form not found' }, { status: 404 });
    }

    return NextResponse.json({ consultation: data });
  } catch (err: any) {
    console.error('Server error fetching consultation form:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}