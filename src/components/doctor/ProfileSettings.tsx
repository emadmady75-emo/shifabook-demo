'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { SupabaseDoctor } from '@/app/doctor/page';
import { useBooking } from '@/components/BookingContext';

interface ProfileSettingsProps {
  doctor: SupabaseDoctor;
  language: 'ar' | 'en';
  activeSection?: 'profile' | 'password' | null;
}

export default function ProfileSettings({ doctor, language, activeSection = 'profile' }: ProfileSettingsProps) {
  const isAr = language === 'ar';
  const router = useRouter();
  const supabase = createClient();
  const { refreshProfile } = useBooking();

  // Profile fields states
  const [fullName, setFullName] = useState(doctor.full_name || '');
  const [specialization, setSpecialization] = useState(doctor.specialization || '');
  const [clinicName, setClinicName] = useState(doctor.clinic_name || '');
  const [consultationFee, setConsultationFee] = useState(doctor.consultation_fee ?? 0);
  const [city, setCity] = useState(doctor.city || '');
  const [handle, setHandle] = useState(doctor.handle || '');
  const [savedHandle, setSavedHandle] = useState(doctor.handle || '');
  const [clinicMapUrl, setClinicMapUrl] = useState(doctor.clinic_map_url || '');

  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(doctor.profile_image_url || '');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Synchronize state when doctor prop changes
  React.useEffect(() => {
    setFullName(doctor.full_name || '');
    setSpecialization(doctor.specialization || '');
    setClinicName(doctor.clinic_name || '');
    setConsultationFee(doctor.consultation_fee ?? 0);
    setCity(doctor.city || '');
    setPreviewUrl(doctor.profile_image_url || '');
    setHandle(doctor.handle || '');
    setSavedHandle(doctor.handle || '');
    setClinicMapUrl(doctor.clinic_map_url || '');
  }, [doctor]);

  // Password fields states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type: allowed: jpg, jpeg, png, webp.
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];

    if (!allowedMimeTypes.includes(file.type) && !allowedExts.includes(fileExt || '')) {
      setUploadError(isAr 
        ? 'نوع الملف غير مسموح. الأنواع المسموحة هي: JPG, JPEG, PNG, WEBP' 
        : 'File type not allowed. Allowed types are: JPG, JPEG, PNG, WEBP');
      return;
    }

    // Validate size: max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(isAr 
        ? 'حجم الصورة يتعدى 5 ميجابايت. يرجى اختيار صورة أصغر.' 
        : 'Image size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
    // Create live preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setUploadError(null);

    // Validate handle format: lowercase only, letters, numbers, hyphens only, no spaces.
    if (handle.trim() !== '') {
      const handleRegex = /^[a-z0-9-]+$/;
      if (!handleRegex.test(handle)) {
        setMessage({
          type: 'error',
          text: isAr 
            ? 'معرف رابط الحجز يجب أن يحتوي على أحرف صغيرة وأرقام وشرطة (-) فقط وبدون مسافات.' 
            : 'Booking Link Handle must contain lowercase letters, numbers, and hyphens (-) only, with no spaces.'
        });
        setLoading(false);
        return;
      }
    }

    // Validate Google Maps Clinic Link: optional, but if entered, must start with http:// or https://
    if (clinicMapUrl.trim() !== '') {
      if (!/^https?:\/\//i.test(clinicMapUrl.trim())) {
        setMessage({
          type: 'error',
          text: isAr 
            ? 'رابط موقع العيادة يجب أن يبدأ بـ http:// أو https://' 
            : 'Google Maps Clinic Link must start with http:// or https://'
        });
        setLoading(false);
        return;
      }
    }

    let finalProfileImageUrl = doctor.profile_image_url || null;

    try {
      // If a new file is selected, upload it first to storage
      if (selectedFile) {
        setUploading(true);
        const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `doctors/${doctor.id}/profile-${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('doctor-images')
          .upload(fileName, selectedFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadErr) {
          console.error('Supabase Storage upload error details:', {
            message: uploadErr.message,
            error: uploadErr
          });

          // Check if RLS policy is blocking the upload
          const isPolicyError = uploadErr.message?.includes('policy') || uploadErr.message?.includes('permission') || (uploadErr as any).status === 403;
          if (isPolicyError) {
            throw new Error(isAr 
              ? 'فشل رفع الصورة بسبب سياسة الحماية (RLS). يرجى التأكد من تفعيل سياسات رفع الصور.' 
              : 'Failed to upload image due to RLS policies. Please ensure public upload policies are enabled.');
          } else {
            throw new Error(isAr 
              ? `فشل رفع الصورة: ${uploadErr.message || ''}` 
              : `Failed to upload image: ${uploadErr.message || ''}`);
          }
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('doctor-images')
          .getPublicUrl(fileName);

        finalProfileImageUrl = publicUrl;
      }

      const { error } = await supabase
        .from('doctors')
        .update({
          full_name: fullName,
          specialization,
          clinic_name: clinicName,
          consultation_fee: Number(consultationFee),
          city,
          profile_image_url: finalProfileImageUrl,
          handle: handle.trim() || null,
          clinic_map_url: clinicMapUrl.trim() || null
        })
        .eq('id', doctor.id);

      if (error) {
        throw error;
      }

      setMessage({
        type: 'success',
        text: isAr ? 'تم تحديث بيانات الطبيب بنجاح' : 'Doctor profile updated successfully',
      });
      setSavedHandle(handle.trim());
      
      // Update global context state instantly
      if (refreshProfile) {
        await refreshProfile();
      }

      // Refresh the page data server-side
      router.refresh();
      // Reset selected file state after successful save
      setSelectedFile(null);
    } catch (err: any) {
      console.error('Error updating doctor profile details:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        error: err
      });

      const isUniqueError = err?.code === '23505' || err?.message?.includes('duplicate key') || err?.message?.includes('unique constraint');
      const isMissingColumn = 
        err?.code === 'PGRST111' || 
        (err?.message && (
          err.message.toLowerCase().includes('profile_image_url') || 
          err.message.toLowerCase().includes('handle') || 
          (err.message.toLowerCase().includes('column') && err.message.toLowerCase().includes('not found'))
        ));

      if (isUniqueError) {
        setMessage({
          type: 'error',
          text: isAr
            ? 'معرف رابط الحجز مستخدم بالفعل من قبل طبيب آخر. يرجى اختيار معرف فريد.'
            : 'This Booking Link Handle is already in use by another doctor. Please choose a unique handle.'
        });
      } else if (isMissingColumn) {
        const isHandleMissing = err.message?.toLowerCase().includes('handle');
        setMessage({
          type: 'error',
          text: isHandleMissing
            ? (isAr 
                ? 'يجب تشغيل ملف الهجرة لإضافة حقل معرف الحجز في قاعدة البيانات أولاً' 
                : 'The doctor booking handle column must be added to the database first (run the migration script)')
            : (isAr 
                ? 'يجب إضافة حقل صورة الطبيب في قاعدة البيانات أولاً' 
                : 'The doctor profile image column must be added to the database first'),
        });
      } else {
        setMessage({
          type: 'error',
          text: isAr ? `فشل تحديث البيانات: ${err.message || ''}` : `Failed to update profile: ${err.message || ''}`,
        });
      }
    } finally {
      setLoading(false);
      setUploading(false);
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

      // Clear the password_reset_required flag if they change password inside Settings
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('clinic_users')
          .update({ password_reset_required: false })
          .eq('auth_user_id', user.id);
      }

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
      <div className={`glass-panel rounded-3xl p-6 border border-teal-500/20 text-right space-y-6 ${activeSection === 'profile' ? '' : 'hidden'}`}>
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

          {/* Direct Booking URL Display */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block text-right">
              {isAr ? 'رابط الحجز المباشر' : 'Direct Booking URL'}
            </label>
            {savedHandle ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const url = typeof window !== 'undefined' ? `${window.location.origin}/book/${savedHandle}` : `shifabook.com/book/${savedHandle}`;
                    navigator.clipboard.writeText(url);
                    if (typeof window !== 'undefined') {
                      window.alert(isAr ? 'تم نسخ الرابط إلى الحافظة!' : 'Link copied to clipboard!');
                    }
                  }}
                  className="px-4 py-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-bold hover:bg-teal-500/20 active:scale-95 transition-all whitespace-nowrap"
                >
                  {isAr ? 'نسخ الرابط' : 'Copy Link'}
                </button>
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/book/${savedHandle}` : `shifabook.com/book/${savedHandle}`}
                  className="w-full px-4 py-3 rounded-xl bg-[#070e12] border border-teal-950/30 text-teal-400 text-sm transition-colors text-left font-mono"
                />
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-400 text-xs font-bold text-right">
                {isAr ? 'لم يتم إعداد معرف الحجز للطبيب بعد' : 'Doctor booking handle is not configured yet'}
              </div>
            )}
          </div>

          {/* Editable Handle Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block text-right">
              {isAr ? 'معرف رابط الحجز' : 'Booking Link Handle'}
            </label>
            <input
              type="text"
              value={handle}
              placeholder="dr-ahmed"
              onChange={(e) => {
                // Lowercase letters, numbers, hyphen only, no spaces.
                const val = e.target.value.toLowerCase().replace(/\s+/g, '');
                setHandle(val);
              }}
              className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-right font-mono"
            />
            <p className="text-[10px] text-slate-500 text-right">
              {isAr 
                ? 'الأحرف الصغيرة، الأرقام، والشرطة (-) فقط. بدون مسافات.' 
                : 'Lowercase letters, numbers, and hyphens (-) only. No spaces.'}
            </p>
          </div>

          {/* Doctor Profile Photo Upload */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 block text-right">
              {isAr ? 'صورة الطبيب الشخصية' : 'Doctor Profile Photo'}
            </label>

            {uploadError && (
              <div className="p-3.5 rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-400 text-xs font-bold text-right">
                {uploadError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row-reverse items-center justify-between gap-5 p-4 rounded-2xl bg-[#09151e] border border-teal-950/60">
              {/* Image Preview */}
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-800 border-2 border-teal-500/30 flex-shrink-0 flex items-center justify-center shadow-md">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Profile Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : null}
                {!previewUrl && (
                  <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="w-5 h-5 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="text-center sm:text-right space-y-2.5">
                <input
                  type="file"
                  id="profile-image-file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('profile-image-file')?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-teal-500/20 bg-teal-500/5 text-teal-300 font-extrabold text-xs hover:bg-teal-500/10 hover:border-teal-500/30 transition-all active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  {isAr ? 'تغيير الصورة' : 'Change Image'}
                </button>
                <p className="text-[10px] text-slate-500">
                  {isAr 
                    ? 'الحد الأقصى للملف: 5 ميجابايت. الصيغ المدعومة: JPG, PNG, WEBP.' 
                    : 'Max file size: 5MB. Supported formats: JPG, PNG, WEBP.'}
                </p>
              </div>
            </div>
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
              {isAr ? 'قيمة الكشف' : 'Consultation Fee'}
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

          {/* Google Maps Clinic Link */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {isAr ? 'رابط موقع العيادة على خرائط Google' : 'Google Maps Clinic Link'}
            </label>
            <input
              type="url"
              placeholder={isAr ? 'مثال: https://maps.google.com/?q=...' : 'Example: https://maps.google.com/?q=...'}
              value={clinicMapUrl}
              onChange={(e) => setClinicMapUrl(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-right font-sans"
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
      <div className={`glass-panel rounded-3xl p-6 border border-teal-500/20 text-right space-y-6 ${activeSection === 'password' ? '' : 'hidden'}`}>
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
