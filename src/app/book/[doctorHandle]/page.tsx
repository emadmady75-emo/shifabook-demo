'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DaySelector from '@/components/booking/DaySelector';
import BookingGrid from '@/components/booking/BookingGrid';
import BookingModal from '@/components/booking/BookingModal';
import RescheduleAlert from '@/components/booking/RescheduleAlert';
import { useBooking, PatientBooking, getActorArabicLabel, getQueueCode } from '@/components/BookingContext';
import { formatDateOnly } from '@/lib/dates';

export default function DoctorPublicBookingPage() {
  const params = useParams();
  const handle = params?.doctorHandle as string;

  const { language, doctorProfile, activeBookingId, bookings, fetchPublicAvailability, selectedFacility, setSelectedFacility, phoneVerified, scheduleConfig, resolveDoctorByHandle } = useBooking();
  const isAr = language === 'ar';

  const [isDoctorLoading, setIsDoctorLoading] = useState(true);
  const [doctorError, setDoctorError] = useState<string | null>(null);

  React.useEffect(() => {
    if (handle) {
      setIsDoctorLoading(true);
      resolveDoctorByHandle(handle)
        .then((success) => {
          if (!success) {
            setDoctorError(isAr ? 'الطبيب غير موجود' : 'Doctor not found');
          }
        })
        .catch((err) => {
          console.error(err);
          setDoctorError(err?.message || 'Error');
        })
        .finally(() => {
          setIsDoctorLoading(false);
        });
    }
  }, [handle, isAr]);

  React.useEffect(() => {
    if (doctorProfile?.id) {
      fetchPublicAvailability(doctorProfile.id);
    }
  }, [doctorProfile?.id, selectedFacility.id]);

  if (isDoctorLoading) {
    return (
      <div className="flex-grow bg-[#050b0f] min-h-screen flex items-center justify-center text-teal-400 font-bold">
        {isAr ? 'جاري تحميل بيانات الطبيب...' : 'Loading doctor details...'}
      </div>
    );
  }

  if (doctorError || !doctorProfile?.id) {
    return (
      <div className="flex-grow bg-[#050b0f] min-h-screen flex flex-col items-center justify-center text-white space-y-4">
        <h1 className="text-2xl font-black text-rose-500">{isAr ? 'خطأ في العثور على الطبيب' : 'Doctor Not Found'}</h1>
        <p className="text-sm text-slate-400">{doctorError || (isAr ? 'عذراً، لم نتمكن من العثور على الصفحة المطلوبة.' : 'Sorry, the requested page could not be found.')}</p>
      </div>
    );
  }

  const [selectedDate, setSelectedDate] = useState<string>(
    formatDateOnly(new Date())
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  // State for Booking Modal / Success Receipt
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [lastCompletedBooking, setLastCompletedBooking] = useState<PatientBooking | null>(null);

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    setIsModalOpen(true);
  };

  const handleBookingSuccess = (booking: PatientBooking) => {
    setLastCompletedBooking(booking);
    setIsModalOpen(false);
    setSelectedTime(null);
    setIsRescheduling(false);
  };

  const handleTriggerReschedule = () => {
    setIsRescheduling(true);
    document.getElementById('public-booking-grid-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClearActiveBooking = () => {
    setIsRescheduling(false);
    setLastCompletedBooking(null);
  };

  // Convert handle to nice name for customization
  const getDoctorDisplayName = () => {
    return isAr ? doctorProfile.name : doctorProfile.nameEn;
  };

  const formatPeriodTime = (timeStr: string) => {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
      return '';
    }
    const [h, m] = timeStr.split(':');
    const hr = parseInt(h);
    if (isNaN(hr)) return '';
    const suffix = isAr ? (hr >= 12 ? 'م' : 'ص') : (hr >= 12 ? 'PM' : 'AM');
    const displayHr = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
    return `${displayHr}:${m} ${suffix}`;
  };

  return (
    <>
      <Navbar />

      <main className="flex-grow bg-[#050b0f] min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Custom Doctor Banner Card */}
          <div className="glass-panel rounded-3xl p-8 border border-teal-500/20 relative overflow-hidden text-right shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              
              <div className="flex flex-col md:flex-row items-start gap-6">
                {/* Avatar */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doctorProfile.avatar}
                  alt={getDoctorDisplayName()}
                  className="w-28 h-28 md:w-32 md:h-32 rounded-3xl object-cover border-3 border-teal-500/25 shadow-xl shadow-black/50"
                />
                
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-400 text-xs border border-teal-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 glow-active" />
                    <span>{isAr ? 'حجز فوري مباشر' : 'Direct Instant Booking'}</span>
                  </div>

                  <h1 className="text-3xl font-black text-white">
                    {getDoctorDisplayName()}
                  </h1>

                  <p className="text-sm font-bold text-teal-400">
                    {isAr ? doctorProfile.title : doctorProfile.titleEn}
                  </p>

                  <p className="text-xs text-slate-300 font-bold">
                    {isAr ? doctorProfile.hospital : doctorProfile.hospitalEn}
                    {doctorProfile.city ? ` - ${doctorProfile.city}` : ''}
                  </p>

                  <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                    {isAr ? doctorProfile.specialization : doctorProfile.specializationEn}
                  </p>
                </div>
              </div>

              {/* Consultation details badge */}
              <div className="w-full md:w-auto p-5 rounded-2xl bg-teal-950/20 border border-teal-900/40 text-center space-y-2">
                <span className="text-xs text-slate-400 block">{isAr ? 'قيمة الكشف بالعيادة' : 'Clinic Consult Rate'}</span>
                <span className="text-2xl font-black text-white block">
                  {doctorProfile.consultationFee ?? 0} {isAr ? 'ج.م' : 'EGP'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {isAr ? 'تأكيد الحجز فوري عبر الواتساب' : 'WhatsApp Confirmed'}
                </span>
              </div>

            </div>
          </div>

          {/* Section Header with Trust Steps Strip */}
          <div id="public-booking-grid-section" className="text-center space-y-4 max-w-3xl mx-auto mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-teal-500/20 bg-teal-500/5 text-teal-300 text-xs font-bold mb-1">
              <svg className="w-3.5 h-3.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {isAr ? 'خريطة المقاعد التفاعلية للمواعيد' : 'Interactive Seat Map for Booking'}
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
              {isAr ? 'اختر مقعد كشفك واحجز في ثوانٍ' : 'Select Your Seat & Book Instantly'}
            </h2>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-950/30 border border-teal-900/40 text-xs font-semibold text-teal-400">
              <span>✈️</span>
              <span>{isAr ? 'مفهوم حجز مقاعد الطيران: كل مقعد = موعد فردي مخصص مع الطبيب' : 'Flight-style seating: Each seat = a dedicated 1-on-1 consultation slot'}</span>
            </div>

            {/* Three-step trust/explanation strip */}
            <div className="grid grid-cols-3 gap-2 max-w-xl mx-auto pt-4 text-xs font-bold" dir={isAr ? "rtl" : "ltr"}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-900/30 border border-teal-950/30 text-slate-300">
                <span className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-300 flex items-center justify-center text-[10px] font-black border border-teal-500/25">١</span>
                <span>{isAr ? 'اختار اليوم والفرع' : 'Choose Day & Branch'}</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-900/30 border border-teal-950/30 text-slate-300">
                <span className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-300 flex items-center justify-center text-[10px] font-black border border-teal-500/25">٢</span>
                <span>{isAr ? 'اختار مقعد الحجز' : 'Select Seating Slot'}</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-900/30 border border-teal-950/30 text-slate-300">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-300 flex items-center justify-center text-[10px] font-black border border-emerald-500/25">٣</span>
                <span>{isAr ? 'تأكيد واتساب فوري' : 'Instant WhatsApp Confirm'}</span>
              </div>
            </div>
          </div>

          {/* Rescheduling Active Banner Alert */}
          <RescheduleAlert 
            onTriggerReschedule={handleTriggerReschedule} 
            onClear={handleClearActiveBooking}
          />

          {/* Core Booking Interface grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              
              {/* Day Date & Branch Selector */}
              <div className="lg:col-span-4 lg:sticky lg:top-24">
                <div className="glass-panel rounded-3xl p-6 border border-teal-500/20">
                  {/* Clinic Location Info */}
                  <div className="mb-6 pb-6 border-b border-teal-500/10">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                      {isAr ? 'مقر العيادة' : 'Clinic Location'}
                    </label>
                    <div className="p-4 rounded-2xl bg-teal-950/10 border border-teal-900/20 text-right space-y-1.5">
                      <p className="text-sm font-bold text-teal-300">
                        {isAr ? selectedFacility.name : selectedFacility.nameEn}
                      </p>
                      
                      {/* Address and Google Maps Link */}
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-teal-950/40">
                        <span>
                          {isAr ? selectedFacility.address : selectedFacility.addressEn}
                        </span>
                        <a
                          href={selectedFacility.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {isAr ? 'عرض الخريطة' : 'View Map'}
                        </a>
                      </div>
                    </div>
                  </div>

                  <DaySelector 
                    selectedDate={selectedDate} 
                    onSelectDate={(d) => {
                      setSelectedDate(d);
                      setSelectedTime(null);
                    }} 
                  />
                </div>
              </div>

              {/* Airline Seat Selection Time Grid */}
              <div className="lg:col-span-8 glass-panel rounded-3xl p-6 border border-teal-500/20">
                <BookingGrid 
                  selectedDate={selectedDate} 
                  selectedTime={selectedTime} 
                  onSelectTime={handleSelectTime} 
                />
              </div>

            </div>

        </div>

        {/* Interactive Booking Modal dialog */}
        {isModalOpen && selectedTime && (
          <BookingModal
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedTime(null);
            }}
            onSuccess={handleBookingSuccess}
            isRescheduling={isRescheduling}
            rescheduleBookingId={activeBookingId}
          />
        )}

        {/* Completed Booking Success Overlay Dialog */}
        {lastCompletedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={handleClearActiveBooking} className="absolute inset-0 bg-[#04080b]/95 backdrop-blur-md" />
            
            <div className="relative w-full max-w-md glass-panel rounded-3xl overflow-hidden shadow-2xl z-10 border border-teal-400 text-center p-6 sm:p-8 space-y-5 sm:space-y-6 animate-in fade-in zoom-in-95 duration-200">
              
              {/* Success Badge */}
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mx-auto glow-active">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Title Header */}
              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {isRescheduling 
                    ? (isAr ? 'تم نقل موعدك بنجاح!' : 'Slot relocated successfully!')
                    : (isAr ? 'تهانينا! تم تأكيد حجزك' : 'Congratulations! Slot Confirmed')}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isAr 
                    ? 'لقد قمنا بإرسال تفاصيل التذكرة وتأكيد الحجز فوراً عبر جوالك على الواتساب.' 
                    : 'We have dispatched the ticket information directly to your mobile phone via WhatsApp.'}
                </p>
              </div>

              {/* Upgraded Doctor Details Card */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#09151e] border border-teal-950/60 text-right">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doctorProfile.avatar}
                  alt={isAr ? doctorProfile.name : doctorProfile.nameEn}
                  className="w-14 h-14 rounded-xl object-cover border border-teal-500/20 flex-shrink-0"
                />
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] text-slate-500 block">{isAr ? 'الطبيب المعالج:' : 'Consulting Doctor:'}</span>
                  <span className="font-bold text-white text-sm block truncate">{isAr ? doctorProfile.name : doctorProfile.nameEn}</span>
                  <span className="text-xs text-teal-400 block truncate">{isAr ? doctorProfile.title : doctorProfile.titleEn}</span>
                </div>
              </div>

              {/* Receipt Ticket Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#09151e] border border-teal-950 text-right space-y-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-16 h-16 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />
                
                <div className="flex justify-between border-b border-teal-950/60 pb-2.5 text-xs text-slate-400">
                  <span>{isAr ? 'كود الحجز:' : 'Booking Reference:'}</span>
                  <span className="font-mono font-bold text-white uppercase">{lastCompletedBooking.id.substring(5, 12)}</span>
                </div>

                <div className="flex justify-between border-b border-teal-950/60 pb-2.5 text-xs text-slate-400">
                  <span>{isAr ? 'رقم الدور:' : 'Queue Number:'}</span>
                  <span className="font-bold text-teal-400 font-mono text-sm">{lastCompletedBooking.queue_code || getQueueCode(lastCompletedBooking.date, lastCompletedBooking.timeSlot, scheduleConfig, bookings)}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 block">{isAr ? 'المريض المستفيد:' : 'Patient Name:'}</span>
                  <span className="font-bold text-slate-200 block text-sm">{lastCompletedBooking.patientName}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 block">{isAr ? 'اليوم المختار:' : 'Selected Date:'}</span>
                    <span className="font-bold text-slate-200 block text-xs">{lastCompletedBooking.date}</span>
                  </div>
                  <div className="space-y-1 text-left">
                    <span className="text-[10px] text-slate-500 block">{isAr ? 'توقيت المقعد:' : 'Seat Slot:'}</span>
                    <span className="font-bold text-teal-300 block text-xs">{formatPeriodTime(lastCompletedBooking.timeSlot)}</span>
                  </div>
                </div>

                {lastCompletedBooking.facilityName && (
                  <div className="pt-2.5 border-t border-teal-950/60 text-right space-y-1">
                    <span className="text-[10px] text-slate-500 block">{isAr ? 'الفرع وعنوان العيادة:' : 'Clinic Branch & Address:'}</span>
                    <span className="font-bold text-slate-200 block text-xs">{lastCompletedBooking.facilityName}</span>
                    {lastCompletedBooking.facilityAddress && (
                      <span className="text-slate-400 block text-[11px] leading-relaxed">{lastCompletedBooking.facilityAddress}</span>
                    )}
                  </div>
                )}

                {lastCompletedBooking.rescheduled_by && (
                  <div className="pt-2.5 border-t border-teal-950/60 text-right space-y-1">
                    <span className="text-[10px] text-slate-500 block">{isAr ? 'جهة التعديل:' : 'Modified By:'}</span>
                    <span className="font-bold text-slate-200 block text-xs">
                      {getActorArabicLabel(lastCompletedBooking.rescheduled_by, isAr ? 'ar' : 'en')}
                    </span>
                  </div>
                )}

                <div className="pt-2.5 border-t border-teal-950/60 flex items-center justify-between text-xs text-slate-400">
                  <span>{isAr ? 'حالة التذكرة:' : 'Ticket status:'}</span>
                  <span className="font-bold text-emerald-400">
                    {isAr ? '✓ مؤكد ومجدول' : '✓ Scheduled'}
                  </span>
                </div>
              </div>

              {/* Maps & WhatsApp Upgraded Actions */}
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={lastCompletedBooking.facilityMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl border border-teal-500/30 bg-teal-950/10 text-teal-300 font-bold text-xs hover:bg-teal-950/30 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4 text-teal-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{isAr ? 'اتجاهات الخريطة' : 'Map Directions'}</span>
                </a>
                
                <a
                  href={`https://wa.me/201012345678?text=${encodeURIComponent(
                    isAr 
                      ? `السلام عليكم، أنا المريض ${lastCompletedBooking.patientName}، أود تأكيد موعدي مع ${doctorProfile.name} بتاريخ ${lastCompletedBooking.date} الساعة ${formatPeriodTime(lastCompletedBooking.timeSlot)} (رقم الحجز: ${lastCompletedBooking.id.substring(5, 12)}).`
                      : `Hello, I am ${lastCompletedBooking.patientName}, confirming my appointment with ${doctorProfile.nameEn} on ${lastCompletedBooking.date} at ${formatPeriodTime(lastCompletedBooking.timeSlot)} (Ref: ${lastCompletedBooking.id.substring(5, 12)}).`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl bg-emerald-500 text-[#070e12] font-black text-xs hover:bg-emerald-400 hover:scale-[1.01] transition-all shadow-md shadow-emerald-500/10"
                >
                  <svg className="w-4 h-4 text-[#070e12] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.896 0c3.181.001 6.171 1.242 8.423 3.496 2.253 2.253 3.495 5.244 3.495 8.428 0 6.577-5.325 11.902-11.897 11.902-2.003-.001-3.974-.509-5.719-1.48L0 24zm6.59-4.846c1.6.95 3.197 1.48 4.793 1.48 5.485 0 9.948-4.463 9.948-9.948 0-2.656-1.034-5.152-2.91-7.03C16.545 1.77 14.05 .735 11.9 0c-5.487 0-9.95 4.463-9.95 9.948-.002 1.83.473 3.614 1.378 5.18l-1.012 3.693 3.791-.995c1.52.88 3.175 1.328 4.73 1.328zm10.745-6.666c-.28-.14-1.657-.818-1.914-.91-.256-.093-.443-.14-.63.14-.187.28-.724.91-.887 1.096-.164.186-.327.21-.607.07-.28-.14-1.183-.436-2.254-1.393-.833-.743-1.395-1.66-1.558-1.94-.163-.28-.018-.43.122-.57.126-.126.28-.327.42-.49.14-.163.187-.28.28-.467.093-.187.047-.35-.023-.49-.07-.14-.63-1.517-.863-2.077-.227-.546-.456-.472-.627-.472-.163-.002-.35-.002-.536-.002-.187 0-.49.07-.747.35-.257.28-.98.957-.98 2.333s1.004 2.707 1.144 2.9c.14.186 1.977 3.018 4.79 4.23.67.288 1.19.46 1.597.59.67.214 1.282.184 1.765.11.54-.08 1.657-.677 1.89-1.33.233-.654.233-1.214.163-1.33-.07-.116-.256-.186-.536-.326z"/>
                  </svg>
                  <span>{isAr ? 'تواصل واتساب' : 'WhatsApp Chat'}</span>
                </a>
              </div>

              {/* Close Button */}
              <button
                onClick={handleClearActiveBooking}
                className="w-full py-3 sm:py-3.5 rounded-xl border border-teal-950 bg-teal-950/20 text-slate-300 font-bold text-sm hover:bg-teal-950/50 hover:text-white transition-colors"
              >
                {isAr ? 'إغلاق العرض' : 'Close Ticket'}
              </button>

            </div>
          </div>
        )}

      </main>

      <Footer />
    </>
  );
}
