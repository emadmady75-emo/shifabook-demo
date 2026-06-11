-- =============================================================
-- RC-2.0: Clinic Layer Foundation Migration
-- =============================================================
-- Creates the clinics table and adds clinic_id foreign keys to
-- doctors, clinic_users, patients, and expenses.
-- Adds handle column to doctors for public booking resolution.
-- Backfills existing demo data with a default clinic.
--
-- Run this migration in the Supabase SQL editor.
-- Safe to re-run (all operations are idempotent).
-- =============================================================

-- ─── 1. CREATE CLINICS TABLE ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    city TEXT NULL,
    address TEXT NULL,
    phone TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Anyone can SELECT clinics (needed for public booking to resolve clinic info)
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select clinics" ON public.clinics;
CREATE POLICY "Allow select clinics" ON public.clinics
    FOR SELECT USING (true);

-- Authenticated staff can modify their clinic
DROP POLICY IF EXISTS "Allow modify clinics" ON public.clinics;
CREATE POLICY "Allow modify clinics" ON public.clinics
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.clinic_users
            WHERE auth_user_id = auth.uid()
              AND is_active = true
              AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clinic_users
            WHERE auth_user_id = auth.uid()
              AND is_active = true
              AND role = 'admin'
        )
    );

-- ─── 2. ADD clinic_id TO doctors ────────────────────────────
ALTER TABLE public.doctors
    ADD COLUMN IF NOT EXISTS clinic_id UUID
    REFERENCES public.clinics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS doctors_clinic_id_idx
    ON public.doctors (clinic_id) WHERE clinic_id IS NOT NULL;

-- ─── 3. ADD handle TO doctors ───────────────────────────────
ALTER TABLE public.doctors
    ADD COLUMN IF NOT EXISTS handle TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS doctors_handle_idx
    ON public.doctors (handle) WHERE handle IS NOT NULL;

-- ─── 4. ADD clinic_id TO clinic_users ───────────────────────
ALTER TABLE public.clinic_users
    ADD COLUMN IF NOT EXISTS clinic_id UUID
    REFERENCES public.clinics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS clinic_users_clinic_id_idx
    ON public.clinic_users (clinic_id) WHERE clinic_id IS NOT NULL;

-- ─── 5. ADD clinic_id TO patients ───────────────────────────
ALTER TABLE public.patients
    ADD COLUMN IF NOT EXISTS clinic_id UUID
    REFERENCES public.clinics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS patients_clinic_id_idx
    ON public.patients (clinic_id) WHERE clinic_id IS NOT NULL;

-- ─── 6. ADD clinic_id TO expenses ───────────────────────────
ALTER TABLE public.expenses
    ADD COLUMN IF NOT EXISTS clinic_id UUID
    REFERENCES public.clinics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS expenses_clinic_id_idx
    ON public.expenses (clinic_id) WHERE clinic_id IS NOT NULL;

-- ─── 7. BACKFILL: Create default clinic ─────────────────────
INSERT INTO public.clinics (id, name, slug, city, address, is_active)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'ShifaBook Demo Clinic',
    'shifabook-demo',
    '6 أكتوبر - مصر',
    'شارع جامعة الدول العربية، المهندسين',
    true
)
ON CONFLICT (slug) DO NOTHING;

-- ─── 8. BACKFILL: Link existing doctor to default clinic ────
UPDATE public.doctors
SET clinic_id = 'c0000000-0000-0000-0000-000000000001',
    handle = 'dr-ahmed'
WHERE clinic_id IS NULL;

-- ─── 9. BACKFILL: Link existing clinic_users to default clinic
UPDATE public.clinic_users
SET clinic_id = 'c0000000-0000-0000-0000-000000000001'
WHERE clinic_id IS NULL;

-- ─── 10. BACKFILL: Link existing patients to default clinic ─
UPDATE public.patients
SET clinic_id = 'c0000000-0000-0000-0000-000000000001'
WHERE clinic_id IS NULL;

-- ─── 11. BACKFILL: Link existing expenses to default clinic ─
UPDATE public.expenses
SET clinic_id = 'c0000000-0000-0000-0000-000000000001'
WHERE clinic_id IS NULL;

-- =============================================================
-- NOTE: RLS policy hardening with clinic_id checks is planned
-- for RC-2.1. For RC-2.0, data isolation is enforced at the
-- application layer through scoped queries.
-- =============================================================

-- TODO RC-2.1: Add clinic_id-aware RLS policies:
--   appointments: WHERE doctor_id IN (SELECT id FROM doctors WHERE clinic_id = user_clinic_id)
--   schedule_exceptions: same pattern
--   patients: WHERE clinic_id = user_clinic_id
--   expenses: WHERE clinic_id = user_clinic_id
--   payments/invoices: through appointment → doctor → clinic chain
