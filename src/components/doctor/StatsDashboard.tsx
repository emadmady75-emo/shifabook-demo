'use client';

import React from 'react';
import { useBooking } from '../BookingContext';
import { formatDateOnly } from '@/lib/dates';

export default function StatsDashboard() {
  const { language, bookings, scheduleConfig } = useBooking();
  const isAr = language === 'ar';

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

  const activeBookings   = bookings.filter(b => b.status !== 'cancelled');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');

  // Treat past active appointments (pending/confirmed) or future confirmed appointments as collected/completed revenue.
  const confirmedRevenue = activeBookings
    .filter(b => isAppointmentPast(b.date, b.timeSlot) || b.status === 'confirmed')
    .reduce((s, b) => s + b.price, 0);

  // Treat future pending appointments as pending/pipeline revenue.
  const pendingRevenue = activeBookings
    .filter(b => !isAppointmentPast(b.date, b.timeSlot) && b.status === 'pending')
    .reduce((s, b) => s + b.price, 0);

  const totalGrossRevenue = confirmedRevenue + pendingRevenue;

  const totalWeeklyCapacity = 16 * scheduleConfig.workingDays.length * scheduleConfig.capacityPerSlot;
  const occupancyPct = totalWeeklyCapacity > 0
    ? Math.min(Math.round((activeBookings.length / totalWeeklyCapacity) * 100), 100)
    : 0;

  // Derive occupancy colour threshold
  const occupancyColor = occupancyPct >= 75 ? 'from-emerald-400 to-teal-400'
    : occupancyPct >= 40 ? 'from-teal-400 to-cyan-400'
    : 'from-amber-400 to-orange-400';

  // Attendance Rate calculation:
  // Formula: attended_appointments / (total_completed + total_no_show + total_cancelled_after_confirmation)
  const attendedAppts = bookings.filter(
    b => b.status === 'attended' || (b.status !== 'cancelled' && b.status !== 'no_show' && isAppointmentPast(b.date, b.timeSlot))
  ).length;

  const totalCompleted = attendedAppts;
  const totalNoShow = bookings.filter(b => b.status === 'no_show').length;
  const totalCancelledAfterConfirm = bookings.filter(
    b => b.status === 'cancelled' && (b.confirmed_by !== null || b.confirmed_at !== null)
  ).length;

  const attendanceDenominator = totalCompleted + totalNoShow + totalCancelledAfterConfirm;
  const attendanceRate = attendanceDenominator > 0
    ? Math.round((attendedAppts / attendanceDenominator) * 100)
    : 100;

  // Weekly Revenue Growth calculation:
  const getWeekRanges = () => {
    const ranges = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (let i = 5; i >= 0; i--) {
      const start = new Date(today);
      start.setDate(today.getDate() - (i * 7 + 6));
      const end = new Date(today);
      end.setDate(today.getDate() - (i * 7));

      ranges.push({
        startStr: formatDateOnly(start),
        endStr: formatDateOnly(end),
        labelAr: i === 0 
          ? 'الأسبوع الحالي' 
          : i === 1 
            ? 'الأسبوع السابق' 
            : `منذ ${i} أسابيع`,
        labelEn: i === 0 
          ? 'Current Week' 
          : i === 1 
            ? 'Prev Week' 
            : `${i}w ago`
      });
    }
    return ranges;
  };

  const weekRanges = getWeekRanges();
  const weeklyData = weekRanges.map(range => {
    const revenue = bookings
      .filter(b => b.status !== 'cancelled')
      .filter(b => b.date >= range.startStr && b.date <= range.endStr)
      .reduce((sum, b) => sum + (b.price || 0), 0);
    return {
      ...range,
      revenue
    };
  });

  const maxRev = Math.max(...weeklyData.map(w => w.revenue), 1000);
  const currentWeekRev = weeklyData[5].revenue;
  const prevWeekRev = weeklyData[4].revenue;

  let growthPct = 0;
  if (prevWeekRev > 0) {
    growthPct = Math.round(((currentWeekRev - prevWeekRev) / prevWeekRev) * 100);
  } else if (currentWeekRev > 0) {
    growthPct = 100;
  }
  const growthSign = growthPct >= 0 ? '+' : '';

  const cards = [
    {
      key: 'revenue',
      labelAr: 'إجمالي الإيرادات المتوقعة',
      labelEn: 'Total Gross Revenue',
      value: `${totalGrossRevenue.toLocaleString()}`,
      unit: isAr ? 'ج.م' : 'EGP',
      badge: isAr ? '+١٨٪ أسبوعياً' : '+18% this week',
      badgeCls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      subLeft: isAr ? `مؤكد: ${confirmedRevenue.toLocaleString()} ج.م` : `Confirmed: ${confirmedRevenue.toLocaleString()} EGP`,
      subRight: isAr ? `معلق: ${pendingRevenue.toLocaleString()} ج.م` : `Pipeline: ${pendingRevenue.toLocaleString()} EGP`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconCls: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
      valueColor: 'text-white',
      extra: null,
    },
    {
      key: 'occupancy',
      labelAr: 'نسبة إشغال المواعيد',
      labelEn: 'Slot Occupancy Rate',
      value: `${occupancyPct}%`,
      unit: '',
      badge: isAr ? 'الطاقة الاستيعابية' : 'Capacity',
      badgeCls: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
      subLeft: isAr ? `${activeBookings.length} حجز نشط` : `${activeBookings.length} active bookings`,
      subRight: isAr ? `${totalWeeklyCapacity} إجمالي المقاعد` : `${totalWeeklyCapacity} total seats`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      iconCls: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
      valueColor: 'text-white',
      extra: (
        <div className="mt-5 w-full bg-slate-900/60 rounded-full h-2 border border-teal-950/30 overflow-hidden">
          <div
            className={`bg-gradient-to-r ${occupancyColor} h-full rounded-full transition-all duration-700`}
            style={{ width: `${occupancyPct}%` }}
          />
        </div>
      ),
    },
    {
      key: 'attendance',
      labelAr: 'معدل الحضور',
      labelEn: 'Attendance Rate',
      value: `${attendanceRate}%`,
      unit: '',
      badge: isAr 
        ? (attendanceRate >= 85 ? 'ممتاز' : attendanceRate >= 65 ? 'ثابت' : 'تحتاج انتباه') 
        : (attendanceRate >= 85 ? 'Excellent' : attendanceRate >= 65 ? 'Stable' : 'Needs attention'),
      badgeCls: attendanceRate >= 85 
        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
        : attendanceRate >= 65 
          ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' 
          : 'bg-rose-500/10 text-rose-300 border-rose-500/20',
      subLeft: isAr ? `${attendedAppts} حضور` : `${attendedAppts} attended`,
      subRight: isAr ? `من إجمالي ${attendanceDenominator}` : `out of ${attendanceDenominator} total`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      iconCls: attendanceRate >= 85 
        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
        : 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      valueColor: 'text-white',
      extra: (
        <div className="mt-5 w-full bg-slate-900/60 rounded-full h-2 border border-teal-950/30 overflow-hidden">
          <div
            className={`bg-gradient-to-r ${attendanceRate >= 85 ? 'from-emerald-400 to-teal-400' : 'from-amber-400 to-orange-400'} h-full rounded-full transition-all duration-700`}
            style={{ width: `${attendanceRate}%` }}
          />
        </div>
      ),
    },
    {
      key: 'weeklyGrowth',
      labelAr: 'نمو الإيرادات الأسبوعي',
      labelEn: 'Weekly Revenue Growth',
      value: `${currentWeekRev.toLocaleString()}`,
      unit: isAr ? 'ج.م' : 'EGP',
      badge: `${growthSign}${growthPct}%`,
      badgeCls: growthPct >= 0 
        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
        : 'bg-rose-500/10 text-rose-300 border-rose-500/20',
      subLeft: isAr ? `السابق: ${prevWeekRev.toLocaleString()} ج.م` : `Prev: ${prevWeekRev.toLocaleString()} EGP`,
      subRight: isAr ? `معدل النمو` : `Growth rate`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          {growthPct >= 0 ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
          )}
        </svg>
      ),
      iconCls: growthPct >= 0 
        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
        : 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      valueColor: 'text-white',
      extra: (
        <div className="mt-4 flex items-end justify-between gap-1.5 h-16 pt-2 border-t border-teal-950/30">
          {weeklyData.map((week, idx) => {
            const heightPct = Math.max(Math.min((week.revenue / maxRev) * 100, 100), 5);
            const isCurrent = idx === 5;
            const isPrev = idx === 4;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center group relative">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-1 bg-slate-950 border border-teal-500/30 text-white text-[9px] font-bold rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-xl">
                  {isAr ? week.labelAr : week.labelEn}: {week.revenue.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                </div>
                {/* Bar */}
                <div 
                  className={`w-full rounded-t transition-all duration-500 ${
                    isCurrent 
                      ? 'bg-gradient-to-t from-teal-500 to-emerald-400 shadow-md shadow-teal-500/20' 
                      : isPrev
                        ? 'bg-teal-500/60'
                        : 'bg-teal-950/40 border border-teal-900/30'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
                {/* Short Label */}
                <span className="text-[8px] text-slate-500 mt-1 font-semibold scale-90 sm:scale-100">
                  {idx + 1}
                </span>
              </div>
            );
          })}
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-right">
      {cards.map(card => (
        <div
          key={card.key}
          className="glass-panel glass-panel-hover rounded-2xl p-5 relative overflow-hidden border border-teal-500/15 shadow-lg flex flex-col justify-between"
          style={{ minHeight: '210px' }}
        >
          {/* Background orb */}
          <div className="absolute top-0 left-0 w-20 h-20 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />

          <div>
            {/* Icon + badge row */}
            <div className="flex items-start justify-between mb-4">
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${card.badgeCls}`}>
                {card.badge}
              </span>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${card.iconCls}`}>
                {card.icon}
              </div>
            </div>

            {/* Label */}
            <p className="text-[11px] sm:text-xs text-slate-400 font-semibold mb-1 leading-snug">
              {isAr ? card.labelAr : card.labelEn}
            </p>

            {/* Main value */}
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className={`text-2xl sm:text-3xl font-black tabular-nums leading-none ${card.valueColor}`}>
                {card.value}
              </span>
              {card.unit && (
                <span className="text-xs font-bold text-slate-500">{card.unit}</span>
              )}
            </div>
          </div>

          <div>
            {/* Optional progress bar / chart */}
            {card.extra}

            {/* Footer row */}
            <div className="mt-4 pt-3 border-t border-teal-950/50 flex flex-col sm:flex-row justify-between gap-1 text-[10px] text-slate-500">
              <span>{card.subLeft}</span>
              <span className="text-teal-400 font-semibold">{card.subRight}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
