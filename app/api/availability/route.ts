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
    const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const maxBookingTime = nowUtc + 31 * 24 * 60 * 60 * 1000;
    const requestedTimeUtc = new Date(dateStr + 'T00:00:00Z').getTime();

    if (requestedTimeUtc > maxBookingTime) {
      return NextResponse.json({ slots: [] });
    }

    const queryStart = `${dateStr}T00:00:00`;
    const queryEnd = `${dateStr}T23:59:59`;

    const { data: bookings } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .gte('start_time', `${queryStart}.000Z`)
      .lte('start_time', `${queryEnd}.999Z`)
      .not('status', 'eq', 'cancelled');

    const { data: blockedTimes } = await supabase
      .from('blocked_times')
      .select('start_time, end_time');

    const busyIntervals: { start: number; end: number }[] = [];

    bookings?.forEach(b => {
      const start = new Date(b.start_time).getTime();
      const originalEnd = new Date(b.end_time).getTime();
      const bufferedEnd = originalEnd + 30 * 60000; 
      busyIntervals.push({ start, end: bufferedEnd });
    });

    const dateMidnight = new Date(`${dateStr}T00:00:00Z`).getTime();
    const nextDateMidnight = dateMidnight + 24 * 60 * 60 * 1000;

    blockedTimes?.forEach(bt => {
      const btStart = new Date(bt.start_time).getTime();
      const btEnd = new Date(bt.end_time).getTime();
      if (btStart < nextDateMidnight && btEnd > dateMidnight) {
        busyIntervals.push({ start: btStart, end: btEnd });
      }
    });

    // Generate slots strictly between 10:00 and 20:00
    const availableSlots: string[] = [];
    const openingHour = 10;
    const closingHour = 20; // Hard ceiling: 8:00 PM absolute

    const dateParts = dateStr.split('-');
    const baseDateMs = Date.UTC(
      parseInt(dateParts[0], 10),
      parseInt(dateParts[1], 10) - 1,
      parseInt(dateParts[2], 10)
    );

    const openingTimeMs = baseDateMs + openingHour * 3600000;
    const closingTimeMs = baseDateMs + closingHour * 3600000;

    let currentSlotMs = openingTimeMs;

    while (currentSlotMs < closingTimeMs) {
      const slotStartMs = currentSlotMs;
      const slotEndMs = slotStartMs + treatmentDuration * 60000;

      // ABSOLUTE HARD CEILING: 
      // 1. No slot can start at or after 20:00 (closingHour)
      // 2. No slot can end past 20:00 (closingTimeMs)
      const slotHour = new Date(slotStartMs).getUTCHours();
      if (slotHour >= closingHour || slotEndMs > closingTimeMs) {
        break;
      }

      let isConflict = false;
      for (const busy of busyIntervals) {
        if (slotStartMs < busy.end && slotEndMs > busy.start) {
          isConflict = true;
          break;
        }
      }

      const slotDateTime = new Date(slotStartMs);
      if (!isConflict && slotDateTime.getTime() >= minBookingTime.getTime()) {
        availableSlots.push(slotDateTime.toISOString());
      }

      currentSlotMs += 30 * 60000; // Increment by 30 minutes
    }

    return NextResponse.json({ slots: availableSlots });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to calculate availability' }, { status: 500 });
  }
}