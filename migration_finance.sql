-- Migration: RC-1.13 Reception Role Rename & Finance Module Foundation

-- 1. Drop check constraint on clinic_users role and recreate it with 'reception' instead of 'user'
DO $$
BEGIN
    ALTER TABLE clinic_users DROP CONSTRAINT IF EXISTS clinic_users_role_check;
    ALTER TABLE clinic_users ADD CONSTRAINT clinic_users_role_check CHECK (role IN ('admin', 'supervisor', 'reception', 'accountant'));
EXCEPTION
    WHEN undefined_table THEN
        -- Table doesn't exist yet, which is fine
        NULL;
END $$;

-- 2. Update existing 'user' roles to 'reception'
DO $$
BEGIN
    UPDATE clinic_users SET role = 'reception' WHERE role = 'user';
EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;

-- 3. Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
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

-- 4. Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT CHECK (status IN ('draft','issued','cancelled')) DEFAULT 'draft',
    issued_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
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

-- 6. Enable RLS on finance tables
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 7. Add simple read RLS policies for authenticated users
DROP POLICY IF EXISTS "Allow authenticated read payments" ON payments;
CREATE POLICY "Allow authenticated read payments" ON payments
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read invoices" ON invoices;
CREATE POLICY "Allow authenticated read invoices" ON invoices
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read expenses" ON expenses;
CREATE POLICY "Allow authenticated read expenses" ON expenses
    FOR SELECT TO authenticated USING (true);

-- 8. Add password_reset_required column to clinic_users
ALTER TABLE clinic_users ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN NOT NULL DEFAULT false;

-- 9. Add UPDATE RLS policy for clinic_users so users can clear their password reset flag
DROP POLICY IF EXISTS "Allow users to update their own profile" ON clinic_users;
CREATE POLICY "Allow users to update their own profile" ON clinic_users
    FOR UPDATE TO authenticated USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());
