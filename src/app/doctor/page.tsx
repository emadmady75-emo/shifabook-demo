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
}

export default async function DoctorDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/doctor/login');
  }

  // TypeScript-safe database query to fetch doctor profile by user.id
  const { data: doctor, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !doctor) {
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
              <h2 className="text-xl font-black text-white">لم يتم إعداد ملف الطبيب بعد</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                حسابك مسجل بنجاح، ولكن لم يتم إعداد ملف الطبيب الخاص بك في قاعدة البيانات بعد. يرجى مراجعة مدير النظام.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return <DoctorDashboardClient doctor={doctor as SupabaseDoctor} />;
}
