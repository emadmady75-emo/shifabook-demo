'use client';

import React from 'react';
import { useBooking } from './BookingContext';

export default function Footer() {
  const { language } = useBooking();
  const isAr = language === 'ar';

  return (
    <footer className="mt-auto border-t border-teal-950/60 bg-[#04080b] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-400 text-sm">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
            <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
          <span className="font-bold text-slate-200">
            {isAr ? 'شفاء بوك © ٢٠٢٦' : 'ShifaBook © 2026'}
          </span>
        </div>

        {/* Dynamic copywriting trust signals */}
        <p className="text-center text-slate-500">
          {isAr
            ? 'نظام الحجز الفوري الخاضع لإشراف طبي مباشر. متوافق كلياً مع المعايير الصحية المحلية.'
            : 'Instant booking gateway managed directly under medical supervision. Fully compliant with local health standards.'}
        </p>

        {/* Clinic Info */}
        <div className="flex gap-4">
          <span className="text-teal-400 font-medium">
            {isAr ? 'القاهرة، جمهورية مصر العربية.' : 'Cairo, Egypt.'}
          </span>
        </div>

      </div>
    </footer>
  );
}
