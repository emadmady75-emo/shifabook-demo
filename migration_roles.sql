-- Migration: RC-1.12 Admin Roles & Audit Logging

-- 1. Create clinic_users table
CREATE TABLE IF NOT EXISTS clinic_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'user', 'accountant')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add audit columns to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_by TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS attended_by TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_by TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 3. Enable RLS on clinic_users
ALTER TABLE clinic_users ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for clinic_users:
-- Allow authenticated users to select clinic_users
DROP POLICY IF EXISTS "Allow authenticated users to select clinic_users" ON clinic_users;
CREATE POLICY "Allow authenticated users to select clinic_users" ON clinic_users
    FOR SELECT TO authenticated USING (true);

-- 5. Seed the existing doctor as admin in clinic_users
-- Match the doctor id: 5e236d18-ff19-42d5-82cf-6e6d6a177e9a
INSERT INTO clinic_users (email, full_name, role, is_active, auth_user_id)
VALUES (
    'doctor@shifabook.com', -- Default login email
    'د. عبدالرحمن المصري',
    'admin',
    true,
    '5e236d18-ff19-42d5-82cf-6e6d6a177e9a'
)
ON CONFLICT (auth_user_id) DO UPDATE 
SET role = 'admin', full_name = EXCLUDED.full_name;
