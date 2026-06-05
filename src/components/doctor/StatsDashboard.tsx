'use client';

import React from 'react';
import { useBooking } from '../BookingContext';

export default function StatsDashboard() {
  const { language, bookings, scheduleConfig } = useBooking();
  const isAr = language === 'ar';

  const isAppointmentPast = (dateStr: string, timeStr: string): boolean => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
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
  const potentialLoss     = cancelledBookings.reduce((s, b) => s + b.price, 0);

  const totalWeeklyCapacity = 16 * scheduleConfig.workingDays.length * scheduleConfig.capacityPerSlot;
  const occupancyPct = totalWeeklyCapacity > 0
    ? Math.min(Math.round((activeBookings.length / totalWeeklyCapacity) * 100), 100)
    : 0;

  // Derive occupancy colour threshold
  const occupancyColor = occupancyPct >= 75 ? 'from-emerald-400 to-teal-400'
    : occupancyPct >= 40 ? 'from-teal-400 to-cyan-400'
    : 'from-amber-400 to-orange-400';

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
      key: 'leakage',
      labelAr: 'إيرادات ضائعة (الإلغاءات)',
      labelEn: 'Revenue Leakage',
      value: `${potentialLoss.toLocaleString()}`,
      unit: isAr ? 'ج.م' : 'EGP',
      badge: isAr ? 'خسارة' : 'Loss',
      badgeCls: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
      subLeft: isAr ? `${cancelledBookings.length} إلغاء` : `${cancelledBookings.length} cancelled`,
      subRight: isAr ? '⚡ اقتراح قائمة انتظار' : '⚡ Suggest Waitlist',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      iconCls: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      valueColor: 'text-rose-300',
      extra: null,
    },
    {
      key: 'speed',
      labelAr: 'متوسط سرعة إتمام الحجز',
      labelEn: 'Avg. Booking Completion',
      value: isAr ? '٢٤ ث' : '24s',
      unit: '',
      badge: isAr ? 'سرعة قياسية' : 'Ultra fast',
      badgeCls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      subLeft: isAr ? 'انخفاض التخلي بنسبة ٤٢٪' : 'Drop-off reduced by 42%',
      subRight: isAr ? 'بدون حساب أو كلمة مرور' : 'Zero friction login',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      iconCls: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
      valueColor: 'text-white',
      extra: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-right">
      {cards.map(card => (
        <div
          key={card.key}
          className="glass-panel glass-panel-hover rounded-2xl p-5 relative overflow-hidden border border-teal-500/15 shadow-lg"
        >
          {/* Background orb */}
          <div className="absolute top-0 left-0 w-20 h-20 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />

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

          {/* Optional progress bar */}
          {card.extra}

          {/* Footer row */}
          <div className="mt-4 pt-3 border-t border-teal-950/50 flex flex-col sm:flex-row justify-between gap-1 text-[10px] text-slate-500">
            <span>{card.subLeft}</span>
            <span className="text-teal-400 font-semibold">{card.subRight}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
