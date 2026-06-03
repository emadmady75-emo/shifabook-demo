'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// Data Interfaces
export interface PatientBooking {
  id: string;
  patientName: string;
  mobileNumber: string;
  date: string;       // YYYY-MM-DD
  timeSlot: string;   // HH:MM
  status: 'pending' | 'confirmed' | 'cancelled';
  price: number;      // Revenue Tracking (e.g. 500 EGP)
  createdAt: string;
}

export interface ScheduleConfig {
  workingDays: number[];     // Day indexes (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  startTime: string;        // "HH:MM" e.g., "09:00"
  endTime: string;          // "HH:MM" e.g., "17:00"
  slotDurationMinutes: number; // e.g., 30 minutes
  capacityPerSlot: number;   // Capacity-ready slot model (e.g. 1 or 2 patients per slot)
  pricePerAppointment: number; // For growth/revenue metrics (e.g. 500 EGP)
}

export interface TimeSlot {
  time: string;
  bookings: PatientBooking[];
  capacity: number;
  isBooked: boolean;
  isExpired: boolean;
}

export interface WhatsAppEvent {
  id: string;
  timestamp: string;
  type: 'booking.created' | 'booking.confirmed' | 'booking.reminder_24h' | 'booking.cancelled';
  patientName: string;
  phone: string;
  message: string;
  status: 'sent' | 'delivered' | 'read' | 'replied';
}

export interface DoctorProfile {
  id?: string;
  name: string;
  nameEn: string;
  title: string;
  titleEn: string;
  specialization: string;
  specializationEn: string;
  avatar: string;
  hospital: string;
  hospitalEn: string;
  consultationFee?: number;
  city?: string;
}

interface BookingContextType {
  bookings: PatientBooking[];
  setBookings: React.Dispatch<React.SetStateAction<PatientBooking[]>>;
  scheduleConfig: ScheduleConfig;
  whatsappEvents: WhatsAppEvent[];
  doctorProfile: DoctorProfile;
  activeBookingId: string | null;
  activeBooking: PatientBooking | null;
  language: 'ar' | 'en';
  setLanguage: (lang: 'ar' | 'en') => void;
  updateScheduleConfig: (config: Partial<ScheduleConfig>) => void;
  bookAppointment: (name: string, phone: string, date: string, time: string) => Promise<PatientBooking>;
  rescheduleAppointment: (bookingId: string, newDate: string, newTime: string) => Promise<boolean>;
  cancelAppointment: (bookingId: string) => Promise<void>;
  confirmAttendance: (bookingId: string) => Promise<void>;
  triggerMockWhatsAppEvent: (type: WhatsAppEvent['type'], booking: PatientBooking) => void;
  generateTimeSlotsForDate: (dateStr: string) => TimeSlot[];
  isHydrated: boolean;
  fetchPublicAvailability: (doctorId: string) => Promise<void>;
  isLoadingAvailability: boolean;
  setIsLoadingAvailability: (loading: boolean) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

// Initial Doctor Profile
const INITIAL_DOCTOR: DoctorProfile = {
  name: "د. عبدالله المصري",
  nameEn: "Dr. Ahmed Al-Otaibi",
  title: "استشاري طب وجراحة القلب والأوعية الدموية",
  titleEn: "Consultant Cardiologist & Vascular Surgeon",
  specialization: "طب وجراحة القلب القسطرة التداخلية، وعلاج ارتفاع ضغط الدم الشرياني والأوعية الدموية.",
  specializationEn: "Interventional Cardiology, hypertension management, and arterial disorders.",
  avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=256&h=256&fit=crop",
  hospital: "مستشفى القصر العيني التخصصي",
  hospitalEn: "Shifa Specialized Hospital, Riyadh",
};

// Initial Config
const DEFAULT_CONFIG: ScheduleConfig = {
  workingDays: [0, 1, 2, 3, 4], // Sun to Thu
  startTime: "09:00",
  endTime: "17:00",
  slotDurationMinutes: 30,
  capacityPerSlot: 1, // Capacity-ready slots
  pricePerAppointment: 500, // 500 EGP per booking
};

// Initial Mock Bookings
const INITIAL_BOOKINGS: PatientBooking[] = [];

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<PatientBooking[]>(INITIAL_BOOKINGS);
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>(DEFAULT_CONFIG);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [activeBooking, setActiveBooking] = useState<PatientBooking | null>(null);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>(INITIAL_DOCTOR);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    // Fetch doctor profile from Supabase on mount
    const fetchProfile = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data, error } = await supabase.from('doctors').select('*').limit(1);
        if (!error && data && data.length > 0) {
          const doc = data[0];
          setDoctorProfile({
            id: doc.id,
            name: doc.full_name,
            nameEn: doc.full_name,
            title: doc.specialization,
            titleEn: doc.specialization,
            specialization: doc.specialization,
            specializationEn: doc.specialization,
            avatar: INITIAL_DOCTOR.avatar,
            hospital: doc.clinic_name,
            hospitalEn: doc.clinic_name,
            consultationFee: doc.consultation_fee,
            city: doc.city,
          });
        }
      } catch (err) {
        console.error('Error fetching doctor profile in BookingProvider:', err);
      }
    };
    fetchProfile();

    // Clear legacy shifabook_bookings key
    localStorage.removeItem('shifabook_bookings');

    const storedConfig = localStorage.getItem('shifabook_config');
    const storedActiveId = localStorage.getItem('shifabook_active_booking');
    const storedActiveBooking = localStorage.getItem('shifabook_active_booking_details');
    const storedLang = localStorage.getItem('shifabook_lang');

    if (storedConfig) setScheduleConfig(JSON.parse(storedConfig));
    if (storedActiveId) setActiveBookingId(storedActiveId);
    if (storedActiveBooking) setActiveBooking(JSON.parse(storedActiveBooking));
    if (storedLang) setLanguage(storedLang as 'ar' | 'en');
    
    // Clear old localStorage orphaned WhatsApp events
    localStorage.removeItem('shifabook_wa_events');
    
    setIsHydrated(true);
  }, []);

  const saveConfig = (newConfig: ScheduleConfig) => {
    setScheduleConfig(newConfig);
    localStorage.setItem('shifabook_config', JSON.stringify(newConfig));
  };

  const saveActiveId = (id: string | null) => {
    setActiveBookingId(id);
    if (id) {
      localStorage.setItem('shifabook_active_booking', id);
    } else {
      localStorage.removeItem('shifabook_active_booking');
    }
  };

  const updateScheduleConfig = (config: Partial<ScheduleConfig>) => {
    const updated = { ...scheduleConfig, ...config };
    saveConfig(updated);
  };

  // Helper: Trigger mock WhatsApp messaging events (no-op as events are derived dynamically)
  const triggerMockWhatsAppEvent = (type: WhatsAppEvent['type'], booking: PatientBooking) => {
    // No-op: derived dynamically from active appointments state
  };

  const fetchPublicAvailability = async (doctorId: string) => {
    setIsLoadingAvailability(true);
    try {
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 30);
      const endDate = futureDate.toISOString().split('T')[0];

      const res = await fetch(`/api/public/availability?doctorId=${doctorId}&start=${startDate}&end=${endDate}`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((appt: any, index: number) => ({
          id: `public-appt-${index}`,
          patientName: '',
          mobileNumber: '',
          date: appt.appointment_date,
          timeSlot: appt.appointment_time,
          status: appt.status as any,
          price: scheduleConfig.pricePerAppointment,
          createdAt: new Date().toISOString()
        }));
        setBookings(mapped);
      }
    } catch (err) {
      console.error('Error fetching public availability:', err);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  const bookAppointment = async (name: string, phone: string, date: string, time: string) => {
    // Use local ID for client-side state and localStorage representation only
    const finalId = `appt-${Date.now()}`;

    const doctorId = doctorProfile?.id || null;
    if (!doctorId) {
      console.error("Verification failed: doctor_id is null or undefined in doctorProfile", doctorProfile);
    }

    const payload = {
      doctor_id: doctorId,
      patient_name: name,
      patient_phone: phone,
      appointment_date: date,
      appointment_time: time,
      status: 'pending',
      source: 'web'
    };

    // Supabase insert if doctor ID is available
    if (doctorId) {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        
        const { error } = await supabase
          .from('appointments')
          .insert(payload);

        if (error) {
          if (error.code === '23505') {
            await fetchPublicAvailability(doctorId);
            throw new Error("هذا الموعد تم حجزه بالفعل، من فضلك اختر موعدًا آخر");
          }
          throw new Error(error.message || "Failed to insert appointment into Supabase");
        }

        // Trigger Next.js API route as a secure bridge for WhatsApp notification
        try {
          fetch('/api/public/whatsapp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              doctor_id: doctorId,
              patient_name: name,
              patient_phone: phone,
              appointment_date: date,
              appointment_time: time
            })
          }).catch(err => {
            console.error('Non-blocking WhatsApp API trigger error:', err);
          });
        } catch (webhookErr) {
          console.error('Error invoking WhatsApp API trigger client-side:', webhookErr);
        }
      } catch (err: any) {
        if (err.message === "هذا الموعد تم حجزه بالفعل، من فضلك اختر موعدًا آخر") {
          throw err;
        }
        if (err?.code === '23505' || err?.message?.includes('23505')) {
          await fetchPublicAvailability(doctorId);
          throw new Error("هذا الموعد تم حجزه بالفعل، من فضلك اختر موعدًا آخر");
        }
        console.error('Failed to insert appointment:', err);
        throw err;
      }
    } else {
      throw new Error("No active doctor profile found to book appointment.");
    }

    const newBooking: PatientBooking = {
      id: finalId,
      patientName: name,
      mobileNumber: phone,
      date,
      timeSlot: time,
      status: 'pending',
      price: scheduleConfig.pricePerAppointment,
      createdAt: new Date().toISOString(),
    };

    // Save active booking details for rescheduling banner (separate from grid calculations)
    localStorage.setItem('shifabook_active_booking_details', JSON.stringify(newBooking));
    setActiveBooking(newBooking);
    saveActiveId(newBooking.id);

    // Fetch updated public availability to reflect on the grid immediately
    if (doctorId) {
      await fetchPublicAvailability(doctorId);
    }

    // Trigger WhatsApp simulator
    triggerMockWhatsAppEvent('booking.created', newBooking);

    return newBooking;
  };

  const rescheduleAppointment = async (bookingId: string, newDate: string, newTime: string) => {
    const bookingToMove = activeBooking && activeBooking.id === bookingId ? activeBooking : bookings.find(b => b.id === bookingId);
    if (!bookingToMove) return false;

    // Check if new slot already reached capacity
    const slotsOnNewDate = generateTimeSlotsForDate(newDate);
    const targetSlot = slotsOnNewDate.find(s => s.time === newTime);
    if (targetSlot && targetSlot.isBooked) {
      return false; // Slot full
    }

    // If it's a Supabase UUID (length is 36)
    if (bookingId.length === 36) {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { error } = await supabase
          .from('appointments')
          .update({
            appointment_date: newDate,
            appointment_time: newTime,
            status: 'confirmed'
          })
          .eq('id', bookingId);

        if (error) {
          throw error;
        }
      } catch (err) {
        console.error('Failed to reschedule appointment in Supabase:', err);
        return false;
      }
    }

    const updatedBooking = {
      ...bookingToMove,
      date: newDate,
      timeSlot: newTime,
      status: 'confirmed' as const,
    };
    localStorage.setItem('shifabook_active_booking_details', JSON.stringify(updatedBooking));
    setActiveBooking(updatedBooking);

    // Refresh public availability
    const doctorId = doctorProfile?.id;
    if (doctorId) {
      await fetchPublicAvailability(doctorId);
    }

    return true;
  };

  const cancelAppointment = async (bookingId: string) => {
    const booking = activeBooking && activeBooking.id === bookingId ? activeBooking : bookings.find(b => b.id === bookingId);
    if (!booking) return;

    // If it's a Supabase UUID
    if (bookingId.length === 36) {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', bookingId);
      } catch (err) {
        console.error('Failed to cancel appointment in Supabase:', err);
      }
    }

    localStorage.removeItem('shifabook_active_booking_details');
    setActiveBooking(null);
    saveActiveId(null);

    // Refresh public availability
    const doctorId = doctorProfile?.id;
    if (doctorId) {
      await fetchPublicAvailability(doctorId);
    }
  };

  const confirmAttendance = async (bookingId: string) => {
    // If it's a Supabase UUID
    if (bookingId.length === 36) {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        await supabase
          .from('appointments')
          .update({ status: 'confirmed' })
          .eq('id', bookingId);
      } catch (err) {
        console.error('Failed to confirm attendance in Supabase:', err);
      }
    }

    const updated = bookings.map(b => {
      if (b.id === bookingId) {
        return { ...b, status: 'confirmed' as const };
      }
      return b;
    });
    setBookings(updated);
  };

  // Generate Slots dynamically for a chosen date based on capacity config
  const generateTimeSlotsForDate = (dateStr: string): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday

    // Check if clinic is working on this day of week
    if (!scheduleConfig.workingDays.includes(dayOfWeek)) {
      return []; // Return empty array -> Clinic Closed
    }

    const [startHour, startMin] = scheduleConfig.startTime.split(':').map(Number);
    const [endHour, endMin] = scheduleConfig.endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Filter bookings on this specific day (excluding cancelled)
    const dayBookings = bookings.filter(b => b.date === dateStr && b.status !== 'cancelled');

    // Simulate current mock time context to mark past slots as expired
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = dateStr === todayStr;
    const currentHour = new Date().getHours();
    const currentMin = new Date().getMinutes();
    const currentTotalMin = currentHour * 60 + currentMin;

    for (let m = startMinutes; m < endMinutes; m += scheduleConfig.slotDurationMinutes) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const timeStr = `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

      // Gather bookings in this slot
      const slotBookings = dayBookings.filter(b => b.timeSlot === timeStr);
      
      const isBooked = slotBookings.length >= scheduleConfig.capacityPerSlot;
      const isExpired = isToday && (m < currentTotalMin);

      slots.push({
        time: timeStr,
        bookings: slotBookings,
        capacity: scheduleConfig.capacityPerSlot,
        isBooked,
        isExpired,
      });
    }

    return slots;
  };

  // Dynamically derive WhatsApp logs from bookings (which reflect the Supabase appointments)
  const getDerivedWhatsAppEvents = (): WhatsAppEvent[] => {
    const events: WhatsAppEvent[] = [];

    bookings.forEach(b => {
      // 1. Created Event
      const createdTime = new Date(b.createdAt || Date.now()).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      events.push({
        id: `wa-created-${b.id}`,
        timestamp: createdTime,
        type: 'booking.created',
        patientName: b.patientName,
        phone: b.mobileNumber,
        message: language === 'ar' 
          ? `مرحباً ${b.patientName}، تم تسجيل حجزك المبدئي بنجاح في شفاء بوك بتاريخ ${b.date} الساعة ${b.timeSlot}. يرجى الرد برقم 1 لتأكيد الحضور.`
          : `Hello ${b.patientName}, your appointment has been registered on ${b.date} at ${b.timeSlot}. Please reply with 1 to confirm.`,
        status: b.status === 'pending' ? 'sent' : 'replied'
      });

      // 2. Confirmed Event (if status is confirmed)
      if (b.status === 'confirmed') {
        const confirmedTime = new Date(b.createdAt || Date.now()).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
        events.push({
          id: `wa-confirmed-${b.id}`,
          timestamp: confirmedTime,
          type: 'booking.confirmed',
          patientName: b.patientName,
          phone: b.mobileNumber,
          message: language === 'ar'
            ? `تأكيد: تم تأكيد موعدكم رسمياً بتاريخ ${b.date} الساعة ${b.timeSlot}. نتطلع لرؤيتك.`
            : `Confirmed: Your appointment on ${b.date} at ${b.timeSlot} is now confirmed.`,
          status: 'read'
        });
      }

      // 3. Cancelled Event (if status is cancelled)
      if (b.status === 'cancelled') {
        const cancelledTime = new Date(b.createdAt || Date.now()).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
        events.push({
          id: `wa-cancelled-${b.id}`,
          timestamp: cancelledTime,
          type: 'booking.cancelled',
          patientName: b.patientName,
          phone: b.mobileNumber,
          message: language === 'ar'
            ? `تنبيه: تم إلغاء موعدك المجدول بتاريخ ${b.date} الساعة ${b.timeSlot}.`
            : `Notice: Your scheduled appointment on ${b.date} at ${b.timeSlot} has been cancelled.`,
          status: 'sent'
        });
      }
    });

    // Sort by id descending so the latest is at the top
    return events.sort((a, b) => b.id.localeCompare(a.id)).slice(0, 50);
  };

  return (
    <BookingContext.Provider
      value={{
        bookings,
        setBookings,
        scheduleConfig,
        whatsappEvents: getDerivedWhatsAppEvents(),
        doctorProfile,
        activeBookingId,
        activeBooking,
        language,
        setLanguage: (lang) => {
          setLanguage(lang);
          localStorage.setItem('shifabook_lang', lang);
        },
        updateScheduleConfig,
        bookAppointment,
        rescheduleAppointment,
        cancelAppointment,
        confirmAttendance,
        triggerMockWhatsAppEvent,
        generateTimeSlotsForDate,
        isHydrated,
        fetchPublicAvailability,
        isLoadingAvailability,
        setIsLoadingAvailability,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};

