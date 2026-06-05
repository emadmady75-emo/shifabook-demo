'use client';

import React from 'react';
import { useBooking, PatientBooking, WhatsAppEvent } from '../BookingContext';
import { formatDateOnly } from '@/lib/dates';

export default function AppointmentsList() {
  const { language, bookings, cancelAppointment, confirmAttendance, whatsappEvents } = useBooking();
  const isAr = language === 'ar';

  const activeBookings = bookings.filter(b => b.status !== 'cancelled').sort((a, b) => {
    return a.date.localeCompare(b.date) || a.timeSlot.localeCompare(b.timeSlot);
  });

  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const formatPeriodTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':');
    const hr = parseInt(h);
    const suffix = isAr ? (hr >= 12 ? 'م' : 'ص') : (hr >= 12 ? 'PM' : 'AM');
    const displayHr = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
    return `${displayHr}:${m} ${suffix}`;
  };

  const isAppointmentPast = (dateStr: string, timeStr: string): boolean => {
    const now = new Date();
    const todayStr = formatDateOnly(now);
    if (dateStr < todayStr) return true;
    if (dateStr > todayStr) return false;
    const [h, m] = timeStr.split(':').map(Number);
    const currentTotalMin = now.getHours() * 60 + now.getMinutes();
    const slotTotalMin = h * 60 + m;
    return slotTotalMin < currentTotalMin;
  };

  const getStatusBadge = (appt: PatientBooking) => {
    if (appt.status === 'cancelled') {
      return (
        <span className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 text-xs border border-rose-500/20 font-bold">
          {isAr ? '✕ ملغى' : '✕ Cancelled'}
        </span>
      );
    }

    const isPast = isAppointmentPast(appt.date, appt.timeSlot);
    if (isPast) {
      return (
        <span className="px-2 py-1 rounded-lg bg-teal-500/10 text-teal-400 text-xs border border-teal-500/20 font-bold">
          {isAr ? '✓ تم الحضور' : '✓ Attended'}
        </span>
      );
    }

    if (appt.status === 'confirmed') {
      return (
        <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20 font-bold">
          {isAr ? '✓ مؤكد' : '✓ Confirmed'}
        </span>
      );
    }

    // Default: future pending
    return (
      <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20 font-bold animate-pulse">
        {isAr ? '⏳ بانتظار التأكيد' : '⏳ Pending confirmation'}
      </span>
    );
  };

  const getDeliveryStatusIcon = (status: WhatsAppEvent['status']) => {
    switch (status) {
      case 'sent':
        return <span className="text-slate-500" title="Sent">✓</span>;
      case 'delivered':
        return <span className="text-slate-400 font-black" title="Delivered">✓✓</span>;
      case 'read':
        return <span className="text-teal-400 font-black" title="Read">✓✓</span>;
      case 'replied':
        return (
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-black border border-emerald-500/25">
            {isAr ? 'رد المريض بنعم' : 'Patient Confirmed'}
          </span>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-right">
      
      {/* Dynamic Patient Bookings Tracker Table */}
      <div className="lg:col-span-8 glass-panel rounded-3xl p-6 border border-teal-500/20 space-y-6">
        <div>
          <h3 className="text-lg font-black text-white">
            {isAr ? 'الحجوزات النشطة وقائمة المرضى' : 'Active Appointments & Patient Ledger'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isAr 
              ? 'مراقبة الحجوزات والتحكم بها. يمكنك إلغاء الموعد أو تأكيد الحضور يدوياً.' 
              : 'Monitor and coordinate active reservations. Manually override or cancel slots below.'}
          </p>
        </div>

        {activeBookings.length === 0 ? (
          <div className="text-center py-12 bg-slate-950/20 rounded-2xl border border-teal-950/40">
            <p className="text-slate-400 text-sm">
              {isAr ? 'لا توجد حجوزات مجدولة نشطة حالياً.' : 'No active bookings registered.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-teal-950 text-slate-400 text-xs font-bold">
                  <th className="pb-3 text-right">{isAr ? 'المريض' : 'Patient'}</th>
                  <th className="pb-3 text-right">{isAr ? 'اليوم' : 'Date'}</th>
                  <th className="pb-3 text-right">{isAr ? 'المقعد / الوقت' : 'Seat / Time'}</th>
                  <th className="pb-3 text-right">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="pb-3 text-left">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-950/40 text-slate-200">
                {activeBookings.map((appt) => (
                  <tr key={appt.id} className="hover:bg-teal-950/10 transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-white">{appt.patientName}</div>
                      <div className="text-xs text-slate-400">{appt.mobileNumber}</div>
                    </td>
                    <td className="py-4">{appt.date}</td>
                    <td className="py-4 text-teal-300 font-bold">
                      {formatPeriodTime(appt.timeSlot)}
                    </td>
                    <td className="py-4">{getStatusBadge(appt)}</td>
                    <td className="py-4 text-left">
                      <div className="inline-flex gap-2">
                        {appt.status === 'pending' && (
                          <button
                            onClick={() => confirmAttendance(appt.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold text-xs transition-colors"
                          >
                            {isAr ? 'تأكيد الحضور' : 'Confirm'}
                          </button>
                        )}
                        <button
                          onClick={() => cancelAppointment(appt.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-950 hover:bg-rose-950/40 text-xs transition-colors font-semibold"
                        >
                          {isAr ? 'إلغاء الموعد' : 'Cancel'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Cancelled Log Teaser */}
        {cancelledBookings.length > 0 && (
          <div className="pt-4 border-t border-teal-950/40 space-y-2">
            <h4 className="text-xs font-bold text-slate-400">
              {isAr ? 'السجل التاريخي للإلغاءات الأخيرة' : 'Log of Recent Cancellations'}
            </h4>
            <div className="space-y-1">
              {cancelledBookings.slice(0, 3).map((cb) => (
                <div key={cb.id} className="flex justify-between items-center text-xs bg-rose-950/5 border border-rose-950/20 p-2 rounded-xl text-slate-400">
                  <span>{cb.patientName} ({cb.mobileNumber})</span>
                  <span>
                    {isAr ? 'ألغى موعد' : 'Cancelled slot'} {cb.date} - {formatPeriodTime(cb.timeSlot)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Mock Messaging Logs Hub */}
      <div className="lg:col-span-4 glass-panel rounded-3xl p-6 border border-teal-500/20 space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 glow-active" />
            <h3 className="text-lg font-black text-white">
              {isAr ? 'بوابة إشعارات الواتساب' : 'WhatsApp Notification Hub'}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr 
              ? 'مراقبة المسار الفوري للرسائل وتأكيدات المرضى التلقائية.' 
              : 'Direct monitor of messaging pipeline & automated patient callbacks.'}
          </p>
        </div>

        {/* Timeline Event Feed */}
        <div className="space-y-4 max-h-[380px] overflow-y-auto custom-scrollbar pl-1">
          {whatsappEvents.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              {isAr ? 'بانتظار حدوث عمليات حجز لبدء رصد الأحداث...' : 'Awaiting bookings to log webhook activity...'}
            </div>
          ) : (
            whatsappEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-3.5 rounded-2xl bg-[#09151e] border border-teal-950/50 space-y-2 text-right relative overflow-hidden animate-in slide-in-from-right-4 duration-300"
              >
                
                {/* Event header */}
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-mono text-slate-500">{evt.timestamp}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-teal-400">{evt.type}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  </div>
                </div>

                {/* Patient details */}
                <div className="text-xs font-bold text-slate-200">
                  {evt.patientName} ({evt.phone})
                </div>

                {/* Message Content Preview */}
                <div className="p-2 rounded bg-slate-950/40 text-[10px] text-slate-400 border border-teal-950/20 leading-relaxed font-mono">
                  "{evt.message}"
                </div>

                {/* Status Indicator */}
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-500">Event ID: {evt.id.substring(3, 10)}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">{isAr ? 'الحالة:' : 'Status:'}</span>
                    {getDeliveryStatusIcon(evt.status)}
                  </div>
                </div>

              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
}
