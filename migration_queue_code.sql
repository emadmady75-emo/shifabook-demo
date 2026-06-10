-- safe idempotent SQL migration to add queue_code column
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS queue_code TEXT;
