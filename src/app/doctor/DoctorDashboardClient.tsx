'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import StatsDashboard from '@/components/doctor/StatsDashboard';
import ScheduleBuilder from '@/components/doctor/ScheduleBuilder';
import AppointmentsList from '@/components/doctor/AppointmentsList';
import ProfileSettings from '@/components/doctor/ProfileSettings';
import { useBooking } from '@/components/BookingContext';
import { createClient } from '@/lib/supabase/client';
import { SupabaseDoctor, SupabaseAppointment } from './page';

interface DoctorDashboardClientProps {
  doctor: SupabaseDoctor;
  initialAppointments: SupabaseAppointment[];
}

export default function DoctorDashboardClient({ doctor, initialAppointments }: DoctorDashboardClientProps) {
  const { language, doctorProfile, setBookings, setIsLoadingAvailability } = useBooking();
  const isAr = language === 'ar';
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const mapped = initialAppointments.map(appt => ({
      id: appt.id,
      patientName: appt.patient_name,
      mobileNumber: appt.patient_phone,
      date: appt.appointment_date,
      timeSlot: appt.appointment_time,
      status: appt.status as any,
      price: doctor.consultation_fee || 400,
      createdAt: appt.created_at,
    }));
    setBookings(mapped);
    setIsLoadingAvailability(false);
  }, [initialAppointments, doctor.consultation_fee, setBookings, setIsLoadingAvailability]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/doctor/login');
  };

  return (
    <>
      <Navbar />

      <main className="flex-grow bg-[#050b0f] min-h-screen py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
          
          {/* Header Panel */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-right border-b border-teal-950/60 pb-6">
            <div className="space-y-1.5 w-full sm:w-auto">
              <div className="flex flex-row justify-between items-center sm:block">
                <p className="text-xs font-bold text-teal-400 uppercase tracking-widest">
                  {new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                {/* Logout button (mobile / inline) */}
                <button
                  onClick={handleLogout}
                  className="sm:hidden px-3 py-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-colors"
                >
                  {isAr ? 'خروج' : 'Logout'}
                </button>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {isAr ? 'لوحة الأداء والنمو المالي' : 'Clinic Dashboard & Revenue Growth'}
              </h1>
              <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
                {isAr 
                  ? `مرحباً د. ${doctor.full_name}. هذا ملخص أداء عيادتك (${doctor.clinic_name}) اليوم، شامل الإيرادات ونسب الإشغال.` 
                  : `Welcome back, Dr. ${doctor.full_name}. Here is today's clinic summary at ${doctor.clinic_name}: revenue, occupancy, and bookings.`}
              </p>
            </div>
            
            {/* Quick Profile Badge & Logout Button */}
            <div className="flex items-center gap-4 flex-shrink-0 w-full sm:w-auto justify-between sm:justify-end">
              <button
                onClick={handleLogout}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 text-sm font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl hover:bg-rose-500/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {isAr ? 'تسجيل الخروج' : 'Logout'}
              </button>

              <div className="flex items-center gap-3 bg-teal-950/20 border border-teal-900/40 p-3 rounded-2xl">
                <div className="text-right">
                  <span className="text-xs font-black text-white block">
                    {doctor.full_name}
                  </span>
                  <span className="text-[10px] text-teal-400 block font-bold">
                    {doctor.specialization} | {doctor.clinic_name}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {doctor.city} · {doctor.consultation_fee} {isAr ? 'جنيه' : 'EGP'}
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
          </div>

          {/* 1. Growth/Revenue Analytics Dashboard Widget */}
          <StatsDashboard />

          {/* 2. Main Administration & Configuration Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Weekly Schedule Configuration Builder Form & Profile Settings */}
            <div className="xl:col-span-4 xl:sticky xl:top-24 space-y-8 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar pr-1">
              <ScheduleBuilder />
              <ProfileSettings doctor={doctor} language={language} />
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
