'use client';

import React, { useState, useEffect } from 'react';
import { useBooking } from '../BookingContext';
import PatientPhoneLink from './PatientPhoneLink';

interface PaymentData {
  id?: string;
  appointment_id: string;
  patient_name: string;
  patient_phone: string;
  amount: number;
  status: 'unpaid' | 'paid' | 'refunded';
  method: 'cash' | 'card' | 'wallet' | 'insurance' | 'other';
  paid_at?: string;
  received_by?: string;
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  appointment_id?: string;
  payment_id?: string;
  patient_name: string;
  patient_phone: string;
  amount: number;
  status: 'draft' | 'issued' | 'cancelled';
  issued_at?: string;
  created_at: string;
}

interface ExpenseData {
  id: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  notes: string;
  created_by?: string;
  created_at: string;
}

export default function FinanceModule() {
  const { language, clinicUser } = useBooking();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'payments' | 'invoices' | 'expenses'>('payments');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isMigrationPending, setIsMigrationPending] = useState(false);

  // Raw API Data
  const [appointments, setAppointments] = useState<any[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [doctorLookup, setDoctorLookup] = useState<Record<string, { name: string; fee: number }>>({});

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Add Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: isAr ? 'إيجار' : 'Rent',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Action status tracker for inline feedback
  const [savingPaymentId, setSavingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/finance');
      const data = await res.json();

      const isPending = 
        data.code === 'MIGRATION_PENDING' || 
        (data.error && (
          data.error.includes('relation') || 
          data.error.includes('schema cache') || 
          data.error.includes('payments') || 
          data.error.includes('invoices') || 
          data.error.includes('expenses')
        ));

      if (isPending) {
        setIsMigrationPending(true);
        setErrorMsg(data.error || 'لم يتم تفعيل وحدة الإدارة المالية بعد.');
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to fetch finance data');
        setIsLoading(false);
        return;
      }

      setAppointments(data.appointments || []);
      setPayments(data.payments || []);
      setInvoices(data.invoices || []);
      setExpenses(data.expenses || []);
      setDoctorLookup(data.doctorLookup || {});
    } catch (err: any) {
      console.error('Graceful error load:', err);
      setIsMigrationPending(true);
      setErrorMsg(isAr ? 'لم يتم تفعيل وحدة الإدارة المالية بعد.' : 'Finance module is not active yet.');
    } finally {
      setIsLoading(false);
    }
  };

  // Merge Appointments & Payments
  const mergedPayments = appointments.map(appt => {
    const paymentRecord = payments.find(p => p.appointment_id === appt.id);
    const docInfo = doctorLookup[appt.doctor_id] || { name: '', fee: 400 };

    return {
      appointment_id: appt.id,
      patient_name: appt.patient_name,
      patient_phone: appt.patient_phone,
      appointment_date: appt.appointment_date,
      appointment_time: appt.appointment_time,
      doctor_name: docInfo.name,
      consultation_fee: appt.consultation_fee_at_booking ?? docInfo.fee,
      // payment overrides
      status: paymentRecord?.status || 'unpaid',
      method: paymentRecord?.method || 'cash',
      paid_at: paymentRecord?.paid_at,
      received_by: paymentRecord?.received_by,
      payment_id: paymentRecord?.id
    };
  });

  const filteredPayments = mergedPayments.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      p.patient_name.toLowerCase().includes(q) ||
      p.patient_phone.includes(q)
    );
  });

  const filteredInvoices = invoices.filter(inv => {
    const q = searchQuery.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.patient_name.toLowerCase().includes(q) ||
      inv.patient_phone.includes(q)
    );
  });

  const filteredExpenses = expenses.filter(exp => {
    const q = searchQuery.toLowerCase();
    return (
      exp.title.toLowerCase().includes(q) ||
      (exp.category && exp.category.toLowerCase().includes(q))
    );
  });

  // Calculate statistics
  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalUnpaid = mergedPayments
    .filter(p => p.status === 'unpaid')
    .reduce((sum, p) => sum + Number(p.consultation_fee), 0);

  const totalExpenseSum = expenses
    .reduce((sum, exp) => sum + Number(exp.amount), 0);

  const netRevenue = totalPaid - totalExpenseSum;

  const handleUpdatePayment = async (apptId: string, status: string, method: string, patientName: string, patientPhone: string, fee: number) => {
    setSavingPaymentId(apptId);
    try {
      const res = await fetch('/api/admin/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment',
          appointment_id: apptId,
          status,
          method,
          patient_name: patientName,
          patient_phone: patientPhone,
          amount: fee
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update payment status');
      } else {
        // Refresh local data
        await fetchFinanceData();
      }
    } catch (err) {
      console.error(err);
      alert('Error updating payment');
    } finally {
      setSavingPaymentId(null);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'expense',
          title: expenseForm.title,
          category: expenseForm.category,
          amount: Number(expenseForm.amount),
          expense_date: expenseForm.expense_date,
          notes: expenseForm.notes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to add expense');
      } else {
        // Reset Form & Refresh
        setExpenseForm({
          title: '',
          category: isAr ? 'إيجار' : 'Rent',
          amount: '',
          expense_date: new Date().toISOString().split('T')[0],
          notes: ''
        });
        await fetchFinanceData();
      }
    } catch (err) {
      console.error(err);
      alert('Error adding expense');
    } finally {
      setIsSaving(false);
    }
  };

  const formatPeriodTime = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(':')) return '';
    const [h, m] = timeStr.split(':');
    const hr = parseInt(h);
    if (isNaN(hr)) return '';
    const suffix = isAr ? (hr >= 12 ? 'م' : 'ص') : (hr >= 12 ? 'PM' : 'AM');
    const displayHr = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
    return `${displayHr}:${m} ${suffix}`;
  };

  // Render migration pending state gracefully
  if (isMigrationPending) {
    return (
      <div className="glass-panel rounded-3xl p-8 border border-teal-500/20 text-center space-y-6 max-w-lg mx-auto my-10" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-white">وحدة الإدارة المالية لم يتم تفعيلها بعد</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            يرجى تشغيل Migration المالية لاحقًا لتفعيل المدفوعات والفواتير والمصروفات.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-right" dir="rtl">
      
      {/* ─── Financial Summary Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Paid Collected */}
        <div className="glass-panel rounded-2xl p-5 relative overflow-hidden border border-teal-500/15 shadow-lg">
          <p className="text-[11px] text-slate-400 font-semibold mb-1">
            {isAr ? 'المدفوعات المحصلة' : 'Payments Collected'}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-400 tabular-nums">
              {totalPaid.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            {isAr ? 'من الحسابات المؤكدة والمدفوعة' : 'From confirmed paid slots'}
          </p>
        </div>

        {/* Unpaid Pipeline */}
        <div className="glass-panel rounded-2xl p-5 relative overflow-hidden border border-teal-500/15 shadow-lg">
          <p className="text-[11px] text-slate-400 font-semibold mb-1">
            {isAr ? 'إيرادات قيد التحصيل' : 'Unpaid Pipeline'}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-400 tabular-nums">
              {totalUnpaid.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            {isAr ? 'مواعيد حضور مؤكدة غير مدفوعة' : 'Confirmed bookings not paid'}
          </p>
        </div>

        {/* Expenses */}
        <div className="glass-panel rounded-2xl p-5 relative overflow-hidden border border-teal-500/15 shadow-lg">
          <p className="text-[11px] text-slate-400 font-semibold mb-1">
            {isAr ? 'إجمالي المصروفات' : 'Total Expenses'}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-rose-400 tabular-nums">
              {totalExpenseSum.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            {isAr ? 'المصروفات التشغيلية للعيادة' : 'Operating expenses registered'}
          </p>
        </div>

        {/* Net Income */}
        <div className="glass-panel rounded-2xl p-5 relative overflow-hidden border border-teal-500/15 shadow-lg">
          <p className="text-[11px] text-slate-400 font-semibold mb-1">
            {isAr ? 'صافي الدخل المالي' : 'Net Financial Revenue'}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black tabular-nums ${netRevenue >= 0 ? 'text-teal-400' : 'text-rose-500'}`}>
              {netRevenue.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            {isAr ? 'التحصيل مطروحاً منه المصروفات' : 'Collected revenue less expenses'}
          </p>
        </div>
      </div>

      {/* ─── Sub-Tab Selector & Search ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-teal-950 pb-4">
        <div className="flex gap-4">
          <button
            onClick={() => { setActiveTab('payments'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'payments'
                ? 'bg-teal-500 text-teal-950 shadow-md shadow-teal-500/15'
                : 'bg-teal-950/20 text-slate-400 hover:text-white border border-teal-950'
            }`}
          >
            {isAr ? 'الفواتير والمدفوعات' : 'Payments & Invoicing'}
          </button>
          
          <button
            onClick={() => { setActiveTab('invoices'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'invoices'
                ? 'bg-teal-500 text-teal-950 shadow-md shadow-teal-500/15'
                : 'bg-teal-950/20 text-slate-400 hover:text-white border border-teal-950'
            }`}
          >
            {isAr ? 'دفتر الفواتير الصادرة' : 'Issued Invoices Ledger'}
          </button>

          <button
            onClick={() => { setActiveTab('expenses'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'expenses'
                ? 'bg-teal-500 text-teal-950 shadow-md shadow-teal-500/15'
                : 'bg-teal-950/20 text-slate-400 hover:text-white border border-teal-950'
            }`}
          >
            {isAr ? 'المصروفات التشغيلية' : 'Clinic Expenses'}
          </button>
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder={
              activeTab === 'payments'
                ? (isAr ? 'ابحث باسم المريض أو الهاتف...' : 'Search by name or phone...')
                : activeTab === 'invoices'
                ? (isAr ? 'ابحث برقم الفاتورة أو المريض...' : 'Search by invoice or patient...')
                : (isAr ? 'ابحث باسم المصروف أو الفئة...' : 'Search by expense title...')
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 pr-9 rounded-xl bg-[#09151e] border border-teal-950 text-slate-200 text-xs focus:outline-none focus:border-teal-500 transition-colors"
          />
          <svg className="w-3.5 h-3.5 absolute right-3 top-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* ─── Payments Sub-Tab ─── */}
      {activeTab === 'payments' && (
        <div className="glass-panel rounded-3xl p-6 border border-teal-500/20 space-y-6">
          <div>
            <h3 className="text-base font-black text-white">{isAr ? 'سجل مدفوعات الحجوزات' : 'Appointments Payment Directory'}</h3>
            <p className="text-xs text-slate-400 mt-1">
              {isAr ? 'تحديث وتأكيد المبالغ المالية للمرضى حسب طريقة الدفع.' : 'Update and confirm billing details for active appointments.'}
            </p>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              {isAr ? 'لا توجد دفعات مطابقة للبحث.' : 'No billing records found.'}
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="border-b border-teal-950 text-slate-400 font-bold pb-2">
                    <th className="pb-3 text-right">{isAr ? 'المريض' : 'Patient'}</th>
                    <th className="pb-3 text-right">{isAr ? 'تاريخ الحجز' : 'Appointment Date'}</th>
                    <th className="pb-3 text-right">{isAr ? 'الطبيب' : 'Doctor'}</th>
                    <th className="pb-3 text-right">{isAr ? 'قيمة الكشف' : 'Consultation Fee'}</th>
                    <th className="pb-3 text-right">{isAr ? 'طريقة الدفع' : 'Payment Method'}</th>
                    <th className="pb-3 text-right">{isAr ? 'الحالة المالية' : 'Payment Status'}</th>
                    <th className="pb-3 text-left">{isAr ? 'المحصل المالي' : 'Received By'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-950/30 text-slate-200">
                  {filteredPayments.map((p) => {
                    const isSavingThis = savingPaymentId === p.appointment_id;

                    return (
                      <tr key={p.appointment_id} className="hover:bg-teal-950/10 transition-colors">
                        <td className="py-4">
                          <div className="font-bold text-white">{p.patient_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            <PatientPhoneLink phone={p.patient_phone} isAr={isAr} />
                          </div>
                        </td>
                        <td className="py-4">
                          <div>{p.appointment_date}</div>
                          <div className="text-[10px] text-teal-400 font-bold">{formatPeriodTime(p.appointment_time)}</div>
                        </td>
                        <td className="py-4 text-slate-300">{p.doctor_name || 'طبيب تجريبي'}</td>
                        <td className="py-4 font-mono font-bold text-white">{p.consultation_fee} {isAr ? 'ج.م' : 'EGP'}</td>
                        
                        <td className="py-4">
                          <select
                            value={p.method}
                            onChange={(e) => handleUpdatePayment(p.appointment_id, p.status, e.target.value as any, p.patient_name, p.patient_phone, p.consultation_fee)}
                            disabled={isSavingThis}
                            className="bg-[#09151e] border border-teal-950 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-teal-500 text-white cursor-pointer"
                          >
                            <option value="cash">{isAr ? 'نقدي (Cash)' : 'Cash'}</option>
                            <option value="card">{isAr ? 'بطاقة ائتمان' : 'Credit Card'}</option>
                            <option value="wallet">{isAr ? 'محفظة الكترونية' : 'Digital Wallet'}</option>
                            <option value="insurance">{isAr ? 'تأمين طبي' : 'Insurance'}</option>
                            <option value="other">{isAr ? 'أخرى' : 'Other'}</option>
                          </select>
                        </td>

                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <select
                              value={p.status}
                              onChange={(e) => handleUpdatePayment(p.appointment_id, e.target.value as any, p.method, p.patient_name, p.patient_phone, p.consultation_fee)}
                              disabled={isSavingThis}
                              className={`bg-[#09151e] border border-teal-950 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-teal-500 font-bold cursor-pointer ${
                                p.status === 'paid' ? 'text-emerald-400' : p.status === 'refunded' ? 'text-rose-400' : 'text-amber-400'
                              }`}
                            >
                              <option value="unpaid" className="text-amber-400">{isAr ? 'غير مدفوع' : 'Unpaid'}</option>
                              <option value="paid" className="text-emerald-400">{isAr ? 'تم الدفع ✓' : 'Paid'}</option>
                              <option value="refunded" className="text-rose-400">{isAr ? 'مسترجع ↺' : 'Refunded'}</option>
                            </select>
                            
                            {isSavingThis && (
                              <div className="w-3.5 h-3.5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                            )}
                          </div>
                        </td>

                        <td className="py-4 text-left">
                          {p.status === 'paid' ? (
                            <div>
                              <div className="font-bold text-slate-300 text-[10px]">{p.received_by || 'سيستم'}</div>
                              {p.paid_at && (
                                <div className="text-[8px] text-slate-500 font-mono">
                                  {new Date(p.paid_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 font-mono">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Invoices Sub-Tab ─── */}
      {activeTab === 'invoices' && (
        <div className="glass-panel rounded-3xl p-6 border border-teal-500/20 space-y-6">
          <div>
            <h3 className="text-base font-black text-white">{isAr ? 'دفتر الفواتير الصادرة للمرضى' : 'Client Invoices Directory'}</h3>
            <p className="text-xs text-slate-400 mt-1">
              {isAr ? 'عرض فواتير المرضى المصدرة تلقائياً وتفاصيلها الحسابية.' : 'View generated billing invoices automatically updated from payment logs.'}
            </p>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              {isAr ? 'لا توجد فواتير مصدرة حالياً.' : 'No invoices generated yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="border-b border-teal-950 text-slate-400 font-bold pb-2">
                    <th className="pb-3 text-right">{isAr ? 'رقم الفاتورة' : 'Invoice Number'}</th>
                    <th className="pb-3 text-right">{isAr ? 'المريض' : 'Patient'}</th>
                    <th className="pb-3 text-right">{isAr ? 'القيمة الإجمالية' : 'Invoice Amount'}</th>
                    <th className="pb-3 text-right">{isAr ? 'تاريخ الإصدار' : 'Issue Date'}</th>
                    <th className="pb-3 text-left">{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-950/30 text-slate-200">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-teal-950/10 transition-colors">
                      <td className="py-4 text-teal-300 font-mono font-bold">{inv.invoice_number}</td>
                      <td className="py-4">
                        <div className="font-bold text-white">{inv.patient_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          <PatientPhoneLink phone={inv.patient_phone} isAr={isAr} />
                        </div>
                      </td>
                      <td className="py-4 font-mono font-bold text-white">{inv.amount} {isAr ? 'ج.م' : 'EGP'}</td>
                      <td className="py-4">
                        {inv.issued_at ? (
                          <span className="font-mono">{new Date(inv.issued_at).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</span>
                        ) : (
                          <span className="font-mono text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-4 text-left">
                        <span className={`px-2.5 py-1 rounded-lg border font-bold text-[10px] ${
                          inv.status === 'issued'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : inv.status === 'cancelled'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {inv.status === 'issued' ? (isAr ? 'صادرة ومسددة' : 'Issued') : inv.status === 'cancelled' ? (isAr ? 'ملغاة' : 'Cancelled') : (isAr ? 'مسودة' : 'Draft')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Expenses Sub-Tab ─── */}
      {activeTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Add Expense Form (Left Column) */}
          <div className="lg:col-span-4 glass-panel rounded-3xl p-6 border border-teal-500/20 space-y-6">
            <div>
              <h3 className="text-base font-black text-white">{isAr ? 'تسجيل مصروف تشغيلي' : 'Record Expense'}</h3>
              <p className="text-xs text-slate-400 mt-1">
                {isAr ? 'إضافة مصاريف العيادة كالإيجارات، المستلزمات الطبية، والرواتب.' : 'Add items like clinic rent, medical assets, or clinic utilities.'}
              </p>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-semibold">{isAr ? 'بند المصروف' : 'Expense Title'}</label>
                <input
                  type="text"
                  placeholder={isAr ? 'مثال: مستلزمات طبية، إيجار المقر...' : 'e.g. Clinic Rent, Syringes...'}
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  required
                  className="w-full bg-[#09151e] border border-teal-950 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-semibold">{isAr ? 'التصنيف' : 'Category'}</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full bg-[#09151e] border border-teal-950 text-white rounded-xl px-3 py-2 text-xs cursor-pointer focus:outline-none"
                >
                  <option value="إيجار">{isAr ? 'إيجارات (Rent)' : 'Rent'}</option>
                  <option value="أدوات">{isAr ? 'أدوات ومستلزمات طبية' : 'Medical Assets'}</option>
                  <option value="رواتب">{isAr ? 'رواتب وأجور' : 'Salaries'}</option>
                  <option value="خدمات">{isAr ? 'مرافق (كهرباء، ماء، إنترنت)' : 'Utilities'}</option>
                  <option value="تسويق">{isAr ? 'تسويق وإعلانات' : 'Marketing'}</option>
                  <option value="أخرى">{isAr ? 'أخرى' : 'Other'}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-semibold">{isAr ? 'القيمة المالية' : 'Expense Amount'}</label>
                <input
                  type="number"
                  placeholder="EGP"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  required
                  min="0.01"
                  step="any"
                  className="w-full bg-[#09151e] border border-teal-950 text-white rounded-xl px-3 py-2 text-xs text-left font-mono focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-semibold">{isAr ? 'تاريخ الصرف' : 'Expense Date'}</label>
                <input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                  required
                  className="w-full bg-[#09151e] border border-teal-950 text-white rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-semibold">{isAr ? 'ملاحظات إضافية' : 'Notes'}</label>
                <textarea
                  placeholder={isAr ? 'تفاصيل الفاتورة أو البائع...' : 'Details...'}
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-[#09151e] border border-teal-950 text-white rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-teal-950 font-black text-xs hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'تسجيل المصروف ✓' : 'Save Expense')}
              </button>
            </form>
          </div>

          {/* Expenses List (Right Column) */}
          <div className="lg:col-span-8 glass-panel rounded-3xl p-6 border border-teal-500/20 space-y-6">
            <div>
              <h3 className="text-base font-black text-white">{isAr ? 'دفتر قيود المصروفات' : 'Expenses Ledger'}</h3>
              <p className="text-xs text-slate-400 mt-1">
                {isAr ? 'سجل المصروفات التشغيلية التي تم صرفها من ميزانية العيادة.' : 'History of registered payments made for clinic maintenance.'}
              </p>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                {isAr ? 'لا توجد قيود مصروفات مسجلة.' : 'No expenses recorded.'}
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="border-b border-teal-950 text-slate-400 font-bold pb-2">
                      <th className="pb-3 text-right">{isAr ? 'المصروف' : 'Title'}</th>
                      <th className="pb-3 text-right">{isAr ? 'التصنيف' : 'Category'}</th>
                      <th className="pb-3 text-right">{isAr ? 'القيمة' : 'Amount'}</th>
                      <th className="pb-3 text-right">{isAr ? 'تاريخ الاستحقاق' : 'Date'}</th>
                      <th className="pb-3 text-right">{isAr ? 'سجل بواسطة' : 'By'}</th>
                      <th className="pb-3 text-left">{isAr ? 'ملاحظات' : 'Notes'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-teal-950/30 text-slate-200">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-teal-950/10 transition-colors">
                        <td className="py-4 font-bold text-white">{exp.title}</td>
                        <td className="py-4">
                          <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px]">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-4 font-mono font-bold text-rose-400">-{exp.amount} {isAr ? 'ج.م' : 'EGP'}</td>
                        <td className="py-4 font-mono">{exp.expense_date}</td>
                        <td className="py-4 text-slate-400">{exp.created_by || 'غير محدد'}</td>
                        <td className="py-4 text-left text-slate-400 max-w-xs truncate" title={exp.notes}>
                          {exp.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
