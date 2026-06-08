import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey);
};

async function verifyFinanceCaller() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    return { error: 'غير مصرح بالدخول', status: 401 };
  }

  // Fallback for default doctor
  if (user.id === '5e236d18-ff19-42d5-82cf-6e6d6a177e9a' || user.email === 'doctor@shifabook.com') {
    return { caller: user, role: 'admin', fullName: 'د. عبدالرحمن المصري' };
  }

  try {
    const { data: clinicUser, error } = await client
      .from('clinic_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (error || !clinicUser) {
      return { error: 'غير مصرح لك بالدخول، يرجى مراجعة مدير النظام.', status: 403 };
    }

    const role = clinicUser.role === 'user' ? 'reception' : clinicUser.role;

    if (!clinicUser.is_active) {
      return { error: 'الحساب غير نشط.', status: 403 };
    }

    return { caller: user, role, fullName: clinicUser.full_name };
  } catch (err) {
    // If clinic_users table is missing, but user is logged in
    return { caller: user, role: 'admin', fullName: 'د. عبدالرحمن المصري' }; // Fallback
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifyFinanceCaller();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.role !== 'admin' && auth.role !== 'accountant') {
    return NextResponse.json({ error: 'غير مصرح لك بعرض الحسابات المالية.' }, { status: 403 });
  }

  const supabaseAdmin = getAdminClient();

  try {
    // 1. Fetch appointments (confirmed, attended)
    const { data: appointments, error: apptErr } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .in('status', ['confirmed', 'attended'])
      .order('appointment_date', { ascending: false });

    if (apptErr) throw apptErr;

    // 2. Fetch payments
    const { data: payments, error: payErr } = await supabaseAdmin
      .from('payments')
      .select('*');

    if (payErr) throw payErr;

    // 3. Fetch invoices
    const { data: invoices, error: invErr } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (invErr) throw invErr;

    // 4. Fetch expenses
    const { data: expenses, error: expErr } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false });

    if (expErr) throw expErr;

    // 5. Fetch doctor details to get consultation fee if needed
    const { data: doctors, error: docErr } = await supabaseAdmin
      .from('doctors')
      .select('id, full_name, consultation_fee');

    // Create a lookup for doctor fees
    const doctorLookup = (doctors || []).reduce((acc: any, doc: any) => {
      acc[doc.id] = { name: doc.full_name, fee: doc.consultation_fee };
      return acc;
    }, {});

    return NextResponse.json({
      appointments,
      payments,
      invoices,
      expenses,
      doctorLookup
    });
  } catch (err: any) {
    console.error('Finance GET error:', err);
    if (err.code === '42P01' || err.message?.includes('relation') && err.message?.includes('does not exist')) {
      return NextResponse.json({ 
        code: 'MIGRATION_PENDING', 
        error: 'لم يتم تفعيل وحدة الإدارة المالية بعد. يرجى تشغيل ملف الهجرة.' 
      });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyFinanceCaller();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { type, ...payload } = await request.json();
  const supabaseAdmin = getAdminClient();

  try {
    if (type === 'expense') {
      // Role validation: only admin and accountant
      if (auth.role !== 'admin' && auth.role !== 'accountant') {
        return NextResponse.json({ error: 'غير مصرح لك بإضافة مصروفات مالية.' }, { status: 403 });
      }

      const { title, category, amount, expense_date, notes } = payload;
      if (!title || !amount) {
        return NextResponse.json({ error: 'الاسم والقيمة مطلوبان.' }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from('expenses')
        .insert({
          title,
          category,
          amount: Number(amount),
          expense_date: expense_date || new Date().toISOString().split('T')[0],
          notes,
          created_by: auth.fullName || auth.caller.email
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, data });
    } 
    
    if (type === 'payment') {
      const { appointment_id, status, method, patient_name, patient_phone, amount } = payload;

      if (!appointment_id || !status || !patient_name || !patient_phone) {
        return NextResponse.json({ error: 'البيانات غير مكتملة لتسجيل عملية الدفع.' }, { status: 400 });
      }

      // Role check for payments update
      if (auth.role !== 'admin' && auth.role !== 'accountant') {
        // Reception can only set paid / cash
        if (auth.role === 'reception' || auth.role === 'user') {
          if (status !== 'paid' || method !== 'cash') {
            return NextResponse.json({ error: 'موظف الاستقبال يمكنه فقط تأكيد تحصيل الدفعات النقدية (Cash).' }, { status: 403 });
          }
        } else {
          return NextResponse.json({ error: 'غير مصرح لك بتحديث الحسابات المالية.' }, { status: 403 });
        }
      }

      // Upsert payment
      // Try to find if payment already exists
      const { data: existingPayment } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('appointment_id', appointment_id)
        .maybeSingle();

      let paymentId = existingPayment?.id;
      const paymentData = {
        appointment_id,
        patient_name,
        patient_phone,
        amount: Number(amount),
        status,
        method: method || 'cash',
        paid_at: status === 'paid' ? new Date().toISOString() : null,
        received_by: auth.fullName || auth.caller.email,
        updated_at: new Date().toISOString()
      };

      if (paymentId) {
        const { error: updateErr } = await supabaseAdmin
          .from('payments')
          .update(paymentData)
          .eq('id', paymentId);
        if (updateErr) throw updateErr;
      } else {
        const { data: newPay, error: insertErr } = await supabaseAdmin
          .from('payments')
          .insert(paymentData)
          .select()
          .single();
        if (insertErr) throw insertErr;
        paymentId = newPay.id;
      }

      // Handle invoice generation/update
      const invoiceNumber = `INV-${new Date().getFullYear()}-${appointment_id.substring(0, 8).toUpperCase()}`;
      
      const invoiceData = {
        invoice_number: invoiceNumber,
        appointment_id,
        payment_id: paymentId,
        patient_name,
        patient_phone,
        amount: Number(amount),
        status: status === 'paid' ? 'issued' : status === 'refunded' ? 'cancelled' : 'draft',
        issued_at: status === 'paid' ? new Date().toISOString() : null
      };

      const { data: existingInvoice } = await supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('appointment_id', appointment_id)
        .maybeSingle();

      if (existingInvoice) {
        const { error: invErr } = await supabaseAdmin
          .from('invoices')
          .update({
            status: invoiceData.status,
            issued_at: invoiceData.issued_at,
            amount: invoiceData.amount,
            payment_id: paymentId
          })
          .eq('id', existingInvoice.id);
        if (invErr) throw invErr;
      } else {
        const { error: invErr } = await supabaseAdmin
          .from('invoices')
          .insert(invoiceData);
        if (invErr) throw invErr;
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'نوع الإجراء غير صالح.' }, { status: 400 });
  } catch (err: any) {
    console.error('Finance POST error:', err);
    if (err.code === '42P01' || err.message?.includes('relation') && err.message?.includes('does not exist')) {
      return NextResponse.json({ 
        code: 'MIGRATION_PENDING', 
        error: 'لم يتم تفعيل وحدة الإدارة المالية بعد. يرجى تشغيل ملف الهجرة.' 
      });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
