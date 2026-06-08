import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';

// Initialize the Supabase admin client using service role key
const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey);
};

// Helper to check if the caller is an active admin
async function verifyAdminCaller() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    return { error: 'غير مصرح بالدخول', status: 401 };
  }

  // Fallback for default seeded doctor
  if (user.id === '5e236d18-ff19-42d5-82cf-6e6d6a177e9a' || user.email === 'doctor@shifabook.com') {
    return { caller: user, isAdmin: true };
  }

  // Check database
  try {
    const { data: clinicUser, error } = await client
      .from('clinic_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (error || !clinicUser) {
      return { error: 'غير مصرح لك بالدخول، يرجى مراجعة مدير النظام.', status: 403 };
    }

    const role = clinicUser.role === 'user' ? 'reception' : clinicUser.role;

    if (role !== 'admin' || !clinicUser.is_active) {
      return { error: 'عذراً، يجب أن تكون مديراً مسجلاً ونشطاً للقيام بهذا الإجراء.', status: 403 };
    }

    return { caller: user, isAdmin: true };
  } catch (err) {
    // Graceful fallback if clinic_users table is not yet created
    return { error: 'فشل التحقق من الصلاحيات. يرجى التأكد من تشغيل ملف الهجرة بقاعدة البيانات.', status: 500 };
  }
}

export async function GET(request: NextRequest) {
  const authCheck = await verifyAdminCaller();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const client = await createClient();
  try {
    const { data, error } = await client
      .from('clinic_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Backward compatibility: map 'user' to 'reception'
    const normalized = (data || []).map((u: any) => {
      if (u.role === 'user') {
        return { ...u, role: 'reception' };
      }
      return u;
    });

    return NextResponse.json(normalized);
  } catch (err: any) {
    console.error('Error fetching clinic users:', err);
    // Graceful fallback if relation does not exist
    if (err.code === '42P01' || err.message?.includes('relation "clinic_users" does not exist')) {
      return NextResponse.json([
        {
          id: '5e236d18-ff19-42d5-82cf-6e6d6a177e9a',
          email: 'doctor@shifabook.com',
          full_name: 'د. عبدالرحمن المصري',
          role: 'admin',
          is_active: true,
          auth_user_id: '5e236d18-ff19-42d5-82cf-6e6d6a177e9a',
          created_at: new Date().toISOString()
        }
      ]);
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authCheck = await verifyAdminCaller();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const caller = authCheck.caller!;
  const supabaseAdmin = getAdminClient();

  try {
    const { full_name, email, password, role, is_active } = await request.json();

    if (!full_name || !email || !password || !role) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة.' }, { status: 400 });
    }

    // 1. Create Auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (authError) {
      if (authError.message?.includes('already registered') || authError.status === 422) {
        return NextResponse.json({ error: 'البريد الإلكتروني مسجل بالفعل لمستخدم آخر.' }, { status: 400 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authUser.user.id;

    // 2. Lock account if inactive initially
    if (is_active === false) {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: '87600h'
      });
    }

    // 3. Insert into clinic_users
    let { error: dbError } = await supabaseAdmin
      .from('clinic_users')
      .insert({
        email,
        full_name,
        role,
        is_active: is_active ?? true,
        auth_user_id: userId,
        created_by: caller.id
      });

    // Check constraint fallback for un-migrated role databases
    if (dbError && dbError.code === '23514' && role === 'reception') {
      console.warn("Check constraint rejected 'reception', retrying insertion with role 'user' for fallback.");
      const retryResult = await supabaseAdmin
        .from('clinic_users')
        .insert({
          email,
          full_name,
          role: 'user',
          is_active: is_active ?? true,
          auth_user_id: userId,
          created_by: caller.id
        });
      dbError = retryResult.error;
    }

    if (dbError) {
      console.error('Database insertion error for clinic user:', dbError);
      // Clean up orphaned Auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: 'فشل إدخال بيانات المستخدم في قاعدة البيانات.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId });
  } catch (err: any) {
    console.error('Error in POST clinic user:', err);
    return NextResponse.json({ error: err.message || 'حدث خطأ غير متوقع.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authCheck = await verifyAdminCaller();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const caller = authCheck.caller!;
  const supabaseAdmin = getAdminClient();

  try {
    const { id, role, is_active } = await request.json();

    if (!id || !role || is_active === undefined) {
      return NextResponse.json({ error: 'البيانات غير مكتملة للتعديل.' }, { status: 400 });
    }

    // Fetch the target clinic_user profile
    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from('clinic_users')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'المستخدم غير موجود.' }, { status: 404 });
    }

    // Prevent modifying self
    if (targetUser.auth_user_id === caller.id) {
      return NextResponse.json({ error: 'لا يمكنك تعديل صلاحياتك أو إلغاء تفعيل حسابك بنفسك.' }, { status: 400 });
    }

    // 1. Update clinic_users
    let { error: dbError } = await supabaseAdmin
      .from('clinic_users')
      .update({
        role,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    // Check constraint fallback for un-migrated role databases
    if (dbError && dbError.code === '23514' && role === 'reception') {
      console.warn("Check constraint rejected 'reception', retrying update with role 'user' for fallback.");
      const retryResult = await supabaseAdmin
        .from('clinic_users')
        .update({
          role: 'user',
          is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      dbError = retryResult.error;
    }

    if (dbError) {
      console.error('Database update error for clinic user:', dbError);
      return NextResponse.json({ error: 'فشل تحديث بيانات المستخدم.' }, { status: 500 });
    }

    // 2. Lock / unlock in Auth
    if (targetUser.auth_user_id) {
      const banDuration = is_active ? 'none' : '87600h';
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.auth_user_id, {
        ban_duration: banDuration
      });
      if (banError) {
        console.error('Auth ban status update error:', banError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in PUT clinic user:', err);
    return NextResponse.json({ error: err.message || 'حدث خطأ غير متوقع.' }, { status: 500 });
  }
}
