const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local for Supabase credentials
const envPath = path.join(__dirname, '..', '.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  try {
    envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  } catch (e2) {
    console.error("Could not find .env.local", e2);
    process.exit(1);
  }
}

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Doctor ID
const DOCTOR_ID = '5e236d18-ff19-42d5-82cf-6e6d6a177e9a';
// Default Clinic ID (from RC-2.0, if clinics table exists)
const CLINIC_ID = 'c0000000-0000-0000-0000-000000000001';
// Default Facility ID
const FACILITY_ID = '8c9cbe7d-f421-4f10-9118-2e0618037ea4';

// 30 Realistic Patients
const PATIENTS_DATA = [
  { full_name: 'أحمد محمود العشري', phone: '+201002345678', gender: 'ذكر', birth_date: '1992-04-12', age: 34, blood_type: 'O+', chronic_diseases: 'لا يوجد', allergies: 'بنسلين', notes: 'متابعة ما بعد استئصال الزائدة.' },
  { full_name: 'منى أحمد عبد الكريم', phone: '+201115678901', gender: 'أنثى', birth_date: '1998-08-20', age: 28, blood_type: 'A+', chronic_diseases: 'لا يوجد', allergies: 'لا يوجد', notes: 'متابعة الحمل في الثلث الثاني.' },
  { full_name: 'محمد علي الشافعي', phone: '+201223456789', gender: 'ذكر', birth_date: '1981-01-15', age: 45, blood_type: 'B+', chronic_diseases: 'ارتفاع ضغط الدم', allergies: 'سلفا', notes: 'حالة ارتفاع ضغط دم شرياني مزمن.' },
  { full_name: 'فاطمة عمر الشرقاوي', phone: '+201556789012', gender: 'أنثى', birth_date: '1974-11-03', age: 52, blood_type: 'AB+', chronic_diseases: 'السكري من النوع الثاني', allergies: 'لا يوجد', notes: 'تنظيم جرعات الأنسولين.' },
  { full_name: 'يوسف حسن رضوان', phone: '+201014567890', gender: 'ذكر', birth_date: '2014-05-18', age: 12, blood_type: 'O-', chronic_diseases: 'حساسية صدرية (ربو)', allergies: 'مكسرات', notes: 'متابعة دورية لحساسية الصدر الموسمية.' },
  { full_name: 'سارة ابراهيم بدوي', phone: '+201123456780', gender: 'أنثى', birth_date: '1995-10-22', age: 31, blood_type: 'A-', chronic_diseases: 'خمول الغدة الدرقية', allergies: 'لا يوجد', notes: 'تعديل جرعة التروكسين.' },
  { full_name: 'عمرو مصطفى خليل', phone: '+201201234567', gender: 'ذكر', birth_date: '1997-03-30', age: 29, blood_type: 'O+', chronic_diseases: 'لا يوجد', allergies: 'لا يوجد', notes: 'فحص دوري عام.' },
  { full_name: 'رانيا خالد الهواري', phone: '+201509876543', gender: 'أنثى', birth_date: '1988-07-07', age: 38, blood_type: 'B-', chronic_diseases: 'أنيميا البحر المتوسط', allergies: 'لا يوجد', notes: 'متابعة نسبة الهيموجلوبين.' },
  { full_name: 'خالد عبد الرحمن الفيشاوي', phone: '+201091234567', gender: 'ذكر', birth_date: '1965-02-14', age: 61, blood_type: 'AB-', chronic_diseases: 'قصور الشريان التاجي', allergies: 'أسبرين', notes: 'مريض قلب تاجى، يحتاج متابعة دورية.' },
  { full_name: 'نادين شريف سلامة', phone: '+201198765432', gender: 'أنثى', birth_date: '2002-09-09', age: 24, blood_type: 'O+', chronic_diseases: 'لا يوجد', allergies: 'فراولة', notes: 'حساسية طفح جلدي مؤقت.' },
  { full_name: 'طارق سعيد الجيار', phone: '+201281234567', gender: 'ذكر', birth_date: '1986-06-25', age: 40, blood_type: 'A+', chronic_diseases: 'النقرس', allergies: 'لا يوجد', notes: 'تحليل حمض البوليك ومتابعة النظام الغذائي.' },
  { full_name: 'مها عادل البشري', phone: '+201597654321', gender: 'أنثى', birth_date: '1978-04-18', age: 48, blood_type: 'O+', chronic_diseases: 'لا يوجد', allergies: 'بنسلين', notes: 'استشارة فحص سنوي.' },
  { full_name: 'مصطفى كامل سليم', phone: '+201061234567', gender: 'ذكر', birth_date: '1991-12-12', age: 35, blood_type: 'B+', chronic_diseases: 'ارتفاع الكوليسترول', allergies: 'لا يوجد', notes: 'تنظيم نسبة الدهون في الدم.' },
  { full_name: 'هند شريف غانم', phone: '+201169876543', gender: 'أنثى', birth_date: '1999-01-01', age: 27, blood_type: 'A+', chronic_diseases: 'لا يوجد', allergies: 'لا يوجد', notes: 'زيارة متابعة دورية.' },
  { full_name: 'علي حسين الجبالي', phone: '+201271234567', gender: 'ذكر', birth_date: '1971-08-30', age: 55, blood_type: 'O+', chronic_diseases: 'ارتفاع ضغط الدم', allergies: 'لا يوجد', notes: 'متابعة قياسات الضغط اليومية.' },
  { full_name: 'هالة مجدي السويفي', phone: '+201529876543', gender: 'أنثى', birth_date: '1983-05-15', age: 43, blood_type: 'AB+', chronic_diseases: 'صداع نصفي مزمن', allergies: 'مسكنات معينة', notes: 'مراجعة فعالية أدوية الوقاية.' },
  { full_name: 'محمود عبد العزيز الجزار', phone: '+201029876543', gender: 'ذكر', birth_date: '1976-03-24', age: 50, blood_type: 'O-', chronic_diseases: 'لا يوجد', allergies: 'لا يوجد', notes: 'فحص للاطمئنان العام.' },
  { full_name: 'ريم طارق السادات', phone: '+201129876543', gender: 'أنثى', birth_date: '2004-10-10', age: 22, blood_type: 'B+', chronic_diseases: 'لا يوجد', allergies: 'مكسرات', notes: 'فحص قبل التوظيف.' },
  { full_name: 'كريم علاء الدين', phone: '+201229876543', gender: 'ذكر', birth_date: '1993-02-28', age: 33, blood_type: 'A-', chronic_diseases: 'لا يوجد', allergies: 'لا يوجد', notes: 'استشارة سريعة.' },
  { full_name: 'جيهان كمال الشربيني', phone: '+201521234567', gender: 'أنثى', birth_date: '1968-09-05', age: 58, blood_type: 'O+', chronic_diseases: 'روماتويد مفصلي', allergies: 'لا يوجد', notes: 'متابعة العلاج البيولوجي والالتهابات.' },
  { full_name: 'شريف منير الزيات', phone: '+201089876543', gender: 'ذكر', birth_date: '1979-06-12', age: 47, blood_type: 'AB+', chronic_diseases: 'لا يوجد', allergies: 'بنسلين', notes: 'استشارة بخصوص آلام الظهر.' },
  { full_name: 'نجلاء فتحي السقا', phone: '+201189876543', gender: 'أنثى', birth_date: '1987-03-03', age: 39, blood_type: 'O+', chronic_diseases: 'لا يوجد', allergies: 'لا يوجد', notes: 'متابعة ما بعد الولادة القيصرية.' },
  { full_name: 'هشام عباس الشافعي', phone: '+201289876543', gender: 'ذكر', birth_date: '1984-07-22', age: 42, blood_type: 'A+', chronic_diseases: 'الكبد الدهني', allergies: 'لا يوجد', notes: 'متابعة وظائف الكبد ومستويات الكوليسترول.' },
  { full_name: 'دينا الشربيني غالي', phone: '+201589876543', gender: 'أنثى', birth_date: '1990-05-05', age: 36, blood_type: 'B+', chronic_diseases: 'لا يوجد', allergies: 'لا يوجد', notes: 'فحص شامل.' },
  { full_name: 'ماجد الكدواني زكي', phone: '+201039876543', gender: 'ذكر', birth_date: '1973-11-20', age: 53, blood_type: 'O+', chronic_diseases: 'السكري والضغط', allergies: 'لا يوجد', notes: 'تعديل الخطة الدوائية المشتركة للضغط والسكري.' },
  { full_name: 'منى زكي عبد الرحمن', phone: '+201139876543', gender: 'أنثى', birth_date: '1985-06-15', age: 41, blood_type: 'A+', chronic_diseases: 'لا يوجد', allergies: 'فول الصويا', notes: 'متابعة مستوى فيتامين د والكالسيوم.' },
  { full_name: 'أحمد حلمي القاضي', phone: '+201239876543', gender: 'ذكر', birth_date: '1980-04-16', age: 46, blood_type: 'B-', chronic_diseases: 'لا يوجد', allergies: 'لا يوجد', notes: 'متابعة آلام الفقرات القطنية.' },
  { full_name: 'كريم عبد العزيز حسن', phone: '+201539876543', gender: 'أنثى', birth_date: '1982-10-18', age: 44, blood_type: 'AB-', chronic_diseases: 'لا يوجد', allergies: 'لا يوجد', notes: 'مراجعة التحاليل المعملية.' },
  { full_name: 'أمير كرارة سليم', phone: '+201049876543', gender: 'ذكر', birth_date: '1989-02-10', age: 37, blood_type: 'O+', chronic_diseases: 'لا يوجد', allergies: 'لا يوجد', notes: 'فحص رياضي دوري.' },
  { full_name: 'يسرا اللوزي غانم', phone: '+201149876543', gender: 'أنثى', birth_date: '1996-03-24', age: 30, blood_type: 'A-', chronic_diseases: 'لا يوجد', allergies: 'بنسلين', notes: 'زيارة أولى للمتابعة العامة.' }
];

// Helper to check if a column exists in a database table
async function checkColumnExists(tableName, columnName) {
  try {
    const { error } = await supabase.from(tableName).select(columnName).limit(1);
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST204' || error.code === 'PGRST205' || error.message?.includes('relation') || error.message?.includes('schema cache')) {
        return false;
      }
      if (error.code === '42703' || error.message.includes('column') || error.message.includes('does not exist')) {
        return false;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

// Helper to check if a table exists
async function checkTableExists(tableName) {
  try {
    const { error } = await supabase.from(tableName).select('*').limit(1);
    if (error) {
      if (error.code === '42P01' || 
          error.code === 'PGRST204' || 
          error.code === 'PGRST205' || 
          error.message?.includes('relation') || 
          error.message?.includes('schema cache') || 
          error.message?.includes('does not exist')) {
        return false;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

// Format date helper (YYYY-MM-DD)
function formatDate(date) {
  const d = new Date(date);
  const month = '' + (d.getMonth() + 1);
  const day = '' + d.getDate();
  const year = d.getFullYear();
  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
}

async function run() {
  console.log("Starting ShifaBook realistic demo data seed...");

  // 1. Schema introspection
  const hasClinicIdOnPatients = await checkColumnExists('patients', 'clinic_id');
  const hasClinicIdOnExpenses = await checkColumnExists('expenses', 'clinic_id');
  const hasAppointmentType = await checkColumnExists('appointments', 'appointment_type');
  const hasParentAppointmentId = await checkColumnExists('appointments', 'parent_appointment_id');
  const hasFacilityIdOnAppointments = await checkColumnExists('appointments', 'facility_id');
  const hasPatientIdOnAppointments = await checkColumnExists('appointments', 'patient_id');
  const hasExpensesTable = await checkTableExists('expenses');
  const hasPaymentsTable = await checkTableExists('payments');
  const hasInvoicesTable = await checkTableExists('invoices');

  console.log("Schema Scoping Detection:");
  console.log(`- clinic_id on patients: ${hasClinicIdOnPatients}`);
  console.log(`- clinic_id on expenses: ${hasClinicIdOnExpenses}`);
  console.log(`- appointment_type on appointments: ${hasAppointmentType}`);
  console.log(`- parent_appointment_id on appointments: ${hasParentAppointmentId}`);
  console.log(`- facility_id on appointments: ${hasFacilityIdOnAppointments}`);
  console.log(`- patient_id on appointments: ${hasPatientIdOnAppointments}`);
  console.log(`- expenses table active: ${hasExpensesTable}`);
  console.log(`- payments table active: ${hasPaymentsTable}`);
  console.log(`- invoices table active: ${hasInvoicesTable}`);

  // 2. Insert Patients first to get stable UUIDs
  console.log(`Upserting ${PATIENTS_DATA.length} patient profiles...`);
  const patientsToInsert = PATIENTS_DATA.map(p => {
    const record = { ...p };
    if (hasClinicIdOnPatients) {
      record.clinic_id = CLINIC_ID;
    }
    return record;
  });

  const { data: insertedPatients, error: patientErr } = await supabase
    .from('patients')
    .upsert(patientsToInsert, { onConflict: 'phone' })
    .select();

  if (patientErr) {
    console.error("Failed to seed patients:", patientErr.message);
    process.exit(1);
  }
  console.log(`Successfully seeded/updated ${insertedPatients.length} patients.`);

  // Map patient phones to their database IDs
  const patientMap = {};
  insertedPatients.forEach(p => {
    patientMap[p.phone] = p;
  });

  // 3. Fetch existing active appointments to avoid unique constraint violations
  console.log("Fetching existing active appointments to prevent conflicts...");
  const { data: existingAppts, error: fetchErr } = await supabase
    .from('appointments')
    .select('appointment_date, appointment_time')
    .eq('doctor_id', DOCTOR_ID)
    .neq('status', 'cancelled')
    .gte('appointment_date', '2026-05-24')
    .lte('appointment_date', '2026-06-13');

  if (fetchErr) {
    console.error("Failed to fetch existing appointments:", fetchErr.message);
    process.exit(1);
  }
  const activeSlotsSet = new Set((existingAppts || []).map(a => `${a.appointment_date}_${a.appointment_time}`));
  console.log(`Found ${activeSlotsSet.size} existing active slots.`);

  // 4. Generate dates for the last 21 days (from 2026-05-24 to 2026-06-13)
  const today = new Date('2026-06-13'); // Fixed current local time context
  const workDays = [0, 1, 2, 3, 4]; // Sun, Mon, Tue, Wed, Thu
  const prefixes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"
  ];

  // Store regular appointments for linking follow-ups
  const regularBookings = [];
  const allAppointments = [];
  
  let totalBooked = 0;
  let totalCancelled = 0;

  for (let dayOffset = 20; dayOffset >= 0; dayOffset--) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() - dayOffset);
    const dateStr = formatDate(currentDate);
    const dayOfWeek = currentDate.getDay();

    if (!workDays.includes(dayOfWeek)) {
      continue; // Skip weekends
    }

    let targetOccupancy = 0;
    if (dayOffset >= 14) {
      targetOccupancy = 7; // Week 1: 7 slots/day -> 35 total bookings (deleted 5 bookings from original 40)
    } else if (dayOffset >= 7) {
      targetOccupancy = 10; // Week 2: 10 slots/day -> 50 total bookings (deleted 5 bookings from original 55)
    } else {
      targetOccupancy = 16; // Week 3: 16 slots/day -> 80 total bookings (to ensure we have enough to hit exactly 73 active bookings)
    }

    const prefix = prefixes[dayOfWeek];
    
    // Select specific time slots to fill
    const selectedSlots = timeSlots.slice(0, targetOccupancy);

    selectedSlots.forEach((timeStr, slotIdx) => {
      // Check if slot already has an active appointment in the DB
      if (activeSlotsSet.has(`${dateStr}_${timeStr}`)) {
        console.log(`Slot ${dateStr} ${timeStr} already has an active appointment in DB. Skipping to avoid duplicate key violation.`);
        return;
      }
      
      // Select patient cyclically to ensure balance
      const patientIndex = (totalBooked) % PATIENTS_DATA.length;
      const patientTemplate = PATIENTS_DATA[patientIndex];
      const dbPatient = patientMap[patientTemplate.phone];

      totalBooked++;

      // Compute Queue Code
      const queueCode = `${prefix}${(slotIdx + 1).toString().padStart(2, '0')}`;

      // Set pricing based on follow-up or regular
      // If we are in Week 2/3 and this is one of the follow-ups (about 15-20% of active bookings)
      const isFollowUp = hasAppointmentType && hasParentAppointmentId && 
                         (dayOffset < 14) && 
                         (slotIdx % 5 === 0) && 
                         regularBookings.length > 0;

      let appointmentType = 'regular';
      let parentId = null;
      let fee = 450; // Regular Consultation Fee

      if (isFollowUp) {
        appointmentType = 'follow_up';
        // Pick an earlier regular appointment for the same patient or another patient to link
        const parentAppt = regularBookings.find(b => b.patient_phone === dbPatient.phone) || regularBookings[Math.floor(Math.random() * regularBookings.length)];
        parentId = parentAppt ? parentAppt.id : null;
        // Follow-up fee: either free (0) or discounted (150 EGP)
        fee = slotIdx % 10 === 0 ? 0 : 150;
      }

      const createdTime = new Date(currentDate);
      createdTime.setHours(8, 0, 0); // Booked earlier in the morning
      
      const apptRecord = {
        id: crypto.randomUUID(), // pregenerate id for linking
        doctor_id: DOCTOR_ID,
        patient_name: dbPatient.full_name,
        patient_phone: dbPatient.phone,
        appointment_date: dateStr,
        appointment_time: timeStr,
        status: 'attended', // all initially marked active, post-processing will adjust
        source: 'demo-seed-rc1', // tagging for clean rollback
        consultation_fee_at_booking: fee,
        queue_code: queueCode,
        created_at: createdTime.toISOString(),
        updated_at: createdTime.toISOString()
      };

      if (hasFacilityIdOnAppointments) {
        apptRecord.facility_id = FACILITY_ID;
      }
      if (hasPatientIdOnAppointments) {
        apptRecord.patient_id = dbPatient.id;
      }

      if (hasAppointmentType) {
        apptRecord.appointment_type = appointmentType;
      }
      if (hasParentAppointmentId) {
        apptRecord.parent_appointment_id = parentId;
      }

      allAppointments.push(apptRecord);

      if (appointmentType === 'regular') {
        regularBookings.push(apptRecord);
      }
    });
  }

  // 3. Post-processing adjustment to guarantee exact counts and avoid unique key violations
  console.log("Post-processing generated appointments to hit target active/cancelled counts...");
  
  // Group by week
  const week1Appts = allAppointments.filter(a => a.appointment_date >= '2026-05-24' && a.appointment_date <= '2026-05-30');
  const week2Appts = allAppointments.filter(a => a.appointment_date >= '2026-05-31' && a.appointment_date <= '2026-06-06');
  const week3Appts = allAppointments.filter(a => a.appointment_date >= '2026-06-07' && a.appointment_date <= '2026-06-13');

  // Existing active counts in the DB
  const existingActiveWeek1 = (existingAppts || []).filter(a => a.appointment_date >= '2026-05-24' && a.appointment_date <= '2026-05-30').length;
  const existingActiveWeek2 = (existingAppts || []).filter(a => a.appointment_date >= '2026-05-31' && a.appointment_date <= '2026-06-06').length;
  const existingActiveWeek3 = (existingAppts || []).filter(a => a.appointment_date >= '2026-06-07' && a.appointment_date <= '2026-06-13').length;

  console.log(`Existing active in DB - W1: ${existingActiveWeek1}, W2: ${existingActiveWeek2}, W3: ${existingActiveWeek3}`);

  // Target active counts from seeding
  const targetActiveWeek1 = Math.max(0, 33 - existingActiveWeek1);
  const targetActiveWeek2 = Math.max(0, 47 - existingActiveWeek2);
  const targetActiveWeek3 = Math.max(0, 73 - existingActiveWeek3);

  // Target cancelled counts
  const targetCancelledWeek1 = 2;
  const targetCancelledWeek2 = 3;
  const targetCancelledWeek3 = 4;

  const adjustWeek = (appts, targetActive, targetCancelled) => {
    // Sort to keep it consistent
    appts.sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.appointment_time.localeCompare(b.appointment_time));
    
    let activeSet = 0;
    let cancelledSet = 0;

    appts.forEach(appt => {
      if (activeSet < targetActive) {
        appt.status = 'attended';
        activeSet++;
      } else if (cancelledSet < targetCancelled) {
        appt.status = 'cancelled';
        appt.cancelled_by = 'System Admin (admin)';
        const createdTime = new Date(appt.created_at);
        const cancelTime = new Date(createdTime);
        cancelTime.setHours(9, 30);
        appt.cancelled_at = cancelTime.toISOString();
        cancelledSet++;
        totalCancelled++;
      } else {
        // Any overflow becomes cancelled
        appt.status = 'cancelled';
        appt.cancelled_by = 'System Admin (admin)';
        const createdTime = new Date(appt.created_at);
        const cancelTime = new Date(createdTime);
        cancelTime.setHours(9, 30);
        appt.cancelled_at = cancelTime.toISOString();
        totalCancelled++;
      }
    });

    console.log(`Adjusted week - target active: ${targetActive}, actual active: ${activeSet}, target cancelled: ${targetCancelled}, actual cancelled: ${cancelledSet}`);
  };

  adjustWeek(week1Appts, targetActiveWeek1, targetCancelledWeek1);
  adjustWeek(week2Appts, targetActiveWeek2, targetCancelledWeek2);
  adjustWeek(week3Appts, targetActiveWeek3, targetCancelledWeek3);

  const totalActiveCount = allAppointments.filter(a => a.status === 'attended').length;
  console.log(`Generated ${allAppointments.length} appointments (${totalCancelled} cancelled, ${totalActiveCount} active).`);
  console.log(`Cancellation Rate: ${((totalCancelled / (totalActiveCount + totalCancelled)) * 100).toFixed(2)}%`);

  // 4. Batch insert appointments
  const { data: insertedAppts, error: apptErr } = await supabase
    .from('appointments')
    .insert(allAppointments)
    .select();

  if (apptErr) {
    console.error("Failed to seed appointments:", apptErr.message);
    process.exit(1);
  }
  console.log(`Successfully seeded ${insertedAppts.length} appointments.`);

  // 5. Seed Payments & Invoices (if finance tables exist)
  if (hasPaymentsTable) {
    console.log("Payments table exists. Generating payment records for active appointments...");
    const payments = [];
    const invoices = [];

    insertedAppts.forEach(appt => {
      if (appt.status === 'cancelled') return; // no payments for cancelled

      const paymentId = crypto.randomUUID();
      const createdTime = new Date(appt.created_at);
      const paidTime = new Date(appt.appointment_date + 'T' + appt.appointment_time + ':00.000Z');

      payments.push({
        id: paymentId,
        appointment_id: appt.id,
        patient_name: appt.patient_name,
        patient_phone: appt.patient_phone,
        amount: appt.consultation_fee_at_booking,
        status: 'paid',
        method: Math.random() < 0.8 ? 'cash' : 'card', // 80% cash, 20% card
        paid_at: paidTime.toISOString(),
        received_by: 'Reception User (reception)',
        created_at: createdTime.toISOString(),
        updated_at: paidTime.toISOString()
      });

      if (hasInvoicesTable) {
        const invNum = `INV-${new Date(appt.appointment_date).getFullYear()}-${appt.id.substring(0, 8).toUpperCase()}`;
        invoices.push({
          invoice_number: invNum,
          appointment_id: appt.id,
          payment_id: paymentId,
          patient_name: appt.patient_name,
          patient_phone: appt.patient_phone,
          amount: appt.consultation_fee_at_booking,
          status: 'issued',
          issued_at: paidTime.toISOString(),
          created_at: paidTime.toISOString()
        });
      }
    });

    const { error: payErr } = await supabase.from('payments').insert(payments);
    if (payErr) {
      console.error("Failed to seed payments:", payErr.message);
    } else {
      console.log(`Successfully seeded ${payments.length} payment records.`);
    }

    if (hasInvoicesTable && invoices.length > 0) {
      const { error: invErr } = await supabase.from('invoices').insert(invoices);
      if (invErr) {
        console.error("Failed to seed invoices:", invErr.message);
      } else {
        console.log(`Successfully seeded ${invoices.length} invoice records.`);
      }
    }
  }

  // 6. Seed Expenses (if expenses table exists)
  if (hasExpensesTable) {
    console.log("Expenses table exists. Seeding weekly operating expenses...");
    
    const expenses = [
      // Week 1 (Days 14 to 20 ago)
      { title: 'إيجار مقر العيادة الشهري', category: 'Rent', amount: 3000, expense_date: '2026-05-24', notes: 'إيجار مقر العيادة - فرع المهندسين', created_by: 'Main Administrator' },
      { title: 'فاتورة الكهرباء والمياه', category: 'Utilities', amount: 500, expense_date: '2026-05-26', notes: 'استهلاك المرافق الأسبوعي', created_by: 'Main Administrator' },
      { title: 'أدوات ومستلزمات طبية', category: 'Medical Supplies', amount: 1200, expense_date: '2026-05-27', notes: 'شراء شاش، مطهرات، وخافض حرارة', created_by: 'Main Administrator' },
      
      // Week 2 (Days 7 to 13 ago)
      { title: 'فاتورة الكهرباء والمياه والإنترنت', category: 'Utilities', amount: 600, expense_date: '2026-06-02', notes: 'استهلاك المرافق الأسبوعي', created_by: 'Main Administrator' },
      { title: 'صيانة مكيف الهواء بالعيادة', category: 'Maintenance', amount: 1500, expense_date: '2026-06-03', notes: 'تنظيف وصيانة المكيف الرئيسي للفرع', created_by: 'Main Administrator' },

      // Week 3 (Days 0 to 6 ago)
      { title: 'فاتورة الكهرباء والمياه والإنترنت', category: 'Utilities', amount: 550, expense_date: '2026-06-09', notes: 'استهلاك المرافق الأسبوعي', created_by: 'Main Administrator' },
      { title: 'أدوات ومستلزمات طبية طارئة', category: 'Medical Supplies', amount: 2200, expense_date: '2026-06-10', notes: 'مستلزمات معقمة لغرفة الكشف', created_by: 'Main Administrator' }
    ];

    const expensesToInsert = expenses.map(exp => {
      const record = { ...exp };
      if (hasClinicIdOnExpenses) {
        record.clinic_id = CLINIC_ID;
      }
      return record;
    });

    const { error: expErr } = await supabase.from('expenses').insert(expensesToInsert);
    if (expErr) {
      console.error("Failed to seed expenses:", expErr.message);
    } else {
      console.log(`Successfully seeded ${expensesToInsert.length} expenses.`);
    }
  }

  // 7. Seed Blocked Slots (schedule_exceptions)
  console.log("Seeding schedule exceptions (blocked slots) on several days...");
  const exceptions = [
    { doctor_id: DOCTOR_ID, exception_date: '2026-05-25', slot_time: '12:00', reason: 'استراحة غداء (مجدولة)', is_recurring_weekly: false },
    { doctor_id: DOCTOR_ID, exception_date: '2026-05-25', slot_time: '12:30', reason: 'استراحة غداء (مجدولة)', is_recurring_weekly: false },
    { doctor_id: DOCTOR_ID, exception_date: '2026-06-03', slot_time: '10:00', reason: 'اجتماع إدارة طارئ', is_recurring_weekly: false },
    { doctor_id: DOCTOR_ID, exception_date: '2026-06-09', slot_time: '14:00', reason: 'استراحة الطبيب', is_recurring_weekly: false }
  ];

  // Filter out exceptions if already exists on date + time to avoid conflicts
  const { data: existingExc } = await supabase.from('schedule_exceptions').select('exception_date, slot_time');
  const excSet = new Set((existingExc || []).map(e => `${e.exception_date}_${e.slot_time}`));

  const filteredExceptions = exceptions.filter(e => !excSet.has(`${e.exception_date}_${e.slot_time}`));

  if (filteredExceptions.length > 0) {
    const { error: excErr } = await supabase.from('schedule_exceptions').insert(filteredExceptions);
    if (excErr) {
      console.error("Failed to seed schedule exceptions:", excErr.message);
    } else {
      console.log(`Successfully seeded ${filteredExceptions.length} blocked slots.`);
    }
  } else {
    console.log("Schedule exceptions already exists, skipped.");
  }

  console.log("ShifaBook demo data seeding completed successfully! Natural growth metrics loaded.");
}

run();
