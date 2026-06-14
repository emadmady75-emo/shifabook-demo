-- RC-1.14E: Add doctor handle column, unique index, and backfill demo doctor

-- 1. Add handle column to doctors table
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS handle text;

-- 2. Create unique index on handle to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS doctors_handle_unique_idx
ON public.doctors(handle)
WHERE handle IS NOT NULL;

-- 3. Backfill current demo doctor ('د. عبدالرحمن المصري') to 'dr-ahmed'
UPDATE public.doctors
SET handle = 'dr-ahmed'
WHERE handle IS NULL
  AND (full_name ILIKE '%عبدالرحمن%' OR id = '5e236d18-ff19-42d5-82cf-6e6d6a177e9a');
