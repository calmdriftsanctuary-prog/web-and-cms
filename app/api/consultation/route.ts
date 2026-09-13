import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('*, treatments(title)')
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Booking appointment not found' }, { status: 404 });
    }

    const { data: fieldConfigs } = await supabase
      .from('field_configs')
      .select('*')
      .eq('form_type', 'consultation');

    return NextResponse.json({ success: true, booking, fieldConfigs: fieldConfigs || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch consultation' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      bookingId, 
      dateOfBirth,
      medicalConditions, 
      allergies, 
      pressurePreference, 
      emergencyContact, 
      ...dynamicFields 
    } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking reference ID.' }, { status: 400 });
    }

    // Package all standard fields, date of birth, and dynamic fields neatly into the database row and jsonb responses column
    const consultationRecord = {
      booking_id: bookingId,
      date_of_birth: dateOfBirth || null,
      responses: {
        medicalConditions: medicalConditions || 'None',
        allergies: allergies || 'None',
        pressurePreference: pressurePreference || 'Standard',
        emergencyContact: emergencyContact || 'None',
        ...dynamicFields
      }
    };

    // Check if a consultation record already exists for this booking
    const { data: existing } = await supabase
      .from('consultations')
      .select('id')
      .eq('booking_id', bookingId)
      .single();

    let queryError = null;

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('consultations')
        .update(consultationRecord)
        .eq('id', existing.id);
      queryError = error;
    } else {
      // Insert new record
      const { error } = await supabase
        .from('consultations')
        .insert(consultationRecord);
      queryError = error;
    }

    if (queryError) {
      console.error('Consultation Save Error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Consultation API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}