import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { AdminDashboardData } from '../../types';
import { TwoToneHeading } from '../../components/TwoToneHeading';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';

export const AdminDashboardScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [period, setPeriod] = useState<string>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await adminService.getDashboard(period);
        if (isMounted) setDashboard(data);
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Admin authentication required.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, [period]);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-pill bg-rose-50 text-danger text-[11px] font-bold uppercase tracking-wider mb-2">
            🔒 {isRTL ? 'منطقة إدارية مقيدة (ADMIN ONLY)' : 'Restricted Administration Portal'}
          </div>
          <TwoToneHeading
            first={isRTL ? 'لوحة' : 'Admin'}
            second={isRTL ? 'إدارة المنصة والتحليلات' : 'Dashboard'}
            level={1}
            className="text-3xl font-extrabold"
          />
          <p className="text-sm text-faded-ink mt-1">
            {isRTL
              ? 'متابعة أداء المنظومة، استهلاك سحابة R2، وأنشطة المستخدمين مع الالتزام الكامل بالخصوصية'
              : 'High-level operational telemetry, R2 storage utilization, and user engagement monitoring'}
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 p-1 bg-white border border-line rounded-pill">
          {['7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-bold rounded-pill transition ${
                period === p ? 'bg-blue text-white' : 'text-ink hover:text-navy hover:bg-well'
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Privacy Guarantee Banner */}
      <div className="p-4 rounded-card bg-blue/5 border border-blue/20 text-xs text-ink flex items-start gap-3">
        <span className="text-blue text-base font-bold">🛡</span>
        <div>
          <strong className="text-navy font-bold">
            {isRTL ? 'ضمان الخصوصية الإدارية الصارمة:' : 'Strict Admin Privacy Guarantee:'}
          </strong>{' '}
          {isRTL
            ? 'لا تعرض هذه اللوحة محتويات الملفات أو سجلات البيانات المرفوعة من قبل المستخدمين أو نصوص محادثات الذكاء الاصطناعي، التزاماً بسياسات الأمان.'
            : 'Operational metadata and aggregates only. Private dataset contents, individual records, and AI chat messages are never exposed.'}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner message={isRTL ? 'جارٍ تحميل المقاييس الإدارية...' : 'Loading administration metrics...'} />
      ) : error ? (
        <div className="p-6 rounded-card bg-rose-50 border border-rose-200 text-danger text-sm font-semibold">
          {error}
        </div>
      ) : dashboard ? (
        <>
          {/* Main Metrics 4-Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="decidix-card p-5">
              <div className="text-xs font-semibold text-faded-ink uppercase tracking-wider mb-1">
                {isRTL ? 'إجمالي الحسابات' : 'Total User Accounts'}
              </div>
              <div className="text-3xl font-black text-navy">
                {dashboard.metrics.total_users}
              </div>
              <div className="text-xs text-emerald-600 mt-1">
                {dashboard.metrics.active_users} {isRTL ? 'نشط' : 'active'} • {dashboard.metrics.suspended_users} {isRTL ? 'معلق' : 'suspended'}
              </div>
            </div>

            <div className="decidix-card p-5">
              <div className="text-xs font-semibold text-faded-ink uppercase tracking-wider mb-1">
                {isRTL ? 'مجموعات البيانات النشطة' : 'Active Datasets'}
              </div>
              <div className="text-3xl font-black text-navy">
                {dashboard.metrics.active_datasets} / {dashboard.metrics.total_datasets}
              </div>
              <div className="text-xs text-blue mt-1">
                {isRTL ? 'مفحوصة ومعالجة بنجاح' : 'Validated & Canonical'}
              </div>
            </div>

            <div className="decidix-card p-5">
              <div className="text-xs font-semibold text-faded-ink uppercase tracking-wider mb-1">
                {isRTL ? 'إجمالي السجلات المفحوصة' : 'Ingested Records'}
              </div>
              <div className="text-3xl font-black text-navy">
                {(dashboard.metrics.total_records || 0).toLocaleString()}
              </div>
              <div className="text-xs text-faded-ink mt-1">
                Across all regions
              </div>
            </div>

            <div className="decidix-card p-5">
              <div className="text-xs font-semibold text-faded-ink uppercase tracking-wider mb-1">
                {isRTL ? 'استهلاك سحابة R2' : 'Cloudflare R2 Storage'}
              </div>
              <div className="text-3xl font-black text-navy">
                {formatBytes(dashboard.metrics.total_storage_bytes || 0)}
              </div>
              <div className="text-xs text-faded-ink mt-1">
                Bucket: <code className="text-navy font-bold">decidcix</code>
              </div>
            </div>
          </div>

          {/* Activity Summary & Recent Admin Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="decidix-card p-6">
              <h3 className="font-bold text-navy text-base mb-4">
                {isRTL ? 'نشاط المنظومة اليوم' : 'Platform Telemetry'}
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-well bg-well">
                  <span className="text-xs font-semibold text-ink">
                    {isRTL ? 'إجمالي الأحداث المسجلة:' : 'Tracked Events:'}
                  </span>
                  <span className="font-bold text-navy text-sm">
                    {dashboard.activity_summary?.total_events?.toLocaleString() || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-well bg-well">
                  <span className="text-xs font-semibold text-ink">
                    {isRTL ? 'طلبات واجهة البرمجة اليوم:' : 'API Calls Today:'}
                  </span>
                  <span className="font-bold text-blue text-sm">
                    {dashboard.activity_summary?.api_calls_today?.toLocaleString() || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-well bg-well">
                  <span className="text-xs font-semibold text-ink">
                    {isRTL ? 'الجلسات النشطة حالياً:' : 'Active Sessions:'}
                  </span>
                  <span className="font-bold text-emerald-600 text-sm">
                    {dashboard.activity_summary?.active_sessions || 1}
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 decidix-card p-6">
              <h3 className="font-bold text-navy text-base mb-4">
                {isRTL ? 'آخر عمليات تسجيل الدخول للنظام' : 'Recent Authenticated Logins'}
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs font-bold text-faded-ink uppercase">
                      <th className="py-2.5 px-3">{isRTL ? 'المستخدم' : 'User'}</th>
                      <th className="py-2.5 px-3">{isRTL ? 'الدور' : 'Role'}</th>
                      <th className="py-2.5 px-3">{isRTL ? 'التوقيت' : 'Timestamp'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {dashboard.recent_logins?.map((u) => (
                      <tr key={u.id} className="hover:bg-well/50 transition">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-navy text-xs">{u.name}</div>
                          <div className="text-[11px] text-faded-ink">{u.email}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-pill bg-blue/10 text-blue uppercase">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-xs font-mono text-faded-ink">
                          {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Recent'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
