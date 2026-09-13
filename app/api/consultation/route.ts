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

    // Check if the ID belongs to an actual booking
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (!bookingError && bookingData) {
      // Fetch consultation templates and all questions directly
      const { data: templates } = await supabase
        .from('consultations')
        .select('*');

      let questions: any[] = [];
      let templateTitle = 'Client Consultation Form';
      let templateDesc = 'Please complete your pre-treatment consultation details below.';
      let templateId = id;

      if (templates && templates.length > 0) {
        templateId = templates[0].id;
        templateTitle = templates[0].title || templateTitle;
        templateDesc = templates[0].description || templateDesc;

        const { data: qData } = await supabase
          .from('consultation_questions')
          .select('*')
          .eq('consultation_id', templateId);

        if (qData && qData.length > 0) {
          questions = qData;
        }
      }

      // Fallback: if no questions found linked by ID, grab all active consultation questions
      if (questions.length === 0) {
        const { data: allQ } = await supabase
          .from('consultation_questions')
          .select('*');
        if (allQ) questions = allQ;
      }

      return NextResponse.json({
        consultation: {
          id: templateId,
          title: templateTitle,
          description: templateDesc,
          consultation_questions: questions,
        },
        booking: bookingData,
      });
    }

    // Fallback for direct consultation template IDs
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