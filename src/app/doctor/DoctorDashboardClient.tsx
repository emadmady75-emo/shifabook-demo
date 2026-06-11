'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import StatsDashboard from '@/components/doctor/StatsDashboard';
import ScheduleBuilder from '@/components/doctor/ScheduleBuilder';
import AppointmentsList from '@/components/doctor/AppointmentsList';
import ProfileSettings from '@/components/doctor/ProfileSettings';
import PatientCRM from '@/components/doctor/PatientCRM';
import UserManagement from '@/components/doctor/UserManagement';
import FinanceModule from '@/components/doctor/FinanceModule';
import { useBooking } from '@/components/BookingContext';
import { createClient } from '@/lib/supabase/client';
import { SupabaseDoctor, SupabaseAppointment } from './page';

interface DoctorDashboardClientProps {
  doctor: SupabaseDoctor;
  initialAppointments: SupabaseAppointment[];
}

export default function DoctorDashboardClient({ doctor, initialAppointments }: DoctorDashboardClientProps) {
  const { language, doctorProfile, setBookings, setIsLoadingAvailability, clinicUser, refreshProfile, isLoadingProfile } = useBooking();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'crm' | 'users' | 'finance'>('dashboard');
  const isAr = language === 'ar';
  const router = useRouter();
  const supabase = createClient();

  // Forced password reset states
  const [localResetRequired, setLocalResetRequired] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (clinicUser?.password_reset_required) {
      setLocalResetRequired(true);
    } else {
      setLocalResetRequired(false);
    }
  }, [clinicUser]);

  const handleForcePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicUser) return;
    
    setResetError('');
    if (resetPassword.length < 8) {
      setResetError(isAr ? 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل' : 'Password must be at least 8 characters long');
      return;
    }
    if (resetPassword !== confirmResetPassword) {
      setResetError(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    setResetLoading(true);
    try {
      const { error: authErr } = await supabase.auth.updateUser({ password: resetPassword });
      if (authErr) throw authErr;

      const { error: dbErr } = await supabase
        .from('clinic_users')
        .update({ password_reset_required: false })
        .eq('auth_user_id', clinicUser.auth_user_id);

      if (dbErr) {
        console.warn("DB update for password_reset_required failed:", dbErr);
      }

      setResetSuccess(true);
      setLocalResetRequired(false);
      
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (err: any) {
      console.error('Forced password reset error:', err);
      setResetError(err.message || (isAr ? 'حدث خطأ أثناء تغيير كلمة المرور.' : 'Error changing password.'));
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    const mapped = initialAppointments.map(appt => ({
      id: appt.id,
      patientName: appt.patient_name,
      mobileNumber: appt.patient_phone,
      date: appt.appointment_date,
      timeSlot: appt.appointment_time,
      status: appt.status as any,
      price: appt.consultation_fee_at_booking ?? doctor.consultation_fee ?? 0,
      createdAt: appt.created_at,
    }));
    setBookings(mapped);
    setIsLoadingAvailability(false);
  }, [initialAppointments, doctor.consultation_fee, setBookings, setIsLoadingAvailability]);

  // Tab permission guards
  useEffect(() => {
    if (activeTab === 'users' && clinicUser?.role !== 'admin') {
      setActiveTab('dashboard');
    }
    if (activeTab === 'crm' && clinicUser?.role === 'accountant') {
      setActiveTab('dashboard');
    }
    if (activeTab === 'finance' && !['admin', 'accountant'].includes(clinicUser?.role || '')) {
      setActiveTab('dashboard');
    }
  }, [activeTab, clinicUser]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/doctor/login');
  };

  // UI elements visibility checks based on roles
  const showStats = clinicUser?.role !== 'reception';
  const showSchedule = clinicUser?.role === 'admin' || clinicUser?.role === 'supervisor' || clinicUser?.role === 'reception';
  const showProfileSettings = clinicUser?.role === 'admin';
  const showSidebar = showSchedule || showProfileSettings;

  const getRoleLabel = (role?: string) => {
    if (!role) return '';
    switch (role) {
      case 'admin': return isAr ? 'مدير النظام' : 'Admin';
      case 'supervisor': return isAr ? 'مشرف العيادة' : 'Supervisor';
      case 'reception':
      case 'user': 
        return isAr ? 'استقبال' : 'Reception';
      case 'accountant': return isAr ? 'المحاسب المالي' : 'Accountant';
      default: return role;
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="flex flex-col min-h-screen bg-[#050b0f]" dir="rtl">
        <Navbar />
        <main className="flex-grow flex items-center justify-center py-20 px-4">
          <div className="max-w-md w-full text-center space-y-6 glass-panel rounded-3xl p-8 border border-teal-500/20 shadow-2xl">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="space-y-2">
              <h2 className="text-lg font-black text-white">
                {isAr ? 'جاري تحميل لوحة الإدارة...' : 'Loading Dashboard...'}
              </h2>
              <p className="text-xs text-slate-400">
                {isAr 
                  ? 'يرجى الانتظار لحين تحميل بيانات الحساب والصلاحيات.' 
                  : 'Please wait while account and permission data are being loaded.'}
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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
                {isAr ? 'لوحة الإدارة والمتابعة' : 'Admin Dashboard & Management'}
              </h1>
              <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
                {isAr 
                  ? `مرحباً ${clinicUser?.full_name || ''} (${getRoleLabel(clinicUser?.role)}). صلاحيتك تمنحك إمكانية إدارة عيادة (${doctor.clinic_name}).` 
                  : `Welcome back, ${clinicUser?.full_name || ''} (${getRoleLabel(clinicUser?.role)}). You are managing ${doctor.clinic_name}.`}
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

          {/* Premium Tab Selector Bar */}
          <div className="flex border-b border-teal-950/60 pb-px gap-6 text-right" dir="rtl">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`pb-3 text-sm font-black border-b-2 transition-all duration-200 ${
                activeTab === 'dashboard'
                  ? 'border-teal-500 text-teal-400 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'لوحة المتابعة وجدول العيادة' : 'Clinic Dashboard & Scheduler'}
            </button>
            {clinicUser?.role !== 'accountant' && (
              <button
                onClick={() => setActiveTab('crm')}
                className={`pb-3 text-sm font-black border-b-2 transition-all duration-200 ${
                  activeTab === 'crm'
                    ? 'border-teal-500 text-teal-400 font-extrabold'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {isAr ? 'إدارة سجلات المرضى (CRM)' : 'Patient Directory & CRM'}
              </button>
            )}
            {clinicUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('users')}
                className={`pb-3 text-sm font-black border-b-2 transition-all duration-200 ${
                  activeTab === 'users'
                    ? 'border-teal-500 text-teal-400 font-extrabold'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {isAr ? 'إدارة المستخدمين' : 'User Management'}
              </button>
            )}
            {(clinicUser?.role === 'admin' || clinicUser?.role === 'accountant') && (
              <button
                onClick={() => setActiveTab('finance')}
                className={`pb-3 text-sm font-black border-b-2 transition-all duration-200 ${
                  activeTab === 'finance'
                    ? 'border-teal-500 text-teal-400 font-extrabold'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {isAr ? 'الإدارة المالية' : 'Finance'}
              </button>
            )}
          </div>

          {activeTab === 'dashboard' && (
            <>
              {/* 1. Growth/Revenue Analytics Dashboard Widget */}
              {showStats && <StatsDashboard />}

              {/* 2. Main Administration & Configuration Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Weekly Schedule Configuration Builder Form & Profile Settings */}
                {showSidebar && (
                  <div className="xl:col-span-4 xl:sticky xl:top-24 space-y-8 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar pr-1">
                    {showSchedule && <ScheduleBuilder />}
                    {showProfileSettings && <ProfileSettings doctor={doctor} language={language} />}
                  </div>
                )}

                {/* Right Column: Active Appointments Data Ledger & Live Webhooks Hub */}
                <div className={showSidebar ? "xl:col-span-8" : "xl:col-span-12"}>
                  <AppointmentsList />
                </div>

              </div>
            </>
          )}

          {activeTab === 'crm' && clinicUser?.role !== 'accountant' && (
            <PatientCRM />
          )}

          {activeTab === 'users' && clinicUser?.role === 'admin' && (
            <UserManagement />
          )}

          {activeTab === 'finance' && (clinicUser?.role === 'admin' || clinicUser?.role === 'accountant') && (
            <FinanceModule />
          )}

        </div>
      </main>

      <Footer />

      {localResetRequired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04080b]/98 backdrop-blur-lg" dir="rtl">
          <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-teal-500/30 text-right space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mx-auto mb-2">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-white">
                {isAr ? 'تأمين الحساب وإعادة تعيين كلمة المرور' : 'Secure Account & Reset Password'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr 
                  ? 'تم تسجيل دخولك بنجاح باستخدام كلمة مرور مؤقتة. لحماية خصوصية بيانات المرضى، يرجى تعيين كلمة مرور جديدة قوية لحسابك الآن.'
                  : 'You have logged in using a temporary password. To protect patient data privacy, please set a strong new password for your account.'}
              </p>
            </div>

            {resetError && (
              <div className="p-3.5 rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-400 text-xs font-bold text-center">
                ⚠️ {resetError}
              </div>
            )}

            <form onSubmit={handleForcePasswordResetSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-right"
                  placeholder={isAr ? '8 أحرف على الأقل' : 'At least 8 characters'}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  {isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmResetPassword}
                  onChange={(e) => setConfirmResetPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-right"
                  placeholder={isAr ? 'أعد كتابة كلمة المرور' : 'Retype password'}
                />
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-[#070e12] font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md shadow-teal-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetLoading ? (isAr ? 'جاري التحديث وتأمين الحساب...' : 'Updating & securing...') : (isAr ? 'حفظ كلمة المرور والدخول للوحة التحكم' : 'Save Password & Enter Dashboard')}
              </button>
              
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-bold text-xs transition-colors mt-2"
              >
                {isAr ? 'تسجيل الخروج' : 'Logout / Sign Out'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
