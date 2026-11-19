import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { DecidixIcon } from '../../components/DecidixIcon';

export const AdminUsersScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'deleted'>('all');
  const [search, setSearch] = useState('');

  const [users, setUsers] = useState([
    { email: 'member01@decidixapp.tech', role: 'VIEWER', status: 'Active', statusClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60', lastActive: 'Today · 10:20', datasets: 3, storage: '12.4 KB', action: 'Suspend' },
    { email: 'member02@decidixapp.tech', role: 'ANALYST', status: 'Active', statusClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60', lastActive: 'Today · 09:42', datasets: 5, storage: '8.2 KB', action: 'Suspend' },
    { email: 'member03@decidixapp.tech', role: 'VIEWER', status: 'Suspended', statusClass: 'bg-amber-50 text-amber-700 border border-amber-200/60', lastActive: 'Nov 06', datasets: 2, storage: '4.1 KB', action: 'Reactivate' },
    { email: 'member04@decidixapp.tech', role: 'VIEWER', status: 'Active', statusClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60', lastActive: 'Nov 05', datasets: 1, storage: '1.8 KB', action: 'Suspend' },
    { email: 'member05@decidixapp.tech', role: 'VIEWER', status: 'Deleted', statusClass: 'bg-rose-50 text-rose-700 border border-rose-200/60', lastActive: 'Nov 01', datasets: 0, storage: '0 B', action: 'View' },
  ]);

  const filteredUsers = users.filter((u) => {
    if (filter === 'active' && u.status !== 'Active') return false;
    if (filter === 'suspended' && u.status !== 'Suspended') return false;
    if (filter === 'deleted' && u.status !== 'Deleted') return false;
    if (search && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAction = (userItem: any) => {
    if (userItem.action === 'Suspend') {
      setUsers((prev) =>
        prev.map((u) =>
          u.email === userItem.email
            ? { ...u, status: 'Suspended', statusClass: 'bg-amber-50 text-amber-700 border border-amber-200/60', action: 'Reactivate' }
            : u
        )
      );
    } else if (userItem.action === 'Reactivate') {
      setUsers((prev) =>
        prev.map((u) =>
          u.email === userItem.email
            ? { ...u, status: 'Active', statusClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60', action: 'Suspend' }
            : u
        )
      );
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
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
            Sample users · not live records
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
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">24</span>
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
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">21</span>
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
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">2</span>
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
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">1</span>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full">
              Terminated
            </span>
          </div>
        </div>
      </div>

      {/* Main Account Directory Table Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        {/* Filter bar */}
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
                placeholder={isRTL ? 'بحث بالبريد...' : 'Search by email or user ID...'}
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
              {filteredUsers.map((u) => (
                <tr key={u.email} className="hover:bg-slate-50/70 transition-colors duration-100">
                  <td className="py-3.5 font-bold text-navy">{u.email}</td>
                  <td className="py-3.5 font-semibold text-slate-600">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${u.statusClass}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-500 tabular-nums">{u.lastActive}</td>
                  <td className="py-3.5 font-bold text-navy tabular-nums">{u.datasets}</td>
                  <td className="py-3.5 text-slate-500 tabular-nums">{u.storage}</td>
                  <td className="py-3.5 text-right">
                    <button
                      onClick={() => handleAction(u)}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-200/80 hover:bg-slate-50 font-semibold text-[11px] text-navy shadow-2xs transition-colors duration-150"
                    >
                      {u.action}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
