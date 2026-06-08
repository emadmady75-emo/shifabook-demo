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

const crypto = require('crypto');

function generateRandomPassword() {
  const randomStr = crypto.randomBytes(9).toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 10);
  return `${randomStr}Aa1!`;
}

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

  const generatedCredentials = [];

  for (const user of TEST_USERS) {
    const tempPassword = generateRandomPassword();
    console.log(`Processing user: ${user.email} (${user.role})...`);

    // Check if user already exists in clinic_users
    const { data: existingProfile, error: profileErr } = await supabaseAdmin
      .from('clinic_users')
      .select('*')
      .eq('email', user.email)
      .limit(1);

    if (existingProfile && existingProfile.length > 0) {
      console.log(`- Profile already exists for ${user.email}. Skipping Auth creation.`);
      
      // Update role and password reset flag
      await supabaseAdmin
        .from('clinic_users')
        .update({ 
          role: user.role,
          password_reset_required: true
        })
        .eq('email', user.email);
      console.log(`- Updated role to ${user.role} and set password_reset_required to true.`);
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
        password: tempPassword,
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
      // If user exists, reset password to random
      const { error: resetPassErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: tempPassword
      });
      if (resetPassErr) {
        console.error(`- Error resetting auth password for existing user:`, resetPassErr.message);
      } else {
        console.log(`- Reset existing auth password to a new random temporary credential.`);
      }
    }

    // Insert into clinic_users
    const { error: insertErr } = await supabaseAdmin
      .from('clinic_users')
      .insert({
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_active: true,
        auth_user_id: userId,
        password_reset_required: true
      });

    if (insertErr) {
      console.error(`- Error inserting clinic_users profile:`, insertErr.message);
    } else {
      console.log(`- Profile linked successfully!`);
    }

    generatedCredentials.push({ email: user.email, password: tempPassword, role: user.role });
  }

  console.log("\n=======================================================");
  console.log("Seeding finished! Secure temporary credentials generated:");
  generatedCredentials.forEach(u => {
    console.log(`- Email: ${u.email} | Temporary Password: ${u.password} | Role: ${u.role}`);
  });
  console.log("=======================================================");
  console.log("Note: On first login, users will be prompted to reset this password.");
}

seed();
