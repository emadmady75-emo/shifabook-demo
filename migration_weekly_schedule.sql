-- 1. Add schedule columns to public.doctors table
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS working_days jsonb;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS start_time text;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS end_time text;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS slot_duration integer;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS capacity_per_slot integer;

-- 2. Backfill existing doctor records with default schedule settings
UPDATE public.doctors
SET 
  working_days = '[0, 1, 2, 3, 4]'::jsonb,
  start_time = '09:00',
  end_time = '17:00',
  slot_duration = 30,
  capacity_per_slot = 1
WHERE working_days IS NULL;
