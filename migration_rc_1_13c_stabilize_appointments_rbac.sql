-- Minimal Migration: RC-1.13C-A Stabilize Appointments & RBAC Schema (Forensics Hotfix)
-- This script contains the smallest safe change set to fix the regressions.
-- It only alters the appointments table and configures proper RLS policies.

-- 1. Add audit columns to public.appointments table if they do not exist
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS confirmed_by TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS attended_by TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS rescheduled_by TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Configure clean and robust RLS policies for appointments table
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

-- 3. Add performance indexes for appointments table
CREATE INDEX IF NOT EXISTS appointments_doctor_id_idx ON public.appointments (doctor_id);
CREATE INDEX IF NOT EXISTS appointments_patient_phone_idx ON public.appointments (patient_phone);
CREATE INDEX IF NOT EXISTS appointments_appointment_date_idx ON public.appointments (appointment_date);
