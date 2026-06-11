-- safe idempotent SQL migration to add schedule exceptions table
CREATE TABLE IF NOT EXISTS public.schedule_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    slot_time TEXT NOT NULL,
    reason TEXT NULL,
    is_recurring_weekly BOOLEAN NOT NULL DEFAULT false,
    weekday INTEGER NULL CHECK (weekday >= 0 AND weekday <= 6),
    created_by UUID REFERENCES public.clinic_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;

-- Select policy: Anyone (anon/authenticated) can select exceptions to check availability
DROP POLICY IF EXISTS "Allow select schedule_exceptions" ON public.schedule_exceptions;
CREATE POLICY "Allow select schedule_exceptions" ON public.schedule_exceptions
    FOR SELECT USING (true);

-- Modify policy: Admin, Supervisor, and Reception roles can insert/update/delete exceptions
DROP POLICY IF EXISTS "Allow modify schedule_exceptions" ON public.schedule_exceptions;
CREATE POLICY "Allow modify schedule_exceptions" ON public.schedule_exceptions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.clinic_users
            WHERE auth_user_id = auth.uid()
              AND is_active = true
              AND role IN ('admin', 'supervisor', 'reception')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clinic_users
            WHERE auth_user_id = auth.uid()
              AND is_active = true
              AND role IN ('admin', 'supervisor', 'reception')
        )
    );

-- Required Indexes
CREATE INDEX IF NOT EXISTS schedule_exceptions_doctor_id_idx ON public.schedule_exceptions (doctor_id);
CREATE INDEX IF NOT EXISTS schedule_exceptions_exception_date_idx ON public.schedule_exceptions (exception_date);
CREATE INDEX IF NOT EXISTS schedule_exceptions_weekday_idx ON public.schedule_exceptions (weekday);
CREATE INDEX IF NOT EXISTS schedule_exceptions_doctor_id_exception_date_idx ON public.schedule_exceptions (doctor_id, exception_date);
CREATE INDEX IF NOT EXISTS schedule_exceptions_doctor_id_weekday_idx ON public.schedule_exceptions (doctor_id, weekday);
