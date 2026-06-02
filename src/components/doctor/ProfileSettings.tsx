'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { SupabaseDoctor } from '@/app/doctor/page';

interface ProfileSettingsProps {
  doctor: SupabaseDoctor;
  language: 'ar' | 'en';
}

export default function ProfileSettings({ doctor, language }: ProfileSettingsProps) {
  const isAr = language === 'ar';
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState(doctor.full_name || '');
  const [specialization, setSpecialization] = useState(doctor.specialization || '');
  const [clinicName, setClinicName] = useState(doctor.clinic_name || '');
  const [consultationFee, setConsultationFee] = useState(doctor.consultation_fee || 400);
  const [city, setCity] = useState(doctor.city || '');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
        })
        .eq('id', doctor.id);

      if (error) {
        throw error;
      }

      setMessage({
        type: 'success',
        text: isAr ? 'تم تحديث بيانات الطبيب بنجاح' : 'Doctor profile updated successfully',
      });
      
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

  return (
    <div className="glass-panel rounded-3xl p-6 border border-teal-500/20 text-right space-y-6">
      <div>
        <h3 className="text-lg font-black text-white">
          {isAr ? 'إعدادات ملف الطبيب' : 'Doctor Profile Settings'}
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          {isAr
            ? 'قم بتحديث الاسم والتخصص ومعلومات العيادة وقيمة الكشف الخاصة بك.'
            : 'Update your name, specialization, clinic info, and consultation fee.'}
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
          className="w-full py-3 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-[#070e12] font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md shadow-teal-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التغييرات' : 'Save Changes')}
        </button>
      </form>
    </div>
  );
}
