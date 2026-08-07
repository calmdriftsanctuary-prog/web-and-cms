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

    // 1-Month (31 days) Advance Booking Window Restriction (using UTC comparison)
    const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const maxBookingTime = nowUtc + 31 * 24 * 60 * 60 * 1000;
    const requestedTimeUtc = new Date(dateStr + 'T00:00:00Z').getTime();

    if (requestedTimeUtc > maxBookingTime) {
      return NextResponse.json({ slots: [] });
    }

    // Strict UTC day bounds to prevent timezone leakage
    const dayStart = `${dateStr}T00:00:00.000Z`;
    const dayEnd = `${dateStr}T23:59:59.999Z`;

    const { data: bookings } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)
      .not('status', 'eq', 'cancelled');

    const { data: blockedTimes } = await supabase
      .from('blocked_times')
      .select('start_time, end_time')
      .lte('start_time', dayEnd)
      .gte('end_time', dayStart);

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

    // Generate slots using absolute UTC hours to prevent local offset bleeding
    const availableSlots: string[] = [];
    const openingHourUtc = 10;
    const closingHourUtc = 20; // Absolute max limit: 8:00 PM UTC/BST

    const dateParts = dateStr.split('-');
    const baseDateMs = Date.UTC(
      parseInt(dateParts[0], 10),
      parseInt(dateParts[1], 10) - 1,
      parseInt(dateParts[2], 10)
    );

    const closingTimeMs = baseDateMs + closingHourUtc * 3600000;

    for (let hour = openingHourUtc; hour < closingHourUtc; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStartMs = baseDateMs + hour * 3600000 + minute * 60000;
        const slotEndMs = slotStartMs + treatmentDuration * 60000;

        // Strictly block slots ending past 20:00
        if (slotEndMs > closingTimeMs) continue;

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
      }
    }

    return NextResponse.json({ slots: availableSlots });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to calculate availability' }, { status: 500 });
  }
}