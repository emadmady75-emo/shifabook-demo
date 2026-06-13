'use client';

import React from 'react';
import { useBooking, PatientBooking, WhatsAppEvent, getQueueCode, FollowUpOptions } from '../BookingContext';
import { formatDateOnly } from '@/lib/dates';
import PatientPhoneLink from './PatientPhoneLink';

export default function AppointmentsList() {
  const { 
    language, 
    bookings, 
    cancelAppointment, 
    confirmAttendance, 
    markAttended,
    markNoShow,
    whatsappEvents, 
    rescheduleAppointment, 
    generateTimeSlotsForDate, 
    scheduleConfig,
    clinicUser,
    bookFollowUpAppointment,
    getFollowUpChain,
    doctorProfile
  } = useBooking();
  const isAr = language === 'ar';

  const [reschedulingBooking, setReschedulingBooking] = React.useState<PatientBooking | null>(null);
  const [selectedRescheduleDate, setSelectedRescheduleDate] = React.useState<string>('');
  const [selectedRescheduleTime, setSelectedRescheduleTime] = React.useState<string | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = React.useState(false);
  const [rescheduleError, setRescheduleError] = React.useState('');

  // Follow-Up Modal State
  const [followUpParent, setFollowUpParent] = React.useState<PatientBooking | null>(null);
  const [followUpDate, setFollowUpDate] = React.useState<string>('');
  const [followUpTime, setFollowUpTime] = React.useState<string | null>(null);
  const [followUpFeeMode, setFollowUpFeeMode] = React.useState<'free' | 'discounted' | 'full'>('free');
  const [followUpCustomFee, setFollowUpCustomFee] = React.useState<string>('');
  const [followUpNote, setFollowUpNote] = React.useState<string>('');
  const [followUpLoading, setFollowUpLoading] = React.useState(false);
  const [followUpError, setFollowUpError] = React.useState('');
  const [followUpSuccess, setFollowUpSuccess] = React.useState(false);

  // Timeline popover state
  const [timelineApptId, setTimelineApptId] = React.useState<string | null>(null);

  const handleOpenFollowUp = (appt: PatientBooking) => {
    setFollowUpParent(appt);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFollowUpDate(formatDateOnly(tomorrow));
    setFollowUpTime(null);
    setFollowUpFeeMode('free');
    setFollowUpCustomFee('');
    setFollowUpNote('');
    setFollowUpError('');
    setFollowUpSuccess(false);
  };

  const getFollowUpFee = (): number => {
    if (followUpFeeMode === 'free') return 0;
    if (followUpFeeMode === 'full') return doctorProfile?.consultationFee ?? 0;
    const parsed = parseFloat(followUpCustomFee);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpParent || !followUpTime) return;

    setFollowUpLoading(true);
    setFollowUpError('');

    try {
      const options: FollowUpOptions = {
        parentAppointmentId: followUpParent.id,
        patientName: followUpParent.patientName,
        patientPhone: followUpParent.mobileNumber,
        date: followUpDate,
        timeSlot: followUpTime,
        fee: getFollowUpFee(),
        note: followUpNote || undefined
      };

      await bookFollowUpAppointment(options);
      setFollowUpSuccess(true);

      // Auto-close after brief delay
      setTimeout(() => {
        setFollowUpParent(null);
        setFollowUpSuccess(false);
      }, 2000);
    } catch (err: any) {
      setFollowUpError(err?.message || (isAr ? 'حدث خطأ أثناء حجز المتابعة' : 'Failed to book follow-up'));
    } finally {
      setFollowUpLoading(false);
    }
  };

  const showFollowUpBtn = (appt: PatientBooking) => appt.status === 'attended' && (!clinicUser || ['admin', 'supervisor', 'reception'].includes(clinicUser.role));

  const hasFollowUpLink = (appt: PatientBooking) => {
    return appt.appointment_type === 'follow_up' || bookings.some(b => b.parent_appointment_id === appt.id);
  };

  const handleOpenReschedule = (appt: PatientBooking) => {
    setReschedulingBooking(appt);
    setSelectedRescheduleDate(appt.date);
    setSelectedRescheduleTime(null);
    setRescheduleError('');
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingBooking || !selectedRescheduleTime) return;

    setRescheduleLoading(true);
    setRescheduleError('');

    try {
      const success = await rescheduleAppointment(
        reschedulingBooking.id,
        selectedRescheduleDate,
        selectedRescheduleTime,
        'doctor'
      );

      if (success) {
        setReschedulingBooking(null);
      } else {
        setRescheduleError(isAr ? 'عذراً، هذا الموعد غير متاح أو ممتلئ.' : 'Sorry, this slot is not available or full.');
      }
    } catch (err: any) {
      setRescheduleError(err?.message || (isAr ? 'حدث خطأ أثناء نقل الموعد' : 'Failed to reschedule appointment'));
    } finally {
      setRescheduleLoading(false);
    }
  };

  const rescheduleDays = Array.from({ length: 10 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const getDayName = (date: Date) =>
    date.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'short' });

  const getMonthName = (date: Date) =>
    date.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short' });

  const renderRescheduleSlots = () => {
    if (!reschedulingBooking) return null;
    const slots = generateTimeSlotsForDate(selectedRescheduleDate);
    if (slots.length === 0) {
      return (
        <div className="col-span-full text-center py-8 text-slate-500 text-xs">
          {isAr ? 'العيادة مغلقة هذا اليوم' : 'Clinic Closed'}
        </div>
      );
    }
    return slots.map((slot) => {
      const isSelected = selectedRescheduleTime === slot.time;
      const isCurrentSlot = selectedRescheduleDate === reschedulingBooking.date && slot.time === reschedulingBooking.timeSlot;
      const isFull = slot.isBooked;
      const isExpired = slot.isExpired;
      const isBlocked = slot.isBlocked;

      let btnCls = '';
      if (isCurrentSlot) {
        btnCls = 'bg-amber-500/10 border-amber-500/70 text-amber-300 cursor-not-allowed';
      } else if (isExpired) {
        btnCls = 'bg-slate-950/20 border-slate-900/20 text-slate-700 cursor-not-allowed opacity-35';
      } else if (isBlocked) {
        btnCls = 'bg-slate-900/40 border-slate-900 text-slate-500 cursor-not-allowed opacity-60';
      } else if (isFull) {
        btnCls = 'bg-rose-950/15 border-rose-900/50 text-rose-500/70 cursor-not-allowed';
      } else if (isSelected) {
        btnCls = 'bg-gradient-to-r from-teal-500 to-emerald-400 border-teal-300 text-[#070e12] font-black scale-[1.02] shadow-md shadow-teal-500/15';
      } else {
        btnCls = 'bg-[#09151e] border-teal-950/60 text-slate-200 hover:border-teal-500 hover:bg-teal-950/20';
      }

      return (
        <button
          key={slot.time}
          type="button"
          disabled={isExpired || isFull || isCurrentSlot || isBlocked}
          onClick={() => setSelectedRescheduleTime(slot.time)}
          title={isBlocked ? (isAr ? 'هذا الموعد غير متاح' : 'This slot is unavailable') : undefined}
          className={`py-2.5 px-1.5 rounded-xl border flex flex-col items-center justify-center transition-all ${btnCls}`}
        >
          <span className="font-bold text-xs">{formatPeriodTime(slot.time)}</span>
          <span className="text-[8px] opacity-80 mt-0.5">
            {isCurrentSlot 
              ? (isAr ? 'الحالي' : 'Current') 
              : isBlocked
              ? (isAr ? 'غير متاح' : 'Unavailable')
              : isFull 
              ? (isAr ? 'محجوز' : 'Full') 
              : (isAr ? 'شاغر' : 'Free')}
          </span>
        </button>
      );
    });
  };

  function isAppointmentPast(dateStr: string, timeStr: string): boolean {
    if (!dateStr || !timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
      return false;
    }
    const now = new Date();
    const todayStr = formatDateOnly(now);
    if (dateStr < todayStr) return true;
    if (dateStr > todayStr) return false;
    const [h, m] = timeStr.split(':').map(Number);
    const currentTotalMin = now.getHours() * 60 + now.getMinutes();
    const slotTotalMin = h * 60 + m;
    return slotTotalMin < currentTotalMin;
  }

  // 1. Filter and sort active appointments newest first (DESC)
  const sortedActiveBookings = React.useMemo(() => {
    const active = bookings.filter(b => b.status !== 'cancelled');
    
    // Filter by role if accountant
    const filtered = active.filter(appt => {
      if (clinicUser?.role === 'accountant') {
        const isPast = isAppointmentPast(appt.date, appt.timeSlot);
        return appt.status === 'confirmed' || appt.status === 'attended' || isPast;
      }
      return true;
    });

    // Sort: Date DESC, Time DESC, Created At DESC
    return filtered.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      
      const timeCompare = b.timeSlot.localeCompare(a.timeSlot);
      if (timeCompare !== 0) return timeCompare;
      
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [bookings, clinicUser]);

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);

  const totalAppointmentsCount = sortedActiveBookings.length;
  const totalPages = Math.max(1, Math.ceil(totalAppointmentsCount / pageSize));

  const paginatedAppointments = React.useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    return sortedActiveBookings.slice(startIndex, startIndex + pageSize);
  }, [sortedActiveBookings, currentPage, pageSize, totalPages]);

  const getPageNumbers = () => {
    const pages = [];
    const delta = 2; // Number of pages to show before and after current page
    
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (
        i === currentPage - delta - 1 ||
        i === currentPage + delta + 1
      ) {
        pages.push('...');
      }
    }
    
    // Remove consecutive ellipses
    return pages.filter((v, i, a) => v !== '...' || a[i - 1] !== '...');
  };

  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const formatPeriodTime = (timeStr: string) => {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
      return '';
    }
    const [h, m] = timeStr.split(':');
    const hr = parseInt(h);
    if (isNaN(hr)) return '';
    const suffix = isAr ? (hr >= 12 ? 'م' : 'ص') : (hr >= 12 ? 'PM' : 'AM');
    const displayHr = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
    return `${displayHr}:${m} ${suffix}`;
  };

  const getStatusBadge = (appt: PatientBooking) => {
    if (appt.status === 'cancelled') {
      return (
        <span className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 text-xs border border-rose-500/20 font-bold">
          {isAr ? '✕ ملغى' : '✕ Cancelled'}
        </span>
      );
    }

    if (appt.status === 'no_show') {
      return (
        <span className="px-2 py-1 rounded-lg bg-orange-500/10 text-orange-400 text-xs border border-orange-500/20 font-bold">
          {isAr ? '✕ لم يحضر' : '✕ No Show'}
        </span>
      );
    }

    const isPast = isAppointmentPast(appt.date, appt.timeSlot);
    if (appt.status === 'attended' || isPast) {
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

  const showWhatsAppHub = clinicUser?.role !== 'accountant';
  const showCancelledLog = clinicUser?.role !== 'reception' && clinicUser?.role !== 'accountant';

  const showConfirmBtn = (appt: PatientBooking) => appt.status === 'pending' && (!clinicUser || clinicUser.role !== 'accountant');
  const showRescheduleBtn = (appt: PatientBooking) => !isAppointmentPast(appt.date, appt.timeSlot) && (!clinicUser || clinicUser.role !== 'accountant');
  const showCancelBtn = (appt: PatientBooking) => !clinicUser || clinicUser.role === 'admin';
  const showMarkAttendedBtn = (appt: PatientBooking) => appt.status === 'confirmed' && (!clinicUser || clinicUser.role === 'admin' || clinicUser.role === 'supervisor' || clinicUser.role === 'reception');
  const showMarkNoShowBtn = (appt: PatientBooking) => appt.status === 'confirmed' && (!clinicUser || clinicUser.role === 'admin' || clinicUser.role === 'supervisor' || clinicUser.role === 'reception');

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-right">
      
      {/* Dynamic Patient Bookings Tracker Table */}
      <div className={showWhatsAppHub ? "lg:col-span-8 glass-panel rounded-3xl p-6 border border-teal-500/20 space-y-6" : "lg:col-span-12 glass-panel rounded-3xl p-6 border border-teal-500/20 space-y-6"}>
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

        {sortedActiveBookings.length === 0 ? (
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
                  <th className="pb-3 text-right">{isAr ? 'الدور' : 'Queue'}</th>
                  <th className="pb-3 text-right">{isAr ? 'المريض' : 'Patient'}</th>
                  <th className="pb-3 text-right">{isAr ? 'اليوم' : 'Date'}</th>
                  <th className="pb-3 text-right">{isAr ? 'المقعد / الوقت' : 'Seat / Time'}</th>
                  <th className="pb-3 text-right">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="pb-3 text-left">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-950/40 text-slate-200">
                {paginatedAppointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-teal-950/10 transition-colors">
                    <td className="py-4">
                      <span className="px-2 py-1 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold font-mono text-xs">
                        {appt.queue_code || getQueueCode(appt.date, appt.timeSlot, scheduleConfig, bookings)}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{appt.patientName}</span>
                        {appt.appointment_type === 'follow_up' && (
                          <span
                            className="px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-[9px] border border-cyan-500/20 font-bold whitespace-nowrap"
                            title={isAr ? `متابعة لموعد سابق` : `Follow-up appointment`}
                          >
                            {isAr ? 'متابعة' : 'Follow-Up'}
                          </span>
                        )}
                        {hasFollowUpLink(appt) && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setTimelineApptId(timelineApptId === appt.id ? null : appt.id); }}
                            className="p-0.5 rounded hover:bg-teal-950/30 transition-colors relative"
                            title={isAr ? 'عرض سلسلة المواعيد' : 'View appointment chain'}
                          >
                            <svg className="w-3.5 h-3.5 text-cyan-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        <PatientPhoneLink phone={appt.mobileNumber} isAr={isAr} />
                      </div>
                      {/* Timeline Popover */}
                      {timelineApptId === appt.id && (
                        <div className="absolute z-40 mt-1 p-3 rounded-xl bg-[#09151e] border border-cyan-500/20 shadow-xl min-w-[220px] max-w-[280px] animate-in fade-in zoom-in-95 duration-150">
                          <div className="text-[10px] font-bold text-cyan-400 mb-2 border-b border-cyan-950/40 pb-1">
                            {isAr ? 'سلسلة المواعيد المرتبطة' : 'Linked Appointment Chain'}
                          </div>
                          <div className="space-y-1.5 max-h-[150px] overflow-y-auto custom-scrollbar">
                            {getFollowUpChain(appt.id).map((chainAppt, idx) => (
                              <div key={chainAppt.id} className={`flex items-center gap-2 text-[10px] p-1.5 rounded-lg ${chainAppt.id === appt.id ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-slate-950/30'}`}>
                                <span className="font-mono text-cyan-400 font-bold min-w-[32px]">{chainAppt.queue_code || '—'}</span>
                                <span className="text-slate-300">{chainAppt.date}</span>
                                <span className="text-slate-400">{formatPeriodTime(chainAppt.timeSlot)}</span>
                                {chainAppt.appointment_type === 'follow_up' && <span className="text-cyan-400 text-[8px]">{isAr ? 'متابعة' : 'F/U'}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-4">{appt.date}</td>
                    <td className="py-4 text-teal-300 font-bold">
                      {formatPeriodTime(appt.timeSlot)}
                    </td>
                    <td className="py-4">{getStatusBadge(appt)}</td>
                    <td className="py-4 text-left">
                      <div className="inline-flex gap-2">
                        {showConfirmBtn(appt) && (
                          <button
                            onClick={() => confirmAttendance(appt.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold text-xs transition-colors"
                          >
                            {isAr ? 'تأكيد الحضور' : 'Confirm'}
                          </button>
                        )}
                        {showMarkAttendedBtn(appt) && (
                          <button
                            onClick={() => markAttended(appt.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold text-xs transition-colors"
                          >
                            {isAr ? 'تسجيل حضور' : 'Mark Attended'}
                          </button>
                        )}
                        {showMarkNoShowBtn(appt) && (
                          <button
                            onClick={() => markNoShow(appt.id)}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-950 hover:bg-rose-950/40 text-xs transition-colors font-semibold"
                          >
                            {isAr ? 'عدم حضور' : 'No Show'}
                          </button>
                        )}
                        {showRescheduleBtn(appt) && (
                          <button
                            onClick={() => handleOpenReschedule(appt)}
                            className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-950 hover:bg-[#0d2a2f] hover:text-teal-350 text-xs transition-colors font-semibold"
                          >
                            {isAr ? 'نقل الموعد' : 'Reschedule'}
                          </button>
                        )}
                        {showFollowUpBtn(appt) && (
                          <button
                            onClick={() => handleOpenFollowUp(appt)}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-950 hover:bg-cyan-950/40 text-xs transition-colors font-semibold"
                          >
                            {isAr ? 'حجز متابعة' : 'Follow-Up'}
                          </button>
                        )}
                        {showCancelBtn(appt) && (
                          <button
                            onClick={() => cancelAppointment(appt.id)}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-950 hover:bg-rose-950/40 text-xs transition-colors font-semibold"
                          >
                            {isAr ? 'إلغاء الموعد' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Section */}
        {sortedActiveBookings.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-teal-950/30 text-xs text-slate-400">
            {/* Status text & Page size selector */}
            <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
              <span>
                {isAr 
                  ? `عرض ${totalAppointmentsCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}–${Math.min(currentPage * pageSize, totalAppointmentsCount)} من ${totalAppointmentsCount} حجز` 
                  : `Showing ${totalAppointmentsCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}–${Math.min(currentPage * pageSize, totalAppointmentsCount)} of ${totalAppointmentsCount} appointments`}
              </span>
              
              <div className="flex items-center gap-1.5 ml-2 border-l border-teal-950/40 pl-2">
                <span>{isAr ? 'حجم الصفحة:' : 'Page size:'}</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-[#09151e] border border-teal-950/60 rounded px-2 py-1 text-slate-200 outline-none focus:border-teal-500 text-[11px] font-bold"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>

            {/* Page navigation controls */}
            <div className="flex items-center justify-center gap-1">
              {/* Previous Button */}
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 rounded-lg border border-teal-950 bg-slate-950/30 text-slate-400 hover:text-white hover:border-teal-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>◀</span>
                <span>{isAr ? 'السابق' : 'Previous'}</span>
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1 mx-2">
                {getPageNumbers().map((p, i) => {
                  if (p === '...') {
                    return <span key={`dots-${i}`} className="px-2 text-slate-650 font-bold select-none">...</span>;
                  }
                  const isActive = currentPage === p;
                  return (
                    <button
                      key={`page-${p}`}
                      type="button"
                      onClick={() => setCurrentPage(p as number)}
                      className={`w-7 h-7 rounded-lg border font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-gradient-to-r from-teal-500 to-emerald-400 border-teal-300 text-[#070e12]' 
                          : 'border-teal-950 bg-[#09151e]/40 text-slate-400 hover:border-teal-500/20 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1.5 rounded-lg border border-teal-950 bg-slate-950/30 text-slate-400 hover:text-white hover:border-teal-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>{isAr ? 'التالي' : 'Next'}</span>
                <span>▶</span>
              </button>
            </div>
          </div>
        )}

        {/* Cancelled Log Teaser */}
        {showCancelledLog && cancelledBookings.length > 0 && (
          <div className="pt-4 border-t border-teal-950/40 space-y-2">
            <h4 className="text-xs font-bold text-slate-400">
              {isAr ? 'السجل التاريخي للإلغاءات الأخيرة' : 'Log of Recent Cancellations'}
            </h4>
            <div className="space-y-1">
              {cancelledBookings.slice(0, 3).map((cb) => (
                <div key={cb.id} className="flex justify-between items-center text-xs bg-rose-950/5 border border-rose-950/20 p-2 rounded-xl text-slate-400">
                  <span>
                    {cb.patientName} (<PatientPhoneLink phone={cb.mobileNumber} isAr={isAr} />)
                  </span>
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
      {showWhatsAppHub && (
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
                    {evt.patientName} (<PatientPhoneLink phone={evt.phone} isAr={isAr} />)
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
      )}
    </div>

    {/* Reschedule Modal Overlay */}
      {reschedulingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-right" dir="rtl">
          {/* Dark glass backdrop */}
          <div onClick={() => setReschedulingBooking(null)} className="absolute inset-0 bg-[#04080b]/95 backdrop-blur-md" />
          
          {/* Modal Container */}
          <div className="relative w-full max-w-lg glass-panel rounded-3xl overflow-hidden shadow-2xl z-10 border border-teal-500/20 text-right animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-5 border-b border-teal-950/60 flex items-center justify-between">
              <button 
                type="button"
                onClick={() => setReschedulingBooking(null)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <h3 className="text-lg font-black text-white font-bold">
                {isAr ? 'نقل موعد المريض' : 'Reschedule Patient Appointment'}
              </h3>
            </div>

            {/* Content Form */}
            <form onSubmit={handleRescheduleSubmit} className="p-6 space-y-5">
              {rescheduleError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-400 text-center">
                  ⚠️ {rescheduleError}
                </div>
              )}

              {/* Patient Summary Card */}
              <div className="p-4 rounded-2xl bg-[#09151e] border border-teal-950/60 space-y-2 text-xs sm:text-sm text-slate-300">
                <div className="flex justify-between items-center pb-2 border-b border-teal-950/20">
                  <span className="text-slate-500">{isAr ? 'اسم المريض:' : 'Patient Name:'}</span>
                  <span className="font-bold text-white">{reschedulingBooking.patientName}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-teal-950/20">
                  <span className="text-slate-500">{isAr ? 'رقم الهاتف:' : 'Phone Number:'}</span>
                  <PatientPhoneLink phone={reschedulingBooking.mobileNumber} isAr={isAr} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">{isAr ? 'الموعد الحالي:' : 'Current Appointment:'}</span>
                  <span className="font-bold text-amber-400 font-mono">
                    {reschedulingBooking.date} | {formatPeriodTime(reschedulingBooking.timeSlot)}
                  </span>
                </div>
              </div>

              {/* Step 1: Select New Date */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block text-right">
                  {isAr ? 'اختر اليوم الجديد:' : 'Select New Date:'}
                </label>
                <select
                  value={selectedRescheduleDate}
                  onChange={(e) => {
                    setSelectedRescheduleDate(e.target.value);
                    setSelectedRescheduleTime(null);
                  }}
                  className="w-full bg-[#09151e] border border-teal-950 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 transition-colors cursor-pointer text-right font-bold"
                >
                  {rescheduleDays.map((date) => {
                    const dateStr = formatDateOnly(date);
                    const dayOfWeek = date.getDay();
                    const isWorkingDay = scheduleConfig?.workingDays?.includes(dayOfWeek) ?? true;
                    
                    return (
                      <option key={dateStr} value={dateStr} disabled={!isWorkingDay} className="bg-slate-950 text-white">
                        {dateStr} - {getDayName(date)} ({isWorkingDay ? (isAr ? 'متاح' : 'Available') : (isAr ? 'مغلق' : 'Closed')})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Step 2: Select New Time Slot Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block text-right">
                  {isAr ? 'اختر المقعد / الموعد الجديد:' : 'Select New Seat / Time Slot:'}
                </label>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[180px] overflow-y-auto p-1 custom-scrollbar border border-teal-950 bg-[#060d13]/55 rounded-2xl" dir="ltr">
                  {renderRescheduleSlots()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex gap-3" dir="rtl">
                <button
                  type="button"
                  onClick={() => setReschedulingBooking(null)}
                  className="flex-1 py-3.5 rounded-xl border border-teal-950/80 bg-transparent text-slate-300 font-bold text-sm hover:bg-slate-900 hover:text-white transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={rescheduleLoading || !selectedRescheduleTime}
                  className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-[#070e12] font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rescheduleLoading ? (
                    <div className="w-5 h-5 border-2 border-[#070e12] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{isAr ? 'تأكيد نقل الموعد' : 'Confirm Reschedule'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
         </div>
       )}

    {/* Follow-Up Creation Modal */}
    {followUpParent && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-right" dir="rtl">
        {/* Dark glass backdrop */}
        <div onClick={() => !followUpLoading && setFollowUpParent(null)} className="absolute inset-0 bg-[#04080b]/95 backdrop-blur-md" />

        {/* Modal Container */}
        <div className="relative w-full max-w-lg glass-panel rounded-3xl overflow-hidden shadow-2xl z-10 border border-cyan-500/20 text-right animate-in fade-in zoom-in-95 duration-200">

          {/* Header */}
          <div className="p-5 border-b border-cyan-950/60 flex items-center justify-between">
            <button
              type="button"
              onClick={() => !followUpLoading && setFollowUpParent(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-lg font-black text-white">
              {isAr ? 'حجز موعد متابعة' : 'Book Follow-Up Appointment'}
            </h3>
          </div>

          {/* Success State */}
          {followUpSuccess ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-white font-bold text-lg">
                {isAr ? 'تم حجز موعد المتابعة بنجاح!' : 'Follow-Up Booked Successfully!'}
              </h4>
              <p className="text-sm text-slate-400">
                {isAr ? 'تم إرسال إشعار واتساب للمريض.' : 'WhatsApp notification sent to patient.'}
              </p>
            </div>
          ) : (
            /* Form Content */
            <form onSubmit={handleFollowUpSubmit} className="p-6 space-y-5">
              {followUpError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-400 text-center">
                  ⚠️ {followUpError}
                </div>
              )}

              {/* Parent Appointment Summary */}
              <div className="p-4 rounded-2xl bg-[#09151e] border border-cyan-950/60 space-y-2 text-xs sm:text-sm text-slate-300">
                <div className="flex justify-between items-center pb-2 border-b border-cyan-950/20">
                  <span className="text-slate-500">{isAr ? 'اسم المريض:' : 'Patient:'}</span>
                  <span className="font-bold text-white">{followUpParent.patientName}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-cyan-950/20">
                  <span className="text-slate-500">{isAr ? 'الموعد الأصلي:' : 'Original Appointment:'}</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {followUpParent.date} | {formatPeriodTime(followUpParent.timeSlot)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">{isAr ? 'رمز الدور الأصلي:' : 'Original Queue:'}</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {followUpParent.queue_code || '—'}
                  </span>
                </div>
              </div>

              {/* Date Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block text-right">
                  {isAr ? 'تاريخ موعد المتابعة:' : 'Follow-Up Date:'}
                </label>
                <select
                  value={followUpDate}
                  onChange={(e) => { setFollowUpDate(e.target.value); setFollowUpTime(null); }}
                  className="w-full bg-[#09151e] border border-cyan-950 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer text-right font-bold"
                >
                  {rescheduleDays.map((date) => {
                    const dateStr = formatDateOnly(date);
                    const dayOfWeek = date.getDay();
                    const isWorkingDay = scheduleConfig?.workingDays?.includes(dayOfWeek) ?? true;
                    return (
                      <option key={dateStr} value={dateStr} disabled={!isWorkingDay} className="bg-slate-950 text-white">
                        {dateStr} - {getDayName(date)} ({isWorkingDay ? (isAr ? 'متاح' : 'Available') : (isAr ? 'مغلق' : 'Closed')})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Time Slot Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block text-right">
                  {isAr ? 'اختر وقت المتابعة:' : 'Select Follow-Up Time:'}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[180px] overflow-y-auto p-1 custom-scrollbar border border-cyan-950 bg-[#060d13]/55 rounded-2xl" dir="ltr">
                  {(() => {
                    const slots = generateTimeSlotsForDate(followUpDate);
                    if (slots.length === 0) {
                      return (
                        <div className="col-span-full text-center py-8 text-slate-500 text-xs">
                          {isAr ? 'العيادة مغلقة هذا اليوم' : 'Clinic Closed'}
                        </div>
                      );
                    }
                    return slots.map((slot) => {
                      const isSelected = followUpTime === slot.time;
                      const isFull = slot.isBooked;
                      const isExpired = slot.isExpired;
                      const isBlocked = slot.isBlocked;
                      let btnCls = '';
                      if (isExpired) {
                        btnCls = 'bg-slate-950/20 border-slate-900/20 text-slate-700 cursor-not-allowed opacity-35';
                      } else if (isBlocked) {
                        btnCls = 'bg-slate-900/40 border-slate-900 text-slate-500 cursor-not-allowed opacity-60';
                      } else if (isFull) {
                        btnCls = 'bg-rose-950/15 border-rose-900/50 text-rose-500/70 cursor-not-allowed';
                      } else if (isSelected) {
                        btnCls = 'bg-gradient-to-r from-cyan-500 to-teal-400 border-cyan-300 text-[#070e12] font-black scale-[1.02] shadow-md shadow-cyan-500/15';
                      } else {
                        btnCls = 'bg-[#09151e] border-cyan-950/60 text-slate-200 hover:border-cyan-500 hover:bg-cyan-950/20';
                      }
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={isExpired || isFull || isBlocked}
                          onClick={() => setFollowUpTime(slot.time)}
                          title={isBlocked ? (isAr ? 'هذا الموعد غير متاح' : 'This slot is unavailable') : undefined}
                          className={`py-2.5 px-1.5 rounded-xl border flex flex-col items-center justify-center transition-all ${btnCls}`}
                        >
                          <span className="font-bold text-xs">{formatPeriodTime(slot.time)}</span>
                          <span className="text-[8px] opacity-80 mt-0.5">
                            {isBlocked ? (isAr ? 'غير متاح' : 'Unavailable') : isFull ? (isAr ? 'محجوز' : 'Full') : (isAr ? 'شاغر' : 'Free')}
                          </span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Fee Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block text-right">
                  {isAr ? 'قيمة الكشف:' : 'Consultation Fee:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFollowUpFeeMode('free')}
                    className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all ${
                      followUpFeeMode === 'free'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-[#09151e] border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {isAr ? 'مجاني (0)' : 'Free (0)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowUpFeeMode('discounted')}
                    className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all ${
                      followUpFeeMode === 'discounted'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        : 'bg-[#09151e] border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {isAr ? 'مخفض' : 'Discounted'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowUpFeeMode('full')}
                    className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all ${
                      followUpFeeMode === 'full'
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                        : 'bg-[#09151e] border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {isAr ? `كامل (${doctorProfile?.consultationFee ?? 0})` : `Full (${doctorProfile?.consultationFee ?? 0})`}
                  </button>
                </div>
                {followUpFeeMode === 'discounted' && (
                  <input
                    type="number"
                    min="0"
                    value={followUpCustomFee}
                    onChange={(e) => setFollowUpCustomFee(e.target.value)}
                    placeholder={isAr ? 'أدخل المبلغ المخفض...' : 'Enter discounted amount...'}
                    className="w-full bg-[#09151e] border border-amber-950/60 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors text-right"
                  />
                )}
              </div>

              {/* Note Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block text-right">
                  {isAr ? 'ملاحظة (اختياري):' : 'Note (optional):'}
                </label>
                <input
                  type="text"
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder={isAr ? 'مثال: مراجعة نتائج التحاليل' : 'e.g. Review lab results'}
                  className="w-full bg-[#09151e] border border-cyan-950/60 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors text-right"
                />
              </div>

              {/* Fee Summary */}
              <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex justify-between items-center text-sm">
                <span className="text-cyan-400 font-bold">
                  {getFollowUpFee() === 0 ? (isAr ? 'مجاني' : 'Free') : `${getFollowUpFee()} ${isAr ? 'جنيه' : 'EGP'}`}
                </span>
                <span className="text-slate-400 text-xs">{isAr ? 'قيمة الكشف:' : 'Fee:'}</span>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex gap-3" dir="rtl">
                <button
                  type="button"
                  onClick={() => setFollowUpParent(null)}
                  disabled={followUpLoading}
                  className="flex-1 py-3.5 rounded-xl border border-cyan-950/80 bg-transparent text-slate-300 font-bold text-sm hover:bg-slate-900 hover:text-white transition-colors disabled:opacity-50"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={followUpLoading || !followUpTime}
                  className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-[#070e12] font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {followUpLoading ? (
                    <div className="w-5 h-5 border-2 border-[#070e12] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{isAr ? 'تأكيد حجز المتابعة' : 'Confirm Follow-Up'}</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )}
    </>
  );
}
