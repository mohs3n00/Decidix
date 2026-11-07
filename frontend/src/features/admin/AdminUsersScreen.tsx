import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { User } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';

export const AdminUsersScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await adminService.listUsers({
        search,
        status: statusFilter,
        limit: 50,
      });
      setUsers(res.users || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleSuspend = async (id: string) => {
    try {
      await adminService.suspendUser(id);
      setActionMessage(isRTL ? 'تم تعليق الحساب بنجاح.' : 'User account suspended.');
      await fetchUsers();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Action failed');
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await adminService.reactivateUser(id);
      setActionMessage(isRTL ? 'تمت إعادة تنشيط الحساب بنجاح.' : 'User account reactivated.');
      await fetchUsers();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Action failed');
    }
  };

  const handleRevokeSessions = async (id: string) => {
    try {
      await adminService.revokeSessions(id);
      setActionMessage(isRTL ? 'تم إلغاء كافة الجلسات النشطة للمستخدم.' : 'All active sessions revoked.');
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Action failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(isRTL ? 'هل أنت متأكد من رغبتك في حذف هذا الحساب نهائياً؟' : 'Permanently delete this user account?')) {
      return;
    }
    try {
      await adminService.deleteUser(id);
      setActionMessage(isRTL ? 'تم حذف الحساب.' : 'Account deleted.');
      await fetchUsers();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-pill bg-rose-50 text-danger text-[11px] font-bold uppercase tracking-wider mb-2">
            🔒 {isRTL ? 'منطقة إدارية (ADMIN)' : 'User Management'}
          </div>
          <TwoToneHeading
            first={isRTL ? 'إدارة' : 'User'}
            second={isRTL ? 'حسابات المستخدمين' : 'Accounts'}
            level={1}
            className="text-3xl font-extrabold"
          />
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'مراجعة أدوار وصلاحيات مستخدمي المنصة، تعليق الحسابات، وإلغاء الجلسات النشطة'
              : 'RBAC role assignment, session revocation, and security status controls'}
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-card bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between">
          <span>✓ {actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-emerald-600 font-bold">✕</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="decidix-card p-4 flex flex-col sm:flex-row items-center gap-4 bg-white">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isRTL ? 'ابحث بالاسم أو البريد الإلكتروني...' : 'Search by name or email...'}
          className="decidix-input flex-1"
        />

        <div className="flex items-center gap-1 p-1 bg-well rounded-pill">
          {['all', 'active', 'suspended', 'deleted'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-bold rounded-pill transition uppercase ${
                statusFilter === s ? 'bg-blue text-white' : 'text-ink hover:text-navy'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="decidix-card p-6">
        {isLoading ? (
          <LoadingSpinner message={isRTL ? 'جارٍ تحميل الحسابات...' : 'Loading accounts...'} />
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-ink">
            <p className="font-semibold">{isRTL ? 'لم يتم العثور على مستخدمين.' : 'No users found matching query.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-bold text-faded-ink uppercase">
                  <th className="py-3 px-4">{isRTL ? 'المستخدم' : 'Account'}</th>
                  <th className="py-3 px-4">{isRTL ? 'الدور' : 'Role'}</th>
                  <th className="py-3 px-4">{isRTL ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-4">{isRTL ? 'تاريخ التسجيل' : 'Created'}</th>
                  <th className="py-3 px-4 text-right">{isRTL ? 'إجراءات الأمان' : 'Security Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-well/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-navy">{u.name}</div>
                      <div className="text-xs text-faded-ink">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-pill bg-blue/10 text-blue uppercase">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`decidix-pill-badge text-[10px] font-bold ${
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-600'
                            : u.status === 'suspended'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-danger'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-faded-ink">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleRevokeSessions(u.id)}
                        className="text-xs font-semibold px-2 py-1 rounded bg-well text-navy hover:bg-line transition"
                        title={isRTL ? 'إلغاء الجلسات' : 'Revoke active sessions'}
                      >
                        Revoke
                      </button>

                      {u.status === 'suspended' ? (
                        <button
                          onClick={() => handleReactivate(u.id)}
                          className="text-xs font-semibold px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspend(u.id)}
                          className="text-xs font-semibold px-2 py-1 rounded bg-amber-50 text-amber-800 hover:bg-amber-100 transition"
                        >
                          Suspend
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(u.id)}
                        className="text-xs font-semibold px-2 py-1 rounded bg-rose-50 text-danger hover:bg-rose-100 transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
