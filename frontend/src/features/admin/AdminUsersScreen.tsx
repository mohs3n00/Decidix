import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../components/Toast';
import { DecidixIcon } from '../../components/DecidixIcon';
import { adminService } from '../../services/adminService';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const AdminUsersScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const toast = useToast();
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'deleted'>('all');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [summaryCounts, setSummaryCounts] = useState({ total: 0, active: 0, suspended: 0, deleted: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const [res, dash] = await Promise.all([
        adminService.listUsers({
          search: search.trim() || undefined,
          status: filter !== 'all' ? filter : undefined,
          limit: 50,
        }),
        adminService.getDashboard('30d').catch(() => null),
      ]);
      const rawUsers = Array.isArray(res.users) ? res.users : [];
      setUsers(rawUsers);
      if (dash?.kpis?.users) {
        setSummaryCounts({
          total: dash.kpis.users.total,
          active: dash.kpis.users.active,
          suspended: dash.kpis.users.suspended,
          deleted: dash.kpis.users.deleted,
        });
      } else {
        setSummaryCounts({
          total: res.meta?.total ?? rawUsers.length,
          active: rawUsers.filter((u: any) => u.status === 'active').length,
          suspended: rawUsers.filter((u: any) => u.status === 'suspended').length,
          deleted: rawUsers.filter((u: any) => u.status === 'deleted').length,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || (isRTL ? 'تعذر تحميل قائمة المستخدمين' : 'Failed to load users'));
    } finally {
      setIsLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const t = setTimeout(loadUsers, 200);
    return () => clearTimeout(t);
  }, [loadUsers]);

  const handleAction = async (userItem: any) => {
    setBusyUserId(userItem.id);
    try {
      if (userItem.status === 'suspended') {
        await adminService.reactivateUser(userItem.id);
        toast.success(isRTL ? `تم إعادة تفعيل الحساب ${userItem.email}` : `Reactivated ${userItem.email}`);
      } else if (userItem.status === 'active') {
        await adminService.suspendUser(userItem.id);
        toast.success(isRTL ? `تم تعليق الحساب ${userItem.email}` : `Suspended ${userItem.email}`);
      }
      await loadUsers();
    } catch (err: any) {
      toast.error(err?.message || (isRTL ? 'تعذر تنفيذ الإجراء' : 'Action failed'));
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue mb-1">
            {isRTL ? 'إدارة المنظومة' : 'ADMIN WORKSPACE'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy">
            {isRTL ? 'إدارة المستخدمين' : 'User management'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isRTL
              ? 'مراجعة الحسابات، ملخصات الاستخدام، وحالة الوصول دون الاطلاع على المحتوى الخاص للمستخدمين.'
              : 'Review account metadata, usage summaries, and access status without opening private user content.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            {isLoading ? (isRTL ? 'جاري التحميل...' : 'Loading...') : (isRTL ? 'سجل حي من قاعدة البيانات' : 'Live Account Directory')}
          </span>
          <button
            onClick={() => window.print()}
            className="h-9 px-4 rounded-lg bg-white border border-slate-200/80 text-navy hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors duration-150"
          >
            {isRTL ? 'تصدير المستخدمين' : 'Export users'}
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
            <DecidixIcon name="account" size={16} color="var(--color-blue)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'الحسابات المسجلة' : 'Registered accounts'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">{summaryCounts.total}</span>
            <span className="text-[11px] font-bold text-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
              All profiles
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
            <DecidixIcon name="arrow_up_right" size={16} color="currentColor" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'حسابات نشطة' : 'Active accounts'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">{summaryCounts.active}</span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              Active status
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 mb-3">
            <DecidixIcon name="arrow_down_right" size={16} color="currentColor" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'معلقة' : 'Suspended'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">{summaryCounts.suspended}</span>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
              Suspended
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 mb-3">
            <DecidixIcon name="notifications" size={16} color="var(--color-danger)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'محذوفة' : 'Deleted'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">{summaryCounts.deleted}</span>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full">
              Terminated
            </span>
          </div>
        </div>
      </div>

      {/* Main Account Directory Table Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-navy">
              {isRTL ? 'دليل الحسابات' : 'Account directory'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRTL
                ? 'عرض بيانات وصفية فقط · دون الوصول لمحتوى الملفات أو محادثات الذكاء الاصطناعي'
                : 'Metadata-only view · no file contents or AI conversations'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRTL ? 'بحث بالبريد أو الاسم...' : 'Search by email or name...'}
                className="w-56 h-9 ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 rounded-lg bg-slate-50 border border-slate-200/80 focus:bg-white focus:ring-2 focus:ring-blue/15 focus:border-blue text-xs text-navy outline-none transition-colors duration-150"
              />
              <div className="absolute inset-y-0 ltr:left-3 rtl:right-3 flex items-center pointer-events-none text-slate-400">
                <DecidixIcon name="search" size={14} color="#94A3B8" />
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              {(['all', 'active', 'suspended', 'deleted'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all duration-150 ${
                    filter === t
                      ? 'bg-white text-navy shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-navy'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Rows */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            {isRTL ? 'جاري تحميل الحسابات...' : 'Loading accounts...'}
          </div>
        ) : users.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            {isRTL ? 'لا توجد حسابات مطابقة للتصفية.' : 'No accounts match the selected filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-semibold">Account</th>
                  <th className="pb-3 font-semibold">Role</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Last active</th>
                  <th className="pb-3 font-semibold">Datasets</th>
                  <th className="pb-3 font-semibold">Storage</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const statusClass =
                    u.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : u.status === 'suspended'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      : 'bg-rose-50 text-rose-700 border border-rose-200/60';
                  const lastActiveStr = u.lastActiveAt
                    ? new Date(u.lastActiveAt).toLocaleDateString()
                    : '—';
                  return (
                    <tr key={u.id || u.email} className="hover:bg-slate-50/70 transition-colors duration-100">
                      <td className="py-3.5 font-bold text-navy">
                        <div>{u.email}</div>
                        {u.name && <div className="text-[10px] text-slate-400 font-normal">{u.name}</div>}
                      </td>
                      <td className="py-3.5 font-semibold text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700 uppercase">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${statusClass}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-500 tabular-nums">{lastActiveStr}</td>
                      <td className="py-3.5 font-bold text-navy tabular-nums">{u.datasetCount ?? 0}</td>
                      <td className="py-3.5 text-slate-500 tabular-nums">{formatBytes(u.storageBytes ?? 0)}</td>
                      <td className="py-3.5 text-right">
                        {u.status !== 'deleted' && (
                          <button
                            disabled={busyUserId === u.id}
                            onClick={() => handleAction(u)}
                            className="px-3.5 py-1.5 rounded-lg border border-slate-200/80 hover:bg-slate-50 font-semibold text-[11px] text-navy shadow-2xs transition-colors duration-150 disabled:opacity-50"
                          >
                            {u.status === 'suspended'
                              ? isRTL ? 'إعادة تفعيل' : 'Reactivate'
                              : isRTL ? 'تعليق' : 'Suspend'}
                          </button>
                        )}
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
};
