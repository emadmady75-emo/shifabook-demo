'use client';

import React from 'react';
import { useBooking, TimeSlot, PatientBooking } from '../BookingContext';

interface BookingGridProps {
  selectedDate: string;
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  isRescheduling?: boolean;
  activeBooking?: PatientBooking | null;
}

// Period icons inline SVG paths
const SunIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
  </svg>
);

const SunsetIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3M5.636 5.636l.707.707M18.364 18.364l.707.707M5.636 18.364l.707-.707M17.657 6.343l.707-.707M2 12h20M12 6a6 6 0 000 12" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

export default function BookingGrid({ selectedDate, selectedTime, onSelectTime, isRescheduling = false, activeBooking }: BookingGridProps) {
  const { language, generateTimeSlotsForDate, isHydrated, isLoadingAvailability } = useBooking();
  const isAr = language === 'ar';

  if (!isHydrated || isLoadingAvailability) {
    return (
      <div className="space-y-5 text-right animate-pulse">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-teal-950/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-24 h-7 rounded-xl bg-teal-950/40" />
            <div className="w-20 h-7 rounded-xl bg-teal-950/40" />
          </div>
          <div className="space-y-2">
            <div className="w-48 h-6 bg-teal-950/50 rounded-lg ml-auto" />
            <div className="w-64 h-3 bg-slate-900/50 rounded ml-auto" />
          </div>
        </div>
        <div className="h-64 rounded-3xl bg-teal-950/20" />
      </div>
    );
  }

  const slots = generateTimeSlotsForDate(selectedDate);

  const morningSlots = slots.filter(s => parseInt(s.time.split(':')[0]) < 12);
  const afternoonSlots = slots.filter(s => { const h = parseInt(s.time.split(':')[0]); return h >= 12 && h < 15; });
  const eveningSlots = slots.filter(s => parseInt(s.time.split(':')[0]) >= 15);

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':');
    const hr = parseInt(h);
    const suffix = isAr ? (hr >= 12 ? 'م' : 'ص') : (hr >= 12 ? 'PM' : 'AM');
    const displayHr = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
    return `${displayHr}:${m}${isAr ? '' : ' '}${suffix}`;
  };

  const availableCount = slots.filter(s => !s.isBooked && !s.isExpired).length;
  const bookedCount = slots.filter(s => s.isBooked).length;

  const renderPeriodSection = (
    periodSlots: TimeSlot[],
    labelAr: string,
    labelEn: string,
    rowCode: string,
    icon: React.ReactNode,
    colorClass: string,
  ) => {
    if (periodSlots.length === 0) return null;

    const periodAvailable = periodSlots.filter(s => !s.isBooked && !s.isExpired).length;

    return (
      <div className="space-y-3">
        {/* Period header */}
        <div className={`flex items-center justify-between py-2 px-3 rounded-xl bg-slate-900/40 border border-teal-950/50`}>
          <span className="text-[10px] text-slate-500">
            {periodAvailable} {isAr ? 'مقعد شاغر' : 'available'}
          </span>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-200">
              {isAr ? labelAr : labelEn}
            </h4>
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorClass} border`}>
              {icon}
            </span>
          </div>
        </div>

        {/* Seat cards grid — 4 on mobile, more on desktop */}
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
          {periodSlots.map((slot, index) => {
            const isSelected = selectedTime === slot.time;
            const remaining = slot.capacity - slot.bookings.length;
            const isFull = slot.isBooked;
            const isExpired = slot.isExpired;
            const isBlocked = slot.isBlocked;
            const seatId = `${rowCode}${index + 1}`;

            // Highlight the current active booking slot under rescheduling mode
            const isCurrentSlot = !!(isRescheduling && activeBooking && selectedDate === activeBooking.date && slot.time === activeBooking.timeSlot);

            let cardCls = '';
            if (isCurrentSlot) {
              cardCls = 'bg-amber-500/10 border-2 border-amber-500/80 text-amber-300 cursor-not-allowed shadow-md shadow-amber-500/10 scale-[1.03]';
            } else if (isExpired) {
              cardCls = 'bg-slate-950/20 border-slate-900/30 text-slate-700 cursor-not-allowed opacity-35';
            } else if (isBlocked) {
              cardCls = 'bg-slate-900/40 border-slate-900 text-slate-500 cursor-not-allowed opacity-60';
            } else if (isFull) {
              cardCls = 'bg-rose-950/15 border-rose-900/50 text-rose-500/70 cursor-not-allowed';
            } else if (isSelected) {
              cardCls = 'bg-gradient-to-b from-teal-400 to-emerald-500 border-teal-300 text-[#04080b] shadow-xl shadow-teal-400/30 scale-[1.06] z-10 glow-active';
            } else {
              cardCls = 'bg-[#0b1820]/60 border-teal-900/50 text-slate-200 hover:border-teal-400/70 hover:bg-teal-950/25 hover:shadow-md hover:shadow-teal-500/10 hover:scale-[1.03]';
            }

            return (
              <button
                key={slot.time}
                onClick={() => !isExpired && !isFull && !isCurrentSlot && !isBlocked && onSelectTime(slot.time)}
                disabled={isExpired || isFull || isCurrentSlot || isBlocked}
                title={isBlocked ? (isAr ? 'هذا الموعد غير متاح' : 'This slot is unavailable') : undefined}
                aria-label={`${isAr ? 'مقعد' : 'Seat'} ${seatId} — ${formatTime(slot.time)}`}
                aria-pressed={isSelected}
                className={`relative py-3 px-1.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all duration-200 seat-slot ${cardCls}`}
              >
                {/* Seat code */}
                <span className={`text-[9px] font-black tracking-widest ${isCurrentSlot ? 'text-amber-500/60' : isSelected ? 'text-teal-950/70' : 'text-teal-500/60'}`}>
                  {seatId}
                </span>

                {/* Seat icon */}
                <svg
                  className={`w-6 h-6 ${isCurrentSlot ? 'text-amber-400' : isSelected ? 'text-[#04080b]' : isBlocked ? 'text-slate-600' : isFull ? 'text-rose-600/50' : 'text-teal-400/60'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>

                {/* Time label — always visible, clear */}
                <span className={`text-[11px] font-black leading-none tracking-tight text-center ${isCurrentSlot ? 'text-amber-300' : isSelected ? 'text-[#04080b]' : isBlocked ? 'text-slate-500' : isExpired ? 'text-slate-600 line-through' : 'text-slate-100'}`}>
                  {formatTime(slot.time)}
                </span>

                {/* Status badge */}
                {!isExpired && (
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold ${
                    isCurrentSlot
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35'
                      : isSelected
                      ? 'bg-teal-950/25 text-teal-950'
                      : isBlocked
                      ? 'bg-slate-900/50 text-slate-400 border border-slate-850'
                      : isFull
                      ? 'bg-rose-500/15 text-rose-400'
                      : 'bg-teal-500/15 text-teal-300'
                  }`}>
                    {isCurrentSlot
                      ? (isAr ? 'موعدك الحالي' : 'Current')
                      : isBlocked
                      ? (isAr ? 'غير متاح' : 'Unavailable')
                      : isFull
                      ? (isAr ? 'محجوز' : 'Full')
                      : isSelected
                      ? (isAr ? '✓ محدد' : '✓ Selected')
                      : `${remaining}/${slot.capacity}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 text-right">

      {/* Grid header with step indicator + live summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-teal-950/60 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Available count badge */}
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            {availableCount} {isAr ? 'مقعد شاغر' : 'available'}
          </span>
          {bookedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              {bookedCount} {isAr ? 'محجوز' : 'booked'}
            </span>
          )}
        </div>
        <div className="space-y-0.5 text-right">
          <h3 className="text-lg font-black text-white flex items-center gap-2 justify-end">
            <span>{isAr ? 'اختر مقعد الكشف' : 'Select a Seat'}</span>
            <span className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 text-xs font-black">٢</span>
          </h3>
          <p className="text-[11px] text-slate-500">
            {isAr ? 'كل مقعد = جلسة زمنية مع الطبيب' : 'Each seat = a dedicated time slot with the doctor'}
          </p>
        </div>
      </div>

      {/* Legend — compact single row */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-400 justify-end">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-teal-950 border border-teal-800 inline-block" />{isAr ? 'شاغر' : 'Available'}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-gradient-to-b from-teal-400 to-emerald-500 inline-block" />{isAr ? 'مختار' : 'Selected'}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-rose-950/30 border border-rose-900 inline-block" />{isAr ? 'محجوز' : 'Booked'}</span>
        <span className="flex items-center gap-1.5 opacity-40"><span className="w-3 h-3 rounded-md bg-slate-900 border border-slate-800 inline-block" />{isAr ? 'منتهي' : 'Expired'}</span>
      </div>

      {/* Grid body */}
      {slots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-[#0a141b]/60 border border-teal-950/40 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-slate-300 text-sm">
              {isAr ? 'العيادة مغلقة هذا اليوم' : 'Clinic Closed Today'}
            </p>
            <p className="text-slate-500 text-xs mt-1">
              {isAr ? 'اختر يوماً آخر من القائمة أعلاه' : 'Please select a different date above'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 p-3 sm:p-5 rounded-3xl bg-[#080f15]/70 border border-teal-950/40">
          {/* Clinic front marker */}
          <div className="flex items-center gap-3 justify-center">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-teal-500/20 to-transparent" />
            <span className="text-[10px] font-bold text-teal-500/50 uppercase tracking-[0.15em] whitespace-nowrap">
              {isAr ? '▲ مكتب الاستقبال' : '▲ Reception Desk'}
            </span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-teal-500/20 to-transparent" />
          </div>

          {renderPeriodSection(
            morningSlots,
            'الصباح (قبل الظهر)',
            'Morning',
            'A',
            <SunIcon />,
            'bg-amber-500/10 border-amber-500/20 text-amber-400'
          )}
          {renderPeriodSection(
            afternoonSlots,
            'الظهيرة',
            'Afternoon',
            'B',
            <SunsetIcon />,
            'bg-orange-500/10 border-orange-500/20 text-orange-400'
          )}
          {renderPeriodSection(
            eveningSlots,
            'المساء',
            'Evening',
            'C',
            <MoonIcon />,
            'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
          )}
        </div>
      )}

      {/* Prompt to confirm when time is selected */}
      {selectedTime && (
        <div className="mt-2 p-3.5 rounded-2xl bg-teal-950/25 border border-teal-500/25 flex items-center justify-between text-sm animate-in slide-in-from-bottom-2 duration-200">
          <div className="text-teal-300 font-black flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {formatTime(selectedTime)}
          </div>
          <span className="text-xs text-slate-400">
            {isAr ? 'انقر "تأكيد" في النافذة المنبثقة أعلاه' : 'Confirm in the form above'}
          </span>
        </div>
      )}
    </div>
  );
}
