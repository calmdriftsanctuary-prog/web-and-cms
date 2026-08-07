import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date'); // Format: YYYY-MM-DD
    const durationParam = searchParams.get('duration'); // Treatment duration in minutes

    if (!dateStr || !durationParam) {
      return NextResponse.json({ error: 'Date and duration are required' }, { status: 400 });
    }

    const treatmentDuration = parseInt(durationParam, 10);
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12-hour notice rule

    // 1-Month (31 days) Advance Booking Window Restriction
    const maxBookingDate = new Date();
    maxBookingDate.setDate(maxBookingDate.getDate() + 31);
    maxBookingDate.setHours(23, 59, 59, 999);

    const requestedDate = new Date(dateStr + 'T00:00:00');

    // If requested date is further than 31 days out, return no slots
    if (requestedDate > maxBookingDate) {
      return NextResponse.json({ slots: [] });
    }

    // Fetch existing bookings for this date
    const dayStart = `${dateStr}T00:00:00.000Z`;
    const dayEnd = `${dateStr}T23:59:59.999Z`;

    const { data: bookings } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)
      .not('status', 'eq', 'cancelled');

    // Fetch manual blocked times for this date
    const { data: blockedTimes } = await supabase
      .from('blocked_times')
      .select('start_time, end_time')
      .lte('start_time', dayEnd)
      .gte('end_time', dayStart);

    // Build busy intervals array including the mandatory 30-min post-treatment buffer
    const busyIntervals: { start: number; end: number }[] = [];

    bookings?.forEach(b => {
      const start = new Date(b.start_time).getTime();
      const originalEnd = new Date(b.end_time).getTime();
      const bufferedEnd = originalEnd + 30 * 60000; 
      busyIntervals.push({ start, end: bufferedEnd });
    });

    blockedTimes?.forEach(bt => {
      busyIntervals.push({
        start: new Date(bt.start_time).getTime(),
        end: new Date(bt.end_time).getTime(),
      });
    });

    // Generate 30-minute increment slots strictly between 10:00 and 20:00 (10am - 8pm)
    const availableSlots: string[] = [];
    const openingHour = 10;
    const closingHour = 20;

    const baseDate = new Date(dateStr);
    for (let hour = openingHour; hour < closingHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotDate = new Date(baseDate);
        slotDate.setHours(hour, minute, 0, 0);

        const slotStart = slotDate.getTime();
        const slotEnd = slotStart + treatmentDuration * 60000;

        // Ensure treatment does not run past closing time
        const closingTime = new Date(baseDate);
        closingTime.setHours(closingHour, 0, 0, 0);
        if (slotEnd > closingTime.getTime()) continue;

        // Check conflicts against bookings, buffers, and blocked times
        let isConflict = false;
        for (const busy of busyIntervals) {
          if (slotStart < busy.end && slotEnd > busy.start) {
            isConflict = true;
            break;
          }
        }

        // Must respect 12-hour notice rule and no conflicts
        const slotDateTime = new Date(slotStart);
        if (!isConflict && slotDateTime >= minBookingTime) {
          availableSlots.push(slotDateTime.toISOString());
        }
      }
    }

    return NextResponse.json({ slots: availableSlots });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to calculate availability' }, { status: 500 });
  }
}