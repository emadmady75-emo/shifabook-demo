'use client';

import React from 'react';
import { useBooking } from '../BookingContext';

interface DaySelectorProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export default function DaySelector({ selectedDate, onSelectDate }: DaySelectorProps) {
  const { language, scheduleConfig } = useBooking();
  const isAr = language === 'ar';

  const days = Array.from({ length: 10 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const getDayName = (date: Date) =>
    date.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { weekday: 'short' });

  const getMonthName = (date: Date) =>
    date.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { month: 'short' });

  const formatDateStr = (date: Date) => date.toISOString().split('T')[0];

  const isToday = (date: Date) =>
    date.toDateString() === new Date().toDateString();

  return (
    <div className="space-y-5 text-right">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-lg font-black text-white flex items-center gap-2 justify-end">
          <span>{isAr ? 'اختر يوم الموعد' : 'Choose a Date'}</span>
          <span className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 text-xs font-black">١</span>
        </h3>
        <p className="text-[11px] text-slate-500">
          {isAr ? 'الأيام المظللة مواعيد عمل فعلية للعيادة' : 'Highlighted days are actual clinic working days'}
        </p>
      </div>

      {/* Pill-style horizontal day carousel */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
        {days.map((date) => {
          const dateStr = formatDateStr(date);
          const isSelected = dateStr === selectedDate;
          const dayOfWeek = date.getDay();
          const isWorkingDay = scheduleConfig.workingDays.includes(dayOfWeek);
          const today = isToday(date);

          return (
            <button
              key={dateStr}
              onClick={() => isWorkingDay && onSelectDate(dateStr)}
              disabled={!isWorkingDay}
              aria-label={`${getDayName(date)} ${date.getDate()} ${getMonthName(date)}`}
              aria-pressed={isSelected}
              className={`
                relative flex-shrink-0 w-[68px] py-3 rounded-2xl border
                flex flex-col items-center gap-1 transition-all duration-200
                ${isSelected
                  ? 'bg-gradient-to-b from-teal-500 to-teal-600 border-teal-400 text-[#070e12] shadow-lg shadow-teal-500/30 scale-[1.05]'
                  : isWorkingDay
                  ? 'bg-teal-950/15 border-teal-900/40 text-slate-200 hover:border-teal-500/50 hover:bg-teal-950/25 hover:scale-[1.02]'
                  : 'bg-slate-950/10 border-slate-900/20 text-slate-600 cursor-not-allowed opacity-40'}
              `}
            >
              {/* Today indicator dot */}
              {today && !isSelected && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-teal-400" />
              )}

              {/* Short day name */}
              <span className={`text-[10px] font-bold tracking-wide ${isSelected ? 'text-teal-950/80' : 'text-slate-500'}`}>
                {getDayName(date)}
              </span>

              {/* Date number — prominent */}
              <span className="text-xl font-black leading-none tracking-tight">
                {date.getDate()}
              </span>

              {/* Month */}
              <span className={`text-[10px] font-medium ${isSelected ? 'text-teal-950/70' : 'text-slate-500'}`}>
                {getMonthName(date)}
              </span>

              {/* Closed label */}
              {!isWorkingDay && (
                <span className="text-[8px] text-slate-600 font-semibold mt-0.5">
                  {isAr ? 'مغلق' : 'Closed'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date summary line */}
      <div className="flex items-center justify-end gap-2 text-xs text-slate-400 border-t border-teal-950/40 pt-3">
        <span className="font-semibold text-slate-300">{selectedDate}</span>
        <span>{isAr ? 'التاريخ المحدد:' : 'Selected:'}</span>
      </div>
    </div>
  );
}
