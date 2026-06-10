import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const facilityId = searchParams.get('facilityId');

    if (!doctorId || !start || !end) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    // Use private SUPABASE_SERVICE_ROLE_KEY to bypass RLS on the server.
    // Fallback to NEXT_PUBLIC_SUPABASE_ANON_KEY if service role key is not configured.
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query appointments filtered by doctor_id, date range, and status not cancelled
    const query = supabase
      .from('appointments')
      .select('id, appointment_date, appointment_time, status, doctor_id, queue_code')
      .eq('doctor_id', doctorId)
      .gte('appointment_date', start)
      .lte('appointment_date', end)
      .neq('status', 'cancelled');

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching public availability from Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('Unexpected error in availability API:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
