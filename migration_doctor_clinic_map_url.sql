-- Add clinic_map_url column to doctors table
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS clinic_map_url text;

-- Update existing doctor profile maps URL with a default if needed
UPDATE public.doctors
SET clinic_map_url = 'https://maps.google.com/?q=30.052,31.200'
WHERE clinic_map_url IS NULL;
