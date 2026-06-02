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
  scheduleConfig: ScheduleConfig;
  whatsappEvents: WhatsAppEvent[];
  doctorProfile: DoctorProfile;
  activeBookingId: string | null;
  language: 'ar' | 'en';
  setLanguage: (lang: 'ar' | 'en') => void;
  updateScheduleConfig: (config: Partial<ScheduleConfig>) => void;
  bookAppointment: (name: string, phone: string, date: string, time: string) => PatientBooking;
  rescheduleAppointment: (bookingId: string, newDate: string, newTime: string) => boolean;
  cancelAppointment: (bookingId: string) => void;
  confirmAttendance: (bookingId: string) => void;
  triggerMockWhatsAppEvent: (type: WhatsAppEvent['type'], booking: PatientBooking) => void;
  generateTimeSlotsForDate: (dateStr: string) => TimeSlot[];
  isHydrated: boolean;
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
const INITIAL_BOOKINGS: PatientBooking[] = [
  {
    id: "appt-1",
    patientName: "فيصل محمد",
    mobileNumber: "+966501234567",
    date: new Date().toISOString().split('T')[0], // Today
    timeSlot: "09:30",
    status: "confirmed",
    price: 500,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "appt-2",
    patientName: "سارة عيد الكريم",
    mobileNumber: "+966539876543",
    date: new Date().toISOString().split('T')[0], // Today
    timeSlot: "11:00",
    status: "confirmed",
    price: 500,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    id: "appt-3",
    patientName: "محمد خطاب",
    mobileNumber: "+966555554321",
    date: new Date().toISOString().split('T')[0], // Today
    timeSlot: "14:00",
    status: "pending",
    price: 500,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "appt-4",
    patientName: "خالد عطالله",
    mobileNumber: "+966547778899",
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    timeSlot: "10:00",
    status: "confirmed",
    price: 500,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  }
];

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<PatientBooking[]>(INITIAL_BOOKINGS);
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>(DEFAULT_CONFIG);
  const [whatsappEvents, setWhatsappEvents] = useState<WhatsAppEvent[]>([]);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>(INITIAL_DOCTOR);
  const [isHydrated, setIsHydrated] = useState(false);

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

    const storedBookings = localStorage.getItem('shifabook_bookings');
    const storedConfig = localStorage.getItem('shifabook_config');
    const storedActiveId = localStorage.getItem('shifabook_active_booking');
    const storedLang = localStorage.getItem('shifabook_lang');
    const storedEvents = localStorage.getItem('shifabook_wa_events');

    if (storedBookings) setBookings(JSON.parse(storedBookings));
    if (storedConfig) setScheduleConfig(JSON.parse(storedConfig));
    if (storedActiveId) setActiveBookingId(storedActiveId);
    if (storedLang) setLanguage(storedLang as 'ar' | 'en');
    
    if (storedEvents) {
      setWhatsappEvents(JSON.parse(storedEvents));
    } else {
      // Seed initial WhatsApp logs
      const initialLogs: WhatsAppEvent[] = [
        {
          id: "wa-1",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}),
          type: "booking.created",
          patientName: "فيصل محمد",
          phone: "+201050553232",
          message: "تم تسجيل موعدكم بنجاح: اليوم الساعة 09:30 ص. يرجى الرد برقم 1 لتأكيد الحضور.",
          status: "replied",
        },
        {
          id: "wa-2",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.8).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}),
          type: "booking.confirmed",
          patientName: "فيصل محمد",
          phone: "+201222379779",
          message: "تأكيد: تم تأكيد موعدكم رسمياً مع د. عبدالله المصري اليوم الساعة 09:30 ص.",
          status: "delivered",
        }
      ];
      setWhatsappEvents(initialLogs);
      localStorage.setItem('shifabook_wa_events', JSON.stringify(initialLogs));
    }
    
    setIsHydrated(true);
  }, []);

  // Save updates to localStorage
  const saveBookings = (newBookings: PatientBooking[]) => {
    setBookings(newBookings);
    localStorage.setItem('shifabook_bookings', JSON.stringify(newBookings));
  };

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

  const saveEvents = (newEvents: WhatsAppEvent[]) => {
    setWhatsappEvents(newEvents);
    localStorage.setItem('shifabook_wa_events', JSON.stringify(newEvents));
  };

  const updateScheduleConfig = (config: Partial<ScheduleConfig>) => {
    const updated = { ...scheduleConfig, ...config };
    saveConfig(updated);
  };

  // Helper: Trigger mock WhatsApp messaging events
  const triggerMockWhatsAppEvent = (type: WhatsAppEvent['type'], booking: PatientBooking) => {
    let message = "";
    let status: WhatsAppEvent['status'] = "sent";

    const timeString = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

    if (type === 'booking.created') {
      message = `مرحباً ${booking.patientName}، تم تسجيل حجزك المبدئي بنجاح في ShifaBook مع د. عبدالله المصري بتاريخ ${booking.date} الساعة ${booking.timeSlot}. لتأكيد موعدك فوراً يرجى الرد بـ "1" أو "نعم".`;
      status = "replied"; // Simulate patient replies instantly for MVP
    } else if (type === 'booking.confirmed') {
      message = `رائع! تم تأكيد موعدك رسمياً مع د. عبدالله المصري يوم ${booking.date} في تمام الساعة ${booking.timeSlot}. نتطلع لرؤيتك.`;
      status = "delivered";
    } else if (type === 'booking.cancelled') {
      message = `تنبيه: تم إلغاء موعدك المجدول يوم ${booking.date} الساعة ${booking.timeSlot}. إذا كان هذا عن طريق الخطأ، يمكنك إعادة الحجز مجدداً في أي وقت.`;
      status = "sent";
    } else if (type === 'booking.reminder_24h') {
      message = `تذكير: موعدك مع د. عبدالله المصري غداً يوم ${booking.date} في تمام الساعة ${booking.timeSlot}. يرجى تأكيد حضورك بالرد بـ "1".`;
      status = "delivered";
    }

    const newEvent: WhatsAppEvent = {
      id: `wa-${Date.now()}`,
      timestamp: timeString,
      type,
      patientName: booking.patientName,
      phone: booking.mobileNumber,
      message,
      status,
    };

    const updatedEvents = [newEvent, ...whatsappEvents].slice(0, 50); // limit to 50 logs
    saveEvents(updatedEvents);

    // If booking was created, simulate an automated instant confirmation trigger 1.5 seconds later
    if (type === 'booking.created' && booking.status === 'pending') {
      setTimeout(() => {
        // Auto transition booking to confirmed in mock DB
        const confirmedBooking: PatientBooking = { ...booking, status: 'confirmed' };
        setBookings(prev => {
          const next = prev.map(b => b.id === booking.id ? confirmedBooking : b);
          localStorage.setItem('shifabook_bookings', JSON.stringify(next));
          return next;
        });
        
        // Push confirmed event to WhatsApp logs
        const confTime = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        const confEvent: WhatsAppEvent = {
          id: `wa-${Date.now() + 1}`,
          timestamp: confTime,
          type: 'booking.confirmed',
          patientName: booking.patientName,
          phone: booking.mobileNumber,
          message: `رائع! تم تأكيد موعدك رسمياً مع د. عبدالله المصري يوم ${booking.date} في تمام الساعة ${booking.timeSlot}. نتطلع لرؤيتك.`,
          status: 'read',
        };
        setWhatsappEvents(prevEv => {
          const nextEv = [confEvent, ...prevEv].slice(0, 50);
          localStorage.setItem('shifabook_wa_events', JSON.stringify(nextEv));
          return nextEv;
        });
      }, 1500);
    }
  };

  const bookAppointment = (name: string, phone: string, date: string, time: string) => {
    const newBooking: PatientBooking = {
      id: `appt-${Date.now()}`,
      patientName: name,
      mobileNumber: phone,
      date,
      timeSlot: time,
      status: 'pending', // Starts as pending, gets auto-confirmed via WhatsApp trigger simulation
      price: scheduleConfig.pricePerAppointment,
      createdAt: new Date().toISOString(),
    };

    const nextBookings = [...bookings, newBooking];
    saveBookings(nextBookings);
    saveActiveId(newBooking.id);

    // Trigger WhatsApp simulator
    triggerMockWhatsAppEvent('booking.created', newBooking);

    return newBooking;
  };

  const rescheduleAppointment = (bookingId: string, newDate: string, newTime: string) => {
    const bookingToMove = bookings.find(b => b.id === bookingId);
    if (!bookingToMove) return false;

    // Check if new slot already reached capacity
    const slotsOnNewDate = generateTimeSlotsForDate(newDate);
    const targetSlot = slotsOnNewDate.find(s => s.time === newTime);
    if (targetSlot && targetSlot.isBooked) {
      return false; // Slot full
    }

    const updated = bookings.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          date: newDate,
          timeSlot: newTime,
          status: 'confirmed' as const,
        };
      }
      return b;
    });

    saveBookings(updated);
    
    // Trigger notification
    const updatedBooking = updated.find(b => b.id === bookingId)!;
    triggerMockWhatsAppEvent('booking.confirmed', updatedBooking);

    return true;
  };

  const cancelAppointment = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const updated = bookings.map(b => {
      if (b.id === bookingId) {
        return { ...b, status: 'cancelled' as const };
      }
      return b;
    });
    saveBookings(updated);

    if (bookingId === activeBookingId) {
      saveActiveId(null);
    }

    triggerMockWhatsAppEvent('booking.cancelled', booking);
  };

  const confirmAttendance = (bookingId: string) => {
    const updated = bookings.map(b => {
      if (b.id === bookingId) {
        return { ...b, status: 'confirmed' as const };
      }
      return b;
    });
    saveBookings(updated);
    const booking = updated.find(b => b.id === bookingId);
    if (booking) {
      triggerMockWhatsAppEvent('booking.confirmed', booking);
    }
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

  return (
    <BookingContext.Provider
      value={{
        bookings,
        scheduleConfig,
        whatsappEvents,
        doctorProfile,
        activeBookingId,
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

