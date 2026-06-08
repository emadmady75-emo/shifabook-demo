'use client';

import React, { useState, useEffect } from 'react';
import { useBooking } from '@/components/BookingContext';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'supervisor' | 'reception' | 'accountant';
  is_active: boolean;
  auth_user_id: string;
  created_at: string;
}

export default function UserManagement() {
  const { language, clinicUser } = useBooking();
  const isAr = language === 'ar';

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'supervisor' | 'reception' | 'accountant'>('reception');
  const [isActive, setIsActive] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  // Messages
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        const errData = await res.json();
        console.error('Failed to fetch users:', errData.error);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Client-side validation
    if (!fullName.trim()) {
      setMessage({ type: 'error', text: isAr ? 'الاسم الكامل مطلوب.' : 'Full name is required.' });
      return;
    }

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setMessage({ type: 'error', text: isAr ? 'يرجى إدخال بريد إلكتروني صالح.' : 'Please enter a valid email.' });
      return;
    }

    if (!password || password.length < 6) {
      setMessage({ type: 'error', text: isAr ? 'كلمة المرور يجب أن لا تقل عن 6 أحرف.' : 'Password must be at least 6 characters.' });
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          role,
          is_active: isActive
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: isAr ? 'تم إنشاء المستخدم بنجاح.' : 'User created successfully.' });
        // Reset form
        setFullName('');
        setEmail('');
        setPassword('');
        setRole('reception');
        setIsActive(true);
        // Refresh list
        fetchUsers();
      } else {
        setMessage({ type: 'error', text: data.error || (isAr ? 'فشل إنشاء المستخدم.' : 'Failed to create user.') });
      }
    } catch (err) {
      setMessage({ type: 'error', text: isAr ? 'حدث خطأ في الشبكة.' : 'Network error.' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: User['role']) => {
    setUpdateMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          role: newRole,
          is_active: users.find(u => u.id === userId)?.is_active ?? true
        })
      });

      const data = await res.json();
      if (res.ok) {
        setUpdateMessage({ type: 'success', text: isAr ? 'تم تحديث صلاحية المستخدم.' : 'User role updated.' });
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        setUpdateMessage({ type: 'error', text: data.error || (isAr ? 'فشل التحديث.' : 'Update failed.') });
      }
    } catch (err) {
      setUpdateMessage({ type: 'error', text: isAr ? 'حدث خطأ في الشبكة.' : 'Network error.' });
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    setUpdateMessage(null);
    const newStatus = !currentStatus;
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          role: targetUser.role,
          is_active: newStatus
        })
      });

      const data = await res.json();
      if (res.ok) {
        setUpdateMessage({
          type: 'success', 
          text: isAr 
            ? (newStatus ? 'تم تفعيل الحساب بنجاح.' : 'تم إيقاف تفعيل الحساب بنجاح.')
            : `User account ${newStatus ? 'activated' : 'deactivated'}.`
        });
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: newStatus } : u));
      } else {
        setUpdateMessage({ type: 'error', text: data.error || (isAr ? 'فشل التحديث.' : 'Update failed.') });
      }
    } catch (err) {
      setUpdateMessage({ type: 'error', text: isAr ? 'حدث خطأ في الشبكة.' : 'Network error.' });
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من إعادة تعيين كلمة مرور هذا المستخدم؟' : 'Are you sure you want to reset this user\'s password?')) {
      return;
    }
    setUpdateMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          action: 'reset_password'
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(isAr 
          ? `تمت إعادة تعيين كلمة المرور بنجاح!\n\nكلمة المرور المؤقتة الجديدة هي:\n${data.tempPassword}\n\nيرجى نسخها وإعطاؤها للمستخدم. سيطلب منه النظام تغييرها عند تسجيل الدخول الأول.` 
          : `Password reset successfully!\n\nNew temporary password:\n${data.tempPassword}\n\nPlease copy it and give it to the user. They will be forced to change it on first login.`
        );
        setUpdateMessage({ 
          type: 'success', 
          text: isAr ? `تمت إعادة تعيين كلمة المرور. كلمة المرور المؤقتة هي: ${data.tempPassword}` : `Password reset. Temp password: ${data.tempPassword}` 
        });
      } else {
        setUpdateMessage({ type: 'error', text: data.error || (isAr ? 'فشل إعادة تعيين كلمة المرور.' : 'Password reset failed.') });
      }
    } catch (err) {
      setUpdateMessage({ type: 'error', text: isAr ? 'حدث خطأ في الشبكة.' : 'Network error.' });
    }
  };

  const getRoleBadge = (userRole: string) => {
    switch (userRole) {
      case 'admin':
        return <span className="px-2. py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-[10px] font-bold border border-purple-500/20">{isAr ? 'مدير' : 'Admin'}</span>;
      case 'supervisor':
        return <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">{isAr ? 'مشرف' : 'Supervisor'}</span>;
      case 'reception':
      case 'user':
        return <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 text-[10px] font-bold border border-teal-500/20">{isAr ? 'استقبال' : 'Reception'}</span>;
      case 'accountant':
        return <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">{isAr ? 'محاسب' : 'Accountant'}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-right" dir={isAr ? 'rtl' : 'ltr'}>
      {/* User Creation Form */}
      <div className="lg:col-span-4 glass-panel rounded-3xl p-6 border border-teal-500/20 space-y-6 self-start">
        <div className="space-y-1">
          <h3 className="text-lg font-black text-white">
            {isAr ? 'إضافة مستخدم جديد' : 'Add New User'}
          </h3>
          <p className="text-xs text-slate-400">
            {isAr ? 'أدخل تفاصيل حساب الموظف الجديد وصلاحياته' : 'Enter details and permissions for the new staff member'}
          </p>
        </div>

        {message && (
          <div className={`p-3 rounded-xl border text-xs font-bold text-center ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {isAr ? 'الاسم الكامل' : 'Full Name'}
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={isAr ? 'مثال: محمد أحمد' : 'e.g. John Doe'}
              className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {isAr ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="reception@shifabook.com"
              className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-left"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {isAr ? 'كلمة المرور' : 'Password'}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-sm transition-colors text-left"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {isAr ? 'الدور / الصلاحية' : 'Role'}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-4 py-3 rounded-xl bg-[#09151e] border border-teal-950/60 text-slate-100 focus:outline-none focus:border-teal-500 text-sm transition-colors appearance-none"
            >
              <option value="admin">{isAr ? 'مدير (Admin)' : 'Admin'}</option>
              <option value="supervisor">{isAr ? 'مشرف (Supervisor)' : 'Supervisor'}</option>
              <option value="reception">{isAr ? 'موظف استقبال (Reception)' : 'Reception'}</option>
              <option value="accountant">{isAr ? 'محاسب (Accountant)' : 'Accountant'}</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveCheckbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded bg-[#09151e] border-teal-950 text-teal-500 focus:ring-0 focus:ring-offset-0"
            />
            <label htmlFor="isActiveCheckbox" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
              {isAr ? 'تفعيل الحساب مباشرة' : 'Activate account immediately'}
            </label>
          </div>

          <button
            type="submit"
            disabled={formLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-[#070e12] font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md shadow-teal-500/10 disabled:opacity-50"
          >
            {formLoading ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ المستخدم' : 'Save User')}
          </button>
        </form>
      </div>

      {/* Users List Table */}
      <div className="lg:col-span-8 glass-panel rounded-3xl p-6 border border-teal-500/20 space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-black text-white">
            {isAr ? 'إدارة المستخدمين النشطين' : 'Manage Clinic Users'}
          </h3>
          <p className="text-xs text-slate-400">
            {isAr ? 'عرض وتعديل صلاحيات وحالة حسابات الفريق بالعيادة' : 'View and edit clinic staff permissions and activation status'}
          </p>
        </div>

        {updateMessage && (
          <div className={`p-3 rounded-xl border text-xs font-bold text-center ${
            updateMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
          }`}>
            {updateMessage.text}
          </div>
        )}

        {loadingUsers ? (
          <div className="py-20 text-center text-slate-400 text-xs font-bold">
            {isAr ? 'جاري تحميل قائمة المستخدمين...' : 'Loading clinic users...'}
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs font-bold">
            {isAr ? 'لا يوجد مستخدمون مضافون بعد.' : 'No users created yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm border-collapse">
              <thead>
                <tr className="border-b border-teal-950/40 text-slate-400 text-xs font-bold">
                  <th className="pb-3 text-right">{isAr ? 'الاسم' : 'Name'}</th>
                  <th className="pb-3 text-right">{isAr ? 'البريد الإلكتروني' : 'Email'}</th>
                  <th className="pb-3 text-right">{isAr ? 'الصلاحية الحالية' : 'Current Role'}</th>
                  <th className="pb-3 text-right">{isAr ? 'تغيير الدور' : 'Change Role'}</th>
                  <th className="pb-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="pb-3 text-left">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-950/20 text-slate-200">
                {users.map((user) => {
                  const isSelf = user.auth_user_id === clinicUser?.auth_user_id;

                  return (
                    <tr key={user.id} className="hover:bg-teal-950/5">
                      <td className="py-3 font-bold text-white max-w-[150px] truncate">
                        {user.full_name} {isSelf && <span className="text-[9px] text-teal-400 font-normal">({isAr ? 'أنت' : 'Self'})</span>}
                      </td>
                      <td className="py-3 text-slate-300 text-xs text-left truncate max-w-[150px]">{user.email}</td>
                      <td className="py-3">{getRoleBadge(user.role)}</td>
                      <td className="py-3">
                        <select
                          disabled={isSelf}
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value as any)}
                          className="bg-[#09151e] border border-teal-950/40 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-teal-500 disabled:opacity-50"
                        >
                          <option value="admin">{isAr ? 'مدير' : 'Admin'}</option>
                          <option value="supervisor">{isAr ? 'مشرف' : 'Supervisor'}</option>
                          <option value="reception">{isAr ? 'موظف استقبال' : 'Reception'}</option>
                          <option value="accountant">{isAr ? 'محاسب' : 'Accountant'}</option>
                        </select>
                      </td>
                      <td className="py-3 text-center">
                        {user.is_active ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                            {isAr ? 'نشط' : 'Active'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20">
                            {isAr ? 'ملغى تفعيله' : 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-left">
                        <div className="flex justify-end gap-2">
                          <button
                            disabled={isSelf}
                            onClick={() => handleResetPassword(user.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 bg-amber-500/10 text-amber-400 border border-amber-950/20 hover:bg-amber-950/40"
                          >
                            {isAr ? 'إعادة تعيين' : 'Reset Pass'}
                          </button>
                          
                          <button
                            disabled={isSelf}
                            onClick={() => handleToggleActive(user.id, user.is_active)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                              user.is_active 
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-950 hover:bg-rose-950/40' 
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-950 hover:bg-[#0d2a2f]'
                            }`}
                          >
                            {user.is_active 
                              ? (isAr ? 'تعطيل' : 'Deactivate') 
                              : (isAr ? 'تفعيل' : 'Activate')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
