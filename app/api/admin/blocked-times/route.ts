import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data: blockedTimes, error } = await supabase
      .from('blocked_times')
      .select('*')
      .order('start_time', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ blockedTimes: blockedTimes || [] }, { status: 200 });
  } catch (err: any) {
    console.error('Failed to fetch blocked times:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, startTime, endTime, reason } = body;

    if (!startTime || !endTime || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (id) {
      // Update existing
      const { error } = await supabase
        .from('blocked_times')
        .update({ start_time: startTime, end_time: endTime, reason })
        .eq('id', id);

      if (error) throw error;
    } else {
      // Insert new
      const { error } = await supabase
        .from('blocked_times')
        .insert([{ start_time: startTime, end_time: endTime, reason }]);

      if (error) throw error;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('Failed to save blocked time:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('blocked_times')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('Failed to delete blocked time:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}