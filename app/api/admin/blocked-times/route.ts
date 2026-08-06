import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET all blocked times
export async function GET() {
  const { data, error } = await supabase.from('blocked_times').select('*').order('start_time', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blockedTimes: data });
}

// POST to create a new block
export async function POST(request: Request) {
  try {
    const { startTime, endTime, reason } = await request.json();
    const { data, error } = await supabase
      .from('blocked_times')
      .insert({ start_time: startTime, end_time: endTime, reason })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, blockedTime: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE to remove a block
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const { error } = await supabase.from('blocked_times').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}