-- =============================================================
-- RC-1.14: Follow-Up Visits Migration
-- =============================================================
-- Adds appointment_type and parent_appointment_id columns to
-- the appointments table to support follow-up visit workflows.
--
-- appointment_type: 'regular' (default) or 'follow_up'
-- parent_appointment_id: FK linking follow-up to its parent
--
-- Run this migration in the Supabase SQL editor.
-- =============================================================

-- 1. Add appointment_type column
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS appointment_type TEXT NOT NULL DEFAULT 'regular';

-- Add check constraint (safe: only if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'appointments_appointment_type_check'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_appointment_type_check
      CHECK (appointment_type IN ('regular', 'follow_up'));
  END IF;
END $$;

-- 2. Add parent_appointment_id column (self-referencing FK)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS parent_appointment_id UUID NULL
  REFERENCES public.appointments(id) ON DELETE SET NULL;

-- 3. Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS appointments_parent_appointment_id_idx
  ON public.appointments (parent_appointment_id)
  WHERE parent_appointment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS appointments_appointment_type_idx
  ON public.appointments (appointment_type)
  WHERE appointment_type = 'follow_up';

-- =============================================================
-- No RLS changes needed — existing appointment policies apply.
-- No backfill needed — all existing rows default to 'regular'.
-- =============================================================

-- TODO Phase 2: Treatment Plans / Multi-Session Procedures
-- - treatment_plan_id UUID FK to a future treatment_plans table
-- - session_number INTEGER for ordered sessions within a plan
-- - These will extend the follow-up foundation built here.
