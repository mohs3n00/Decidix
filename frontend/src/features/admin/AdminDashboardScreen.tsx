import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../components/Toast';
import { DecidixIcon } from '../../components/DecidixIcon';
import { adminService } from '../../services/adminService';
import { AdminDashboardData } from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const AdminDashboardScreen: React.FC = () => {
  const { isRTL } = useLanguage();
  const toast = useToast();
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [datasetStats, setDatasetStats] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    let isMounted = true;
    const loadAdminData = async () => {
      setIsLoading(true);
      try {
        const [dashRes, statsRes, notifRes] = await Promise.all([
          adminService.getDashboard(period),
          adminService.getDatasetStatistics().catch(() => null),
          adminService.getNotificationHistory().catch(() => []),
        ]);
        if (!isMounted) return;
        setDashboard(dashRes);
        setDatasetStats(statsRes);
        setCampaigns(Array.isArray(notifRes) ? notifRes : []);
      } catch (err: any) {
        if (isMounted) {
          toast.error(err?.message || (isRTL ? 'تعذر تحميل لوحة تحكم الإدارة' : 'Failed to load admin dashboard'));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadAdminData();
    return () => {
      isMounted = false;
    };
  }, [period]);

  const kpis = dashboard?.kpis;
  const totalUsers = kpis?.users?.total ?? 0;
  const totalDatasets = datasetStats?.totalDatasets ?? kpis?.datasets?.total ?? 0;
  const totalStorageBytes = datasetStats?.totalStorageBytes ?? kpis?.datasets?.totalStorageBytes ?? 0;
  const totalCampaigns = kpis?.notifications?.totalCampaigns ?? campaigns.length ?? 0;

  const MODULE_AR: Record<string, string> = {
    overview: 'الرئيسية',
    insights: 'التحليلات',
    intelligence: 'الذكاء',
    decisions: 'القرارات',
    datasets: 'البيانات',
    assistant: 'المساعد',
  };

  const activityData = (dashboard?.analytics?.moduleBreakdown || []).map((m) => ({
    name: m.module.charAt(0).toUpperCase() + m.module.slice(1),
    nameAr: MODULE_AR[m.module] || m.module,
    val: m.count,
  }));

  const formatBreakdown: Record<string, number> = datasetStats?.formatDistribution || {};
  const maxFormatCount = Math.max(...Object.values(formatBreakdown), 1);
  const FORMAT_COLORS = ['bg-blue', 'bg-cyan', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
  const formatDist = Object.entries(formatBreakdown).map(([format, count], idx) => ({
    format: format.toUpperCase(),
    count,
    percent: Math.round((count / maxFormatCount) * 100),
    color: FORMAT_COLORS[idx % FORMAT_COLORS.length],
  }));

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue mb-1">
            {isRTL ? 'إدارة المنظومة' : 'ADMIN WORKSPACE'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-navy">
            {isRTL ? 'نظرة عامة على المنصة' : 'Platform overview'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isRTL
              ? 'رؤية تشغيلية آمنة للحسابات، نشاط البيانات، وحالة توصيل المنظومة.'
              : 'A privacy-safe operational view of accounts, data activity, and delivery health.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
            {(['7d', '30d', '90d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  period === p ? 'bg-white text-navy shadow-2xs font-bold' : 'text-slate-600 hover:text-navy'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            {isLoading ? (isRTL ? 'جاري التحديث...' : 'Syncing...') : (isRTL ? 'بيانات حية من PostgreSQL' : 'Live PostgreSQL Metrics')}
          </span>
          <button
            onClick={() => window.print()}
            className="h-9 px-4 rounded-lg bg-white border border-slate-200/80 text-navy hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors duration-150"
          >
            {isRTL ? 'تصدير الملخص' : 'Export summary'}
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
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">{totalUsers}</span>
            <span className="text-[11px] font-bold text-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
              {kpis?.users?.active ?? 0} {isRTL ? 'نشط' : 'active'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
            <DecidixIcon name="search" size={16} color="var(--color-blue)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'مجموعات البيانات' : 'Platform datasets'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">{totalDatasets}</span>
            <span className="text-[11px] font-bold text-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
              {kpis?.datasets?.validated ?? 0} {isRTL ? 'معتمد' : 'validated'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
            <DecidixIcon name="search" size={16} color="var(--color-blue)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'المساحة المستهلكة' : 'Storage consumed'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">{formatBytes(totalStorageBytes)}</span>
            <span className="text-[11px] font-bold text-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
              R2 + DB
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue mb-3">
            <DecidixIcon name="notifications" size={16} color="var(--color-blue)" />
          </div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {isRTL ? 'حملات الإشعارات' : 'Push campaigns'}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-navy tabular-nums">{totalCampaigns}</span>
            <span className="text-[11px] font-bold text-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
              {kpis?.notifications?.totalDelivered ?? 0} {isRTL ? 'مستلم' : 'delivered'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Feature Activity + Dataset Formats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Feature Activity Bar Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-base font-bold text-navy">
              {isRTL ? 'نشاط الميزات والخدمات' : 'Feature activity'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRTL
                ? `إجمالي الأحداث (${kpis?.activity?.totalEvents ?? 0}) عبر الوحدات خلال ${period}`
                : `Aggregated audit events (${kpis?.activity?.totalEvents ?? 0}) across modules (${period})`}
            </p>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5FA" />
                <XAxis dataKey={isRTL ? 'nameAr' : 'name'} stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#061A3A',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '12px',
                    padding: '8px 12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="val" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {activityData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.name === 'Datasets' ? '#21EAF4' : '#2563EB'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Dataset Formats Distribution (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-navy mb-0.5">
              {isRTL ? 'صيغ البيانات' : 'Dataset formats'}
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              {isRTL ? 'التوزيع الفعلي للنسخ المخزنة في السجل' : 'Live distribution from dataset_versions registry'}
            </p>

            {formatDist.length === 0 ? (
              <div className="text-xs text-slate-400 py-8 text-center">
                {isRTL ? 'لا توجد نسخ مسجلة بعد.' : 'No dataset versions recorded yet.'}
              </div>
            ) : (
              <div className="space-y-4">
                {formatDist.map((item) => (
                  <div key={item.format} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-navy">
                      <span>{item.format}</span>
                      <span className="tabular-nums font-bold">{item.count}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-300`}
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Card: Recent Campaigns & Active Version */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <h2 className="text-base font-bold text-navy mb-0.5">
          {isRTL ? 'أحدث حملات الإشعارات وسجل التشغيل' : 'Recent push campaigns & telemetry'}
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          {isRTL
            ? 'بيانات وصفية تشغيلية فقط · لا تتضمن أي صفوف خاصة من البيانات أو نصوص المحادثات'
            : 'Metadata only · no private dataset rows or AI conversation content'}
        </p>

        {campaigns.length === 0 ? (
          <div className="text-xs text-slate-400 py-4">
            {isRTL ? 'لم يتم إرسال حملات إشعارات مسجلة في هذه الفترة.' : 'No push notification campaigns recorded yet.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {campaigns.slice(0, 6).map((c: any) => (
              <div key={c.id} className="py-3.5 flex items-center justify-between text-xs gap-4">
                <span className="font-semibold text-navy">{isRTL ? c.arabicTitle || c.title : c.title}</span>
                <span className="text-slate-600 font-medium">
                  {c.targetAudience} · {c.deliveredCount}/{c.targetedCount}
                </span>
                <span className="text-slate-400 tabular-nums">
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
