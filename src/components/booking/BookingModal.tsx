'use client';

import React, { useState } from 'react';
import { useBooking, PatientBooking } from '../BookingContext';

interface BookingModalProps {
  selectedDate: string;
  selectedTime: string;
  onClose: () => void;
  onSuccess: (booking: PatientBooking) => void;
  isRescheduling?: boolean;
  rescheduleBookingId?: string | null;
}

export default function BookingModal({
  selectedDate,
  selectedTime,
  onClose,
  onSuccess,
  isRescheduling = false,
  rescheduleBookingId = null
}: BookingModalProps) {
  const { 
    language, 
    bookAppointment, 
    rescheduleAppointment, 
    bookings,
    verifiedPhone,
    verifiedName,
    setPhoneVerified,
    phoneVerified,
    checkPhoneBookings
  } = useBooking();

  const isAr = language === 'ar';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');

  const [intakePhone, setIntakePhone] = useState('');
  const [intakeError, setIntakeError] = useState('');
  const [intakeLoading, setIntakeLoading] = useState(false);

  // Prefill phone and name states based on context/rescheduling settings
  React.useEffect(() => {
    if (isRescheduling && rescheduleBookingId) {
      const existing = bookings.find(b => b.id === rescheduleBookingId);
      if (existing) {
        setName(existing.patientName);
        setPhone(existing.mobileNumber);
      }
    } else {
      setPhone(verifiedPhone);
      setName(verifiedName);
    }
  }, [isRescheduling, rescheduleBookingId, bookings, verifiedPhone, verifiedName]);

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntakeError('');

    const { translateDigits } = await import('@/lib/phone');
    const translated = translateDigits(intakePhone);
    let cleaned = translated.replace(/[\s\-]/g, '');

    if (cleaned.startsWith('+20')) {
      cleaned = '0' + cleaned.slice(3);
    } else if (cleaned.startsWith('20') && cleaned.length === 12) {
      cleaned = '0' + cleaned.slice(2);
    }

    const phoneRegex = /^01[0125][0-9]{8}$/;
    if (!phoneRegex.test(cleaned)) {
      setIntakeError(
        isAr 
          ? 'برجاء إدخال رقم موبايل مصري صحيح مثل 01012345678' 
          : 'Please enter a valid Egyptian mobile number (e.g. 01012345678)'
      );
      return;
    }

    setIntakeLoading(true);
    try {
      const { activeBooking: foundActive } = await checkPhoneBookings(translated);
      if (foundActive) {
        onClose();
      }
    } catch (err) {
      console.error('Phone check error:', err);
      setIntakeError(
        isAr 
          ? 'عذراً، حدث خطأ أثناء التحقق. يرجى المحاولة مرة أخرى.' 
          : 'Error checking phone. Please try again.'
      );
    } finally {
      setIntakeLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    if (!phoneVerified && !isRescheduling) {
      handleIntakeSubmit(e);
    } else {
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOtpError('');

    const finalPhone = isRescheduling ? phone : verifiedPhone;
    const finalName = isRescheduling ? name : (verifiedName || name);

    if (!finalName.trim()) {
      setError(isAr ? 'الرجاء إدخال الاسم الكامل' : 'Please enter your full name');
      return;
    }
    if (finalName.trim().length < 4) {
      setError(isAr ? 'الاسم يجب أن لا يقل عن 4 أحرف' : 'Name must be at least 4 characters');
      return;
    }

    // Step 1: Send OTP code
    if (!showOtp) {
      setLoading(true);
      try {
        const res = await fetch('/api/public/otp/request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ phone: finalPhone })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
          setToken(data.token);
          setShowOtp(true);
        } else {
          setError(data.error || (isAr ? 'فشل إرسال رمز التحقق' : 'Failed to send verification code'));
        }
      } catch (err) {
        console.error('OTP request error:', err);
        setError(isAr ? 'فشل الاتصال بخادم التحقق' : 'OTP server connection failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Step 2: Verify OTP code
    setLoading(true);
    try {
      const res = await fetch('/api/public/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: finalPhone,
          otp: otpInput,
          token
        })
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        setOtpError(data.error || (isAr ? 'رمز التحقق غير صحيح' : 'Incorrect verification code'));
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setOtpError(isAr ? 'فشل الاتصال بخادم التحقق' : 'OTP server verification failed');
      setLoading(false);
      return;
    }

    // Step 3: Complete Booking
    try {
      if (isRescheduling && rescheduleBookingId) {
        const moved = await rescheduleAppointment(rescheduleBookingId, selectedDate, selectedTime);
        if (moved) {
          const updatedBooking = bookings.find(b => b.id === rescheduleBookingId);
          if (updatedBooking) {
            onSuccess({
              ...updatedBooking,
              date: selectedDate,
              timeSlot: selectedTime
            });
          }
        } else {
          setError(isAr ? 'عذراً، هذا المقعد قد امتلأ بالفعل.' : 'Sorry, this seat is fully booked now.');
          setLoading(false);
        }
      } else {
        const newBooking = await bookAppointment(finalName, finalPhone, selectedDate, selectedTime);
        onSuccess(newBooking);
      }
    } catch (err: any) {
      const errMsg = err?.message || '';
      if (errMsg === 'هذا الموعد تم حجزه بالفعل، من فضلك اختر موعدًا آخر') {
        setError(errMsg);
      } else {
        setError(
          isAr 
            ? `حدث خطأ أثناء معالجة الطلب: ${errMsg || 'فشل الاتصال بقاعدة البيانات'}` 
            : `An error occurred: ${errMsg || 'Database connection failed'}`
        );
      }
      setLoading(false);
    }
  };

  const formatPeriodTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':');
    const hr = parseInt(h);
    const suffix = isAr ? (hr >= 12 ? 'م' : 'ص') : (hr >= 12 ? 'PM' : 'AM');
    const displayHr = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
    return `${displayHr}:${m} ${suffix}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark Overlay */}
      <div onClick={onClose} className="absolute inset-0 bg-[#04080b]/90 backdrop-blur-sm" />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md glass-panel rounded-3xl overflow-hidden shadow-2xl z-10 border border-teal-500/20 text-right animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-teal-950/60 flex items-center justify-between">
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <h3 className="text-lg font-black text-white">
            {isRescheduling 
              ? (isAr ? 'نقل / تعديل موعدك' : 'Reschedule Appointment') 
              : (isAr ? 'أدخل تفاصيل الاتصال' : 'Enter Booking Details')}
          </h3>
        </div>

        {/* Selected Slot Summary Box */}
        <div className="mx-6 mt-4 p-4 rounded-2xl bg-teal-950/20 border border-teal-900/40 flex items-center justify-between text-sm">
          <div className="space-y-0.5">
            <span className="text-xs text-slate-400 block">{isAr ? 'التاريخ المختار' : 'Date'}</span>
            <span className="font-bold text-white">{selectedDate}</span>
          </div>
          <div className="space-y-0.5 text-left">
            <span className="text-xs text-slate-400 block">{isAr ? 'الموعد المختار' : 'Time'}</span>
            <span className="font-bold text-teal-300">{formatPeriodTime(selectedTime)}</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
          
          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400">
              ⚠️ {error}
            </div>
          )}

          {!phoneVerified && !isRescheduling ? (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h4 className="text-md font-bold text-white">
                  {isAr ? 'التحقق من رقم الهاتف' : 'Verify Mobile Number'}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isAr 
                    ? 'يرجى إدخال رقم الهاتف للمتابعة وتأكيد الحجز.'
                    : 'Please enter your mobile number to check availability and confirm booking.'}
                </p>
              </div>

              {intakeError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-400 text-center">
                  ⚠️ {intakeError}
                </div>
              )}

              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-slate-300 block">
                  {isAr ? 'رقم الهاتف المحمول' : 'Mobile Number'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={intakePhone}
                    onChange={(e) => {
                      setIntakePhone(e.target.value);
                      setIntakeError('');
                    }}
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

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3.5 rounded-xl border border-teal-950/60 bg-transparent text-slate-300 font-bold text-sm hover:bg-slate-900 hover:text-white transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={intakeLoading}
                  className="flex-[2] py-3.5 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-[#070e12] font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/10"
                >
                  {intakeLoading ? (
                    <div className="w-5 h-5 border-2 border-[#070e12] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{isAr ? 'متابعة' : 'Continue'}</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            showOtp ? (
            <div className="space-y-4 text-center">
              {/* WhatsApp Icon */}
              <div className="mx-auto w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mb-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-10"></span>
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.896 0c3.181.001 6.171 1.242 8.423 3.496 2.253 2.253 3.495 5.244 3.495 8.428 0 6.577-5.325 11.902-11.897 11.902-2.003-.001-3.974-.509-5.719-1.48L0 24zm6.59-4.846c1.6.95 3.197 1.48 4.793 1.48 5.485 0 9.948-4.463 9.948-9.948 0-2.656-1.034-5.152-2.91-7.03C16.545 1.77 14.05 .735 11.9 0c-5.487 0-9.95 4.463-9.95 9.948-.002 1.83.473 3.614 1.378 5.18l-1.012 3.693 3.791-.995c1.52.88 3.175 1.328 4.73 1.328zm10.745-6.666c-.28-.14-1.657-.818-1.914-.91-.256-.093-.443-.14-.63.14-.187.28-.724.91-.887 1.096-.164.186-.327.21-.607.07-.28-.14-1.183-.436-2.254-1.393-.833-.743-1.395-1.66-1.558-1.94-.163-.28-.018-.43.122-.57.126-.126.28-.327.42-.49.14-.163.187-.28.28-.467.093-.187.047-.35-.023-.49-.07-.14-.63-1.517-.863-2.077-.227-.546-.456-.472-.627-.472-.163-.002-.35-.002-.536-.002-.187 0-.49.07-.747.35-.257.28-.98.957-.98 2.333s1.004 2.707 1.144 2.9c.14.186 1.977 3.018 4.79 4.23.67.288 1.19.46 1.597.59.67.214 1.282.184 1.765.11.54-.08 1.657-.677 1.89-1.33.233-.654.233-1.214.163-1.33-.07-.116-.256-.186-.536-.326z"/>
                </svg>
              </div>

              <h4 className="text-md font-bold text-white">
                {isAr ? 'رمز التحقق (OTP) للواتساب' : 'WhatsApp Verification (OTP)'}
              </h4>

              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr 
                  ? `أدخل رمز التحقق المرسل إلى الرقم ${phone} على الواتساب`
                  : `Enter the code sent to ${phone} on WhatsApp`}
              </p>

              {/* OTP Code Input */}
              <div className="max-w-[180px] mx-auto space-y-1.5 pt-2">
                <input
                  type="text"
                  maxLength={4}
                  required
                  placeholder="----"
                  value={otpInput}
                  onChange={(e) => {
                    setOtpInput(e.target.value.replace(/\D/g, ''));
                    setOtpError('');
                  }}
                  className="w-full text-center tracking-[0.5em] pl-[0.5em] font-mono text-xl py-2.5 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>

              {otpError && (
                <p className="text-xs font-semibold text-rose-400 mt-2">
                  ⚠️ {otpError}
                </p>
              )}

              {/* Call to Actions for OTP */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowOtp(false);
                    setOtpInput('');
                    setOtpError('');
                  }}
                  className="flex-1 py-3 rounded-xl border border-teal-950/60 bg-transparent text-slate-300 font-bold text-sm hover:bg-slate-900 hover:text-white transition-colors"
                >
                  {isAr ? 'تعديل الرقم' : 'Edit Number'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-3 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-[#070e12] font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/10"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-[#070e12] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{isAr ? 'تحقق وتأكيد الموعد' : 'Verify & Confirm'}</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Welcome Back Card for Returning Patients */}
              {verifiedName && !isRescheduling && (
                <div className="p-4 rounded-2xl bg-teal-950/10 border border-teal-900/30 text-right space-y-1">
                  <span className="text-[10px] text-slate-500 block">{isAr ? 'مرحباً بك مجدداً:' : 'Welcome back:'}</span>
                  <span className="font-bold text-white text-sm block">{verifiedName}</span>
                  <span className="text-[10px] text-teal-400 block">{isAr ? 'سيتم ربط هذا الموعد بملفك الطبي الحالي تلقائياً.' : 'This appointment will be linked to your medical profile.'}</span>
                </div>
              )}

              {/* Full Name Input (Only if name is not already known) */}
              {(!verifiedName || isRescheduling) && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block text-right">
                    {isAr ? 'الاسم الكامل للمريض' : 'Patient Full Name'}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isRescheduling}
                    placeholder={isAr ? 'مثال: احمد حسن عبد الواحد' : 'e.g. Ahmed Hassan Abd Elwahed'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-right"
                  />
                </div>
              )}

              {/* Mobile Number Input (Read-only since it is already entered) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block text-right">
                  {isAr ? 'رقم الهاتف المحمول' : 'Mobile Phone'}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    disabled
                    value={phone}
                    className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/40 text-slate-400 focus:outline-none text-sm text-right cursor-not-allowed"
                  />
                  <span className={`absolute top-1/2 -translate-y-1/2 text-xs font-bold text-teal-500/50 pointer-events-none ${isAr ? 'left-4' : 'right-4'}`}>
                    {isAr ? 'مؤكد' : 'Verified'}
                  </span>
                </div>
              </div>

              {/* Pricing Info */}
              {!isRescheduling && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-teal-950/30 flex items-center justify-between text-xs text-right">
                  <span className="text-slate-500">{isAr ? 'طريقة الدفع:' : 'Payment mode:'}</span>
                  <span className="font-bold text-slate-300">
                    {isAr ? 'الدفع في العيادة بعد الكشف (500 ج.م)' : 'Pay at Clinic after checkup (500 EGP)'}
                  </span>
                </div>
              )}

              {/* Call to Actions */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3.5 rounded-xl border border-teal-950/60 bg-transparent text-slate-300 font-bold text-sm hover:bg-slate-900 hover:text-white transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-3.5 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-[#070e12] font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/10"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-[#070e12] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{isAr ? 'احصل على رمز التحقق' : 'Get Verification Code'}</span>
                  )}
                </button>
              </div>
            </>
          ))}

        </form>

      </div>
    </div>
  );
}
