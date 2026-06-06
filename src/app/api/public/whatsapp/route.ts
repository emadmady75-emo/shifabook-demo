import { NextRequest, NextResponse } from 'next/server';
import { normalizePhone } from '@/lib/phone';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { event_type, data } = payload;

    if (!event_type || !data) {
      return NextResponse.json({ error: 'Missing required parameters (event_type or data)' }, { status: 400 });
    }

    // Normalize phone number if present in data
    if (data.patient_phone) {
      data.patient_phone = normalizePhone(data.patient_phone);
    }

    const n8nWebhookUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      console.warn('N8N_WHATSAPP_WEBHOOK_URL is not set. Skipping webhook execution.');
      return NextResponse.json({ ok: true, warning: 'Webhook URL not configured' }, { status: 200 });
    }

    // Forward to n8n unchanged
    try {
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_type,
          data
        })
      });

      if (!response.ok) {
        console.error(`n8n webhook returned error status: ${response.status} ${response.statusText}`);
        return NextResponse.json({ success: false, error: `n8n webhook returned status ${response.status}` }, { status: 500 });
      }
    } catch (webhookErr: any) {
      console.error('Failed to send webhook to n8n:', webhookErr);
      return NextResponse.json({ success: false, error: webhookErr.message || 'Failed to send webhook to n8n' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error('Unexpected error in WhatsApp API bridge:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
