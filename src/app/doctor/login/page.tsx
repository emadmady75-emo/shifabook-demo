'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useBooking } from '@/components/BookingContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function DoctorLogin() {
  const { language } = useBooking();
  const isAr = language === 'ar';
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('Supabase auth error:', signInError);
      setError(signInError.message || (isAr ? 'فشل تسجيل الدخول. يرجى التحقق من البيانات.' : 'Login failed. Please check credentials.'));
      setLoading(false);
    } else {
      setError('');
      if (typeof window !== 'undefined') {
        window.location.href = '/doctor';
      }
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#050b0f] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm glass-panel rounded-3xl p-8 border border-teal-500/20 text-right space-y-6">
          {/* Lock icon */}
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mx-auto">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-xl font-black text-white">
              {isAr ? 'تسجيل دخول لوحة الإدارة' : 'Admin Dashboard Login'}
            </h2>
            <p className="text-xs text-slate-400">
              {isAr ? 'الرجاء إدخال البريد الإلكتروني وكلمة المرور للمتابعة' : 'Enter your email and password to continue'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-right">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-400 text-center" dir={isAr ? 'rtl' : 'ltr'}>
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                {isAr ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@example.com"
                className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-left"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                {isAr ? 'كلمة المرور' : 'Password'}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-left"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-[#070e12] font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md shadow-teal-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isAr ? 'جاري التحميل...' : 'Loading...') : (isAr ? 'تسجيل الدخول' : 'Sign In')}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
}
