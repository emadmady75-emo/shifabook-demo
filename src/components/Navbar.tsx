'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useBooking } from './BookingContext';

export default function Navbar() {
  const { language, setLanguage } = useBooking();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLanguageToggle = () => {
    const nextLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(nextLang);
    document.documentElement.setAttribute('lang', nextLang);
    document.documentElement.setAttribute('dir', nextLang === 'ar' ? 'rtl' : 'ltr');
    setMenuOpen(false);
  };

  const isAr = language === 'ar';

  return (
    <header className="sticky top-0 z-50 border-b border-teal-950/80 bg-[#070e12]/85 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-4">

        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group flex-shrink-0" onClick={() => setMenuOpen(false)}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/15 group-hover:scale-105 transition-transform duration-200">
            {/* Medical cross / calendar icon */}
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#070e12]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-teal-200 to-white bg-clip-text text-transparent">
            {isAr ? 'شفاء بوك' : 'ShifaBook'}
          </span>
        </Link>

        {/* Desktop nav actions */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={handleLanguageToggle}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-teal-900/60 bg-teal-950/20 text-teal-300 hover:bg-teal-950/40 hover:text-white transition-all flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 11.37 7.31 16.5 3 19" />
            </svg>
            {isAr ? 'English' : 'العربية'}
          </button>

          <Link
            href="/doctor"
            className="px-4 py-2 text-sm font-bold rounded-xl text-teal-300 border border-teal-800/50 hover:border-teal-500/70 bg-teal-950/20 hover:bg-teal-950/40 hover:text-white transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {isAr ? 'لوحة الطبيب' : 'Doctor Portal'}
          </Link>

          {/* Book CTA in nav */}
          <a
            href="/#booking-grid-section"
            className="px-4 py-2 text-sm font-black rounded-xl bg-teal-500 text-[#070e12] hover:bg-teal-400 transition-colors shadow-md shadow-teal-500/15"
          >
            {isAr ? 'احجز الآن' : 'Book Now'}
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden w-9 h-9 rounded-xl border border-teal-900/60 bg-teal-950/20 flex items-center justify-center text-teal-300 hover:bg-teal-950/40 transition-colors"
          onClick={() => setMenuOpen(v => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-teal-950/60 bg-[#070e12]/95 px-4 py-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
          <a
            href="/#booking-grid-section"
            onClick={() => setMenuOpen(false)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-[#070e12] font-black text-base shadow-lg shadow-teal-500/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {isAr ? 'احجز موعدك الآن' : 'Book Now'}
          </a>
          <Link
            href="/doctor"
            onClick={() => setMenuOpen(false)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-teal-800/50 bg-teal-950/20 text-teal-300 font-bold text-sm"
          >
            {isAr ? 'لوحة تحكم الطبيب' : 'Doctor Portal'}
          </Link>
          <button
            onClick={handleLanguageToggle}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-teal-900/40 bg-transparent text-slate-400 font-semibold text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 11.37 7.31 16.5 3 19" />
            </svg>
            {isAr ? 'Switch to English' : 'التبديل للعربية'}
          </button>
        </div>
      )}
    </header>
  );
}
