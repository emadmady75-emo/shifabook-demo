import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { normalizePhone } from '@/lib/phone';
import { isAppointmentInFutureOrNow } from '@/lib/dates';

export async function POST(request: NextRequest) {
  try {
    const { phone, doctorId } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Missing phone number' }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    // Server-side check: prevent multiple active bookings for same phone number
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      // RC-2.0: Scope by doctor_id to prevent cross-doctor booking conflicts
      let otpQuery = supabase
        .from('appointments')
        .select('id, appointment_date, appointment_time')
        .eq('patient_phone', normalizedPhone)
        .neq('status', 'cancelled')
        .gte('appointment_date', todayStr);
      if (doctorId) {
        otpQuery = otpQuery.eq('doctor_id', doctorId);
      }
      const { data: activeAppts, error: dbError } = await otpQuery;

      if (dbError) {
        console.error('Server-side active booking check error:', dbError);
      } else if (activeAppts && activeAppts.length > 0) {
        const hasRealActive = activeAppts.some(appt => isAppointmentInFutureOrNow(appt.appointment_date, appt.appointment_time));
        if (hasRealActive) {
          return NextResponse.json({ 
            error: 'لديك حجز نشط بالفعل مسجل بهذا الرقم. يرجى إلغاء الموعد أو تعديله أولاً.' 
          }, { status: 409 });
        }
      }
    }

    // Generate random 4 digit code
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Generate stateless token
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes validity
    const secret = process.env.OTP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'shifabook-otp-secret-key-default';
    const data = `${normalizedPhone}.${otp}.${expires}`;
    const signature = crypto.createHmac('sha256', secret).update(data).digest('hex');
    const token = `${expires}.${signature}`;

    // Send via n8n OTP webhook
    const n8nWebhookUrl = process.env.N8N_OTP_WEBHOOK_URL;
    if (n8nWebhookUrl) {
      try {
        const response = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: normalizedPhone,
            otp: otp,
          }),
        });
        if (!response.ok) {
          console.error(`n8n OTP webhook returned status ${response.status}`);
        }
      } catch (webhookErr) {
        console.error('Failed to trigger n8n OTP webhook:', webhookErr);
      }
    } else {
      console.warn('N8N_OTP_WEBHOOK_URL is not set. OTP is generated but not sent via webhook.');
    }

    // Always log OTP in console/dev mode for QA
    console.log(`[QA OTP Log] Generated OTP for ${normalizedPhone} is ${otp}`);

    return NextResponse.json({ success: true, token });
  } catch (err: any) {
    console.error('Error in OTP request API:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
