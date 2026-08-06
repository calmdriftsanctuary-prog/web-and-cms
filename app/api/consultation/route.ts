import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, medicalConditions, allergies, pressurePreference, emergencyContact } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required.' }, { status: 400 });
    }

    // Save consultation record into Supabase
    const { data: consultation, error } = await supabase
      .from('consultations')
      .insert({
        booking_id: bookingId,
        medical_conditions: medicalConditions || 'None reported',
        allergies: allergies || 'None reported',
        pressure_preference: pressurePreference || 'Medium',
        emergency_contact: emergencyContact,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase Consultation Insert Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, consultation });
  } catch (err: any) {
    console.error('Consultation Route Error:', err);
    return NextResponse.json({ error: 'Failed to save consultation.' }, { status: 500 });
  }
}