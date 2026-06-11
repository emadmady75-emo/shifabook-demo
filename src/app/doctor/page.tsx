import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DoctorDashboardClient from './DoctorDashboardClient';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Define TS-safe interface for Doctor profile from Supabase
export interface SupabaseDoctor {
  id: string;
  full_name: string;
  specialization: string;
  clinic_name: string;
  consultation_fee: number;
  city: string;
  created_at: string;
  profile_image_url?: string;
  clinic_id?: string | null;
  handle?: string | null;
}

// Define TS-safe interface for Appointments from Supabase
export interface SupabaseAppointment {
  id: string;
  doctor_id: string;
  patient_name: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  source: string;
  created_at: string;
  consultation_fee_at_booking?: number | null;
  appointment_type?: string;
  parent_appointment_id?: string | null;
}

export default async function DoctorDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/doctor/login');
  }

  // 1. Fetch clinic user profile
  let clinicUser = null;
  try {
    const { data } = await supabase
      .from('clinic_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();
    clinicUser = data;
  } catch (e) {
    // Graceful fallback if table is not yet created
  }

  const isDefaultDoctor = user.id === '5e236d18-ff19-42d5-82cf-6e6d6a177e9a' || user.email === 'doctor@shifabook.com';
  
  // If user is not the default doctor AND is not in clinic_users, they are unauthorized
  if (!isDefaultDoctor && !clinicUser) {
    return (
      <div className="flex flex-col min-h-screen bg-[#050b0f]" dir="rtl">
        <Navbar />
        <main className="flex-grow flex items-center justify-center py-20 px-4">
          <div className="max-w-md w-full text-center space-y-6 glass-panel rounded-3xl p-8 border border-teal-500/20">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">غير مصرح بالدخول</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                حسابك غير مسجل كعضو في طاقم العيادة. يرجى التواصل مع مدير النظام لتفعيل صلاحياتك.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // 2. Fetch the clinic's doctor profile — RC-2.0: scope by clinic_id if available
  let doctor = null;
  const userClinicId = clinicUser?.clinic_id;

  if (userClinicId) {
    // RC-2.0: Clinic-aware doctor loading
    try {
      const { data: docData } = await supabase
        .from('doctors')
        .select('*')
        .eq('clinic_id', userClinicId)
        .limit(1)
        .maybeSingle();
      doctor = docData;
    } catch (e) {
      // Fallback if clinic_id column doesn't exist yet (pre-migration)
    }
  }

  // Fallback: legacy .limit(1) if clinic-aware loading didn't succeed
  if (!doctor) {
    const { data: docData } = await supabase
      .from('doctors')
      .select('*')
      .limit(1)
      .maybeSingle();
    doctor = docData;
  }

  // Fallback if no doctor row exists at all in the database (unlikely but safe)
  if (!doctor) {
    doctor = {
      id: '5e236d18-ff19-42d5-82cf-6e6d6a177e9a',
      full_name: 'د. عبدالرحمن المصري',
      specialization: 'إستشاري طب الأطفال والأمراض الصدرية والحساسية والمناعة',
      clinic_name: 'People\'s Hospital',
      consultation_fee: 450,
      city: '6 أكتوبر - مصر',
      created_at: new Date().toISOString()
    };
  }

  // 3. Fetch appointments for this doctor
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('doctor_id', doctor.id)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true });

  return (
    <DoctorDashboardClient
      doctor={doctor as SupabaseDoctor}
      initialAppointments={(appointments || []) as SupabaseAppointment[]}
    />
  );
}
