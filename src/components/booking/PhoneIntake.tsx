'use client';

import React, { useState } from 'react';
import { useBooking } from '../BookingContext';
import { translateDigits } from '@/lib/phone';

export default function PhoneIntake() {
  const { language, checkPhoneBookings } = useBooking();
  const isAr = language === 'ar';

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Translate Arabic/Persian digits first
    const translated = translateDigits(phone);
    let cleaned = translated.replace(/[\s\-]/g, '');

    // Convert local prefix if needed for validation check
    if (cleaned.startsWith('+20')) {
      cleaned = '0' + cleaned.slice(3);
    } else if (cleaned.startsWith('20') && cleaned.length === 12) {
      cleaned = '0' + cleaned.slice(2);
    }

    const phoneRegex = /^01[0125][0-9]{8}$/;
    if (!phoneRegex.test(cleaned)) {
      setError(
        isAr 
          ? 'برجاء إدخال رقم موبايل مصري صحيح مثل 01012345678' 
          : 'Please enter a valid Egyptian mobile number (e.g. 01012345678)'
      );
      return;
    }

    setLoading(true);
    try {
      await checkPhoneBookings(translated);
    } catch (err) {
      console.error('Phone lookup failed:', err);
      setError(isAr ? 'عذراً، حدث خطأ أثناء التحقق. يرجى المحاولة مرة أخرى.' : 'Error checking phone. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto glass-panel rounded-3xl p-6 sm:p-8 border border-teal-500/20 text-right space-y-6 relative overflow-hidden shadow-2xl">
      {/* Ambient glow decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header icon */}
      <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mx-auto">
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-xl sm:text-2xl font-black text-white">
          {isAr ? 'حجز موعد طبي فوري' : 'Instant Clinic Booking'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
          {isAr 
            ? 'يرجى إدخال رقم الموبايل للبدء. سنتحقق مما إذا كان لديك حجز نشط أو سجل طبي مسجل.' 
            : 'Enter your mobile number to begin. We will check for any active bookings or medical records.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-400 text-center">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 block">
            {isAr ? 'رقم الهاتف المحمول' : 'Mobile Number'}
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={isAr ? 'مثال: ٠١٠٢٠٧٦١٤٢٥' : 'e.g. 01012345678'}
              className="w-full px-4 py-3.5 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-left font-mono"
            />
            <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-500">
              <span>🇪🇬</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 block leading-snug">
            {isAr 
              ? 'يدعم الأرقام العربية (٠-٩) والإنجليزية (0-9). التحقق فوري.' 
              : 'Supports Arabic (٠-٩) and English (0-9) digits.'}
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-[#070e12] font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md shadow-teal-500/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-[#070e12]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{isAr ? 'جاري التحقق...' : 'Verifying...'}</span>
            </>
          ) : (
            <>
              <span>{isAr ? 'تأكيد ودخول ⚡' : 'Verify & Continue ⚡'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
