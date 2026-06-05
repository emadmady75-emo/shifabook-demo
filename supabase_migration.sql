-- 1. Create facilities table
CREATE TABLE IF NOT EXISTS facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    address_ar TEXT,
    address_en TEXT,
    city_ar TEXT NOT NULL,
    city_en TEXT NOT NULL,
    map_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for facilities
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for facilities
DROP POLICY IF EXISTS "Allow public read-only access to facilities" ON facilities;
CREATE POLICY "Allow public read-only access to facilities" ON facilities
    FOR SELECT USING (true);

-- 2. Create facility_doctors junction table
CREATE TABLE IF NOT EXISTS facility_doctors (
    facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    consultation_fee NUMERIC NOT NULL DEFAULT 0,
    schedule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    room_number TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (facility_id, doctor_id)
);

-- Enable RLS for facility_doctors
ALTER TABLE facility_doctors ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for facility_doctors
DROP POLICY IF EXISTS "Allow public read-only access to facility_doctors" ON facility_doctors;
CREATE POLICY "Allow public read-only access to facility_doctors" ON facility_doctors
    FOR SELECT USING (true);

-- 3. Create patients table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    birth_date DATE,
    national_id TEXT UNIQUE,
    patient_priority TEXT NOT NULL DEFAULT 'regular',
    medical_alerts TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure missing columns are added to existing patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS national_id TEXT UNIQUE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_priority TEXT NOT NULL DEFAULT 'regular';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_alerts TEXT;

-- Enable RLS for patients
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for patients:
-- (1) Allow public INSERT to register during booking
DROP POLICY IF EXISTS "Allow public inserts on patients" ON patients;
CREATE POLICY "Allow public inserts on patients" ON patients
    FOR INSERT WITH CHECK (true);

-- (2) Allow authenticated read access (doctors can view profiles)
DROP POLICY IF EXISTS "Allow authenticated reads on patients" ON patients;
CREATE POLICY "Allow authenticated reads on patients" ON patients
    FOR SELECT TO authenticated USING (true);

-- (3) Allow authenticated update access (doctors can update profiles)
DROP POLICY IF EXISTS "Allow authenticated updates on patients" ON patients;
CREATE POLICY "Allow authenticated updates on patients" ON patients
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 4. Add nullable foreign keys to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id) ON DELETE SET NULL;

-- 5. Create default facility (Mohandessin Branch)
INSERT INTO facilities (id, name_ar, name_en, address_ar, address_en, city_ar, city_en, map_url)
VALUES (
    '8c9cbe7d-f421-4f10-9118-2e0618037ea4',
    'فرع المهندسين - الجيزة',
    'Mohandessin Branch - Giza',
    'شارع جامعة الدول العربية، المهندسين',
    'Jamiat Al Dowal Al Arabiya Street, Mohandessin',
    'الجيزة',
    'Giza',
    'https://maps.google.com/?q=30.052,31.200'
)
ON CONFLICT (id) DO NOTHING;

-- Map doctor to Mohandessin facility
INSERT INTO facility_doctors (facility_id, doctor_id, consultation_fee, schedule_config, room_number, is_active)
SELECT 
    '8c9cbe7d-f421-4f10-9118-2e0618037ea4', 
    id, 
    consultation_fee, 
    '{"workingDays": [0, 1, 2, 3, 4], "startTime": "09:00", "endTime": "17:00", "slotDurationMinutes": 30, "capacityPerSlot": 1}'::jsonb, 
    'عيادة ٣', 
    true
FROM doctors
ON CONFLICT (facility_id, doctor_id) DO NOTHING;

-- Create second facility (New Cairo Branch)
INSERT INTO facilities (id, name_ar, name_en, address_ar, address_en, city_ar, city_en, map_url)
VALUES (
    '9c9cbe7d-f421-4f10-9118-2e0618037ea4',
    'فرع التجمع الخامس - القاهرة',
    'New Cairo Branch - Cairo',
    'شارع التسعين الشمالي، التجمع الخامس',
    'North 90th Street, Fifth Settlement',
    'القاهرة',
    'Cairo',
    'https://maps.google.com/?q=30.027,31.492'
)
ON CONFLICT (id) DO NOTHING;

-- Map doctor to New Cairo facility
INSERT INTO facility_doctors (facility_id, doctor_id, consultation_fee, schedule_config, room_number, is_active)
SELECT 
    '9c9cbe7d-f421-4f10-9118-2e0618037ea4', 
    id, 
    consultation_fee, 
    '{"workingDays": [0, 1, 2, 3, 4], "startTime": "09:00", "endTime": "17:00", "slotDurationMinutes": 30, "capacityPerSlot": 1}'::jsonb, 
    'عيادة ٥', 
    true
FROM doctors
ON CONFLICT (facility_id, doctor_id) DO NOTHING;

-- 6. Extract existing appointments to patients table and link them
-- Extract distinct patient names and phones into the patients table chronologically
INSERT INTO patients (id, full_name, phone, created_at)
SELECT DISTINCT ON (patient_phone)
    gen_random_uuid(),
    patient_name, 
    patient_phone, 
    created_at
FROM appointments
ORDER BY patient_phone, created_at ASC
ON CONFLICT (phone) DO NOTHING;

-- Update existing appointments to link to patients and facility
UPDATE appointments a
SET patient_id = p.id
FROM patients p
WHERE a.patient_phone = p.phone AND a.patient_id IS NULL;

UPDATE appointments
SET facility_id = '8c9cbe7d-f421-4f10-9118-2e0618037ea4'
WHERE facility_id IS NULL;

-- 7. Create trigger function to automatically link future appointments to patients
CREATE OR REPLACE FUNCTION sync_appointment_patient()
RETURNS TRIGGER AS $$
DECLARE
    p_id UUID;
BEGIN
    -- Check if patient already exists by phone
    SELECT id INTO p_id FROM patients WHERE phone = NEW.patient_phone LIMIT 1;
    
    -- If not, create a new patient record
    IF p_id IS NULL THEN
        INSERT INTO patients (full_name, phone)
        VALUES (NEW.patient_name, NEW.patient_phone)
        RETURNING id INTO p_id;
    END IF;
    
    -- Link the patient_id
    NEW.patient_id := p_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS trigger_sync_appointment_patient ON appointments;
CREATE TRIGGER trigger_sync_appointment_patient
BEFORE INSERT ON appointments
FOR EACH ROW
EXECUTE FUNCTION sync_appointment_patient();
