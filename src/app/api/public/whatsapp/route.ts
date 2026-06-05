import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizePhone } from '@/lib/phone';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { 
      doctor_id, 
      patient_name, 
      patient_phone, 
      appointment_date, 
      appointment_time,
      facility_name,
      facility_map_url,
      is_rescheduled,
      old_facility_name,
      new_facility_name,
      old_appointment_date,
      old_appointment_time
    } = payload;

    if (!doctor_id || !patient_phone || !appointment_date || !appointment_time) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing server-side Supabase configuration keys.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Initialize Supabase Client with service role key to bypass RLS on server
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify appointment exists in Supabase database before forwarding to n8n
    const { data: appointments, error: dbError } = await supabase
      .from('appointments')
      .select('patient_name')
      .eq('doctor_id', doctor_id)
      .eq('patient_phone', patient_phone)
      .eq('appointment_date', appointment_date)
      .eq('appointment_time', appointment_time)
      .neq('status', 'cancelled')
      .limit(1);

    if (dbError) {
      console.error('Database verification query error:', dbError);
      return NextResponse.json({ error: 'Database verification failed' }, { status: 500 });
    }

    if (!appointments || appointments.length === 0) {
      console.warn('Appointment verification failed: No matching active booking found for verification payload.');
      return NextResponse.json({ error: 'Appointment verification failed. Booking does not exist.' }, { status: 404 });
    }

    // Extract verified name from database to avoid spoofing client payload
    const verifiedPatientName = appointments[0].patient_name || patient_name || '';
    const normalizedPhone = normalizePhone(patient_phone);

    const n8nWebhookUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      console.warn('N8N_WHATSAPP_WEBHOOK_URL is not set. Skipping webhook execution.');
      return NextResponse.json({ success: true, warning: 'Webhook URL not configured' }, { status: 200 });
    }

    const outboundPayload = {
      event_type: is_rescheduled ? 'booking.rescheduled' : 'booking.created',
      timestamp: new Date().toISOString(),
      data: is_rescheduled ? {
        doctor_id,
        patient_name: verifiedPatientName,
        patient_phone: normalizedPhone,
        old_facility_name: old_facility_name || facility_name || '',
        new_facility_name: new_facility_name || facility_name || '',
        old_appointment_date: old_appointment_date || appointment_date,
        old_appointment_time: old_appointment_time || appointment_time,
        new_appointment_date: appointment_date,
        new_appointment_time: appointment_time,
        facility_name: new_facility_name || facility_name || '',
        facility_map_url: facility_map_url || ''
      } : {
        doctor_id,
        patient_name: verifiedPatientName,
        patient_phone: normalizedPhone,
        appointment_date,
        appointment_time,
        facility_name: facility_name || '',
        facility_map_url: facility_map_url || ''
      }
    };

    // Forward to n8n in a non-blocking try-catch (failures should not block client responses)
    try {
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(outboundPayload)
      });

      if (!response.ok) {
        console.error(`n8n webhook returned error status: ${response.status} ${response.statusText}`);
      }
    } catch (webhookErr) {
      console.error('Failed to send webhook to n8n:', webhookErr);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('Unexpected error in WhatsApp API bridge:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
