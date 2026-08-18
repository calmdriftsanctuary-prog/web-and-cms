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

    // Prepare the payload
    const consultationRecord: any = {
      booking_id: bookingId,
      medical_conditions: medicalConditions || 'None',
      allergies: allergies || 'None',
      pressure_preference: pressurePreference || 'Standard',
      emergency_contact: emergencyContact || 'None',
    };

    if (Object.keys(dynamicFields).length > 0) {
      consultationRecord.responses = dynamicFields;
    }

    // 1. Check if a consultation record already exists for this booking
    const { data: existing } = await supabase
      .from('consultations')
      .select('id')
      .eq('booking_id', bookingId)
      .single();

    let queryError = null;

    if (existing) {
      // 2. If it exists, update it safely by ID
      const { error } = await supabase
        .from('consultations')
        .update(consultationRecord)
        .eq('id', existing.id);
      queryError = error;
    } else {
      // 3. Otherwise, insert a new record
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