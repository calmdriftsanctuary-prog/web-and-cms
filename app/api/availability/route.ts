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

    // 1. CHECK AVAILABILITY RULES (Closed by default!)
    const { data: rules, error: ruleError } = await supabase
      .from('availability_rules')
      .select('*')
      .eq('date', dateStr);

    if (ruleError || !rules || rules.length === 0) {
      return NextResponse.json({ slots: [] }); // Day is closed
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
        const operatingStart = dateMidnight + 10 * 3600000;
        const operatingEnd = dateMidnight + 20 * 3600000;

        busyIntervals.push({ 
          start: Math.min(btStart, operatingStart), 
          end: Math.max(btEnd, operatingEnd) 
        });
      }
    });

    const availableSlots: string[] = [];
    const baseDateMs = dateMidnight;

    // Loop through each active availability rule for this date
    for (const rule of rules) {
      let openHour = 10;
      let closeHour = 20;

      if (!rule.is_full_day && rule.start_time && rule.end_time) {
        // Parse custom hours if specific time window was opened
        openHour = parseInt(rule.start_time.split(':')[0], 10);
        closeHour = parseInt(rule.end_time.split(':')[0], 10);
      }

      const openingTimeMs = baseDateMs + openHour * 3600000;
      const latestStartHour = closeHour - (treatmentDuration / 60);
      const latestStartTimeMs = baseDateMs + latestStartHour * 3600000;
      const absoluteClosingTimeMs = baseDateMs + closeHour * 3600000;

      let currentSlotMs = openingTimeMs;

      while (currentSlotMs <= latestStartTimeMs) {
        const slotStartMs = currentSlotMs;
        const slotEndMs = slotStartMs + treatmentDuration * 60000;

        if (slotEndMs > absoluteClosingTimeMs) {
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
          // Prevent duplicate slots if overlapping rules exist
          const isoString = slotDateTime.toISOString();
          if (!availableSlots.includes(isoString)) {
            availableSlots.push(isoString);
          }
        }

        currentSlotMs += 30 * 60000;
      }
    }

    // Sort slots chronologically
    availableSlots.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return NextResponse.json({ slots: availableSlots });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to calculate availability' }, { status: 500 });
  }
}