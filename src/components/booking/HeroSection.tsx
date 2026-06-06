'use client';

import React from 'react';
import { useBooking } from '../BookingContext';

export default function HeroSection() {
  const { language, doctorProfile } = useBooking();
  const isAr = language === 'ar';

  return (
    <section className="relative overflow-hidden pt-14 pb-20 lg:pt-24 lg:pb-32 border-b border-teal-950/40">

      {/* Layered ambient glow background */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-80px] right-[-80px] w-[600px] h-[600px] bg-teal-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[500px] h-[500px] bg-emerald-600/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-teal-400/4 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">

          {/* ─── Hero Copy ─── */}
          <div className="lg:col-span-7 space-y-7 text-right order-2 lg:order-1">

            {/* Live Availability Pill */}
            <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-emerald-500/25 bg-emerald-500/8 text-emerald-300 text-xs font-bold tracking-wide ${isAr ? 'flex-row' : 'flex-row-reverse'}`}>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <span>{isAr ? 'المواعيد متاحة الآن · حجز فوري' : 'Slots Available Now · Instant Booking'}</span>
            </div>

            {/* Main Headline — tighter, more Arabic-native feel */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.6rem] font-black text-white leading-[1.15] tracking-tight">
              {isAr ? (
                <>
                  حجز موعدك الطبي{' '}
                  <span className="relative">
                    <span className="bg-gradient-to-l from-teal-300 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
                      أصبح أسهل من أي وقت
                    </span>
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-l from-teal-400/60 to-transparent rounded-full" />
                  </span>
                </>
              ) : (
                <>
                  Booking your consultation{' '}
                  <span className="bg-gradient-to-r from-teal-300 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
                    has never been simpler
                  </span>
                </>
              )}
            </h1>

            {/* Subtext — warmer, more personal tone */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
              {isAr
                ? 'اختر موعدك بأسلوب خريطة مقاعد الطيران. أدخل اسمك ورقمك فقط، وستصلك رسالة تأكيد واتساب فورية. بدون حسابات، بدون نماذج طويلة.'
                : 'Pick your slot like choosing an airline seat — enter your name and number, get instant WhatsApp confirmation. No accounts. No long forms.'}
            </p>

            {/* Trust Stats Row */}
            <div className="pt-6 border-t border-teal-950/50 grid grid-cols-3 gap-6 max-w-sm">
              <div className="space-y-1">
                <p className="text-2xl sm:text-3xl font-black text-white tabular-nums">30ث</p>
                <p className="text-[11px] text-slate-400 leading-snug">{isAr ? 'متوسط وقت إتمام الحجز' : 'Avg. booking time'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl sm:text-3xl font-black text-teal-400 tabular-nums">100%</p>
                <p className="text-[11px] text-slate-400 leading-snug">{isAr ? 'تأكيد فوري عبر واتساب' : 'WhatsApp confirmed'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums">صفر</p>
                <p className="text-[11px] text-slate-400 leading-snug">{isAr ? 'حسابات أو كلمات مرور' : 'Accounts required'}</p>
              </div>
            </div>

            {/* Primary CTA — larger, more visible on mobile */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <a
                href="#booking-grid-section"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-[#070e12] font-black text-base sm:text-lg shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {isAr ? 'احجز موعدك الآن' : 'Book Your Appointment'}
              </a>
              <a
                href={`/book/dr-ahmed`}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-teal-800/60 bg-teal-950/20 text-teal-300 font-bold text-sm hover:border-teal-500/50 hover:text-white hover:bg-teal-950/40 transition-all duration-200"
              >
                {isAr ? 'صفحة الحجز المخصصة' : 'Personal Booking Page'}
                <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

          </div>

          {/* ─── Doctor Profile Card ─── */}
          <div className="lg:col-span-5 flex justify-center order-1 lg:order-2">
            <div className="w-full max-w-sm sm:max-w-md glass-panel rounded-[2rem] p-7 relative overflow-hidden shadow-2xl shadow-teal-500/5 border border-teal-500/30 hover:border-teal-500/50 transition-all duration-300 group">

              {/* Glowing header accent */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500" />
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/15 transition-all duration-300" />

              {/* Doctor Avatar & Online Status */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-right gap-5">
                <div className="relative flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={doctorProfile.avatar}
                    alt={isAr ? doctorProfile.name : doctorProfile.nameEn}
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-3 border-teal-500/25 shadow-xl shadow-black/40 group-hover:border-teal-500/40 transition-colors duration-300"
                  />
                  {/* Active Pulse Online Badge */}
                  <div className="absolute -bottom-1 -end-1 w-6.5 h-6.5 rounded-full bg-emerald-500 border-4 border-[#0b171f] flex items-center justify-center shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  </div>
                </div>

                <div className="space-y-2 min-w-0 flex-grow">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {isAr ? '✓ متاح للحجز اليوم' : '✓ Available Today'}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white leading-tight group-hover:text-teal-300 transition-colors">
                    {isAr ? doctorProfile.name : doctorProfile.nameEn}
                  </h3>
                  <p className="text-xs sm:text-sm font-extrabold text-teal-400 leading-snug">
                    {isAr ? doctorProfile.title : doctorProfile.titleEn}
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-1 text-xs text-slate-400">
                    <svg className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">
                      {isAr ? doctorProfile.hospital : doctorProfile.hospitalEn}
                      {doctorProfile.city ? ` - ${doctorProfile.city}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Specialization */}
              <div className="mt-6 pt-5 border-t border-teal-950/60">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  {isAr ? 'التخصص الدقيق والخبرة السريرية' : 'Clinical Focus & Expertise'}
                </p>
                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  {isAr ? doctorProfile.specialization : doctorProfile.specializationEn}
                </p>
              </div>

              {/* Consultation Fee + Payment note */}
              <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-teal-950/50 to-teal-950/20 border border-teal-900/40 flex items-center justify-between shadow-inner">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold mb-0.5">{isAr ? 'رسوم الاستشارة (الكشف)' : 'Consultation Fee'}</p>
                  <p className="text-[11px] text-slate-500 font-semibold">{isAr ? 'الدفع نقداً أو بالفيزا في العيادة' : 'Pay at clinic'}</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-teal-300">{doctorProfile.consultationFee || 400}</span>
                  <span className="text-xs font-bold text-teal-400 mr-1"> {isAr ? 'ج.م' : 'EGP'}</span>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-5 flex flex-wrap gap-2 justify-center sm:justify-start">
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-300 text-xs border border-emerald-500/25 font-bold shadow-sm">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {isAr ? 'طبيب معتمد رسمياً' : 'Verified Doctor'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-500/10 text-teal-300 text-xs border border-teal-500/25 font-bold shadow-sm animate-pulse">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {isAr ? 'تأكيد وحجز فوري' : 'Instant Confirmation'}
                </span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
