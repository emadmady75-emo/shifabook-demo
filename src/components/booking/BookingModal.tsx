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
  const { language, bookAppointment, rescheduleAppointment, bookings } = useBooking();
  const isAr = language === 'ar';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');

  // If rescheduling, prefill user's previous info
  React.useEffect(() => {
    if (isRescheduling && rescheduleBookingId) {
      const existing = bookings.find(b => b.id === rescheduleBookingId);
      if (existing) {
        setName(existing.patientName);
        setPhone(existing.mobileNumber);
      }
    }
  }, [isRescheduling, rescheduleBookingId, bookings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOtpError('');

    // Quick validations
    if (!name.trim()) {
      setError(isAr ? 'الرجاء إدخال الاسم الكامل' : 'Please enter your full name');
      return;
    }
    if (name.trim().length < 4) {
      setError(isAr ? 'الاسم يجب أن لا يقل عن 4 أحرف' : 'Name must be at least 4 characters');
      return;
    }
    
    // Normalize Egyptian phone: strip spaces/dashes, convert +20/20 prefix to 0
    let normalizedPhone = phone.replace(/[\s\-]/g, '');
    if (normalizedPhone.startsWith('+20')) normalizedPhone = '0' + normalizedPhone.slice(3);
    else if (normalizedPhone.startsWith('20') && normalizedPhone.length === 12) normalizedPhone = '0' + normalizedPhone.slice(2);

    const phoneRegex = /^01[0125][0-9]{8}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      setError(
        isAr 
          ? 'برجاء إدخال رقم موبايل مصري صحيح مثل 01012345678' 
          : 'Please enter a valid Egyptian mobile number (e.g. 01012345678)'
      );
      return;
    }

    // WhatsApp OTP step
    if (!showOtp) {
      setShowOtp(true);
      return;
    }

    if (otpInput !== '1234') {
      setOtpError(isAr ? 'رمز التحقق غير صحيح، يرجى كتابة الرمز التجريبي 1234' : 'Incorrect code, please enter the demo code 1234');
      return;
    }

    setLoading(true);

    try {
      if (isRescheduling && rescheduleBookingId) {
        // Run rescheduling logic
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
        // Run new booking logic
        const newBooking = await bookAppointment(name, normalizedPhone, selectedDate, selectedTime);
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400">
              ⚠️ {error}
            </div>
          )}

          {showOtp ? (
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

              <div className="p-2.5 bg-slate-900 border border-teal-500/20 rounded-xl max-w-xs mx-auto">
                <span className="text-xs font-semibold text-teal-400">
                  {isAr ? '💡 الرمز التجريبي لتأكيد الحجز: 1234' : '💡 Demo verification code: 1234'}
                </span>
              </div>

              {/* OTP Code Input */}
              <div className="max-w-[180px] mx-auto space-y-1.5">
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
              <div className="pt-2 flex gap-3">
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
              {/* Full Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block text-right">
                  {isAr ? 'الاسم الكامل للمريض' : 'Patient Full Name'}
                </label>
                <input
                  type="text"
                  required
                  disabled={isRescheduling} // Lock name on reschedule to keep history clean
                  placeholder={isAr ? 'مثال: احمد حسن عبد الواحد' : 'e.g. Ahmed Hassan Abd Elwahed'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-right"
                />
              </div>

              {/* Mobile Number Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block text-right">
                  {isAr ? 'رقم الموبايل (لتأكيد الموعد عبر الواتساب)' : 'Mobile Phone (for WhatsApp confirmation)'}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    disabled={isRescheduling}
                    placeholder="01012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-right"
                  />
                  <span className={`absolute top-1/2 -translate-y-1/2 text-xs font-bold text-teal-500/70 pointer-events-none ${isAr ? 'left-4' : 'right-4'}`}>
                    {isAr ? 'موبايل' : 'Mobile'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 text-right">
                  {isAr 
                    ? 'ملاحظة: سنقوم بإرسال تأكيد الحجز الفوري وتذكيرات مجانية لموعدك عبر الواتساب.' 
                    : 'Note: We will send instant confirmation and free reminders directly to your WhatsApp.'}
                </p>
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
                  className="flex-[2] py-3.5 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-[#070e12] font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/10"
                >
                  <span>{isAr ? 'احصل على رمز التحقق' : 'Get Verification Code'}</span>
                </button>
              </div>
            </>
          )}

        </form>

      </div>
    </div>
  );
}
