-- safe idempotent SQL migration
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS consultation_fee_at_booking numeric;

UPDATE public.appointments
SET consultation_fee_at_booking = doctors.consultation_fee
FROM public.doctors
WHERE appointments.doctor_id = doctors.id
AND appointments.consultation_fee_at_booking IS NULL;
