'use client';

import React from 'react';
import { useBooking } from '../BookingContext';

interface RescheduleAlertProps {
  onTriggerReschedule: () => void;
  onClear: () => void;
}

export default function RescheduleAlert({ onTriggerReschedule, onClear }: RescheduleAlertProps) {
  const { language, activeBooking, cancelAppointment } = useBooking();
  const isAr = language === 'ar';

  if (!activeBooking || activeBooking.status === 'cancelled' || !activeBooking.timeSlot || !activeBooking.date || !activeBooking.patientName) return null;

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

  const handleCancelClick = () => {
    if (window.confirm(isAr ? 'هل أنت متأكد من رغبتك في إلغاء هذا الحجز المجدول؟' : 'Are you sure you want to cancel this booking?')) {
      cancelAppointment(activeBooking.id);
      onClear();
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border border-amber-500/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-right shadow-lg shadow-amber-500/5 animate-in slide-in-from-top-4 duration-300">
      
      {/* Content */}
      <div className="flex gap-3 items-start">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-400 mt-0.5">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <div className="space-y-1">
          <h4 className="text-base font-bold text-amber-300">
            {isAr ? 'لديك حجز موعد نشط ومؤكد حالياً!' : 'You have an active confirmed booking!'}
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {isAr ? (
              <>
                المريض: <span className="font-bold text-white">{activeBooking.patientName}</span> | 
                اليوم: <span className="font-bold text-teal-300">{activeBooking.date}</span> | 
                الساعة: <span className="font-bold text-teal-300">{formatPeriodTime(activeBooking.timeSlot)}</span>
              </>
            ) : (
              <>
                Patient: <span className="font-bold text-white">{activeBooking.patientName}</span> | 
                Date: <span className="font-bold text-teal-300">{activeBooking.date}</span> | 
                Time: <span className="font-bold text-teal-300">{formatPeriodTime(activeBooking.timeSlot)}</span>
              </>
            )}
          </p>
          <p className="text-[10px] text-slate-400">
            {isAr 
              ? 'توجيه: لنقل موعدك وتغييره، قم ببساطة باختيار أي مقعد/خانة زمنية شاغرة في الأسفل وسيقوم النظام بنقل حجزك تلقائياً.' 
              : 'Tip: To reschedule, simply select any available seat/slot in the grid below and your booking will transfer.'}
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2 w-full md:w-auto">
        <button
          onClick={handleCancelClick}
          className="flex-1 md:flex-none px-4 py-2 text-xs font-semibold rounded-xl text-rose-400 border border-rose-950 bg-rose-950/20 hover:bg-rose-950/40 hover:text-rose-300 transition-colors"
        >
          {isAr ? 'إلغاء الموعد' : 'Cancel Booking'}
        </button>
        <button
          onClick={onTriggerReschedule}
          className="flex-[2] md:flex-none px-5 py-2.5 text-xs font-bold rounded-xl bg-amber-500 text-amber-950 shadow-md shadow-amber-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          {isAr ? 'نقل الموعد المجدول' : 'Relocate Slot'}
        </button>
      </div>

    </div>
  );
}
