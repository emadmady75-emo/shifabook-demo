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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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

    setLoading(true);

    try {
      if (isRescheduling && rescheduleBookingId) {
        // Run rescheduling logic
        const moved = rescheduleAppointment(rescheduleBookingId, selectedDate, selectedTime);
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
        const newBooking = bookAppointment(name, normalizedPhone, selectedDate, selectedTime);
        onSuccess(newBooking);
      }
    } catch (err) {
      setError(isAr ? 'حدث خطأ أثناء معالجة الطلب.' : 'An error occurred while processing.');
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

          {/* Full Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {isAr ? 'الاسم الكامل للمريض' : 'Patient Full Name'}
            </label>
            <input
              type="text"
              required
              disabled={isRescheduling} // Lock name on reschedule to keep history clean
              placeholder={isAr ? 'مثال: احمد حسن عبد الواحد' : 'e.g. Ahmed Hassan Abd Elwahed'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors"
            />
          </div>

          {/* Mobile Number Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
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
                className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors"
              />
              <span className={`absolute top-1/2 -translate-y-1/2 text-xs font-bold text-teal-500/70 pointer-events-none ${isAr ? 'left-4' : 'right-4'}`}>
                {isAr ? 'موبايل' : 'Mobile'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {isAr 
                ? 'ملاحظة: سنقوم بإرسال تأكيد الحجز الفوري وتذكيرات مجانية لموعدك عبر الواتساب.' 
                : 'Note: We will send instant confirmation and free reminders directly to your WhatsApp.'}
            </p>
          </div>

          {/* Pricing Info */}
          {!isRescheduling && (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-teal-950/30 flex items-center justify-between text-xs">
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
              ) : isRescheduling ? (
                <span>{isAr ? 'تأكيد نقل الموعد' : 'Confirm Relocation'}</span>
              ) : (
                <span>{isAr ? 'تأكيد الحجز فوراً' : 'Confirm Booking Now'}</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
