'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import StatsDashboard from '@/components/doctor/StatsDashboard';
import ScheduleBuilder from '@/components/doctor/ScheduleBuilder';
import AppointmentsList from '@/components/doctor/AppointmentsList';
import { useBooking } from '@/components/BookingContext';

const DEMO_PASSWORD = 'doctor123';
const SESSION_KEY = 'shifabook_doctor_access';

export default function DoctorDashboard() {
  const { language, doctorProfile } = useBooking();
  const isAr = language === 'ar';

  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === 'true') {
      setAuthenticated(true);
    }
    setChecking(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password === DEMO_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setAuthenticated(true);
    } else {
      setError(isAr ? 'كلمة المرور غير صحيحة' : 'Incorrect password');
    }
  };

  // Don't render anything while checking sessionStorage (prevents flash)
  if (checking) {
    return (
      <div className="min-h-screen bg-[#050b0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Password gate
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#050b0f] flex items-center justify-center px-4">
        <div className="w-full max-w-sm glass-panel rounded-3xl p-8 border border-teal-500/20 text-right space-y-6">

          {/* Lock icon */}
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mx-auto">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-xl font-black text-white">
              {isAr ? 'لوحة تحكم الطبيب' : 'Doctor Dashboard'}
            </h2>
            <p className="text-xs text-slate-400">
              {isAr ? 'أدخل كلمة المرور للمتابعة' : 'Enter password to continue'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-400 text-center">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                {isAr ? 'كلمة مرور لوحة الطبيب' : 'Dashboard Password'}
              </label>
              <input
                type="password"
                autoFocus
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-center tracking-widest"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-[#070e12] font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md shadow-teal-500/10"
            >
              {isAr ? 'دخول لوحة الطبيب' : 'Enter Dashboard'}
            </button>
          </form>

          <p className="text-[10px] text-slate-600 text-center leading-relaxed">
            {isAr
              ? 'هذه حماية تجريبية للعرض فقط وليست نظام تسجيل دخول حقيقي.'
              : 'This is a demo-only gate and not a real authentication system.'}
          </p>
        </div>
      </div>
    );
  }

  // Authenticated — render full dashboard
  return (
    <>
      <Navbar />

      <main className="flex-grow bg-[#050b0f] min-h-screen py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
          
          {/* Header Panel */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-right border-b border-teal-950/60 pb-6">
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-teal-400 uppercase tracking-widest">
                {new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {isAr ? 'لوحة الأداء والنمو المالي' : 'Clinic Dashboard & Revenue Growth'}
              </h1>
              <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
                {isAr 
                  ? `مرحباً ${doctorProfile.name}. هذا ملخص أداء عيادتك اليوم، شامل الإيرادات ونسب الإشغال.` 
                  : `Welcome back, ${doctorProfile.nameEn}. Here is today's clinic summary: revenue, occupancy, and bookings.`}
              </p>
            </div>
            
            {/* Quick Profile Badge */}
            <div className="flex items-center gap-3 bg-teal-950/20 border border-teal-900/40 p-3 rounded-2xl flex-shrink-0">
              <div className="text-right">
                <span className="text-xs font-black text-white block">
                  {isAr ? doctorProfile.name : doctorProfile.nameEn}
                </span>
                <span className="text-[10px] text-teal-400 block">
                  {isAr ? 'مدير المنشأة الطبية' : 'Clinic Administrator'}
                </span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doctorProfile.avatar}
                alt="Doctor avatar"
                className="w-11 h-11 rounded-xl object-cover border border-teal-500/20 flex-shrink-0"
              />
            </div>
          </div>

          {/* 1. Growth/Revenue Analytics Dashboard Widget */}
          <StatsDashboard />

          {/* 2. Main Administration & Configuration Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Weekly Schedule Configuration Builder Form */}
            <div className="xl:col-span-4 xl:sticky xl:top-24">
              <ScheduleBuilder />
            </div>

            {/* Right Column: Active Appointments Data Ledger & Live Webhooks Hub */}
            <div className="xl:col-span-8">
              <AppointmentsList />
            </div>

          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}
