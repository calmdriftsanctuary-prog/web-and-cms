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
      bookingId, 
      medicalConditions, 
      allergies, 
      pressurePreference, 
      emergencyContact, 
      ...dynamicFields 
    } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking reference ID.' }, { status: 400 });
    }

    // Prepare the record payload containing core fields and any dynamic form inputs
    const consultationRecord: any = {
      booking_id: bookingId,
      medical_conditions: medicalConditions || 'None',
      allergies: allergies || 'None',
      pressure_preference: pressurePreference || 'Standard',
      emergency_contact: emergencyContact || 'None',
    };

    // Bundle any extra custom fields into the responses jsonb column
    if (Object.keys(dynamicFields).length > 0) {
      consultationRecord.responses = dynamicFields;
    }

    // Use upsert to handle both new submissions and updates smoothly without conflicts
    const { error: insertError } = await supabase
      .from('consultations')
      .upsert(consultationRecord, { onConflict: 'booking_id' });

    if (insertError) {
      console.error('Consultation Insert Error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Consultation API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}