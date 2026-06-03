'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DaySelector from '@/components/booking/DaySelector';
import BookingGrid from '@/components/booking/BookingGrid';
import BookingModal from '@/components/booking/BookingModal';
import RescheduleAlert from '@/components/booking/RescheduleAlert';
import { useBooking, PatientBooking } from '@/components/BookingContext';

export default function DoctorPublicBookingPage() {
  const params = useParams();
  const handle = params?.doctorHandle as string;

  const { language, doctorProfile, activeBookingId, bookings, fetchPublicAvailability } = useBooking();
  const isAr = language === 'ar';

  React.useEffect(() => {
    if (doctorProfile?.id) {
      fetchPublicAvailability(doctorProfile.id);
    }
  }, [doctorProfile?.id]);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
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
    if (handle === 'dr-ahmed') {
      return isAr ? doctorProfile.name : doctorProfile.nameEn;
    }
    // fallback or capitalize handle
    const formatted = handle?.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
    return formatted || (isAr ? doctorProfile.name : doctorProfile.nameEn);
  };

  const formatPeriodTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':');
    const hr = parseInt(h);
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
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-teal-500/30"
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
                  {doctorProfile.consultationFee || 400} {isAr ? 'ج.م' : 'EGP'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {isAr ? 'تأكيد الحجز فوري عبر الواتساب' : 'WhatsApp Confirmed'}
                </span>
              </div>

            </div>
          </div>

          {/* Section Header */}
          <div id="public-booking-grid-section" className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {isAr ? 'جدول المواعيد الشاغرة ومقاعد الاستشارة' : 'Available Time Slots & Consultation Seats'}
            </h2>
            <p className="text-xs text-slate-400">
              {isAr 
                ? 'استخدم المخطط البصري بالأسفل لتحديد المقعد والوقت المناسب لك.' 
                : 'Use the interactive visual layout below to select your seat slot.'}
            </p>
          </div>

          {/* Rescheduling Active Banner Alert */}
          <RescheduleAlert 
            onTriggerReschedule={handleTriggerReschedule} 
            onClear={handleClearActiveBooking}
          />

          {/* Core Booking Interface grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Day Date Selector */}
            <div className="lg:col-span-4 lg:sticky lg:top-24">
              <div className="glass-panel rounded-3xl p-6 border border-teal-500/20">
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
            
            <div className="relative w-full max-w-md glass-panel rounded-3xl overflow-hidden shadow-2xl z-10 border border-teal-400 text-center p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
              
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mx-auto glow-active">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white">
                  {isRescheduling 
                    ? (isAr ? 'تم نقل موعدك بنجاح!' : 'Slot relocated successfully!')
                    : (isAr ? 'تهانينا! تم تأكيد حجزك' : 'Congratulations! Slot Confirmed')}
                </h3>
                <p className="text-xs text-slate-400">
                  {isAr 
                    ? 'لقد قمنا بإرسال تفاصيل التذكرة وتأكيد الحجز فوراً عبر جوالك على الواتساب.' 
                    : 'We have dispatched the ticket information directly to your mobile phone via WhatsApp.'}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#09151e] border border-teal-950 text-right space-y-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-16 h-16 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />
                
                <div className="flex justify-between border-b border-teal-950/60 pb-2.5 text-xs text-slate-400">
                  <span>{isAr ? 'كود الحجز:' : 'Booking Reference:'}</span>
                  <span className="font-mono font-bold text-white uppercase">{lastCompletedBooking.id.substring(5, 12)}</span>
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

                <div className="pt-2.5 border-t border-teal-950/60 flex items-center justify-between text-xs text-slate-400">
                  <span>{isAr ? 'حالة التذكرة:' : 'Ticket status:'}</span>
                  <span className="font-bold text-emerald-400">
                    {isAr ? '✓ مؤكد ومجدول' : '✓ Scheduled'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleClearActiveBooking}
                className="w-full py-3.5 rounded-xl bg-teal-500 text-teal-950 font-black text-sm hover:bg-teal-400 transition-colors shadow-md"
              >
                {isAr ? 'العودة للصفحة الرئيسية' : 'Return to Home'}
              </button>

            </div>
          </div>
        )}

      </main>

      <Footer />
    </>
  );
}
