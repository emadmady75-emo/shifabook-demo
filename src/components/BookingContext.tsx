'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Facility,
  DoctorProfile,
  ScheduleConfig,
  EGYPTIAN_FACILITIES,
  EGYPTIAN_DOCTORS,
  EGYPTIAN_SCHEDULE_CONFIG,
  EGYPTIAN_DEMO_PATIENTS
} from '@/lib/demoData';
import { formatDateOnly, parseDateOnlySafe } from '@/lib/dates';

export type { Facility, DoctorProfile, ScheduleConfig };

// Constant re-exports for backward compatibility
export const DEMO_FACILITIES = EGYPTIAN_FACILITIES;

export interface PatientBooking {
  id: string;
  patientName: string;
  mobileNumber: string;
  date: string;       // YYYY-MM-DD
  timeSlot: string;   // HH:MM
  status: 'pending' | 'confirmed' | 'cancelled';
  price: number;      // Revenue Tracking (e.g. 500 EGP)
  createdAt: string;
  facilityName?: string;
  facilityMapUrl?: string;
  facilityAddress?: string;
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
  selectedFacility: Facility;
  setSelectedFacility: (facility: Facility) => void;
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
  patients: any[];
  fetchPatients: () => Promise<void>;
  fetchNotesForPatient: (patientId: string) => Promise<any[]>;
  addPatientNote: (patientId: string, noteText: string, noteType?: string) => Promise<boolean>;
  updatePatientProfile: (patientId: string, updatedFields: any) => Promise<boolean>;
  verifiedPhone: string;
  verifiedName: string;
  phoneVerified: boolean;
  setVerifiedPhone: (phone: string) => void;
  setVerifiedName: (name: string) => void;
  setPhoneVerified: (val: boolean) => void;
  checkPhoneBookings: (phone: string) => Promise<{ activeBooking: PatientBooking | null; patientName: string }>;
  refreshAppointments: () => Promise<void>;
  refreshProfile?: () => Promise<void>;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

// Initial Doctor Profile
const INITIAL_DOCTOR: DoctorProfile = EGYPTIAN_DOCTORS[0];

// Initial Config
const DEFAULT_CONFIG: ScheduleConfig = EGYPTIAN_SCHEDULE_CONFIG;

// Initial Mock Bookings
const INITIAL_BOOKINGS: PatientBooking[] = [];

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<PatientBooking[]>(INITIAL_BOOKINGS);
  const [patients, setPatients] = useState<any[]>([]);
  const [verifiedPhone, setVerifiedPhone] = useState<string>('');
  const [verifiedName, setVerifiedName] = useState<string>('');
  const [phoneVerified, setPhoneVerified] = useState<boolean>(false);
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>(DEFAULT_CONFIG);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [activeBooking, setActiveBooking] = useState<PatientBooking | null>(null);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [selectedFacility, setSelectedFacilityState] = useState<Facility>(DEMO_FACILITIES[0]);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>(INITIAL_DOCTOR);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);

  const setSelectedFacility = (fac: Facility) => {
    setSelectedFacilityState(fac);
    localStorage.setItem('shifabook_facility', JSON.stringify(fac));
  };

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
          avatar: doc.profile_image_url || INITIAL_DOCTOR.avatar,
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

  // Load from localStorage on mount
  useEffect(() => {
    fetchProfile();

    // Clear legacy shifabook_bookings key
    localStorage.removeItem('shifabook_bookings');

    const storedConfig = localStorage.getItem('shifabook_config');
    const storedActiveId = localStorage.getItem('shifabook_active_booking');
    const storedActiveBooking = localStorage.getItem('shifabook_active_booking_details');
    const storedLang = localStorage.getItem('shifabook_lang');
    const storedFacility = localStorage.getItem('shifabook_facility');

    if (storedConfig) {
      try {
        setScheduleConfig(JSON.parse(storedConfig));
      } catch (e) {
        console.error('Failed to parse stored config:', e);
      }
    }

    let parsedActiveBooking: PatientBooking | null = null;
    let validActiveId: string | null = null;

    if (storedActiveBooking) {
      try {
        const parsed = JSON.parse(storedActiveBooking);
        if (
          parsed &&
          typeof parsed === 'object' &&
          parsed.id &&
          typeof parsed.id === 'string' &&
          parsed.id.length === 36 &&
          !parsed.id.startsWith('appt-') &&
          parsed.patientName &&
          parsed.date &&
          parsed.timeSlot
        ) {
          parsedActiveBooking = parsed;
          validActiveId = parsed.id;
        } else {
          console.warn('Invalid or legacy active booking details format in localStorage, clearing.');
        }
      } catch (e) {
        console.error('Failed to parse stored active booking details:', e);
      }
    }

    if (storedActiveId && storedActiveId.startsWith('appt-')) {
      console.warn('Legacy active booking ID detected, clearing.');
      validActiveId = null;
      parsedActiveBooking = null;
    }

    if (validActiveId && parsedActiveBooking && parsedActiveBooking.id === validActiveId) {
      setActiveBookingId(validActiveId);
      setActiveBooking(parsedActiveBooking);
    } else {
      localStorage.removeItem('shifabook_active_booking');
      localStorage.removeItem('shifabook_active_booking_details');
      setActiveBookingId(null);
      setActiveBooking(null);
    }

    if (storedLang) setLanguage(storedLang as 'ar' | 'en');
    if (storedFacility) {
      try {
        setSelectedFacilityState(JSON.parse(storedFacility));
      } catch (e) {
        console.error('Failed to parse stored facility:', e);
      }
    }
    
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
      const startDate = formatDateOnly(today);
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 30);
      const endDate = formatDateOnly(futureDate);

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

  const refreshAppointments = async () => {
    const doctorId = doctorProfile?.id;
    if (!doctorId) return;

    const isDoctorRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/doctor');
    if (isDoctorRoute) {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: appts, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('doctor_id', doctorId)
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true });
        if (!error && appts) {
          const mapped = appts.map(appt => ({
            id: appt.id,
            patientName: appt.patient_name,
            mobileNumber: appt.patient_phone,
            date: appt.appointment_date,
            timeSlot: appt.appointment_time,
            status: appt.status as any,
            price: doctorProfile.consultationFee || 400,
            createdAt: appt.created_at,
          }));
          setBookings(mapped);
        }
      } catch (err) {
        console.error('Error refreshing doctor appointments:', err);
      }
    } else {
      await fetchPublicAvailability(doctorId);
    }
  };

  const bookAppointment = async (name: string, phone: string, date: string, time: string) => {
    // Use local ID for client-side state and localStorage representation only
    const finalId = `appt-${Date.now()}`;
    let bookedId = finalId;

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
        
        const { normalizePhone } = await import('@/lib/phone');
        const normalizedPhone = normalizePhone(phone);
        const todayStr = formatDateOnly(new Date());

        // Guard: Check for active booking
        const { data: activeAppts, error: checkError } = await supabase
          .from('appointments')
          .select('id, patient_name, appointment_date, appointment_time')
          .eq('doctor_id', doctorId)
          .eq('patient_phone', normalizedPhone)
          .neq('status', 'cancelled')
          .gte('appointment_date', todayStr)
          .limit(1);

        if (checkError) {
          console.error('Error checking active appointments during insert:', checkError);
        } else if (activeAppts && activeAppts.length > 0) {
          throw new Error("لديك حجز نشط بالفعل مسجل بهذا الرقم. يرجى إلغاء الموعد أو تعديله أولاً.");
        }
        
        const { data: insertedData, error } = await supabase
          .from('appointments')
          .insert({
            ...payload,
            patient_phone: normalizedPhone
          })
          .select();

        if (error) {
          if (error.code === '23505') {
            await fetchPublicAvailability(doctorId);
            throw new Error("هذا الموعد تم حجزه بالفعل، من فضلك اختر موعدًا آخر");
          }
          throw new Error(error.message || "Failed to insert appointment into Supabase");
        }

        if (insertedData && insertedData[0] && insertedData[0].id) {
          bookedId = insertedData[0].id;
        } else {
          console.warn("Supabase insert succeeded but returned no data or missing ID, using fallback UUID");
          bookedId = crypto.randomUUID();
        }

        // Sync patient profile to `patients` table
        try {
          let searchPhone = phone;
          if (searchPhone.startsWith('0')) {
            searchPhone = '+20' + searchPhone.substring(1);
          } else if (searchPhone.startsWith('20') && !searchPhone.startsWith('+')) {
            searchPhone = '+' + searchPhone;
          } else if (!searchPhone.startsWith('+') && searchPhone.length === 10 && searchPhone.startsWith('1')) {
            searchPhone = '+20' + searchPhone;
          }
          
          const { data: existingPatient } = await supabase
            .from('patients')
            .select('id')
            .eq('phone', searchPhone)
            .limit(1);

          if (!existingPatient || existingPatient.length === 0) {
            await supabase.from('patients').insert({
              id: crypto.randomUUID(),
              full_name: name,
              phone: searchPhone,
              gender: 'غير محدد',
              birth_date: '1990-01-01',
              age: 36,
              blood_type: 'O+',
              chronic_diseases: 'لا يوجد',
              allergies: 'لا يوجد',
              emergency_contact_name: '',
              emergency_contact_phone: '',
              patient_status: 'normal',
              whatsapp_opt_in: true,
              sms_opt_in: false,
              created_at: new Date().toISOString()
            });
          }
        } catch (syncErr) {
          console.error('Non-blocking patient profile sync error:', syncErr);
        }

        // Trigger Next.js API route as a secure bridge for WhatsApp notification
        try {
          const bookingId = insertedData && insertedData.length > 0 ? insertedData[0].id : '';
          fetch('/api/public/whatsapp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              event_type: 'booking.created',
              data: {
                patient_name: name,
                patient_phone: phone,
                doctor_name: language === 'ar' ? doctorProfile.name : doctorProfile.nameEn,
                specialization: language === 'ar' ? doctorProfile.specialization : doctorProfile.specializationEn,
                appointment_date: date,
                appointment_time: time,
                facility_name: language === 'ar' ? selectedFacility.name : selectedFacility.nameEn,
                facility_address: language === 'ar' ? selectedFacility.address : selectedFacility.addressEn,
                facility_map_url: selectedFacility.mapUrl,
                booking_id: bookingId
              }
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
      id: bookedId,
      patientName: name,
      mobileNumber: phone,
      date,
      timeSlot: time,
      status: 'pending',
      price: scheduleConfig.pricePerAppointment,
      createdAt: new Date().toISOString(),
      facilityName: language === 'ar' ? selectedFacility.name : selectedFacility.nameEn,
      facilityMapUrl: selectedFacility.mapUrl,
      facilityAddress: language === 'ar' ? selectedFacility.address : selectedFacility.addressEn
    };

    // Save active booking details for rescheduling banner (separate from grid calculations)
    localStorage.setItem('shifabook_active_booking_details', JSON.stringify(newBooking));
    setActiveBooking(newBooking);
    saveActiveId(newBooking.id);

    // Fetch updated appointments/availability immediately
    await refreshAppointments();

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

        // Trigger WhatsApp webhook bridge for rescheduling
        try {
          fetch('/api/public/whatsapp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              event_type: 'booking.rescheduled',
              data: {
                patient_name: bookingToMove.patientName,
                patient_phone: bookingToMove.mobileNumber,
                doctor_name: language === 'ar' ? doctorProfile.name : doctorProfile.nameEn,
                specialization: language === 'ar' ? doctorProfile.specialization : doctorProfile.specializationEn,
                old_appointment_date: bookingToMove.date,
                old_appointment_time: bookingToMove.timeSlot,
                new_appointment_date: newDate,
                new_appointment_time: newTime,
                facility_name: language === 'ar' ? selectedFacility.name : selectedFacility.nameEn,
                facility_address: language === 'ar' ? selectedFacility.address : selectedFacility.addressEn,
                facility_map_url: selectedFacility.mapUrl,
                booking_id: bookingId
              }
            })
          }).catch(err => {
            console.error('Non-blocking WhatsApp API reschedule trigger error:', err);
          });
        } catch (webhookErr) {
          console.error('Error invoking WhatsApp API reschedule trigger client-side:', webhookErr);
        }

      } catch (err) {
        console.error('Failed to reschedule appointment in Supabase:', err);
        return false;
      }
    }

    const newFacilityName = language === 'ar' ? selectedFacility.name : selectedFacility.nameEn;
    const newFacilityMapUrl = selectedFacility.mapUrl;

    const updatedBooking = {
      ...bookingToMove,
      date: newDate,
      timeSlot: newTime,
      status: 'confirmed' as const,
      facilityName: newFacilityName,
      facilityMapUrl: newFacilityMapUrl,
      facilityAddress: language === 'ar' ? selectedFacility.address : selectedFacility.addressEn
    };
    localStorage.setItem('shifabook_active_booking_details', JSON.stringify(updatedBooking));
    setActiveBooking(updatedBooking);

    // Refresh public availability or doctor appointments to reflect immediately
    await refreshAppointments();

    return true;
  };

  const cancelAppointment = async (bookingId: string) => {
    const targetId = (activeBooking && activeBooking.id) ? activeBooking.id : bookingId;
    if (!targetId) return;

    // If it's a Supabase UUID
    if (typeof targetId === 'string' && targetId.length === 36) {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data, error } = await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', targetId)
          .select()
          .single();

        if (error) {
          console.error('Supabase cancellation error:', error);
          throw new Error(error.message || 'Failed to cancel appointment in Supabase');
        }
        console.log('Successfully cancelled appointment in Supabase:', data);

        // Trigger WhatsApp cancellation event
        if (data) {
          try {
            const facility = DEMO_FACILITIES.find(f => f.id === data.facility_id) || DEMO_FACILITIES[0];
            const cancelledBy = typeof window !== 'undefined' && window.location.pathname.startsWith('/doctor') ? 'doctor' : 'patient';

            fetch('/api/public/whatsapp', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                event_type: 'booking.cancelled',
                data: {
                  patient_name: data.patient_name,
                  patient_phone: data.patient_phone,
                  doctor_name: language === 'ar' ? doctorProfile.name : doctorProfile.nameEn,
                  specialization: language === 'ar' ? doctorProfile.specialization : doctorProfile.specializationEn,
                  appointment_date: data.appointment_date,
                  appointment_time: data.appointment_time,
                  facility_name: language === 'ar' ? facility.name : facility.nameEn,
                  facility_address: language === 'ar' ? facility.address : facility.addressEn,
                  facility_map_url: facility.mapUrl,
                  booking_id: data.id,
                  cancelled_by: cancelledBy
                }
              })
            }).catch(err => {
              console.error('Non-blocking WhatsApp API cancellation trigger error:', err);
            });
          } catch (webhookErr) {
            console.error('Error invoking WhatsApp API cancellation trigger:', webhookErr);
          }
        }
      } catch (err) {
        console.error('Failed to cancel appointment in Supabase:', err);
        throw err;
      }
    }

    // Update local state directly for immediate feedback
    setBookings(prev => prev.map(b => (b.id === targetId || b.id === bookingId) ? { ...b, status: 'cancelled' as const } : b));

    localStorage.removeItem('shifabook_active_booking_details');
    setActiveBooking(null);
    saveActiveId(null);

    // Refresh appointments immediately
    await refreshAppointments();
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
    await refreshAppointments();
  };

  // Generate Slots dynamically for a chosen date based on capacity config
  const generateTimeSlotsForDate = (dateStr: string): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const dateObj = parseDateOnlySafe(dateStr);
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
    const todayStr = formatDateOnly(new Date());
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

    const formatTimeHelper = (timeStr: string) => {
      const [h, m] = timeStr.split(':');
      const hr = parseInt(h);
      const suffix = language === 'ar' ? (hr >= 12 ? 'م' : 'ص') : (hr >= 12 ? 'PM' : 'AM');
      const displayHr = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
      return `${displayHr}:${m} ${suffix}`;
    };

    bookings.forEach(b => {
      // 1. Created Event
      const createdTime = new Date(b.createdAt || Date.now()).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const formattedSlotTime = formatTimeHelper(b.timeSlot);

      const docName = language === 'ar' ? doctorProfile.name : doctorProfile.nameEn;
      const spec = language === 'ar' ? doctorProfile.specialization : doctorProfile.specializationEn;

      events.push({
        id: `wa-created-${b.id}`,
        timestamp: createdTime,
        type: 'booking.created',
        patientName: b.patientName,
        phone: b.mobileNumber,
        message: language === 'ar' 
          ? `مرحباً ${b.patientName} 👋\n\nتم تأكيد حجزك بنجاح في شفاء بوك.\n\n👨‍⚕️ الطبيب: ${docName}\n🩺 التخصص: ${spec}\n\n📅 التاريخ: ${b.date}\n⏰ الوقت: ${formattedSlotTime}\n\n📍 العيادة: ${b.facilityName || 'فرع المهندسين'}\nالعنوان: ${b.facilityAddress || 'شارع جامعة الدول العربية، المهندسين'}\n🗺️ اللوكيشن:\n${b.facilityMapUrl || 'https://maps.google.com/?q=30.052,31.200'}\n\nشكراً لاستخدامك شفاء بوك.`
          : `Hello ${b.patientName} 👋\n\nYour appointment has been successfully confirmed at ShifaBook.\n\n👨‍⚕️ Doctor: ${docName}\n🩺 Specialty: ${spec}\n\n📅 Date: ${b.date}\n⏰ Time: ${formattedSlotTime}\n\n📍 Clinic: ${b.facilityName || 'Mohandessin Branch'}\nAddress: ${b.facilityAddress || ''}\n🗺️ Location Map:\n${b.facilityMapUrl || ''}\n\nThank you for using ShifaBook.`,
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
            ? `مرحباً ${b.patientName} 👋\n\nتم نقل موعدك بنجاح في شفاء بوك.\n\n👨‍⚕️ الطبيب: ${docName}\n\nالموعد السابق:\n📅 ${b.date}\n⏰ ${formattedSlotTime}\n\nالموعد الجديد:\n📅 ${b.date}\n⏰ ${formattedSlotTime}\n\n📍 العيادة: ${b.facilityName || 'فرع المهندسين'}\nالعنوان: ${b.facilityAddress || ''}\n🗺️ اللوكيشن:\n${b.facilityMapUrl || ''}\n\nنتشرف بحضورك في الموعد الجديد.`
            : `Hello ${b.patientName} 👋\n\nYour appointment has been successfully rescheduled at ShifaBook.\n\n👨‍⚕️ Doctor: ${docName}\n\nPrevious Slot:\n📅 ${b.date}\n⏰ ${formattedSlotTime}\n\nNew Slot:\n📅 ${b.date}\n⏰ ${formattedSlotTime}\n\n📍 Clinic: ${b.facilityName || ''}\nAddress: ${b.facilityAddress || ''}\n🗺️ Location Map:\n${b.facilityMapUrl || ''}\n\nLooking forward to seeing you at the new slot.`,
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
            ? `مرحباً ${b.patientName} 👋\n\nتم إلغاء موعدك في شفاء بوك.\n\n👨‍⚕️ الطبيب: ${docName}\n📅 التاريخ: ${b.date}\n⏰ الوقت: ${formattedSlotTime}\n\n📍 العيادة: ${b.facilityName || 'فرع المهندسين'}\nالعنوان: ${b.facilityAddress || ''}\n\nيمكنك حجز موعد جديد في أي وقت من خلال صفحة الحجز.\n\nشكراً لاستخدامك شفاء بوك.`
            : `Hello ${b.patientName} 👋\n\nYour appointment has been cancelled at ShifaBook.\n\n👨‍⚕️ Doctor: ${docName}\n📅 Date: ${b.date}\n⏰ Time: ${formattedSlotTime}\n\n📍 Clinic: ${b.facilityName || ''}\nAddress: ${b.facilityAddress || ''}\n\nYou can book a new slot anytime via the booking page.\n\nThank you for using ShifaBook.`,
          status: 'sent'
        });
      }
    });

    return events.sort((a, b) => b.id.localeCompare(a.id)).slice(0, 50);
  };

  const checkPhoneBookings = async (phoneInput: string) => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const { normalizePhone } = await import('@/lib/phone');
      
      const normalized = normalizePhone(phoneInput);
      const todayStr = formatDateOnly(new Date());
      const supabase = createClient();
      
      // 1. Check if patient has an active future/today booking
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_phone', normalized)
        .neq('status', 'cancelled')
        .gte('appointment_date', todayStr)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(1);

      let foundActive: PatientBooking | null = null;
      if (!apptError && appointments && appointments.length > 0) {
        const appt = appointments[0];
        foundActive = {
          id: appt.id,
          patientName: appt.patient_name,
          mobileNumber: appt.patient_phone,
          date: appt.appointment_date,
          timeSlot: appt.appointment_time,
          status: appt.status as any,
          price: scheduleConfig.pricePerAppointment,
          createdAt: appt.created_at
        };
        setActiveBooking(foundActive);
        saveActiveId(appt.id);
        localStorage.setItem('shifabook_active_booking_details', JSON.stringify(foundActive));
      } else {
        setActiveBooking(null);
        saveActiveId(null);
        localStorage.removeItem('shifabook_active_booking_details');
      }

      // 2. Check if patient profile exists in database to load their name
      const { data: patientData, error: patError } = await supabase
        .from('patients')
        .select('full_name')
        .eq('phone', normalized)
        .limit(1);

      let retrievedName = '';
      if (!patError && patientData && patientData.length > 0) {
        retrievedName = patientData[0].full_name;
        setVerifiedName(retrievedName);
      } else {
        setVerifiedName('');
      }

      setVerifiedPhone(normalized);
      setPhoneVerified(true);

      return {
        activeBooking: foundActive,
        patientName: retrievedName
      };
    } catch (err) {
      console.error('Error checking phone bookings:', err);
      return {
        activeBooking: null,
        patientName: ''
      };
    }
  };

  const fetchPatients = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data, error } = await supabase.from('patients').select('*').order('full_name');
      if (error) throw error;
      
      if (data && data.length > 0) {
        setPatients(data);
      } else {
        console.log("No patients found. Seeding demo patients...");
        const seedPromises = EGYPTIAN_DEMO_PATIENTS.map(async (p) => {
          const { error: err } = await supabase.from('patients').insert({
            id: crypto.randomUUID(),
            full_name: p.full_name,
            phone: p.phone,
            gender: p.gender,
            birth_date: p.birth_date,
            age: p.age,
            blood_type: p.blood_type,
            chronic_diseases: p.chronic_diseases,
            allergies: p.allergies,
            emergency_contact_name: p.emergency_contact_name,
            emergency_contact_phone: p.emergency_contact_phone,
            patient_status: p.patient_status,
            notes: p.notes,
            whatsapp_opt_in: true,
            sms_opt_in: false,
            created_at: new Date().toISOString()
          });
          if (err) console.error("Seed error for patient:", p.full_name, err);
        });
        await Promise.all(seedPromises);
        
        const { data: refetched, error: refetchErr } = await supabase.from('patients').select('*').order('full_name');
        if (!refetchErr && refetched) {
          setPatients(refetched);
        }
      }
    } catch (err) {
      console.error('Error fetching patients in BookingProvider:', err);
    }
  };

  const fetchNotesForPatient = async (patientId: string) => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data, error } = await supabase
        .from('patient_notes')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching patient notes:', err);
      return [];
    }
  };

  const addPatientNote = async (patientId: string, noteText: string, noteType: string = 'General') => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const doctorId = doctorProfile?.id || null;
      
      const { error } = await supabase.from('patient_notes').insert({
        id: crypto.randomUUID(),
        patient_id: patientId,
        note_type: noteType,
        note: noteText,
        created_by: doctorId,
        created_at: new Date().toISOString()
      });
      
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error adding patient note:', err);
      return false;
    }
  };

  const updatePatientProfile = async (patientId: string, updatedFields: any) => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error } = await supabase
        .from('patients')
        .update({
          ...updatedFields,
          updated_at: new Date().toISOString()
        })
        .eq('id', patientId);
      
      if (error) throw error;
      
      setPatients(prev => prev.map(p => p.id === patientId ? { ...p, ...updatedFields } : p));
      return true;
    } catch (err) {
      console.error('Error updating patient profile:', err);
      return false;
    }
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
        selectedFacility,
        setSelectedFacility,
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
        patients,
        fetchPatients,
        fetchNotesForPatient,
        addPatientNote,
        updatePatientProfile,
        verifiedPhone,
        verifiedName,
        phoneVerified,
        setVerifiedPhone,
        setVerifiedName,
        setPhoneVerified,
        checkPhoneBookings,
        refreshAppointments,
        refreshProfile: fetchProfile,
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

