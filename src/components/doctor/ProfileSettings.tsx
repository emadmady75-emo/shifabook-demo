'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { SupabaseDoctor } from '@/app/doctor/page';
import { useBooking } from '@/components/BookingContext';

interface ProfileSettingsProps {
  doctor: SupabaseDoctor;
  language: 'ar' | 'en';
}

export default function ProfileSettings({ doctor, language }: ProfileSettingsProps) {
  const isAr = language === 'ar';
  const router = useRouter();
  const supabase = createClient();
  const { refreshProfile } = useBooking();

  // Profile fields states
  const [fullName, setFullName] = useState(doctor.full_name || '');
  const [specialization, setSpecialization] = useState(doctor.specialization || '');
  const [clinicName, setClinicName] = useState(doctor.clinic_name || '');
  const [consultationFee, setConsultationFee] = useState(doctor.consultation_fee || 400);
  const [city, setCity] = useState(doctor.city || '');
  const [profileImageUrl, setProfileImageUrl] = useState(doctor.profile_image_url || '');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password fields states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('doctors')
        .update({
          full_name: fullName,
          specialization,
          clinic_name: clinicName,
          consultation_fee: Number(consultationFee),
          city,
          profile_image_url: profileImageUrl || null
        })
        .eq('id', doctor.id);

      if (error) {
        throw error;
      }

      setMessage({
        type: 'success',
        text: isAr ? 'تم تحديث بيانات الطبيب بنجاح' : 'Doctor profile updated successfully',
      });
      
      // Update global context state instantly
      if (refreshProfile) {
        await refreshProfile();
      }

      // Refresh the page data server-side
      router.refresh();
    } catch (err: any) {
      console.error('Error updating doctor profile:', err);
      setMessage({
        type: 'error',
        text: isAr ? `فشل تحديث البيانات: ${err.message || ''}` : `Failed to update profile: ${err.message || ''}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassLoading(true);
    setPassMessage(null);

    if (newPassword.length < 8) {
      setPassMessage({
        type: 'error',
        text: isAr ? 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل' : 'Password must be at least 8 characters long'
      });
      setPassLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassMessage({
        type: 'error',
        text: isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match'
      });
      setPassLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPassMessage({
        type: 'success',
        text: isAr ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully'
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error updating password:', err);
      setPassMessage({
        type: 'error',
        text: isAr ? `فشل تغيير كلمة المرور: ${err.message || ''}` : `Failed to change password: ${err.message || ''}`
      });
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Settings Card */}
      <div className="glass-panel rounded-3xl p-6 border border-teal-500/20 text-right space-y-6">
        <div>
          <h3 className="text-lg font-black text-white">
            {isAr ? 'إعدادات ملف الطبيب' : 'Doctor Profile Settings'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'قم بتحديث الاسم، التخصص، رابط الصورة الشخصية، ومعلومات العيادة.'
              : 'Update your name, specialization, avatar URL, and clinic info.'}
          </p>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-bold ${
              message.type === 'success'
                ? 'bg-teal-500/10 border-teal-500/25 text-teal-400'
                : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {isAr ? 'الاسم الكامل' : 'Full Name'}
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-right"
            />
          </div>

          {/* Specialization */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {isAr ? 'التخصص' : 'Specialization'}
            </label>
            <input
              type="text"
              required
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-right"
            />
          </div>

          {/* Avatar Image URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {isAr ? 'رابط الصورة الشخصية (URL)' : 'Profile Image URL'}
            </label>
            <input
              type="url"
              placeholder="https://example.com/photo.jpg"
              value={profileImageUrl}
              onChange={(e) => setProfileImageUrl(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-right ltr"
            />
          </div>

          {/* Clinic Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {isAr ? 'اسم العيادة / المستشفى' : 'Clinic / Hospital Name'}
            </label>
            <input
              type="text"
              required
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-right"
            />
          </div>

          {/* Consultation Fee */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {isAr ? 'سعر الكشف' : 'Consultation Fee'}
            </label>
            <input
              type="number"
              required
              min="0"
              value={consultationFee}
              onChange={(e) => setConsultationFee(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-right"
            />
          </div>

          {/* City / Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {isAr ? 'المدينة / العنوان' : 'City / Address'}
            </label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-right"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-[#070e12] font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md shadow-teal-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التغييرات' : 'Save Changes')}
          </button>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="glass-panel rounded-3xl p-6 border border-teal-500/20 text-right space-y-6">
        <div>
          <h3 className="text-lg font-black text-white">
            {isAr ? 'تغيير كلمة المرور' : 'Change Password'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'قم بتأمين حسابك بتعيين كلمة مرور جديدة.'
              : 'Secure your account by setting a new password.'}
          </p>
        </div>

        {passMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-bold ${
              passMessage.type === 'success'
                ? 'bg-teal-500/10 border-teal-500/25 text-teal-400'
                : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
            }`}
          >
            {passMessage.text}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-right"
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-right"
            />
          </div>

          <button
            type="submit"
            disabled={passLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-[#070e12] font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md shadow-teal-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {passLoading ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'تحديث كلمة المرور' : 'Update Password')}
          </button>
        </form>
      </div>
    </div>
  );
}
