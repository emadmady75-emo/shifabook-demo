import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { normalizePhone } from '@/lib/phone';

export async function POST(request: NextRequest) {
  try {
    const { phone, otp, token } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Missing phone or OTP parameters' }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    // Development / demo bypass fallback
    const allowDemoOtp = process.env.NEXT_PUBLIC_ALLOW_DEMO_OTP === 'true';
    if (allowDemoOtp && otp === '1234') {
      return NextResponse.json({ success: true });
    }

    if (!token) {
      return NextResponse.json({ error: 'Missing verification token' }, { status: 400 });
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return NextResponse.json({ error: 'Malformed verification token' }, { status: 400 });
    }

    const [expiresStr, signature] = parts;
    const expires = Number(expiresStr);

    if (isNaN(expires)) {
      return NextResponse.json({ error: 'Invalid expiration timestamp' }, { status: 400 });
    }

    // Verify expiration (5 minutes validity)
    if (Date.now() > expires) {
      return NextResponse.json({ error: 'Verification code has expired' }, { status: 400 });
    }

    // Recompute signature
    const secret = process.env.OTP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'shifabook-otp-secret-key-default';
    const data = `${normalizedPhone}.${otp}.${expires}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Incorrect verification code' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in OTP verify API:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
