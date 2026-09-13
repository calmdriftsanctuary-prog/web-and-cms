import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      bookingId, 
      clientName, 
      clientEmail, 
      dateOfBirth, 
      medicalConditions, 
      allergies, 
      pressurePreference, 
      emergencyContact, 
      responses 
    } = body;

    // Extract values flexibly from direct body properties or responses dictionary
    const finalDob = dateOfBirth || responses?.['Date of Birth'] || responses?.date_of_birth || null;
    const finalMedical = medicalConditions || responses?.['Medical Conditions'] || responses?.medical_conditions || responses?.medical || null;
    const finalAllergies = allergies || responses?.['Allergies'] || responses?.allergies || null;
    const finalPressure = pressurePreference || responses?.['Pressure Preference'] || responses?.pressure_preference || responses?.pressure || null;
    const finalEmergency = emergencyContact || responses?.['Emergency Contact'] || responses?.emergency_contact || responses?.emergency || null;

    const formattedResponses = {
      ...(responses || {}),
      'Date of Birth': finalDob,
      date_of_birth: finalDob,
      'Medical Conditions': finalMedical,
      medical_conditions: finalMedical,
      'Allergies': finalAllergies,
      allergies: finalAllergies,
      'Pressure Preference': finalPressure,
      pressure_preference: finalPressure,
      'Emergency Contact': finalEmergency,
      emergency_contact: finalEmergency,
    };

    if (bookingId) {
      // Sync date_of_birth onto the booking record as well
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          date_of_birth: finalDob,
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error('Failed to update booking date of birth:', updateError);
      }
    }

    // Insert into the consultations table linked via booking_id with dedicated columns populated
    const { data, error } = await supabase
      .from('consultations')
      .insert([
        {
          booking_id: bookingId || null,
          client_name: clientName || null,
          client_email: clientEmail || null,
          date_of_birth: finalDob,
          medical_conditions: finalMedical,
          allergies: finalAllergies,
          pressure_preference: finalPressure,
          emergency_contact: finalEmergency,
          responses: formattedResponses,
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