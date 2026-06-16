export interface Facility {
  id: string;
  name: string;
  nameEn: string;
  address: string;
  addressEn: string;
  mapUrl: string;
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
  handle?: string | null;
  workingDays?: number[];
  startTime?: string;
  endTime?: string;
  slotDurationMinutes?: number;
  capacityPerSlot?: number;
}

export interface ScheduleConfig {
  workingDays: number[];     // Day indexes (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  startTime: string;        // "HH:MM" e.g., "09:00"
  endTime: string;          // "HH:MM" e.g., "17:00"
  slotDurationMinutes: number; // e.g., 30 minutes
  capacityPerSlot: number;   // Capacity-ready slot model (e.g. 1 or 2 patients per slot)
  pricePerAppointment: number; // For growth/revenue metrics (e.g. 500 EGP)
}

export interface DemoPatient {
  full_name: string;
  phone: string;
  gender: string;
  birth_date: string;
  age: number;
  blood_type: string;
  chronic_diseases: string;
  allergies: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  patient_status: string;
  notes: string;
}

export const EGYPTIAN_DOCTORS: DoctorProfile[] = [
  {
    name: "د. عبدالله المصري",
    nameEn: "Dr. Abdullah El-Masry",
    title: "استشاري طب وجراحة القلب والأوعية الدموية",
    titleEn: "Consultant Cardiologist & Vascular Surgeon",
    specialization: "طب وجراحة القلب، القسطرة التداخلية، وعلاج ارتفاع ضغط الدم الشرياني والأوعية الدموية.",
    specializationEn: "Interventional Cardiology, hypertension management, and arterial disorders.",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=256&h=256&fit=crop",
    hospital: "مستشفى القصر العيني التخصصي",
    hospitalEn: "El Qasr El Einy Specialized Hospital, Giza",
    consultationFee: 500,
    city: "الجيزة"
  }
];

export const EGYPTIAN_FACILITIES: Facility[] = [
  {
    id: '8c9cbe7d-f421-4f10-9118-2e0618037ea4',
    name: 'فرع المهندسين - الجيزة',
    nameEn: 'Mohandessin Branch - Giza',
    address: 'شارع جامعة الدول العربية، المهندسين',
    addressEn: 'Jamiat Al Dowal Al Arabiya Street, Mohandessin',
    mapUrl: 'https://maps.google.com/?q=30.052,31.200'
  },
  {
    id: '9c9cbe7d-f421-4f10-9118-2e0618037ea4',
    name: 'فرع التجمع الخامس - القاهرة',
    nameEn: 'New Cairo Branch - Cairo',
    address: 'شارع التسعين الشمالي، التجمع الخامس',
    addressEn: 'North 90th Street, Fifth Settlement',
    mapUrl: 'https://maps.google.com/?q=30.027,31.492'
  }
];

export const EGYPTIAN_SCHEDULE_CONFIG: ScheduleConfig = {
  workingDays: [0, 1, 2, 3, 4], // Sun to Thu
  startTime: "09:00",
  endTime: "17:00",
  slotDurationMinutes: 30,
  capacityPerSlot: 1,
  pricePerAppointment: 500, // 500 EGP per booking
};

export const EGYPTIAN_DEMO_PATIENTS: DemoPatient[] = [
  {
    full_name: "ليلى سوسو",
    phone: "01012345678",
    gender: "أنثى",
    birth_date: "1994-06-15",
    age: 32,
    blood_type: "A+",
    chronic_diseases: "لا يوجد",
    allergies: "بنسلين",
    emergency_contact_name: "أحمد حسن (زوج)",
    emergency_contact_phone: "01122334455",
    patient_status: "normal",
    notes: "متابعة دورية للقلب والضغط بعد الحمل."
  },
  {
    full_name: "أحمد رأفت",
    phone: "01234567890",
    gender: "ذكر",
    birth_date: "1980-03-22",
    age: 46,
    blood_type: "O-",
    chronic_diseases: "ارتفاع ضغط الشرايين",
    allergies: "لا يوجد",
    emergency_contact_name: "منى رأفت (أخت)",
    emergency_contact_phone: "01555667788",
    patient_status: "vip",
    notes: "يحتاج مراقبة دورية للنبض وتعديل جرعة دواء الضغط."
  },
  {
    full_name: "مي عبد العزيز",
    phone: "01511223344",
    gender: "أنثى",
    birth_date: "1988-11-05",
    age: 37,
    blood_type: "B+",
    chronic_diseases: "لا يوجد",
    allergies: "الأسبرين",
    emergency_contact_name: "محمود عبد العزيز (أب)",
    emergency_contact_phone: "01099887766",
    patient_status: "normal",
    notes: "شكوى من خفقان خفيف عند الإجهاد البدني."
  }
];
