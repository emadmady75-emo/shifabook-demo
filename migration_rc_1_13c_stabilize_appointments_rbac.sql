-- Migration: RC-1.13C Stabilize Appointments & RBAC Schema
-- This script is safe to run multiple times. It adds missing columns, verifies tables exist, and configures clean RLS policies.

-- 1. Create facilities table if it does not exist
CREATE TABLE IF NOT EXISTS public.facilities (
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
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for facilities
DROP POLICY IF EXISTS "Allow public read-only access to facilities" ON public.facilities;
CREATE POLICY "Allow public read-only access to facilities" ON public.facilities
    FOR SELECT USING (true);

-- 2. Create facility_doctors junction table if it does not exist
CREATE TABLE IF NOT EXISTS public.facility_doctors (
    facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
    consultation_fee NUMERIC NOT NULL DEFAULT 0,
    schedule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    room_number TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (facility_id, doctor_id)
);

-- Enable RLS for facility_doctors
ALTER TABLE public.facility_doctors ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for facility_doctors
DROP POLICY IF EXISTS "Allow public read-only access to facility_doctors" ON public.facility_doctors;
CREATE POLICY "Allow public read-only access to facility_doctors" ON public.facility_doctors
    FOR SELECT USING (true);

-- 3. Create patients table if it does not exist
CREATE TABLE IF NOT EXISTS public.patients (
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
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS national_id TEXT UNIQUE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS patient_priority TEXT NOT NULL DEFAULT 'regular';
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS medical_alerts TEXT;

-- Enable RLS for patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for patients:
DROP POLICY IF EXISTS "Allow public inserts on patients" ON public.patients;
CREATE POLICY "Allow public inserts on patients" ON public.patients
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated reads on patients" ON public.patients;
CREATE POLICY "Allow authenticated reads on patients" ON public.patients
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated updates on patients" ON public.patients;
CREATE POLICY "Allow authenticated updates on patients" ON public.patients
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 4. Add nullable foreign keys and audit columns to appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL;

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS confirmed_by TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS attended_by TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS rescheduled_by TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 5. Create default facilities if they do not exist
INSERT INTO public.facilities (id, name_ar, name_en, address_ar, address_en, city_ar, city_en, map_url)
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

INSERT INTO public.facilities (id, name_ar, name_en, address_ar, address_en, city_ar, city_en, map_url)
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

-- Map default doctor to Mohandessin and New Cairo facilities if doctor row exists
-- Match doctor ID: 5e236d18-ff19-42d5-82cf-6e6d6a177e9a
INSERT INTO public.facility_doctors (facility_id, doctor_id, consultation_fee, schedule_config, room_number, is_active)
SELECT 
    '8c9cbe7d-f421-4f10-9118-2e0618037ea4', 
    id, 
    consultation_fee, 
    '{"workingDays": [0, 1, 2, 3, 4], "startTime": "09:00", "endTime": "17:00", "slotDurationMinutes": 30, "capacityPerSlot": 1}'::jsonb, 
    'عيادة ٣', 
    true
FROM public.doctors
WHERE id = '5e236d18-ff19-42d5-82cf-6e6d6a177e9a'
ON CONFLICT (facility_id, doctor_id) DO NOTHING;

INSERT INTO public.facility_doctors (facility_id, doctor_id, consultation_fee, schedule_config, room_number, is_active)
SELECT 
    '9c9cbe7d-f421-4f10-9118-2e0618037ea4', 
    id, 
    consultation_fee, 
    '{"workingDays": [0, 1, 2, 3, 4], "startTime": "09:00", "endTime": "17:00", "slotDurationMinutes": 30, "capacityPerSlot": 1}'::jsonb, 
    'عيادة ٥', 
    true
FROM public.doctors
WHERE id = '5e236d18-ff19-42d5-82cf-6e6d6a177e9a'
ON CONFLICT (facility_id, doctor_id) DO NOTHING;

-- Backfill existing appointments to default facility
UPDATE public.appointments
SET facility_id = '8c9cbe7d-f421-4f10-9118-2e0618037ea4'
WHERE facility_id IS NULL;

-- 6. Create trigger function to automatically link future appointments to patients
CREATE OR REPLACE FUNCTION public.sync_appointment_patient()
RETURNS TRIGGER AS $$
DECLARE
    p_id UUID;
BEGIN
    SELECT id INTO p_id FROM public.patients WHERE phone = NEW.patient_phone LIMIT 1;
    
    IF p_id IS NULL THEN
        INSERT INTO public.patients (full_name, phone)
        VALUES (NEW.patient_name, NEW.patient_phone)
        RETURNING id INTO p_id;
    END IF;
    
    NEW.patient_id := p_id;
    RETURN NEW;
END;
$$ LANGUAGE public.plpgsql SECURITY DEFINER;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS trigger_sync_appointment_patient ON public.appointments;
CREATE TRIGGER trigger_sync_appointment_patient
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.sync_appointment_patient();

-- 7. Create payments, invoices, and expenses tables if they do not exist
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT CHECK (status IN ('unpaid','paid','refunded')) DEFAULT 'unpaid',
    method TEXT CHECK (method IN ('cash','card','wallet','insurance','other')) DEFAULT 'cash',
    paid_at TIMESTAMPTZ,
    received_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT CHECK (status IN ('draft','issued','cancelled')) DEFAULT 'draft',
    issued_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT,
    amount NUMERIC NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on finance tables
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Add simple read RLS policies for authenticated users
DROP POLICY IF EXISTS "Allow authenticated read payments" ON public.payments;
CREATE POLICY "Allow authenticated read payments" ON public.payments
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read invoices" ON public.invoices;
CREATE POLICY "Allow authenticated read invoices" ON public.invoices
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read expenses" ON public.expenses;
CREATE POLICY "Allow authenticated read expenses" ON public.expenses
    FOR SELECT TO authenticated USING (true);

-- Ensure password_reset_required column is present in clinic_users
ALTER TABLE public.clinic_users ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN NOT NULL DEFAULT false;

-- Add UPDATE RLS policy for clinic_users so users can clear their password reset flag
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.clinic_users;
CREATE POLICY "Allow users to update their own profile" ON public.clinic_users
    FOR UPDATE TO authenticated USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

-- 8. Configure clean and robust RLS policies for appointments table
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public select appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.appointments;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.appointments;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.appointments;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.appointments;
DROP POLICY IF EXISTS "Doctors can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors can update their own appointments" ON public.appointments;

-- (A) SELECT Policy: Active clinic users can see all, and anon users (patients) can read (for slot status & checking active booking)
CREATE POLICY "Allow select appointments" ON public.appointments
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.clinic_users WHERE auth_user_id = auth.uid() AND is_active = true)
        OR
        auth.role() = 'anon'
    );

-- (B) INSERT Policy: Active clinic users and anon users can create bookings
CREATE POLICY "Allow insert appointments" ON public.appointments
    FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.clinic_users WHERE auth_user_id = auth.uid() AND is_active = true)
        OR
        auth.role() = 'anon'
    );

-- (C) UPDATE Policy:
-- - Active admin can update anything.
-- - Active supervisor and reception can update but NOT cancel (cannot set status to 'cancelled').
-- - Anon users (patients) can update (to reschedule/cancel their own bookings).
CREATE POLICY "Allow update appointments" ON public.appointments
    FOR UPDATE
    USING (
        (SELECT role FROM public.clinic_users WHERE auth_user_id = auth.uid() AND is_active = true) = 'admin'
        OR
        (SELECT role FROM public.clinic_users WHERE auth_user_id = auth.uid() AND is_active = true) IN ('supervisor', 'reception')
        OR
        auth.role() = 'anon'
    )
    WITH CHECK (
        (SELECT role FROM public.clinic_users WHERE auth_user_id = auth.uid() AND is_active = true) = 'admin'
        OR
        (
            (SELECT role FROM public.clinic_users WHERE auth_user_id = auth.uid() AND is_active = true) IN ('supervisor', 'reception')
            AND status <> 'cancelled'
        )
        OR
        auth.role() = 'anon'
    );

-- 9. Add performance indexes for appointments table
CREATE INDEX IF NOT EXISTS appointments_doctor_id_idx ON public.appointments (doctor_id);
CREATE INDEX IF NOT EXISTS appointments_patient_phone_idx ON public.appointments (patient_phone);
CREATE INDEX IF NOT EXISTS appointments_appointment_date_idx ON public.appointments (appointment_date);
CREATE INDEX IF NOT EXISTS appointments_facility_id_idx ON public.appointments (facility_id);
