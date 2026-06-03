'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroSection from '@/components/booking/HeroSection';
import DaySelector from '@/components/booking/DaySelector';
import BookingGrid from '@/components/booking/BookingGrid';
import BookingModal from '@/components/booking/BookingModal';
import RescheduleAlert from '@/components/booking/RescheduleAlert';
import { useBooking, PatientBooking } from '@/components/BookingContext';

export default function PatientLandingPage() {
  const { language, activeBookingId, doctorProfile, fetchPublicAvailability } = useBooking();
  const isAr = language === 'ar';

  React.useEffect(() => {
    if (doctorProfile?.id) {
      fetchPublicAvailability(doctorProfile.id);
    }
  }, [doctorProfile?.id]);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0] // default to today
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
    // Scroll directly to grid
    document.getElementById('booking-grid-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClearActiveBooking = () => {
    setIsRescheduling(false);
    setLastCompletedBooking(null);
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

      <main className="flex-grow">
        
        {/* Premium Value Prop & Doctor Card Hero */}
        <HeroSection />

        {/* Dynamic Booking Workspace Grid Section */}
        <section id="booking-grid-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-8 sm:space-y-12">
          
          {/* Section Header */}
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-teal-500/20 bg-teal-500/5 text-teal-300 text-xs font-bold mb-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {isAr ? 'نظام الحجز الفوري' : 'Instant Booking System'}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              {isAr ? 'اختر موعدك واحجز في ثوانٍ' : 'Pick Your Slot & Book Instantly'}
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
              {isAr 
                ? 'اختر التاريخ المناسب، ثم انقر على أي مقعد شاغر في الخريطة التفاعلية أدناه للمتابعة.' 
                : 'Select a date, then tap any available seat on the interactive map below to continue.'}
            </p>
          </div>

          {/* Reschedule Active Banner Alert */}
          <RescheduleAlert 
            onTriggerReschedule={handleTriggerReschedule} 
            onClear={handleClearActiveBooking}
          />

          {/* Core Booking Selector Grid Container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Day Date Selector (Left) */}
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

            {/* Airline Seat Selection Time Grid (Right) */}
            <div className="lg:col-span-8 glass-panel rounded-3xl p-6 border border-teal-500/20">
              <BookingGrid 
                selectedDate={selectedDate} 
                selectedTime={selectedTime} 
                onSelectTime={handleSelectTime} 
              />
            </div>

          </div>

        </section>

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
              
              {/* Success Badge */}
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mx-auto glow-active">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Copy */}
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

              {/* Receipt Ticket Box */}
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

              {/* CTA button to close success screen */}
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
