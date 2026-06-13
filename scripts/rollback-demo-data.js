const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local for Supabase credentials
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

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Doctor ID
const DOCTOR_ID = '5e236d18-ff19-42d5-82cf-6e6d6a177e9a';

// 30 Patient Phones to match seed data
const PATIENT_PHONES = [
  '+201002345678', '+201115678901', '+201223456789', '+201556789012', '+201014567890',
  '+201123456780', '+201201234567', '+201509876543', '+201091234567', '+201198765432',
  '+201281234567', '+201597654321', '+201061234567', '+201169876543', '+201271234567',
  '+201529876543', '+201029876543', '+201129876543', '+201229876543', '+201521234567',
  '+201089876543', '+201189876543', '+201289876543', '+201589876543', '+201039876543',
  '+201139876543', '+201239876543', '+201539876543', '+201049876543', '+201149876543'
];

// Helper to check if a table exists
async function checkTableExists(tableName) {
  try {
    const { error } = await supabase.from(tableName).select('*').limit(1);
    if (error) {
      if (error.code === '42P01' || 
          error.code === 'PGRST204' || 
          error.code === 'PGRST205' || 
          error.message?.includes('relation') || 
          error.message?.includes('schema cache') || 
          error.message?.includes('does not exist')) {
        return false;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

async function run() {
  console.log("Starting ShifaBook demo data rollback...");

  // 1. Detect active tables
  const hasExpensesTable = await checkTableExists('expenses');
  const hasPaymentsTable = await checkTableExists('payments');
  const hasInvoicesTable = await checkTableExists('invoices');

  console.log("Active Table Detection:");
  console.log(`- expenses table active: ${hasExpensesTable}`);
  console.log(`- payments table active: ${hasPaymentsTable}`);
  console.log(`- invoices table active: ${hasInvoicesTable}`);

  // 2. Fetch seeded appointments to get their IDs
  console.log("Fetching seeded appointments...");
  const { data: seededAppts, error: fetchError } = await supabase
    .from('appointments')
    .select('id')
    .eq('source', 'demo-seed-rc1');

  if (fetchError) {
    console.error("Failed to fetch seeded appointments:", fetchError.message);
    process.exit(1);
  }

  const apptIds = (seededAppts || []).map(a => a.id);
  console.log(`Found ${apptIds.length} seeded appointments to clean up.`);

  if (apptIds.length > 0) {
    // 3. Delete from invoices (dependent table)
    if (hasInvoicesTable) {
      console.log("Deleting associated invoices...");
      const { error: invErr } = await supabase
        .from('invoices')
        .delete()
        .in('appointment_id', apptIds);

      if (invErr) {
        console.error("Failed to delete invoices:", invErr.message);
      } else {
        console.log("Successfully deleted invoices.");
      }
    }

    // 4. Delete from payments (dependent table)
    if (hasPaymentsTable) {
      console.log("Deleting associated payments...");
      const { error: payErr } = await supabase
        .from('payments')
        .delete()
        .in('appointment_id', apptIds);

      if (payErr) {
        console.error("Failed to delete payments:", payErr.message);
      } else {
        console.log("Successfully deleted payments.");
      }
    }

    // 5. Delete appointments
    console.log("Deleting appointments...");
    const { error: apptErr } = await supabase
      .from('appointments')
      .delete()
      .in('id', apptIds);

    if (apptErr) {
      console.error("Failed to delete appointments:", apptErr.message);
    } else {
      console.log("Successfully deleted appointments.");
    }
  }

  // 6. Delete seeded expenses
  if (hasExpensesTable) {
    console.log("Deleting seeded expenses...");
    // Seeded expenses are identifiable by their titles/notes and date range
    const { error: expErr } = await supabase
      .from('expenses')
      .delete()
      .eq('created_by', 'Main Administrator')
      .in('expense_date', [
        '2026-05-24', '2026-05-26', '2026-05-27', 
        '2026-06-02', '2026-06-03', '2026-06-09', '2026-06-10'
      ]);

    if (expErr) {
      console.error("Failed to delete expenses:", expErr.message);
    } else {
      console.log("Successfully deleted seeded expenses.");
    }
  }

  // 7. Delete seeded schedule exceptions
  console.log("Deleting seeded schedule exceptions (blocked slots)...");
  const { error: excErr } = await supabase
    .from('schedule_exceptions')
    .delete()
    .eq('doctor_id', DOCTOR_ID)
    .in('exception_date', ['2026-05-25', '2026-06-03', '2026-06-09'])
    .in('slot_time', ['12:00', '12:30', '10:00', '14:00']);

  if (excErr) {
    console.error("Failed to delete schedule exceptions:", excErr.message);
  } else {
    console.log("Successfully deleted schedule exceptions.");
  }

  // 8. Delete seeded patients
  console.log("Deleting seeded patients...");
  const { error: patErr } = await supabase
    .from('patients')
    .delete()
    .in('phone', PATIENT_PHONES);

  if (patErr) {
    console.error("Failed to delete seeded patients:", patErr.message);
  } else {
    console.log("Successfully deleted seeded patients.");
  }

  console.log("ShifaBook demo data rollback completed successfully! Database cleaned.");
}

run();
