import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, clientName, clientEmail, dateOfBirth, responses } = body;

    const formattedResponses = {
      ...(responses || {}),
      date_of_birth: dateOfBirth || responses?.date_of_birth || responses?.['Date of Birth'] || null,
    };

    // This updates the booking record which populates your CRM and calendar modal cards!
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
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    // Also record it in the consultations history table if it exists
    try {
      await supabase
        .from('consultations')
        .insert([
          {
            booking_id: bookingId || null,
            client_name: clientName || null,
            client_email: clientEmail || null,
            date_of_birth: dateOfBirth || null,
            responses: formattedResponses,
          },
        ]);
    } catch (err) {
      // Non-blocking if consultations table is bypassed
      console.log('Consultations table log skipped:', err);
    }

    return NextResponse.json({ success: true });
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
      const { data: qData } = await supabase
        .from('consultation_questions')
        .select('*');

      return NextResponse.json({
        consultation: {
          id: id,
          title: 'Client Consultation Form',
          description: 'Please complete your pre-treatment consultation details below.',
          consultation_questions: qData || [],
        },
        booking: bookingData,
      });
    }

    const { data, error } = await supabase
      .from('consultations')
      .select('*')
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