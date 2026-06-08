const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  try {
    envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  } catch (e2) {
    console.error("Could not find .env.local", e2);
    process.exit(1);
  }
}

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const DEFAULT_PASSWORD = 'ShifaBook2026_test!';

const TEST_USERS = [
  { email: 'admin@test.com', full_name: 'مدير النظام التجريبي', role: 'admin' },
  { email: 'supervisor@test.com', full_name: 'مشرف العيادة التجريبي', role: 'supervisor' },
  { email: 'reception@test.com', full_name: 'موظف الاستقبال التجريبي', role: 'reception' },
  { email: 'accountant@test.com', full_name: 'المحاسب المالي التجريبي', role: 'accountant' },
];

async function seed() {
  console.log("Starting seed script for default clinic users...");

  // First check if clinic_users table exists
  const { error: checkTableError } = await supabaseAdmin.from('clinic_users').select('id').limit(1);
  if (checkTableError && checkTableError.message?.includes('relation "clinic_users" does not exist')) {
    console.error("Error: The 'clinic_users' table does not exist. Please run the SQL migrations first!");
    return;
  }

  for (const user of TEST_USERS) {
    console.log(`Processing user: ${user.email} (${user.role})...`);

    // Check if user already exists in clinic_users
    const { data: existingProfile, error: profileErr } = await supabaseAdmin
      .from('clinic_users')
      .select('*')
      .eq('email', user.email)
      .limit(1);

    if (existingProfile && existingProfile.length > 0) {
      console.log(`- Profile already exists for ${user.email}. Skipping Auth creation.`);
      
      // Update role if changed
      if (existingProfile[0].role !== user.role) {
        await supabaseAdmin
          .from('clinic_users')
          .update({ role: user.role })
          .eq('email', user.email);
        console.log(`- Updated role to ${user.role}.`);
      }
      continue;
    }

    // Attempt to create auth user
    // First, list users to see if they exist in auth but not profile
    const { data: authUsers, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) {
      console.error("- Error listing auth users:", listErr.message);
      continue;
    }

    let authUser = authUsers.users.find(u => u.email === user.email);
    let userId = authUser ? authUser.id : null;

    if (!authUser) {
      const { data: newAuthUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: user.full_name }
      });

      if (createErr) {
        console.error(`- Error creating auth user for ${user.email}:`, createErr.message);
        continue;
      }

      userId = newAuthUser.user.id;
      console.log(`- Created new Auth user with ID: ${userId}`);
    } else {
      console.log(`- Auth user already exists with ID: ${userId}`);
    }

    // Insert into clinic_users
    const { error: insertErr } = await supabaseAdmin
      .from('clinic_users')
      .insert({
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_active: true,
        auth_user_id: userId
      });

    if (insertErr) {
      console.error(`- Error inserting clinic_users profile:`, insertErr.message);
    } else {
      console.log(`- Profile linked successfully!`);
    }
  }

  console.log("\nSeeding finished! Credentials for testing:");
  TEST_USERS.forEach(u => {
    console.log(`- Email: ${u.email} | Password: ${DEFAULT_PASSWORD} | Role: ${u.role}`);
  });
}

seed();
