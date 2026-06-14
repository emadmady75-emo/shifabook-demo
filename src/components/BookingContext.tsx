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
import { formatDateOnly, parseDateOnlySafe, isAppointmentInFutureOrNow } from '@/lib/dates';

export type { Facility, DoctorProfile, ScheduleConfig };

// Constant re-exports for backward compatibility
// For Phase 1, keep ShifaBook single-clinic only.
// TODO: Phase 2 Multi-Clinic Roadmap:
// - Create 'facilities' database table to store per-branch configurations
// - Support per-branch doctor schedule configurations
// - Implement validator to prevent overlapping doctor appointments across branches
export const DEMO_FACILITIES = [EGYPTIAN_FACILITIES[0]];

export const getQueueCode = (
  dateStr: string,
  timeStr: string,
  scheduleConfig: ScheduleConfig,
  allBookings?: { date: string; timeSlot: string; status?: string }[]
): string => {
  if (!dateStr || !timeStr) return '';
  const dateObj = parseDateOnlySafe(dateStr);
  const dayOfWeek = dateObj.getDay();
  const prefixes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const prefix = prefixes[dayOfWeek];

  const startTime = scheduleConfig?.startTime || '09:00';
  const endTime = scheduleConfig?.endTime || '17:00';
  const slotDuration = scheduleConfig?.slotDurationMinutes || 30;

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  const [slotHour, slotMin] = timeStr.split(':').map(Number);
  const slotMinutes = slotHour * 60 + slotMin;

  let index = 0;
  let found = false;
  for (let m = startMinutes; m < endMinutes; m += slotDuration) {
    index++;
    if (m === slotMinutes) {
      found = true;
      break;
    }
  }

  if (found) {
    return `${prefix}${String(index).padStart(2, '0')}`;
  }

  if (allBookings) {
    const sameDayTimes = Array.from(new Set(
      allBookings
        .filter(b => b.date === dateStr && b.status !== 'cancelled')
        .map(b => b.timeSlot)
    ));
    if (!sameDayTimes.includes(timeStr)) {
      sameDayTimes.push(timeStr);
    }
    sameDayTimes.sort();
    const idx = sameDayTimes.indexOf(timeStr);
    const seq = idx + 1;
    return `${prefix}${String(seq).padStart(2, '0')}`;
  }

  return `${prefix}01`;
};

export const getCleanMapUrl = (hospital: string): string => {
  if (!hospital) return 'https://maps.google.com/?q=30.052,31.200';
  if (hospital.startsWith('http://') || hospital.startsWith('https://')) {
    return hospital;
  }
  const cleanHospital = hospital.trim();
  if (
    cleanHospital.includes('جامعة ٦ أكتوبر') ||
    cleanHospital.includes('October 6') ||
    cleanHospital.includes('المهندسين') ||
    cleanHospital.includes('Mohandessin')
  ) {
    return 'https://maps.google.com/?q=30.052,31.200';
  }
  if (cleanHospital.includes('التجمع الخامس') || cleanHospital.includes('New Cairo')) {
    return 'https://maps.google.com/?q=30.027,31.492';
  }
  return 'https://maps.google.com/?q=' + encodeURIComponent(cleanHospital);
};

export interface PatientBooking {
  id: string;
  patientName: string;
  mobileNumber: string;
  date: string;       // YYYY-MM-DD
  timeSlot: string;   // HH:MM
  status: 'pending' | 'confirmed' | 'cancelled' | 'attended' | 'no_show';
  price: number;      // Revenue Tracking (e.g. 500 EGP)
  createdAt: string;
  facilityName?: string;
  facilityMapUrl?: string;
  facilityAddress?: string;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  rescheduled_by?: string | null;
  rescheduled_at?: string | null;
  queue_code?: string | null;
  appointment_type?: 'regular' | 'follow_up';
  parent_appointment_id?: string | null;
}

const DOCTOR_NAME_EN_MAP: Record<string, string> = {
  'د. عبدالرحمن المصري': 'Dr. Abdelrahman Elmasry',
  'د. عبدالله المصري': 'Dr. Abdullah El-Masry'
};

const DOCTOR_SPEC_EN_MAP: Record<string, string> = {
  'إستشاري طب الأطفال والأمراض الصدرية والحساسية والمناعة': 'Consultant of Pediatrics, Chest Diseases, Allergy and Immunology',
  'استشاري طب وجراحة القلب والأوعية الدموية': 'Consultant Cardiologist & Vascular Surgeon',
  'طب وجراحة القلب، القسطرة التداخلية، وعلاج ارتفاع ضغط الدم الشرياني والأوعية الدموية.': 'Interventional Cardiology, hypertension management, and arterial disorders.'
};

const FACILITY_NAME_EN_MAP: Record<string, string> = {
  'فرع المهندسين - الجيزة': 'Mohandessin Branch - Giza',
  'فرع التجمع الخامس - القاهرة': 'New Cairo Branch - Cairo'
};

const FACILITY_ADDR_EN_MAP: Record<string, string> = {
  'شارع جامعة الدول العربية، المهندسين': 'Jamiat Al Dowal Al Arabiya Street, Mohandessin',
  'شارع التسعين الشمالي، التجمع الخامس': 'North 90th Street, Fifth Settlement'
};

export const getDoctorNameEn = (name: string): string => {
  return DOCTOR_NAME_EN_MAP[name] || EGYPTIAN_DOCTORS[0].nameEn;
};

export const getDoctorSpecEn = (spec: string): string => {
  return DOCTOR_SPEC_EN_MAP[spec] || EGYPTIAN_DOCTORS[0].specializationEn;
};

export const getFacilityNameEn = (name: string): string => {
  return FACILITY_NAME_EN_MAP[name] || EGYPTIAN_FACILITIES.find(f => f.name === name)?.nameEn || 'Mohandessin Branch - Giza';
};

export const getFacilityAddrEn = (address: string): string => {
  return FACILITY_ADDR_EN_MAP[address] || EGYPTIAN_FACILITIES.find(f => f.address === address)?.addressEn || 'Jamiat Al Dowal Al Arabiya Street, Mohandessin';
};

export function getActorArabicLabel(actor: string | null | undefined, language: 'ar' | 'en' = 'ar'): string {
  const isEn = language === 'en';
  if (!actor) return isEn ? "at your request" : "بناءً على طلبك";
  const lower = actor.toLowerCase();
  if (lower === 'patient') return isEn ? "at your request" : "بناءً على طلبك";
  if (lower.includes('reception') || lower.includes('receptionist')) return isEn ? "by the receptionist" : "بواسطة موظف الاستقبال";
  if (lower.includes('supervisor')) return isEn ? "by the supervisor" : "بواسطة المشرف";
  if (lower.includes('admin')) return isEn ? "by the administrator" : "بواسطة مدير النظام";
  if (lower.includes('doctor')) return isEn ? "by the doctor" : "بواسطة الطبيب";
  return isEn ? "at your request" : "بناءً على طلبك";
}

export function formatTimeHelper(timeStr: string, language: 'ar' | 'en' = 'ar'): string {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return '';
  const [h, m] = timeStr.split(':');
  const hr = parseInt(h);
  if (isNaN(hr)) return '';
  const suffix = language === 'ar' ? (hr >= 12 ? 'م' : 'ص') : (hr >= 12 ? 'PM' : 'AM');
  const displayHr = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
  return `${displayHr}:${m} ${suffix}`;
}

export interface TimeSlot {
  time: string;
  bookings: PatientBooking[];
  capacity: number;
  isBooked: boolean;
  isExpired: boolean;
  isBlocked?: boolean;
  blockedReason?: string | null;
  exceptionId?: string | null;
  isRecurring?: boolean;
}

export interface ScheduleException {
  id: string;
  doctor_id: string;
  exception_date: string;
  slot_time: string;
  reason: string | null;
  is_recurring_weekly: boolean;
  weekday: number | null;
  created_by: string | null;
  created_at: string;
}

export interface FollowUpOptions {
  parentAppointmentId: string;
  patientName: string;
  patientPhone: string;
  date: string;
  timeSlot: string;
  fee: number;
  note?: string;
}

export interface WhatsAppEvent {
  id: string;
  timestamp: string;
  type: 'booking.created' | 'booking.confirmed' | 'booking.reminder_24h' | 'booking.cancelled' | 'booking.followup_created';
  patientName: string;
  phone: string;
  message: string;
  status: 'sent' | 'delivered' | 'read' | 'replied';
}

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
}

export interface ClinicUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'supervisor' | 'reception' | 'accountant';
  is_active: boolean;
  auth_user_id: string;
  created_at: string;
  password_reset_required?: boolean;
  clinic_id?: string | null;
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
  rescheduleAppointment: (bookingId: string, newDate: string, newTime: string, rescheduledBy?: 'patient' | 'doctor') => Promise<boolean>;
  cancelAppointment: (bookingId: string) => Promise<void>;
  confirmAttendance: (bookingId: string) => Promise<void>;
  markAttended: (bookingId: string) => Promise<void>;
  markNoShow: (bookingId: string) => Promise<void>;
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
  clinicUser: ClinicUser | null;
  isLoadingProfile?: boolean;
  scheduleExceptions: ScheduleException[];
  isExceptionsTableActive: boolean;
  createBlockedSlots: (slots: { timeSlot: string; reason: string | null; isRecurring: boolean; weekday: number | null }[], dateStr: string) => Promise<void>;
  deleteBlockedSlot: (exceptionId: string) => Promise<void>;
  bookFollowUpAppointment: (options: FollowUpOptions) => Promise<PatientBooking>;
  getFollowUpChain: (appointmentId: string) => PatientBooking[];
  resolveDoctorByHandle: (handle: string) => Promise<boolean>;
  clinic: Clinic | null;
  clinicDoctors: DoctorProfile[];
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
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [clinicUser, setClinicUser] = useState<ClinicUser | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [clinicDoctors, setClinicDoctors] = useState<DoctorProfile[]>([]);
  const [scheduleExceptions, setScheduleExceptions] = useState<ScheduleException[]>([]);
  const [isExceptionsTableActive, setIsExceptionsTableActive] = useState<boolean>(true);

  const fetchScheduleExceptions = async () => {
    const doctorId = doctorProfile?.id;
    if (!doctorId) return;

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('schedule_exceptions')
        .select('*')
        .eq('doctor_id', doctorId);
      
      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('relation "schedule_exceptions" does not exist') || error.message?.includes('schema cache')) {
          setIsExceptionsTableActive(false);
        } else {
          console.error("Error loading exceptions:", error);
        }
      } else if (data) {
        setIsExceptionsTableActive(true);
        setScheduleExceptions(data);
      }
    } catch (err) {
      console.error("Error in fetchScheduleExceptions:", err);
      setIsExceptionsTableActive(false);
    }
  };

  const createBlockedSlots = async (
    slotsToBlock: { timeSlot: string; reason: string | null; isRecurring: boolean; weekday: number | null }[],
    dateStr: string
  ) => {
    if (clinicUser && !['admin', 'supervisor', 'reception'].includes(clinicUser.role)) {
      const errorMsg = language === 'ar' ? "ليس لديك صلاحية لتنفيذ هذا الإجراء." : "You do not have permission to perform this action.";
      throw new Error(errorMsg);
    }

    const doctorId = doctorProfile?.id;
    if (!doctorId) throw new Error("No active doctor profile found.");

    // Conflict check
    for (const slot of slotsToBlock) {
      const isConflicting = bookings.some(b => {
        if (b.status === 'cancelled') return false;
        if (slot.isRecurring) {
          const bookingDate = parseDateOnlySafe(b.date);
          return bookingDate.getDay() === slot.weekday && b.timeSlot === slot.timeSlot;
        } else {
          return b.date === dateStr && b.timeSlot === slot.timeSlot;
        }
      });

      if (isConflicting) {
        const errorMsg = language === 'ar'
          ? "هذا الموعد عليه حجز نشط. قم بنقل أو إلغاء الحجز أولاً."
          : "This slot has an active appointment. Please reschedule or cancel it first.";
        throw new Error(errorMsg);
      }
    }

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const insertPayloads = slotsToBlock.map(slot => ({
        doctor_id: doctorId,
        exception_date: dateStr,
        slot_time: slot.timeSlot,
        reason: slot.reason,
        is_recurring_weekly: slot.isRecurring,
        weekday: slot.weekday,
        created_by: clinicUser?.id || null
      }));

      const { error } = await supabase
        .from('schedule_exceptions')
        .insert(insertPayloads);

      if (error) {
        throw new Error(error.message || "Failed to block slots.");
      }

      await fetchScheduleExceptions();
    } catch (err) {
      console.error("Error creating blocked slots:", err);
      throw err;
    }
  };

  const deleteBlockedSlot = async (exceptionId: string) => {
    if (clinicUser && !['admin', 'supervisor', 'reception'].includes(clinicUser.role)) {
      const errorMsg = language === 'ar' ? "ليس لديك صلاحية لتنفيذ هذا الإجراء." : "You do not have permission to perform this action.";
      throw new Error(errorMsg);
    }

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { error } = await supabase
        .from('schedule_exceptions')
        .delete()
        .eq('id', exceptionId);

      if (error) {
        throw new Error(error.message || "Failed to unblock slot.");
      }

      await fetchScheduleExceptions();
    } catch (err) {
      console.error("Error deleting blocked slot:", err);
      throw err;
    }
  };

  const setSelectedFacility = (fac: Facility) => {
    setSelectedFacilityState(fac);
    localStorage.setItem('shifabook_facility', JSON.stringify(fac));
  };

  // Keep selectedFacility dynamically synchronized with Settings (Profile Settings) clinic name & city
  useEffect(() => {
    if (doctorProfile) {
      setSelectedFacilityState({
        id: '8c9cbe7d-f421-4f10-9118-2e0618037ea4', // Stable facility ID matching first demo branch
        name: doctorProfile.hospital || 'فرع المهندسين - الجيزة',
        nameEn: doctorProfile.hospitalEn || 'Mohandessin Branch - Giza',
        address: doctorProfile.city ? `فرع ${doctorProfile.city}` : 'شارع جامعة الدول العربية، المهندسين',
        addressEn: doctorProfile.city ? `${doctorProfile.city} Branch` : 'Jamiat Al Dowal Al Arabiya Street, Mohandessin',
        mapUrl: getCleanMapUrl(doctorProfile.hospital || 'Mohandessin Branch - Giza')
      });
    }
  }, [doctorProfile]);

  const mapDocRow = (doc: any): DoctorProfile => ({
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
    handle: doc.handle || null,
  });

  const fetchProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // 1. Load clinic user first (scoped by auth_user_id)
      let loadedClinicUser: ClinicUser | null = null;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const { data: clinicUserData, error: userError } = await supabase
            .from('clinic_users')
            .select('*')
            .eq('auth_user_id', user.id)
            .single();

          if (!userError && clinicUserData) {
            const normalized = { ...clinicUserData };
            if (normalized.role === 'user') {
              normalized.role = 'reception';
            }
            loadedClinicUser = normalized;
            setClinicUser(normalized);
          } else {
            // Seeded doctor or default fallback
            const fallbackUser: ClinicUser = {
              id: user.id,
              email: user.email || 'doctor@shifabook.com',
              full_name: user.user_metadata?.full_name || 'د. عبدالرحمن المصري',
              role: 'admin',
              is_active: true,
              auth_user_id: user.id,
              created_at: new Date().toISOString()
            };
            loadedClinicUser = fallbackUser;
            setClinicUser(fallbackUser);
          }
        } catch (dbErr) {
          // Graceful fallback if clinic_users table is not yet created
          const fallbackUser: ClinicUser = {
            id: user.id,
            email: user.email || 'doctor@shifabook.com',
            full_name: user.user_metadata?.full_name || 'د. عبدالرحمن المصري',
            role: 'admin',
            is_active: true,
            auth_user_id: user.id,
            created_at: new Date().toISOString()
          };
          loadedClinicUser = fallbackUser;
          setClinicUser(fallbackUser);
        }
      } else {
        setClinicUser(null);
      }

      // 2. Load doctor profile — clinic-scoped if clinic_id available, fallback to .limit(1)
      const userClinicId = loadedClinicUser?.clinic_id;
      let doctorLoaded = false;

      if (userClinicId) {
        // RC-2.0: Clinic-aware doctor loading
        try {
          // Load clinic record
          const { data: clinicData } = await supabase
            .from('clinics')
            .select('*')
            .eq('id', userClinicId)
            .single();
          if (clinicData) {
            setClinic({
              id: clinicData.id,
              name: clinicData.name,
              slug: clinicData.slug,
              city: clinicData.city,
              address: clinicData.address,
              phone: clinicData.phone,
              is_active: clinicData.is_active
            });
          }

          // Load all doctors in clinic
          const { data: doctors, error: docError } = await supabase
            .from('doctors')
            .select('*')
            .eq('clinic_id', userClinicId);

          if (!docError && doctors && doctors.length > 0) {
            const mappedDoctors = doctors.map(mapDocRow);
            setClinicDoctors(mappedDoctors);
            // Auto-select first doctor (doctor selector is RC-2.1)
            setDoctorProfile(mappedDoctors[0]);
            doctorLoaded = true;
          }
        } catch (clinicErr) {
          // Graceful fallback if clinics table doesn't exist yet (pre-migration)
          console.warn('Clinic-aware loading failed, falling back to legacy:', clinicErr);
        }
      }

      // Fallback: legacy .limit(1) if clinic-aware loading didn't succeed
      if (!doctorLoaded) {
        const { data, error } = await supabase.from('doctors').select('*').limit(1);
        if (!error && data && data.length > 0) {
          const mapped = mapDocRow(data[0]);
          setDoctorProfile(mapped);
          setClinicDoctors([mapped]);
        }
      }
    } catch (err) {
      console.error('Error fetching doctor profile in BookingProvider:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (doctorProfile?.id) {
      fetchScheduleExceptions();
    }
  }, [doctorProfile?.id]);

  // Load from localStorage on mount
  useEffect(() => {
    fetchProfile();

    let authSub: any = null;
    import('@/lib/supabase/client').then(({ createClient }) => {
      const client = createClient();
      const { data } = client.auth.onAuthStateChange(() => {
        fetchProfile();
      });
      authSub = data.subscription;
    });

    // Clear legacy shifabook_bookings key
    localStorage.removeItem('shifabook_bookings');

    const storedConfig = localStorage.getItem('shifabook_config');
    const storedActiveId = localStorage.getItem('shifabook_active_booking');
    const storedActiveBooking = localStorage.getItem('shifabook_active_booking_details');
    const storedLang = localStorage.getItem('shifabook_lang');
    const storedFacility = localStorage.getItem('shifabook_facility');

    if (storedConfig) {
      try {
        const parsed = JSON.parse(storedConfig);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.workingDays) && parsed.startTime && parsed.endTime) {
          setScheduleConfig(parsed);
        } else {
          console.warn('Invalid stored schedule config structure in localStorage, keeping default.');
        }
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
          if (isAppointmentInFutureOrNow(parsed.date, parsed.timeSlot)) {
            parsedActiveBooking = parsed;
            validActiveId = parsed.id;
          } else {
            console.warn('Stored active booking has expired, clearing.');
          }
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
        const parsed = JSON.parse(storedFacility);
        if (parsed && typeof parsed === 'object' && parsed.id && parsed.name && parsed.mapUrl) {
          setSelectedFacilityState(parsed);
        } else {
          console.warn('Invalid stored facility structure in localStorage, keeping default.');
        }
      } catch (e) {
        console.error('Failed to parse stored facility:', e);
      }
    }
    
    // Clear old localStorage orphaned WhatsApp events
    localStorage.removeItem('shifabook_wa_events');
    
    setIsHydrated(true);

    return () => {
      if (authSub) authSub.unsubscribe();
    };
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
    await fetchScheduleExceptions();
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
          id: appt.id || `public-appt-${index}`,
          patientName: '',
          mobileNumber: '',
          date: appt.appointment_date,
          timeSlot: appt.appointment_time,
          status: appt.status as any,
          price: doctorProfile?.consultationFee ?? 0,
          createdAt: new Date().toISOString(),
          queue_code: appt.queue_code
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

    await fetchScheduleExceptions();

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
            price: appt.consultation_fee_at_booking ?? doctorProfile.consultationFee ?? 0,
            createdAt: appt.created_at,
            cancelled_by: appt.cancelled_by,
            cancelled_at: appt.cancelled_at,
            rescheduled_by: appt.rescheduled_by,
            rescheduled_at: appt.rescheduled_at,
            queue_code: appt.queue_code,
            appointment_type: appt.appointment_type || 'regular',
            parent_appointment_id: appt.parent_appointment_id || null,
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
    // Guard: Check if slot is blocked
    const isSlotBlocked = scheduleExceptions.some(exc => {
      if (exc.slot_time !== time) return false;
      if (exc.is_recurring_weekly) {
        const targetDate = parseDateOnlySafe(date);
        return exc.weekday === targetDate.getDay();
      } else {
        return exc.exception_date === date;
      }
    });

    if (isSlotBlocked) {
      throw new Error(
        language === 'ar'
          ? "هذا الموعد غير متاح للحجز (تم إيقافه من قبل إدارة العيادة)."
          : "This slot is unavailable for booking (blocked by clinic administration)."
      );
    }

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
      source: 'web',
      consultation_fee_at_booking: doctorProfile?.consultationFee ?? 0
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
          .gte('appointment_date', todayStr);

        if (checkError) {
          console.error('Error checking active appointments during insert:', checkError);
        } else if (activeAppts && activeAppts.length > 0) {
          const hasRealActive = activeAppts.some(appt => isAppointmentInFutureOrNow(appt.appointment_date, appt.appointment_time));
          if (hasRealActive) {
            throw new Error("لديك حجز نشط بالفعل مسجل بهذا الرقم. يرجى إلغاء الموعد أو تعديله أولاً.");
          }
        }
        
        const computedQueueCode = getQueueCode(date, time, scheduleConfig);
        const { data: insertedData, error } = await supabase
          .from('appointments')
          .insert({
            ...payload,
            patient_phone: normalizedPhone,
            queue_code: computedQueueCode
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
            const patientPayload: any = {
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
            };
            // RC-2.0: Attach clinic_id if available
            if (clinic?.id) patientPayload.clinic_id = clinic.id;
            await supabase.from('patients').insert(patientPayload);
          }
        } catch (syncErr) {
          console.error('Non-blocking patient profile sync error:', syncErr);
        }

        // Trigger Next.js API route as a secure bridge for WhatsApp notification
        try {
          const bookingId = insertedData && insertedData.length > 0 ? insertedData[0].id : '';
          const computedQueueCode = getQueueCode(date, time, scheduleConfig);
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
                doctor_name: doctorProfile.name,
                doctor_name_en: getDoctorNameEn(doctorProfile.name),
                specialization: doctorProfile.specialization,
                specialization_en: getDoctorSpecEn(doctorProfile.specialization),
                appointment_date: date,
                appointment_time: time,
                facility_name: selectedFacility.name,
                facility_name_en: selectedFacility.nameEn || getFacilityNameEn(selectedFacility.name),
                facility_address: selectedFacility.address,
                facility_address_en: selectedFacility.addressEn || getFacilityAddrEn(selectedFacility.address),
                facility_map_url: selectedFacility.mapUrl,
                booking_id: bookingId,
                queue_code: computedQueueCode,
                language: language,
                locale: language
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

    const computedQueueCode = getQueueCode(date, time, scheduleConfig);
    const newBooking: PatientBooking = {
      id: bookedId,
      patientName: name,
      mobileNumber: phone,
      date,
      timeSlot: time,
      status: 'pending',
      price: doctorProfile?.consultationFee ?? 0,
      createdAt: new Date().toISOString(),
      facilityName: language === 'ar' ? selectedFacility.name : selectedFacility.nameEn,
      facilityMapUrl: selectedFacility.mapUrl,
      facilityAddress: language === 'ar' ? selectedFacility.address : selectedFacility.addressEn,
      queue_code: computedQueueCode
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

  const bookFollowUpAppointment = async (options: FollowUpOptions): Promise<PatientBooking> => {
    const { parentAppointmentId, patientName, patientPhone, date, timeSlot, fee, note } = options;

    // Role enforcement: Only admin, supervisor, doctor, reception can create follow-ups
    if (clinicUser && !['admin', 'supervisor', 'reception'].includes(clinicUser.role)) {
      const errorMsg = language === 'ar' ? "ليس لديك صلاحية لتنفيذ هذا الإجراء." : "You do not have permission to perform this action.";
      throw new Error(errorMsg);
    }

    // Guard: Check if slot is blocked
    const isSlotBlocked = scheduleExceptions.some(exc => {
      if (exc.slot_time !== timeSlot) return false;
      if (exc.is_recurring_weekly) {
        const targetDate = parseDateOnlySafe(date);
        return exc.weekday === targetDate.getDay();
      } else {
        return exc.exception_date === date;
      }
    });

    if (isSlotBlocked) {
      throw new Error(
        language === 'ar'
          ? "هذا الموعد غير متاح للحجز (تم إيقافه من قبل إدارة العيادة)."
          : "This slot is unavailable for booking (blocked by clinic administration)."
      );
    }

    const doctorId = doctorProfile?.id || null;
    if (!doctorId) {
      throw new Error("No active doctor profile found to book follow-up appointment.");
    }

    // Check slot capacity
    const slotsOnDate = generateTimeSlotsForDate(date);
    const targetSlot = slotsOnDate.find(s => s.time === timeSlot);
    if (targetSlot && targetSlot.isBooked) {
      throw new Error(
        language === 'ar'
          ? "هذا الموعد ممتلئ بالفعل. يرجى اختيار موعد آخر."
          : "This slot is already full. Please choose another time."
      );
    }

    let bookedId = '';
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { normalizePhone } = await import('@/lib/phone');
    const normalizedPhone = normalizePhone(patientPhone);

    const computedQueueCode = getQueueCode(date, timeSlot, scheduleConfig);

    const payload = {
      doctor_id: doctorId,
      patient_name: patientName,
      patient_phone: normalizedPhone,
      appointment_date: date,
      appointment_time: timeSlot,
      status: 'pending',
      source: 'web',
      consultation_fee_at_booking: fee,
      appointment_type: 'follow_up',
      parent_appointment_id: parentAppointmentId,
      queue_code: computedQueueCode
    };

    const { data: insertedData, error } = await supabase
      .from('appointments')
      .insert(payload)
      .select();

    if (error) {
      // Graceful fallback if follow-up columns don't exist yet
      if (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('schema cache')) {
        const fallbackPayload = {
          doctor_id: doctorId,
          patient_name: patientName,
          patient_phone: normalizedPhone,
          appointment_date: date,
          appointment_time: timeSlot,
          status: 'pending',
          source: 'web',
          consultation_fee_at_booking: fee,
          queue_code: computedQueueCode
        };
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('appointments')
          .insert(fallbackPayload)
          .select();
        if (fallbackError) throw new Error(fallbackError.message || 'Failed to insert follow-up appointment');
        if (fallbackData && fallbackData[0]) {
          bookedId = fallbackData[0].id;
        } else {
          bookedId = crypto.randomUUID();
        }
      } else if (error.code === '23505') {
        throw new Error(
          language === 'ar'
            ? "هذا الموعد تم حجزه بالفعل، من فضلك اختر موعدًا آخر"
            : "This slot is already booked. Please choose another time."
        );
      } else {
        throw new Error(error.message || 'Failed to insert follow-up appointment');
      }
    } else if (insertedData && insertedData[0]) {
      bookedId = insertedData[0].id;
    } else {
      bookedId = crypto.randomUUID();
    }

    // Trigger WhatsApp notification for follow-up
    try {
      const formattedTime = formatTimeHelper(timeSlot, language);
      const feeLabel = fee === 0
        ? (language === 'ar' ? 'مجاني' : 'Free')
        : `${fee} ${language === 'ar' ? 'جنيه' : 'EGP'}`;

      const docNameAr = doctorProfile.name;
      const docNameEn = getDoctorNameEn(doctorProfile.name);

      const followUpMessage = language === 'en'
        ? `Hello ${patientName} 👋\n\nA follow-up appointment has been booked for you at ShifaBook.\n\nDoctor: ${docNameEn}\nDate: ${date}\nTime: ${formattedTime}\nQueue Number: ${computedQueueCode}\nFee: ${feeLabel}\n${note ? `Note: ${note}\n` : ''}\nClinic: ${selectedFacility.nameEn}\nAddress: ${selectedFacility.addressEn}\nLocation:\n${selectedFacility.mapUrl}\n\nThis is a follow-up visit for your previous appointment.\n\nThank you for using ShifaBook.`
        : `مرحباً ${patientName} 👋\n\nتم حجز موعد متابعة لك في شفاء بوك.\n\n👨⚕️ الطبيب: ${docNameAr}\n📅 التاريخ: ${date}\n⏰ الوقت: ${formattedTime}\nرقم الدور: ${computedQueueCode}\n💰 قيمة الكشف: ${feeLabel}\n${note ? `📝 ملاحظة: ${note}\n` : ''}\n📍 العيادة: ${selectedFacility.name}\nالعنوان: ${selectedFacility.address}\n🗺️ اللوكيشن:\n${selectedFacility.mapUrl}\n\nهذا موعد متابعة لزيارتك السابقة.\n\nشكراً لاستخدامك شفاء بوك.`;

      const waPayload = {
        event_type: 'booking.followup_created',
        data: {
          patient_name: patientName,
          patient_phone: patientPhone,
          doctor_name: docNameAr,
          doctor_name_en: docNameEn,
          specialization: doctorProfile.specialization,
          specialization_en: getDoctorSpecEn(doctorProfile.specialization),
          appointment_date: date,
          appointment_time: timeSlot,
          facility_name: selectedFacility.name,
          facility_name_en: selectedFacility.nameEn || getFacilityNameEn(selectedFacility.name),
          facility_address: selectedFacility.address,
          facility_address_en: selectedFacility.addressEn || getFacilityAddrEn(selectedFacility.address),
          facility_map_url: selectedFacility.mapUrl,
          booking_id: bookedId,
          parent_appointment_id: parentAppointmentId,
          queue_code: computedQueueCode,
          consultation_fee: fee,
          note: note || '',
          message: followUpMessage,
          language: language,
          locale: language
        }
      };

      console.log('[CLIENT_WHATSAPP_EVENT]', waPayload);

      fetch('/api/public/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waPayload)
      }).catch(err => {
        console.error('Non-blocking WhatsApp API follow-up trigger error:', err);
      });
    } catch (webhookErr) {
      console.error('Error invoking WhatsApp API follow-up trigger:', webhookErr);
    }

    const newBooking: PatientBooking = {
      id: bookedId,
      patientName: patientName,
      mobileNumber: patientPhone,
      date,
      timeSlot,
      status: 'pending',
      price: fee,
      createdAt: new Date().toISOString(),
      facilityName: language === 'ar' ? selectedFacility.name : selectedFacility.nameEn,
      facilityMapUrl: selectedFacility.mapUrl,
      facilityAddress: language === 'ar' ? selectedFacility.address : selectedFacility.addressEn,
      queue_code: computedQueueCode,
      appointment_type: 'follow_up',
      parent_appointment_id: parentAppointmentId
    };

    // Refresh appointments immediately
    await refreshAppointments();

    return newBooking;
  };

  const getFollowUpChain = (appointmentId: string): PatientBooking[] => {
    // Find the root appointment by traversing up the parent chain
    let rootId = appointmentId;
    let current = bookings.find(b => b.id === appointmentId);
    while (current?.parent_appointment_id) {
      const parent = bookings.find(b => b.id === current!.parent_appointment_id);
      if (parent) {
        rootId = parent.id;
        current = parent;
      } else {
        break;
      }
    }

    // Collect all appointments in the chain
    const chain: PatientBooking[] = [];
    const root = bookings.find(b => b.id === rootId);
    if (root) chain.push(root);

    // BFS to find all children
    const queue = [rootId];
    const visited = new Set<string>([rootId]);
    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const children = bookings.filter(b => b.parent_appointment_id === parentId && !visited.has(b.id));
      for (const child of children) {
        chain.push(child);
        visited.add(child.id);
        queue.push(child.id);
      }
    }

    // Sort chronologically
    return chain.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.timeSlot.localeCompare(b.timeSlot);
    });
  };

  const resolveDoctorByHandle = async (handle: string): Promise<boolean> => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('handle', handle)
        .maybeSingle();

      if (error) {
        console.error('Error resolving doctor by handle:', error);
        return false;
      }

      if (data) {
        const mapped = mapDocRow(data);
        setDoctorProfile(mapped);

        if (data.clinic_id) {
          try {
            const { data: clinicData } = await supabase
              .from('clinics')
              .select('*')
              .eq('id', data.clinic_id)
              .maybeSingle();
            if (clinicData) {
              setClinic({
                id: clinicData.id,
                name: clinicData.name,
                slug: clinicData.slug,
                city: clinicData.city,
                address: clinicData.address,
                phone: clinicData.phone,
                is_active: clinicData.is_active
              });
            }
          } catch (clinicErr) {
            console.warn('Failed to load clinic for resolved doctor:', clinicErr);
          }
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error resolving doctor by handle:', err);
      return false;
    }
  };

  const rescheduleAppointment = async (
    bookingId: string,
    newDate: string,
    newTime: string,
    rescheduledBy: 'patient' | 'doctor' = 'patient'
  ) => {
    // 1. Role enforcement
    if (clinicUser && clinicUser.role === 'accountant') {
      const errorMsg = language === 'ar' ? "ليس لديك صلاحية لتنفيذ هذا الإجراء." : "You do not have permission to perform this action.";
      if (typeof window !== 'undefined') window.alert(errorMsg);
      throw new Error(errorMsg);
    }

    // Guard: Check if destination slot is blocked
    const isSlotBlocked = scheduleExceptions.some(exc => {
      if (exc.slot_time !== newTime) return false;
      if (exc.is_recurring_weekly) {
        const targetDate = parseDateOnlySafe(newDate);
        return exc.weekday === targetDate.getDay();
      } else {
        return exc.exception_date === newDate;
      }
    });

    if (isSlotBlocked) {
      const errorMsg = language === 'ar'
        ? "هذا الموعد غير متاح للحجز (تم إيقافه من قبل إدارة العيادة)."
        : "This slot is unavailable for booking (blocked by clinic administration).";
      if (typeof window !== 'undefined') window.alert(errorMsg);
      throw new Error(errorMsg);
    }

    const bookingToMove = activeBooking && activeBooking.id === bookingId ? activeBooking : bookings.find(b => b.id === bookingId);
    if (!bookingToMove) return false;

    // Check if new slot already reached capacity
    const slotsOnNewDate = generateTimeSlotsForDate(newDate);
    const targetSlot = slotsOnNewDate.find(s => s.time === newTime);
    if (targetSlot && targetSlot.isBooked) {
      return false; // Slot full
    }

    // Keep status consistent (pending or confirmed)
    const newStatus = bookingToMove.status || 'confirmed';

    // If it's a Supabase UUID (length is 36)
    if (bookingId.length === 36) {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        const computedQueueCode = getQueueCode(newDate, newTime, scheduleConfig);
        // Audit fields prep
        let updateData: any = {
          appointment_date: newDate,
          appointment_time: newTime,
          status: newStatus,
          queue_code: computedQueueCode
        };

        if (clinicUser) {
          updateData.rescheduled_by = `${clinicUser.full_name} (${clinicUser.role})`;
          updateData.rescheduled_at = new Date().toISOString();
        } else {
          updateData.rescheduled_by = 'patient';
          updateData.rescheduled_at = new Date().toISOString();
        }

        const { error } = await supabase
          .from('appointments')
          .update(updateData)
          .eq('id', bookingId);

        if (error) {
          // Graceful fallback for missing columns
          if (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('schema cache')) {
            const computedQueueCode = getQueueCode(newDate, newTime, scheduleConfig);
            const fallbackResult = await supabase
              .from('appointments')
              .update({
                appointment_date: newDate,
                appointment_time: newTime,
                status: newStatus,
                queue_code: computedQueueCode
              })
              .eq('id', bookingId);
            if (fallbackResult.error) throw fallbackResult.error;
          } else {
            throw error;
          }
        }

        // Trigger WhatsApp webhook bridge for rescheduling
        try {
          const actorVal = clinicUser ? `${clinicUser.full_name} (${clinicUser.role})` : 'patient';
          const actorLabel = getActorArabicLabel(actorVal, language);
          const formattedTime = formatTimeHelper(newTime, language);
          
          const docNameAr = doctorProfile.name;
          const docNameEn = getDoctorNameEn(doctorProfile.name);
          const prevQueueCode = bookingToMove.queue_code || getQueueCode(bookingToMove.date, bookingToMove.timeSlot, scheduleConfig, bookings);
          const rescheduleMessage = language === 'en'
            ? `Hello ${bookingToMove.patientName} 👋\n\nYour appointment has been rescheduled ${actorLabel} in ShifaBook.\n\nDoctor: ${docNameEn}\n\nPrevious appointment:\nDate: ${bookingToMove.date}\nTime: ${formatTimeHelper(bookingToMove.timeSlot, language)}\nPrevious Queue Number: ${prevQueueCode}\n\nNew appointment:\nDate: ${newDate}\nTime: ${formattedTime}\nNew Queue Number: ${computedQueueCode}\n\nClinic: ${selectedFacility.nameEn}\nAddress: ${selectedFacility.addressEn}\nLocation:\n${selectedFacility.mapUrl}\n\nWe look forward to seeing you at the new appointment.`
            : (actorLabel === "بناءً على طلبك"
              ? `تم تعديل موعدك بناءً على طلبك.\nالموعد الجديد: ${newDate} - ${formattedTime}\nرقم الدور الجديد: ${computedQueueCode}\nرقم الدور السابق: ${prevQueueCode}`
              : `تم تعديل موعدك ${actorLabel}.\nالموعد الجديد: ${newDate} - ${formattedTime}\nرقم الدور الجديد: ${computedQueueCode}\nرقم الدور السابق: ${prevQueueCode}`);

          const payload = {
            event_type: 'booking.rescheduled',
            data: {
              patient_name: bookingToMove.patientName,
              patient_phone: bookingToMove.mobileNumber,
              doctor_name: docNameAr,
              doctor_name_en: docNameEn,
              specialization: doctorProfile.specialization,
              specialization_en: getDoctorSpecEn(doctorProfile.specialization),
              old_appointment_date: bookingToMove.date,
              old_appointment_time: bookingToMove.timeSlot,
              new_appointment_date: newDate,
              new_appointment_time: newTime,
              facility_name: selectedFacility.name,
              facility_name_en: selectedFacility.nameEn || getFacilityNameEn(selectedFacility.name),
              facility_address: selectedFacility.address,
              facility_address_en: selectedFacility.addressEn || getFacilityAddrEn(selectedFacility.address),
              facility_map_url: selectedFacility.mapUrl,
              booking_id: bookingId,
              queue_code: computedQueueCode,
              old_queue_code: bookingToMove.queue_code,
              rescheduled_by: rescheduledBy,
              performed_by_role: clinicUser ? clinicUser.role : 'patient',
              performed_by_name: clinicUser ? clinicUser.full_name : bookingToMove.patientName,
              actor_label: actorLabel,
              message: rescheduleMessage,
              language: language,
              locale: language
            }
          };

          // Client-side Log: [CLIENT_WHATSAPP_EVENT]
          console.log('[CLIENT_WHATSAPP_EVENT]', payload);

          const response = await fetch('/api/public/whatsapp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          const responseText = await response.text();

          // Client-side Log: [CLIENT_WHATSAPP_RESULT]
          console.log('[CLIENT_WHATSAPP_RESULT]', {
            event_type: payload.event_type,
            ok: response.ok,
            status: response.status,
            body: responseText
          });
        } catch (err) {
          console.error('Non-blocking WhatsApp API reschedule trigger error:', err);
        }

      } catch (err) {
        console.error('Failed to reschedule appointment in Supabase:', err);
        return false;
      }
    }

    const newFacilityName = language === 'ar' ? selectedFacility.name : selectedFacility.nameEn;
    const newFacilityMapUrl = selectedFacility.mapUrl;

    const computedQueueCode = getQueueCode(newDate, newTime, scheduleConfig);
    const updatedBooking = {
      ...bookingToMove,
      date: newDate,
      timeSlot: newTime,
      status: newStatus,
      facilityName: newFacilityName,
      facilityMapUrl: newFacilityMapUrl,
      facilityAddress: language === 'ar' ? selectedFacility.address : selectedFacility.addressEn,
      rescheduled_by: clinicUser ? `${clinicUser.full_name} (${clinicUser.role})` : 'patient',
      rescheduled_at: new Date().toISOString(),
      queue_code: computedQueueCode
    };
    
    // Only update activeBooking localStorage if this was the active booking
    if (activeBooking && activeBooking.id === bookingId) {
      localStorage.setItem('shifabook_active_booking_details', JSON.stringify(updatedBooking));
      setActiveBooking(updatedBooking);
    }

    // Refresh public availability or doctor appointments to reflect immediately
    await refreshAppointments();

    return true;
  };

  const cancelAppointment = async (bookingId: string) => {
    const targetId = (activeBooking && activeBooking.id) ? activeBooking.id : bookingId;
    if (!targetId) return;

    // 1. Role enforcement
    if (clinicUser && clinicUser.role !== 'admin') {
      const errorMsg = language === 'ar' ? "ليس لديك صلاحية لتنفيذ هذا الإجراء." : "You do not have permission to perform this action.";
      if (typeof window !== 'undefined') window.alert(errorMsg);
      throw new Error(errorMsg);
    }

    // If it's a Supabase UUID
    if (typeof targetId === 'string' && targetId.length === 36) {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        // Audit fields prep
        let updateData: any = { status: 'cancelled' };
        if (clinicUser) {
          updateData.cancelled_by = `${clinicUser.full_name} (${clinicUser.role})`;
          updateData.cancelled_at = new Date().toISOString();
        } else {
          updateData.cancelled_by = 'patient';
          updateData.cancelled_at = new Date().toISOString();
        }

        let data = null;
        const { data: updatedRows, error } = await supabase
          .from('appointments')
          .update(updateData)
          .eq('id', targetId)
          .select();

        if (error) {
          if (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('schema cache')) {
            const fallbackResult = await supabase
              .from('appointments')
              .update({ status: 'cancelled' })
              .eq('id', targetId)
              .select();
            if (fallbackResult.error) {
              console.error('Supabase cancellation fallback error:', fallbackResult.error);
              throw new Error(fallbackResult.error.message || 'Failed to cancel appointment in Supabase');
            }
            data = Array.isArray(fallbackResult.data) && fallbackResult.data.length > 0
              ? fallbackResult.data[0]
              : null;
          } else {
            console.error('Supabase cancellation error:', error);
            throw new Error(error.message || 'Failed to cancel appointment in Supabase');
          }
        } else {
          data = Array.isArray(updatedRows) && updatedRows.length > 0
            ? updatedRows[0]
            : null;
        }

        if (!data) {
          if (typeof window !== 'undefined') {
            window.alert("تعذر العثور على هذا الموعد في قاعدة البيانات. تم تحديث حالة الحجز محليًا، يرجى اختيار موعد جديد.");
          }
          // Clear stale activeBooking from localStorage/state
          localStorage.removeItem('shifabook_active_booking_details');
          setActiveBooking(null);
          saveActiveId(null);

          // Update local state to cancelled for immediate feedback, then return early
          setBookings(prev => prev.map(b => (b.id === targetId || b.id === bookingId) ? { ...b, status: 'cancelled' as const } : b));
          await refreshAppointments();
          return;
        }

        console.log('Successfully cancelled appointment in Supabase:', data);

        // Trigger WhatsApp cancellation event
        if (data) {
          try {
            const facility = DEMO_FACILITIES.find(f => f.id === data.facility_id) || DEMO_FACILITIES[0];
            const cancelledBy = clinicUser ? 'doctor' : 'patient';

            const actorVal = data.cancelled_by || (clinicUser ? `${clinicUser.full_name} (${clinicUser.role})` : 'patient');
            const actorLabel = getActorArabicLabel(actorVal, language);
             const docNameAr = doctorProfile.name;
             const docNameEn = getDoctorNameEn(doctorProfile.name);
             const cancelMessage = language === 'en'
               ? `Hello ${data.patient_name} 👋\n\nYour appointment has been cancelled ${actorLabel} in ShifaBook.\n\nDoctor: ${docNameEn}\nDate: ${data.appointment_date}\nTime: ${formatTimeHelper(data.appointment_time, language)}\nQueue Number: ${data.queue_code || ''}\n\nClinic: ${facility.nameEn}\nAddress: ${facility.addressEn}\nLocation:\n${facility.mapUrl}\n\nYou can book a new appointment anytime through the booking page.\n\nThank you for using ShifaBook.`
               : (actorLabel === "بناءً على طلبك"
                 ? `تم إلغاء موعدك بناءً على طلبك. رقم الدور الملغي: ${data.queue_code || ''}`
                 : `تم إلغاء موعدك ${actorLabel}. رقم الدور الملغي: ${data.queue_code || ''}`);

             const payload = {
               event_type: 'booking.cancelled',
               data: {
                 patient_name: data.patient_name,
                 patient_phone: data.patient_phone,
                 doctor_name: docNameAr,
                 doctor_name_en: docNameEn,
                 specialization: doctorProfile.specialization,
                 specialization_en: getDoctorSpecEn(doctorProfile.specialization),
                 appointment_date: data.appointment_date,
                 appointment_time: data.appointment_time,
                 facility_name: facility.name,
                 facility_name_en: facility.nameEn || getFacilityNameEn(facility.name),
                 facility_address: facility.address,
                 facility_address_en: facility.addressEn || getFacilityAddrEn(facility.address),
                 facility_map_url: facility.mapUrl,
                 booking_id: data.id,
                 queue_code: data.queue_code,
                 cancelled_by: data.cancelled_by || cancelledBy,
                 performed_by_role: clinicUser ? clinicUser.role : 'patient',
                 performed_by_name: clinicUser ? clinicUser.full_name : data.patient_name,
                 actor_label: actorLabel,
                 message: cancelMessage,
                 language: language,
                 locale: language
               }
             };

            // Client-side Log: [CLIENT_WHATSAPP_EVENT]
            console.log('[CLIENT_WHATSAPP_EVENT]', payload);

            const response = await fetch('/api/public/whatsapp', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });

            const responseText = await response.text();

            // Client-side Log: [CLIENT_WHATSAPP_RESULT]
            console.log('[CLIENT_WHATSAPP_RESULT]', {
              event_type: payload.event_type,
              ok: response.ok,
              status: response.status,
              body: responseText
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
    setBookings(prev => prev.map(b => (b.id === targetId || b.id === bookingId) ? { 
      ...b, 
      status: 'cancelled' as const,
      cancelled_by: clinicUser ? `${clinicUser.full_name} (${clinicUser.role})` : 'patient',
      cancelled_at: new Date().toISOString()
    } : b));

    localStorage.removeItem('shifabook_active_booking_details');
    setActiveBooking(null);
    saveActiveId(null);

    // Refresh appointments immediately
    await refreshAppointments();
  };

  const confirmAttendance = async (bookingId: string) => {
    if (clinicUser && clinicUser.role === 'accountant') {
      const errorMsg = language === 'ar' ? "ليس لديك صلاحية لتنفيذ هذا الإجراء." : "You do not have permission to perform this action.";
      if (typeof window !== 'undefined') window.alert(errorMsg);
      throw new Error(errorMsg);
    }

    // If it's a Supabase UUID
    if (bookingId.length === 36) {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        let updateData: any = { status: 'confirmed' };
        if (clinicUser) {
          updateData.confirmed_by = `${clinicUser.full_name} (${clinicUser.role})`;
          updateData.confirmed_at = new Date().toISOString();
        }

        const { error } = await supabase
          .from('appointments')
          .update(updateData)
          .eq('id', bookingId);

        if (error) {
          if (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('schema cache')) {
            await supabase
              .from('appointments')
              .update({ status: 'confirmed' })
              .eq('id', bookingId);
          } else {
            throw error;
          }
        }
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

  const markAttended = async (bookingId: string) => {
    if (clinicUser && !['admin', 'supervisor', 'reception'].includes(clinicUser.role)) {
      const errorMsg = language === 'ar' ? "ليس لديك صلاحية لتنفيذ هذا الإجراء." : "You do not have permission to perform this action.";
      if (typeof window !== 'undefined') window.alert(errorMsg);
      throw new Error(errorMsg);
    }

    // If it's a Supabase UUID
    if (bookingId.length === 36) {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        let updateData: any = { status: 'attended' };
        if (clinicUser) {
          updateData.attended_by = `${clinicUser.full_name} (${clinicUser.role})`;
          updateData.attended_at = new Date().toISOString();
        }

        const { error } = await supabase
          .from('appointments')
          .update(updateData)
          .eq('id', bookingId);

        if (error) {
          if (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('schema cache')) {
            await supabase
              .from('appointments')
              .update({ status: 'attended' })
              .eq('id', bookingId);
          } else {
            throw error;
          }
        }
      } catch (err) {
        console.error('Failed to mark attended in Supabase:', err);
      }
    }

    const updated = bookings.map(b => {
      if (b.id === bookingId) {
        return { ...b, status: 'attended' as any };
      }
      return b;
    });
    setBookings(updated);
    await refreshAppointments();
  };

  const markNoShow = async (bookingId: string) => {
    if (clinicUser && !['admin', 'supervisor', 'reception'].includes(clinicUser.role)) {
      const errorMsg = language === 'ar' ? "ليس لديك صلاحية لتنفيذ هذا الإجراء." : "You do not have permission to perform this action.";
      if (typeof window !== 'undefined') window.alert(errorMsg);
      throw new Error(errorMsg);
    }

    if (bookingId.length === 36) {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        let updateData: any = { status: 'no_show' };

        const { error } = await supabase
          .from('appointments')
          .update(updateData)
          .eq('id', bookingId);

        if (error) {
          throw error;
        }
      } catch (err) {
        console.error('Failed to mark no-show in Supabase:', err);
      }
    }

    const updated = bookings.map(b => {
      if (b.id === bookingId) {
        return { ...b, status: 'no_show' as any };
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

      // Check if this slot is blocked by any exception
      const matchingException = scheduleExceptions.find(exc => {
        if (exc.slot_time !== timeStr) return false;
        if (exc.is_recurring_weekly) {
          return exc.weekday === dayOfWeek;
        } else {
          return exc.exception_date === dateStr;
        }
      });

      const isBlocked = !!matchingException;
      const blockedReason = matchingException ? matchingException.reason : null;
      const exceptionId = matchingException ? matchingException.id : null;
      const isRecurring = matchingException ? matchingException.is_recurring_weekly : false;

      slots.push({
        time: timeStr,
        bookings: slotBookings,
        capacity: scheduleConfig.capacityPerSlot,
        isBooked,
        isExpired,
        isBlocked,
        blockedReason,
        exceptionId,
        isRecurring
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
          ? `مرحباً ${b.patientName} 👋\n\nتم تأكيد حجزك بنجاح في شفاء بوك.\n\n👨‍⚕️ الطبيب: ${docName}\n🩺 التخصص: ${spec}\n\n📅 التاريخ: ${b.date}\n⏰ الوقت: ${formattedSlotTime}\n\nرقم الدور: ${b.queue_code || getQueueCode(b.date, b.timeSlot, scheduleConfig, bookings)}\n\n📍 العيادة: ${b.facilityName || 'فرع المهندسين'}\nالعنوان: ${b.facilityAddress || 'شارع جامعة الدول العربية، المهندسين'}\n🗺️ اللوكيشن:\n${b.facilityMapUrl || 'https://maps.google.com/?q=30.052,31.200'}\n\nشكراً لاستخدامك شفاء بوك.`
          : `Hello ${b.patientName} 👋\n\nYour appointment has been successfully confirmed at ShifaBook.\n\n👨‍⚕️ Doctor: ${docName}\n🩺 Specialty: ${spec}\n\n📅 Date: ${b.date}\n⏰ Time: ${formattedSlotTime}\nQueue Number: ${b.queue_code || getQueueCode(b.date, b.timeSlot, scheduleConfig, bookings)}\n\n📍 Clinic: ${b.facilityName || 'Mohandessin Branch'}\nAddress: ${b.facilityAddress || ''}\n🗺️ Location Map:\n${b.facilityMapUrl || ''}\n\nThank you for using ShifaBook.`,
        status: b.status === 'pending' ? 'sent' : 'replied'
      });

      // 2. Confirmed Event (if status is confirmed)
      if (b.status === 'confirmed') {
        const confirmedTime = new Date(b.createdAt || Date.now()).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const actor = b.rescheduled_by || 'patient';
        const actorLabel = getActorArabicLabel(actor, language);
        const formattedTime = formatTimeHelper(b.timeSlot);

        events.push({
          id: `wa-confirmed-${b.id}`,
          timestamp: confirmedTime,
          type: 'booking.confirmed',
          patientName: b.patientName,
          phone: b.mobileNumber,
          message: language === 'ar'
            ? `مرحباً ${b.patientName} 👋\n\n${actorLabel === "بناءً على طلبك" ? "تم تعديل موعدك بناءً على طلبك." : `تم تعديل موعدك ${actorLabel}.`}\nالموعد الجديد: ${b.date} - ${formattedTime}\nرقم الدور الجديد: ${b.queue_code || getQueueCode(b.date, b.timeSlot, scheduleConfig, bookings)}\n\n👨‍⚕️ الطبيب: ${docName}\n📍 العيادة: ${b.facilityName || 'فرع المهندسين'}\nالعنوان: ${b.facilityAddress || ''}\n🗺️ اللوكيشن:\n${b.facilityMapUrl || ''}\n\nنتشرف بحضورك في الموعد الجديد.`
            : `Hello ${b.patientName} 👋\n\nYour appointment has been successfully rescheduled at ShifaBook.\n\n👨‍⚕️ Doctor: ${docName}\nNew Slot:\n📅 ${b.date}\n⏰ ${formattedTime}\nNew Queue Number: ${b.queue_code || getQueueCode(b.date, b.timeSlot, scheduleConfig, bookings)}\n\n📍 Clinic: ${b.facilityName || ''}\nAddress: ${b.facilityAddress || ''}\n🗺️ Location Map:\n${b.facilityMapUrl || ''}\n\nLooking forward to seeing you at the new slot.`,
          status: 'read'
        });
      }

      // 3. Cancelled Event (if status is cancelled)
      if (b.status === 'cancelled') {
        const cancelledTime = new Date(b.createdAt || Date.now()).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const actor = b.cancelled_by || 'patient';
        const actorLabel = getActorArabicLabel(actor, language);

        events.push({
          id: `wa-cancelled-${b.id}`,
          timestamp: cancelledTime,
          type: 'booking.cancelled',
          patientName: b.patientName,
          phone: b.mobileNumber,
          message: language === 'ar'
            ? `مرحباً ${b.patientName} 👋\n\n${actorLabel === "بناءً على طلبك" ? "تم إلغاء موعدك بناءً على طلبك. رقم الدور الملغي: " + (b.queue_code || '') : `تم إلغاء موعدك ${actorLabel}. رقم الدور الملغي: ` + (b.queue_code || '')}\n\n👨‍⚕️ الطبيب: ${docName}\n📅 التاريخ: ${b.date}\n⏰ الوقت: ${formattedSlotTime}\n\n📍 العيادة: ${b.facilityName || 'فرع المهندسين'}\nالعنوان: ${b.facilityAddress || ''}\n\nيمكنك حجز موعد جديد في أي وقت من خلال صفحة الحجز.\n\nشكراً لاستخدامك شفاء بوك.`
            : `Hello ${b.patientName} 👋\n\nYour appointment has been cancelled at ShifaBook.\n\n👨‍⚕️ Doctor: ${docName}\n📅 Date: ${b.date}\n⏰ Time: ${formattedSlotTime}\nQueue Number: ${b.queue_code || ''}\n\n📍 Clinic: ${b.facilityName || ''}\nAddress: ${b.facilityAddress || ''}\n\nYou can book a new slot anytime via the booking page.\n\nThank you for using ShifaBook.`,
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
      // RC-2.0: Scope by doctor_id to prevent cross-doctor booking conflicts
      let apptQuery = supabase
        .from('appointments')
        .select('*')
        .eq('patient_phone', normalized)
        .neq('status', 'cancelled')
        .gte('appointment_date', todayStr);
      if (doctorProfile?.id) {
        apptQuery = apptQuery.eq('doctor_id', doctorProfile.id);
      }
      const { data: appointments, error: apptError } = await apptQuery
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      let foundActive: PatientBooking | null = null;
      if (!apptError && appointments && appointments.length > 0) {
        const activeAppt = appointments.find(appt => isAppointmentInFutureOrNow(appt.appointment_date, appt.appointment_time));
        if (activeAppt) {
          foundActive = {
            id: activeAppt.id,
            patientName: activeAppt.patient_name,
            mobileNumber: activeAppt.patient_phone,
            date: activeAppt.appointment_date,
            timeSlot: activeAppt.appointment_time,
            status: activeAppt.status as any,
            price: activeAppt.consultation_fee_at_booking ?? doctorProfile?.consultationFee ?? 0,
            createdAt: activeAppt.created_at,
            cancelled_by: activeAppt.cancelled_by,
            cancelled_at: activeAppt.cancelled_at,
            rescheduled_by: activeAppt.rescheduled_by,
            rescheduled_at: activeAppt.rescheduled_at,
            queue_code: activeAppt.queue_code
          };
        }
      }

      if (foundActive) {
        setActiveBooking(foundActive);
        saveActiveId(foundActive.id);
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
      // RC-2.0: Scope patients by clinic_id if available
      let patientQuery = supabase.from('patients').select('*');
      if (clinic?.id) {
        patientQuery = patientQuery.eq('clinic_id', clinic.id);
      }
      const { data, error } = await patientQuery.order('full_name');
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
        markAttended,
        markNoShow,
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
        clinicUser,
        isLoadingProfile,
        scheduleExceptions,
        isExceptionsTableActive,
        createBlockedSlots,
        deleteBlockedSlot,
        bookFollowUpAppointment,
        getFollowUpChain,
        clinic,
        clinicDoctors,
        resolveDoctorByHandle
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

